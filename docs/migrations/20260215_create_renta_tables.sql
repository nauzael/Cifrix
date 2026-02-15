-- ============================================================================
-- MIGRATION: Módulo de Declaración de Renta
-- Autor: Sistema Cifrix
-- Fecha: 2026-02-15
-- Descripción: Crea las tablas necesarias para el módulo de declaración de
--              impuesto de renta según normativa colombiana
-- ============================================================================

-- Tabla principal de declaraciones de renta
CREATE TABLE IF NOT EXISTS declaraciones_renta (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    periodo_fiscal INTEGER NOT NULL,
    contribuyente_id TEXT NOT NULL,
    contribuyente_nombre TEXT NOT NULL,
    estado TEXT NOT NULL CHECK (estado IN ('BORRADOR', 'PRESENTADA', 'CORREGIDA', 'ANULADA')),
    
    -- Montos principales
    total_ingresos DECIMAL(15,2) DEFAULT 0,
    total_costos DECIMAL(15,2) DEFAULT 0,
    total_gastos DECIMAL(15,2) DEFAULT 0,
    total_deducciones DECIMAL(15,2) DEFAULT 0,
    base_gravable DECIMAL(15,2) DEFAULT 0,
    impuesto_calculado DECIMAL(15,2) DEFAULT 0,
    creditos_tributarios DECIMAL(15,2) DEFAULT 0,
    impuesto_neto DECIMAL(15,2) DEFAULT 0,
    
    -- Metadata
    fecha_creacion TIMESTAMPTZ DEFAULT NOW(),
    fecha_presentacion TIMESTAMPTZ,
    json_calculado JSONB,
    xml_dian TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(organization_id, periodo_fiscal, contribuyente_id)
);

-- Comentarios de tabla
COMMENT ON TABLE declaraciones_renta IS 'Almacena las declaraciones de impuesto de renta';
COMMENT ON COLUMN declaraciones_renta.periodo_fiscal IS 'Año fiscal de la declaración (ej: 2024)';
COMMENT ON COLUMN declaraciones_renta.estado IS 'Estado de la declaración: BORRADOR, PRESENTADA, CORREGIDA, ANULADA';
COMMENT ON COLUMN declaraciones_renta.base_gravable IS 'Base gravable después de ingresos - costos - gastos - deducciones';
COMMENT ON COLUMN declaraciones_renta.json_calculado IS 'Detalle completo del cálculo en formato JSON';
COMMENT ON COLUMN declaraciones_renta.xml_dian IS 'XML generado para presentación ante DIAN';

-- Tabla de ingresos
CREATE TABLE IF NOT EXISTS ingresos_renta (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    declaracion_id UUID NOT NULL REFERENCES declaraciones_renta(id) ON DELETE CASCADE,
    tipo_ingreso TEXT NOT NULL CHECK (tipo_ingreso IN ('LABORAL', 'HONORARIOS', 'RENTAS', 'CAPITAL', 'DIVIDENDOS', 'OTROS')),
    concepto TEXT NOT NULL,
    monto DECIMAL(15,2) NOT NULL,
    mes INTEGER CHECK (mes BETWEEN 1 AND 12),
    retencion_aplicada DECIMAL(15,2) DEFAULT 0,
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE ingresos_renta IS 'Detalle de ingresos por tipo para cada declaración';
COMMENT ON COLUMN ingresos_renta.tipo_ingreso IS 'Tipo de ingreso según clasificación DIAN';
COMMENT ON COLUMN ingresos_renta.retencion_aplicada IS 'Retención en la fuente aplicada sobre este ingreso';

-- Tabla de deducciones
CREATE TABLE IF NOT EXISTS deducciones_renta (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    declaracion_id UUID NOT NULL REFERENCES declaraciones_renta(id) ON DELETE CASCADE,
    tipo_deduccion TEXT NOT NULL CHECK (tipo_deduccion IN ('SALUD', 'EDUCACION', 'INTERESES_VIVIENDA', 'DEPENDIENTES', 'OTROS')),
    concepto TEXT NOT NULL,
    monto DECIMAL(15,2) NOT NULL,
    limite_aplicable DECIMAL(15,2),
    monto_deducido DECIMAL(15,2),
    documento_soporte TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE deducciones_renta IS 'Deducciones aplicables según normativa tributaria';
COMMENT ON COLUMN deducciones_renta.limite_aplicable IS 'Límite legal de deducción según tipo';
COMMENT ON COLUMN deducciones_renta.monto_deducido IS 'Monto efectivamente deducido (puede ser menor al monto si excede límite)';

-- Tabla de activos y pasivos
CREATE TABLE IF NOT EXISTS activos_pasivos_renta (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    declaracion_id UUID NOT NULL REFERENCES declaraciones_renta(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('ACTIVO', 'PASIVO')),
    categoria TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    valor DECIMAL(15,2) NOT NULL,
    fecha_adquisicion DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE activos_pasivos_renta IS 'Relación de activos y pasivos del contribuyente';

-- ============================================================================
-- ÍNDICES PARA RENDIMIENTO
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_declaraciones_renta_org 
    ON declaraciones_renta(organization_id);

CREATE INDEX IF NOT EXISTS idx_declaraciones_renta_periodo 
    ON declaraciones_renta(periodo_fiscal);

CREATE INDEX IF NOT EXISTS idx_declaraciones_renta_estado 
    ON declaraciones_renta(estado);

CREATE INDEX IF NOT EXISTS idx_ingresos_declaracion 
    ON ingresos_renta(declaracion_id);

CREATE INDEX IF NOT EXISTS idx_deducciones_declaracion 
    ON deducciones_renta(declaracion_id);

CREATE INDEX IF NOT EXISTS idx_activos_pasivos_declaracion 
    ON activos_pasivos_renta(declaracion_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE declaraciones_renta ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingresos_renta ENABLE ROW LEVEL SECURITY;
ALTER TABLE deducciones_renta ENABLE ROW LEVEL SECURITY;
ALTER TABLE activos_pasivos_renta ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios pueden ver declaraciones de su organización
CREATE POLICY "Users can view their organization declarations"
    ON declaraciones_renta FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

-- Política: Solo ADMIN y CONTADOR pueden crear declaraciones
CREATE POLICY "Admins and accountants can create declarations"
    ON declaraciones_renta FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid() AND role IN ('ADMIN', 'CONTADOR')
        )
    );

-- Política: Solo ADMIN y CONTADOR pueden actualizar declaraciones
CREATE POLICY "Admins and accountants can update declarations"
    ON declaraciones_renta FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid() AND role IN ('ADMIN', 'CONTADOR')
        )
    );

-- Política: Solo ADMIN puede eliminar declaraciones
CREATE POLICY "Admins can delete declarations"
    ON declaraciones_renta FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid() AND role = 'ADMIN'
        )
    );

-- Políticas similares para tablas relacionadas (ingresos, deducciones, activos)
CREATE POLICY "Users can view related income records"
    ON ingresos_renta FOR SELECT
    USING (
        declaracion_id IN (
            SELECT id FROM declaraciones_renta
            WHERE organization_id IN (
                SELECT organization_id FROM organization_members
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Admins and accountants can manage income records"
    ON ingresos_renta FOR ALL
    USING (
        declaracion_id IN (
            SELECT id FROM declaraciones_renta
            WHERE organization_id IN (
                SELECT organization_id FROM organization_members
                WHERE user_id = auth.uid() AND role IN ('ADMIN', 'CONTADOR')
            )
        )
    );

-- Políticas para deducciones
CREATE POLICY "Users can view deductions"
    ON deducciones_renta FOR SELECT
    USING (
        declaracion_id IN (
            SELECT id FROM declaraciones_renta
            WHERE organization_id IN (
                SELECT organization_id FROM organization_members
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Admins and accountants can manage deductions"
    ON deducciones_renta FOR ALL
    USING (
        declaracion_id IN (
            SELECT id FROM declaraciones_renta
            WHERE organization_id IN (
                SELECT organization_id FROM organization_members
                WHERE user_id = auth.uid() AND role IN ('ADMIN', 'CONTADOR')
            )
        )
    );

-- Políticas para activos y pasivos
CREATE POLICY "Users can view assets and liabilities"
    ON activos_pasivos_renta FOR SELECT
    USING (
        declaracion_id IN (
            SELECT id FROM declaraciones_renta
            WHERE organization_id IN (
                SELECT organization_id FROM organization_members
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Admins and accountants can manage assets"
    ON activos_pasivos_renta FOR ALL
    USING (
        declaracion_id IN (
            SELECT id FROM declaraciones_renta
            WHERE organization_id IN (
                SELECT organization_id FROM organization_members
                WHERE user_id = auth.uid() AND role IN ('ADMIN', 'CONTADOR')
            )
        )
    );
