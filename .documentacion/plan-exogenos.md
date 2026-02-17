# Módulo de Información Exógena - Cifrix

## Descripción General

Módulo para gestionar la información exógena tributaria en dos modalidades:

1. **Modo Propio**: Generar exógeno desde la contabilidad de Cifrix
2. **Modo Externo**: Importar archivos de otros programas, validar, corregir y exportar para DIAN

---

## Dos Modos de Operación

| MODO PROPIO (Generar) | MODO EXTERNO (Importar) |
|---|---|
| Datos de Cifrix: Facturación, Pagos, Nómina, Transacciones, Miembros/Iglesia | Archivos externos: XML (DIAN), CSV, Excel (XLSX) |
| | + Balance Externo (Excel) |
| ↓ | ↓ |
| Generar Exógeno → Listo para DIAN | Importar y Validar → Corregir → Exportar para DIAN |

---

## Comparación de Modos

| Característica | Modo Propio | Modo Externo |
|----------------|-------------|--------------|
| **Origen datos** | Contabilidad Cifrix | Archivos externos |
| **Validación** | Contra datos internos | Contra Balance Externo |
| **Comparación Cifrix** | ✅ Sí | ❌ Nunca |
| **Flujo** | Generar → Exportar | Importar → Comparar → Corregir → Exportar |

---

## Flujo Completo del Sistema

```
MÓDULO EXÓGENOS

┌─────────────────────────────────────────┐
│ 1. GENERAR (Modo Propio)               │
│    → Desde Contabilidad Cifrix          │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ 2. IMPORTAR (Modo Externo)             │
│    • Exógeno (XML/CSV/Excel)           │
│    • Balance (Excel)                    │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ 3. COMPARAR                            │
│    • Exógeno vs Balance Externo         │
│    • Solo archivos externos             │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ 4. CORREGIR                            │
│    • Ajustar valores                    │
│    • Justificar diferencias            │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ 5. EXPORTAR                            │
│    • XML (MUISCA)                      │
│    • CSV / Excel                       │
│    • PDF Resumen                       │
└─────────────────────────────────────────┘
```

---

## Componentes

### 1. Importador Universal (Modo Externo)
- **Parser Multi-Formato**: Excel (.xlsx), XML DIAN, CSV
- **Mapeo de Columnas**: Interfaz configurable, preview, guardar configuraciones
- **Balance de Comprobación Externo**: Importar Excel separado

### 2. Generador (Modo Propio)
- Fuentes: Facturación → 1001/1012, Nómina → 2276, Contabilidad → 1007/1005/1004, Miembros/Iglesia
- Año gravable configurable

### 3. Validador
- **Modo Propio**: Busca en facturas, pagos, transacciones, miembros
- **Modo Externo**: Compara Exógeno vs Balance Externo (nunca vs Cifrix)

### 4. Directorio de Terceros
- Tabla: nit, nombre, tipo, obligado_exogena, tipos_exogena
- Auto-creación al importar

### 5. Gestor de Correcciones
- Tipos: Ajuste valor, Ajuste retención, Cambio concepto, Marcar válido, Ignorar
- Tracking: Historial, Usuario, Justificación

### 6. Exportador DIAN
- XML (MUISCA), CSV, Excel, PDF
- Configurable por año y tipo

---

## UI - Estructura Propuesta

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER: Exógenos [Año▼] [+Importar] [Generar] [Exportar] │
├─────────────────────────────────────────────────────────────┤
│ RESUMEN:                                                   │
│ ┌──────────┬──────────┬──────────┬──────────┐             │
│ │ 145     │ 98%      │ 12       │ $450M    │             │
│ │Terceros │Conciliad │Pendient  │ Total    │             │
│ └──────────┴──────────┴──────────┴──────────┘             │
├─────────────────────────────────────────────────────────────┤
│ TABS: [Importar] [Generar] [Terceros] [Inconsistencias]  │
│       [Exportar]                                          │
├─────────────────────────────────────────────────────────────┤
│ CONTENIDO SEGÚN TAB                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Archivos a Modificar

| Archivo | Acción |
|---------|--------|
| src/lib/exogenos/parser.ts | Modificar - Agregar Excel, mapeo columnas |
| src/lib/exogenos/generator.ts | Expandir - Todos los formatos |
| src/lib/exogenos/validator.ts | Reescribir - Ambos modos |
| src/store/exogenosStore.ts | Expandir - Estados terceros, correcciones |
| src/pages/Exogenos.tsx | Reescribir - Nueva UI con tabs |
| src/lib/db.ts | Agregar tipos |
| src/lib/exogenos/export.ts | Nuevo |
| src/lib/exogenos/balanceParser.ts | Nuevo |
| src/components/exogenos/* | Nuevos componentes |

---

## Migración BD

```sql
-- Terceros
CREATE TABLE third_parties (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  nit VARCHAR(20) NOT NULL,
  nombre TEXT NOT NULL,
  tipo_persona VARCHAR(10),
  obligado_exogena BOOLEAN DEFAULT false,
  tipos_exogena TEXT[],
  UNIQUE(organization_id, nit)
);

-- Balance Externo
CREATE TABLE exogena_balances (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  año_gravable INTEGER NOT NULL,
  nombre_archivo TEXT,
  datos JSONB,
  tercero_count INTEGER,
  total_debitos DECIMAL(15,2),
  total_creditos DECIMAL(15,2)
);

-- Líneas de Balance
CREATE TABLE exogena_balance_lines (
  id UUID PRIMARY KEY,
  balance_id UUID REFERENCES exogena_balances(id),
  nit_tercero VARCHAR(20),
  nombre_tercero TEXT,
  cuenta TEXT,
  debito DECIMAL(15,2),
  credito DECIMAL(15,2),
  saldo DECIMAL(15,2)
);

-- Correcciones
CREATE TABLE exogena_corrections (
  id UUID PRIMARY KEY,
  exogeno_id UUID REFERENCES exogenos(id),
  tipo_correccion VARCHAR(20),
  valor_anterior DECIMAL(15,2),
  valor_nuevo DECIMAL(15,2),
  justificacion TEXT,
  usuario_id UUID
);

-- Mapeos
CREATE TABLE exogena_mappings (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  nombre TEXT,
  formato VARCHAR(10),
  column_mappings JSONB
);
```

---

## Orden de Implementación

1. Parser + Mapeo de columnas (Excel/CSV)
2. Parser de Balance Externo
3. Tabla de terceros
4. Validador Modo Externo
5. Gestor de correcciones
6. Generator (Modo Propio)
7. Exportador
8. Nueva UI

---

## Notas Importantes

- **Modo Externo**: Los archivos importados **nunca** se comparan con Contabilidad Cifrix
- **Comparación Externa**: Solo Exógeno vs Balance Externo
- **Mapeo configurable**: Adapta a cualquier Excel
- **Año gravable**: Configurable (2024, 2025, 2026, etc.)
