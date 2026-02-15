# Plan de Desarrollo: Módulo de Declaraciones de Renta y Exógenos

**Documento técnico para desarrollo de software de contabilidad colombiana**

---

## Tabla de Contenidos

1. [Análisis de Requerimientos Funcionales](#1-análisis-de-requerimientos-funcionales)
2. [Arquitectura General del Sistema](#2-arquitectura-general-del-sistema)
3. [Stack Tecnológico Recomendado](#3-stack-tecnológico-recomendado)
4. [Módulos Principales Detallados](#4-módulos-principales-detallados)
5. [Base de Datos - Esquema Principal](#5-base-de-datos---esquema-principal)
6. [Algoritmos Clave](#6-algoritmos-clave)
7. [Consideraciones de Seguridad](#7-consideraciones-de-seguridad)
8. [Fases de Implementación](#8-fases-de-implementación)

---

## 1. Análisis de Requerimientos Funcionales

### Módulo de Declaración de Renta

- Captura de ingresos (salarios, honorarios, rentas, dividendos)
- Gestión de costos y gastos deducibles
- Cálculo automático de impuestos
- Generación de formatos DIAN (XML/JSON)
- Validación de reglas tributarias
- Gestión de activos y pasivos
- Generación de reportes en PDF

### Módulo de Exógenos

- Lectura y procesamiento de datos de terceros
- Mapeo automático con operaciones internas
- Generación de reportes exógenos por tipo (0210, 0220, 0230, etc.)
- Validación de consistencia con declaración
- Alertas de inconsistencias
- Exportación en formatos DIAN

---

## 2. Análisis de Archivo Exógena (Excel)

### Estructura del Archivo "Reporte de Exógena"
Basado en el análisis de `reporteExogena2024.xlsx`:

- **Formato:** Excel (.xlsx)
- **Hoja Principal:** "Reporte"
- **Encabezados:** Fila 14 (índice 13 en base 0)
- **Datos:** A partir de la fila 20 (índice 19 en base 0)

### Columnas Identificadas
1. **NIT** (Index 0): NIT del reportante.
2. **Nombre / Razón Social** (Index 1): Nombre del reportante (e.g., Bancos, Empresas).
3. **NIT** (Index 2): NIT del contribuyente (usuario).
4. **Nombre/Razón Social reportada** (Index 3): Nombre del contribuyente según el reporte.
5. **Detalle** (Index 4): Descripción del concepto (e.g., "Saldo CDT", "Retención por servicios").
6. **Valor** (Index 5): Monto monetario.
7. **Uso declaración Sugerida** (Index 6): **CAMPO CLAVE**. Contiene códigos de renglón de la declaración sugerida (e.g., "R29 Patrimonio bruto", "R58 Ingresos brutos").
8. **Información Adicional** (Index 7): Detalles extra.

### Mapeo Preliminar (Códigos de Renglón detectados)
| Código | Concepto | Destino en Sistema |
|--------|----------|--------------------|
| **R29** | Patrimonio Bruto | `ActivoPasivoRenta` (Tipo: ACTIVO) |
| **R30** | Deudas | `ActivoPasivoRenta` (Tipo: PASIVO) |
| **R43** | Honorarios/Servicios | `IngresoRenta` (Tipo: HONORARIOS) |
| **R58** | Rentas de Capital | `IngresoRenta` (Tipo: CAPITAL) |
| **R59** | Ingresos no constitutivos | `IngresoRenta` (Campo: es_no_constitutivo) |
| **R74** | Rentas no laborales | `IngresoRenta` (Tipo: OTROS/OPERACIONAL) |
| **R132**| Retenciones año gravable | `IngresoRenta.retencion_aplicada` o `Deduccion/Credito` |
| **Tope X** | Información de Control | Informativo para obligación de declarar |

---

## 3. Arquitectura General del Sistema

```
┌─────────────────────────────────────────────────────────┐
│                   INTERFAZ DE USUARIO                    │
│           (Web - React/Angular, Desktop - Electron)      │
└────────────┬────────────────────────────────────┬────────┘
             │                                    │
     ┌───────▼────────────┐            ┌──────────▼────────┐
     │  UI RENTA          │            │  UI EXÓGENOS      │
     │  - Formularios     │            │  - Dashboard      │
     │  - Reportes        │            │  - Validaciones   │
     └────────┬───────────┘            └──────────┬────────┘
             │                                    │
└────────────┴────────────────────────────────────┴──────────────┐
│                    CAPA DE NEGOCIO                             │
│  ┌──────────────────┐        ┌──────────────────────────────┐ │
│  │ Motor de Cálculo │        │ Motor de Procesamiento       │ │
│  │ - Impuestos      │        │ de Exógenos                  │ │
│  │ - Deducciones    │        │ - Validación de datos        │ │
│  │ - UVT, DTF, etc  │        │ - Mapeo automático           │ │
│  │ - Sanciones      │        │ - Detección anomalías        │ │
│  └──────────────────┘        └──────────────────────────────┘ │
│  ┌──────────────────┐        ┌──────────────────────────────┐ │
│  │ Generador Reportes          │ Generador Formatos DIAN      │ │
│  │ - PDF, Excel     │        │ - XML, JSON, TXT             │ │
│  │ - Análisis       │        │ - Validación DIAN             │ │
│  └──────────────────┘        └──────────────────────────────┘ │
└──────────────┬──────────────────────────────────┬─────────────┘
             │                                    │
┌────────────▼────────────────────────────────────▼─────────────┐
│                    CAPA DE DATOS                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐│
│  │ Base Datos   │  │ Caché        │  │ Almacenamiento       ││
│  │ PostgreSQL   │  │ Redis        │  │ Archivos (S3/Local)  ││
│  │ - Declaraciones  │  │ - Cálculos   │  │ - Reportes generados ││
│  │ - Exógenos   │  │ - Sesiones   │  │ - Archivos XML/JSON  ││
│  │ - Empresas   │  │              │  │                      ││
│  └──────────────┘  └──────────────┘  └──────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Stack Tecnológico Recomendado

### Backend

**Lenguaje:**
- **Java (Spring Boot)**: Mejor rendimiento, escalabilidad empresarial
- **Python (Django/FastAPI)**: Desarrollo más rápido, excelente para cálculos complejos

**Base de Datos:** PostgreSQL
- Soporte para JSON nativo
- Transacciones ACID confiables
- Extensiones para cálculos financieros

**Caché:** Redis
- Cálculos de impuestos precalculados
- Sesiones de usuario
- Datos de referencia (UVT, DTF)

### Frontend

- React.js con TypeScript
- State Management: Redux o Zustand
- UI Framework: Material-UI o Ant Design
- Gráficos: Chart.js o D3.js

### Integraciones

- APIs REST para conectar con DIAN (cuando esté disponible)
- Librerías de generación PDF: iText, PDFBox
- Librerías XML: Jakarta XML Binding

---

## 4. Módulos Principales Detallados

### A. Módulo de Declaración de Renta

```
DeclaracionRentaModule
├── RentaController
│   ├── crearDeclaracion()
│   ├── obtenerDeclaracion()
│   ├── actualizarDeclaracion()
│   └── eliminarDeclaracion()
│
├── RentaService
│   ├── calcularImpuestos()
│   ├── calcularDeducciones()
│   ├── validarDeclaracion()
│   ├── generarReporte()
│   └── exportarDIAN()
│
├── Models
│   ├── Declaracion (Entidad principal)
│   ├── Ingresos
│   ├── Costos
│   ├── Gastos
│   ├── Activos
│   └── Pasivos
│
└── Utils
    ├── CalculadorImpuestos
    ├── ValidadorReglasTributarias
    ├── GeneradorXML_DIAN
    └── CalculadorUVT
```

#### Flujo de Declaración

```
1. CAPTURA DE DATOS
   └─> Usuario ingresa ingresos, gastos, activos
   
2. VALIDACIÓN
   └─> Verificar reglas DIAN, rangos, formatos
   
3. CÁLCULO
   ├─> Base gravable = Ingresos - Costos - Gastos
   ├─> Impuesto = Base × Tarifa (2024: 15%, 19%, 28%, 35%, 37%, 39%, 45%)
   ├─> Deducciones especiales
   ├─> Créditos fiscales
   └─> Impuesto neto a pagar
   
4. GENERACIÓN DE REPORTES
   ├─> PDF para usuario
   ├─> XML para DIAN
   └─> JSON para validación
   
5. ALMACENAMIENTO
   └─> Base de datos + Histórico
```

### B. Módulo de Exógenos

```
ExogenosModule
├── ExogenoController
│   ├── importarExogenos()
│   ├── procesarExogenos()
│   ├── validarExogenos()
│   └── generarReporteExogenos()
│
├── ExogenoService
│   ├── parsearFormatoDIAN()
│   ├── mapearConOperacionesInternas()
│   ├── detectarInconsistencias()
│   ├── generarAlertasCumplimiento()
│   └── exportarExogenos()
│
├── Models
│   ├── Exogeno (Entidad base)
│   ├── Exogeno0210 (Ingresos)
│   ├── Exogeno0220 (Compras)
│   ├── Exogeno0230 (Ventas)
│   ├── Exogeno0240 (Movimiento Bancario)
│   ├── Exogeno0250 (Gastos)
│   └── Exogeno0260 (Inmuebles)
│
├── Procesadores
│   ├── ProcesadorBancario
│   ├── ProcesadorCompras
│   ├── ProcesadorVentas
│   └── ProcesadorInmuebles
│
└── Validadores
    ├── ValidadorConsistencia
    ├── ValidadorRangos
    └── ValidadorFormatosDIAN
```

#### Flujo de Exógenos

```
1. IMPORTACIÓN
   ├─> Carga manual (Excel, TXT, XML)
   ├─> Conexión API con entidades (Bancos, DIAN)
   └─> Lectura de archivos generados por terceros
   
2. PARSEO Y MAPEO
   ├─> Identificar tipo de exógeno
   ├─> Validar formato
   ├─> Mapear con operaciones internas
   └─> Extraer datos relevantes
   
3. VALIDACIÓN
   ├─> Verificar que exista correspondencia interna
   ├─> Validar montos y fechas
   ├─> Detectar duplicados
   └─> Generar alertas de inconsistencias
   
4. ANÁLISIS COMPARATIVO
   ├─> Comparar ingresos reportados vs declarados
   ├─> Comparar compras/ventas
   ├─> Validar saldos bancarios
   └─> Generar discrepancias
   
5. GENERACIÓN DE REPORTES
   ├─> Por tipo de exógeno
   ├─> Resumen de inconsistencias
   ├─> Recomendaciones al contador
   └─> Exportar en formato DIAN
```

---

## 5. Base de Datos - Esquema Principal

### Tabla de Declaraciones

```sql
CREATE TABLE declaraciones_renta (
    id BIGINT PRIMARY KEY,
    periodo_fiscal INT,
    cedula VARCHAR(20) UNIQUE,
    nombre_contribuyente VARCHAR(255),
    estado ENUM('BORRADOR', 'PRESENTADA', 'CORREGIDA'),
    total_ingresos DECIMAL(15,2),
    total_costos DECIMAL(15,2),
    total_gastos DECIMAL(15,2),
    base_gravable DECIMAL(15,2),
    impuesto_calculado DECIMAL(15,2),
    fecha_creacion TIMESTAMP,
    fecha_presentacion TIMESTAMP,
    JSON_generado JSONB
);
```

### Tabla de Ingresos

```sql
CREATE TABLE ingresos_renta (
    id BIGINT PRIMARY KEY,
    declaracion_id BIGINT REFERENCES declaraciones_renta,
    tipo_ingreso VARCHAR(50), -- 'LABORAL', 'HONORARIOS', 'RENTAS', 'CAPITAL'
    monto DECIMAL(15,2),
    descripcion TEXT,
    mes INT
);
```

### Tabla de Exógenos

```sql
CREATE TABLE exogenos (
    id BIGINT PRIMARY KEY,
    tipo_exogeno VARCHAR(10), -- '0210', '0220', '0230', etc.
    periodo_fiscal INT,
    cedula_reportante VARCHAR(20),
    cedula_contribuyente VARCHAR(20),
    monto DECIMAL(15,2),
    fecha_movimiento DATE,
    descripcion TEXT,
    procesado BOOLEAN,
    inconsistencia VARCHAR(255),
    FOREIGN KEY (cedula_contribuyente) REFERENCES declaraciones_renta(cedula)
);
```

### Tabla de Mapeo Operaciones-Exógenos

```sql
CREATE TABLE mapeo_inconsistencias (
    id BIGINT PRIMARY KEY,
    exogeno_id BIGINT REFERENCES exogenos,
    operacion_interna_id BIGINT,
    estado_validacion ENUM('VALIDADO', 'DISCREPANCIA', 'SIN_CORRESPONDENCIA'),
    diferencia_monto DECIMAL(15,2),
    notas TEXT,
    fecha_validacion TIMESTAMP
);
```

---

## 6. Algoritmos Clave

### Motor de Cálculo de Impuestos

```java
public class CalculadorImpuestos {
    
    public BigDecimal calcularImpuestoRenta(Declaracion declaracion) {
        // 1. Sumar ingresos
        BigDecimal totalIngresos = declaracion.getIngresos()
            .stream()
            .map(Ingreso::getMonto)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        // 2. Restar costos y gastos
        BigDecimal totalCostos = obtenerTotalCostos(declaracion);
        BigDecimal totalGastos = obtenerTotalGastos(declaracion);
        
        // 3. Base gravable
        BigDecimal baseGravable = totalIngresos
            .subtract(totalCostos)
            .subtract(totalGastos);
        
        // 4. Aplicar deducciones especiales (hasta el 100% de ingresos no laborales)
        BigDecimal deduccionesEspeciales = calcularDeducciones(declaracion);
        baseGravable = baseGravable.subtract(deduccionesEspeciales);
        
        // 5. Aplicar UVT (si aplica)
        BigDecimal minimo = obtenerUVT().multiply(new BigDecimal(0.95));
        if (baseGravable.compareTo(minimo) < 0) {
            return BigDecimal.ZERO; // No debe pagar
        }
        
        // 6. Aplicar tarifa marginal (2024)
        BigDecimal impuesto = aplicarTarifaMarginal(baseGravable);
        
        // 7. Restar créditos tributarios
        BigDecimal creditosTributarios = calcularCreditos(declaracion);
        impuesto = impuesto.subtract(creditosTributarios);
        
        return impuesto.max(BigDecimal.ZERO);
    }
    
    private BigDecimal aplicarTarifaMarginal(BigDecimal baseGravable) {
        BigDecimal uvt = obtenerUVT();
        BigDecimal impuesto = BigDecimal.ZERO;
        
        // Tramo 1: 0 a 95 UVT → 15%
        if (baseGravable.compareTo(uvt.multiply(new BigDecimal(95))) <= 0) {
            return baseGravable.multiply(new BigDecimal("0.15"));
        }
        
        // Tramo 2: 95 a 300 UVT → 19%
        // Tramo 3: 300 a 630 UVT → 28%
        // ... y así sucesivamente hasta 45%
        
        return impuesto;
    }
}
```

### Motor de Validación de Exógenos

```java
public class ValidadorExogenos {
    
    public ResultadoValidacion validarExogeno(Exogeno exogeno, 
                                              Declaracion declaracion) {
        ResultadoValidacion resultado = new ResultadoValidacion();
        
        // 1. Validar que el exógeno corresponda al período fiscal
        if (!validarPeriodo(exogeno, declaracion)) {
            resultado.addError("Período fiscal no coincide");
        }
        
        // 2. Buscar operación interna correspondiente
        List<OperacionInterna> operacionesCoincidentes = 
            buscarOperacionesCoincidentes(exogeno);
        
        // 3. Validar montos
        if (operacionesCoincidentes.isEmpty()) {
            resultado.addAdvertencia("Sin correspondencia interna");
        } else {
            BigDecimal diferencia = validarMontosYFechas(
                exogeno, 
                operacionesCoincidentes
            );
            
            if (diferencia.compareTo(BigDecimal.ZERO) != 0) {
                resultado.addDiscrepancia(
                    "Diferencia de monto: " + diferencia
                );
            }
        }
        
        // 4. Validar rangos permitidos
        if (!validarRangos(exogeno)) {
            resultado.addError("Valor fuera de rango permitido");
        }
        
        return resultado;
    }
}
```

---

## 7. Consideraciones de Seguridad

```
✓ Encriptación end-to-end para datos sensibles (RFC, salarios)
✓ HTTPS/TLS para todas las comunicaciones
✓ Autenticación multifactor
✓ Auditoría completa de cambios (quién, cuándo, qué cambió)
✓ Validación de entrada (prevenir inyección SQL)
✓ CORS configurado estrictamente
✓ Rate limiting para API
✓ Backup automatizado y cifrado
✓ Cumplimiento RGPD y normativa colombiana
✓ Acceso basado en roles (RBAC)
```

---

## 8. Fases de Implementación

| Fase | Duración | Descripción |
|------|----------|-------------|
| **Fase 1** | Semanas 1-4 | Configuración, base de datos, modelos |
| **Fase 2** | Semanas 5-8 | Backend módulo de renta |
| **Fase 3** | Semanas 9-12 | Frontend módulo de renta, reportes |
| **Fase 4** | Semanas 13-16 | Backend módulo de exógenos |
| **Fase 5** | Semanas 17-20 | Frontend exógenos, validaciones |
| **Fase 6** | Semanas 21-24 | Pruebas, integración DIAN, ajustes |

### Cronograma Total: ~6 meses

---

## Conclusiones

Este plan proporciona una arquitectura sólida y escalable para un módulo completo de declaraciones de renta y exógenos en Colombia. La modularidad del diseño permite implementación incremental y facilita futuras integraciones con sistemas DIAN.

---

**Documento generado con recomendaciones de desarrollo profesional para software contable colombiano**

*Última actualización: 2025*
