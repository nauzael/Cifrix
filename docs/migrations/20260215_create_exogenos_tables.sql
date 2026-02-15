-- ============================================================================
-- MIGRATION: Módulo de Información Exógena
-- Autor: Sistema Cifrix
-- Fecha: 2026-02-15
-- Descripción: Crea las tablas necesarias para el módulo de procesamiento y
--              validación de información exógena según formatos DIAN
-- ============================================================================

-- Tabla principal de exógenos
CREATE TABLE IF NOT EXISTS exogenos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    tipo_exogeno TEXT NOT NULL CHECK (tipo_exogeno IN ('0210', '0220', '0230', '0240', '0250', '0260')),
    periodo_fiscal INTEGER NOT NULL,
    
    -- Datos del informante (quien reporta)
    nit_informante TEXT NOT NULL,
    nombre_informante TEXT,
    
    -- Datos del contribuyente (sobre quien se reporta)
    nit_contribuyente TEXT NOT NULL,
    nombre_contribuyente TEXT,
    
    -- Datos del movimiento
    concepto TEXT NOT NULL,
    monto DECIMAL(15,2) NOT NULL,
    retencion DECIMAL(15,2) DEFAULT 0,
    fecha_movimiento DATE NOT NULL,
    
    -- Procesamiento
    procesado BOOLEAN DEFAULT FALSE,
    validado BOOLEAN DEFAULT FALSE,
    inconsistencia TEXT,
    
    -- Metadata
    archivo_origen TEXT,
    linea_origen INTEGER,
    datos_raw JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(organization_id, tipo_exogeno, nit_informante, nit_contribuyente, fecha_movimiento, concepto)
);

COMMENT ON TABLE exogenos IS 'Almacena información exógena reportada por terceros';
COMMENT ON COLUMN exogenos.tipo_exogeno IS 'Tipo de exógeno: 0210=Ingresos, 0220=Compras, 0230=Ventas, 0240=Bancario, 0250=Gastos, 0260=Inmuebles';
COMMENT ON COLUMN exogenos.nit_informante IS 'NIT de la entidad que reporta la información';
COMMENT ON COLUMN exogenos.nit_contribuyente IS 'NIT del contribuyente sobre quien se reporta';
COMMENT ON COLUMN exogenos.procesado IS 'Indica si el exógeno ya fue procesado y mapeado';
COMMENT ON COLUMN exogenos.validado IS 'Indica si el exógeno pasó las validaciones de consistencia';

-- Tabla de mapeo y validación
CREATE TABLE IF NOT EXISTS mapeo_inconsistencias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exogeno_id UUID NOT NULL REFERENCES exogenos(id) ON DELETE CASCADE,
    
    -- Referencia a operación interna (puede ser factura, pago, transacción, etc.)
    entidad_tipo TEXT, -- 'INVOICE', 'PAYMENT', 'TRANSACTION', etc.
    entidad_id UUID,
    
    -- Estado de validación
    estado_validacion TEXT NOT NULL CHECK (estado_validacion IN ('VALIDADO', 'DISCREPANCIA', 'SIN_CORRESPONDENCIA', 'PENDIENTE')),
    diferencia_monto DECIMAL(15,2),
    diferencia_fecha INTEGER, -- días de diferencia
    
    -- Resolución
    resuelto BOOLEAN DEFAULT FALSE,
    notas TEXT,
    responsable_resolucion TEXT,
    fecha_resolucion TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE mapeo_inconsistencias IS 'Mapea exógenos con operaciones internas y registra inconsistencias detectadas';
COMMENT ON COLUMN mapeo_inconsistencias.estado_validacion IS 'VALIDADO: Coincide con operación interna | DISCREPANCIA: Existe pero con diferencias | SIN_CORRESPONDENCIA: No se encontró operación relacionada';
COMMENT ON COLUMN mapeo_inconsistencias.diferencia_monto IS 'Diferencia en pesos entre exógeno y operación interna';
COMMENT ON COLUMN mapeo_inconsistencias.diferencia_fecha IS 'Diferencia en días entre fechas de exógeno y operación';

-- ============================================================================
-- ÍNDICES PARA RENDIMIENTO
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_exogenos_org 
    ON exogenos(organization_id);

CREATE INDEX IF NOT EXISTS idx_exogenos_tipo 
    ON exogenos(tipo_exogeno);

CREATE INDEX IF NOT EXISTS idx_exogenos_periodo 
    ON exogenos(periodo_fiscal);

CREATE INDEX IF NOT EXISTS idx_exogenos_contribuyente 
    ON exogenos(nit_contribuyente);

CREATE INDEX IF NOT EXISTS idx_exogenos_informante 
    ON exogenos(nit_informante);

CREATE INDEX IF NOT EXISTS idx_exogenos_procesado 
    ON exogenos(procesado);

CREATE INDEX IF NOT EXISTS idx_mapeo_exogeno 
    ON mapeo_inconsistencias(exogeno_id);

CREATE INDEX IF NOT EXISTS idx_mapeo_estado 
    ON mapeo_inconsistencias(estado_validacion);

CREATE INDEX IF NOT EXISTS idx_mapeo_entidad 
    ON mapeo_inconsistencias(entidad_tipo, entidad_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE exogenos ENABLE ROW LEVEL SECURITY;
ALTER TABLE mapeo_inconsistencias ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios pueden ver exógenos de su organización
CREATE POLICY "Users can view their organization exogenos"
    ON exogenos FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

-- Política: Solo ADMIN y CONTADOR pueden importar exógenos
CREATE POLICY "Admins and accountants can import exogenos"
    ON exogenos FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid() AND role IN ('ADMIN', 'CONTADOR')
        )
    );

-- Política: Solo ADMIN y CONTADOR pueden actualizar exógenos
CREATE POLICY "Admins and accountants can update exogenos"
    ON exogenos FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid() AND role IN ('ADMIN', 'CONTADOR')
        )
    );

-- Política: Solo ADMIN puede eliminar exógenos
CREATE POLICY "Admins can delete exogenos"
    ON exogenos FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid() AND role = 'ADMIN'
        )
    );

-- Políticas para mapeo_inconsistencias
CREATE POLICY "Users can view mappings"
    ON mapeo_inconsistencias FOR SELECT
    USING (
        exogeno_id IN (
            SELECT id FROM exogenos
            WHERE organization_id IN (
                SELECT organization_id FROM organization_members
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Admins and accountants can manage mappings"
    ON mapeo_inconsistencias FOR ALL
    USING (
        exogeno_id IN (
            SELECT id FROM exogenos
            WHERE organization_id IN (
                SELECT organization_id FROM organization_members
                WHERE user_id = auth.uid() AND role IN ('ADMIN', 'CONTADOR')
            )
        )
    );

-- ============================================================================
-- FUNCIONES AUXILIARES
-- ============================================================================

-- Función para actualizar timestamp automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updated_at automáticamente
CREATE TRIGGER update_exogenos_updated_at BEFORE UPDATE ON exogenos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mapeo_updated_at BEFORE UPDATE ON mapeo_inconsistencias
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
