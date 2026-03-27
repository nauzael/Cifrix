# Diseño: Reporte de Renovación Cámara de Comercio (RUES)

**Fecha**: 2026-03-26  
**Estado**: Validado por el Usuario  
**Propósito**: Generar un resumen financiero automático para la renovación mercantil (RUES) con corte al 31 de diciembre del año anterior, facilitando el copiado de datos al portal oficial.

## 1. Contexto y Objetivos

Para la renovación anual de la matrícula mercantil en Colombia, las empresas deben reportar datos financieros específicos del año inmediatamente anterior. Este reporte consolida la información del Balance General y el Estado de Resultados en un formato de "casillas" que coinciden con el formulario RUES.

## 2. Arquitectura de Datos

Se implementará lógica de clasificación basada en códigos PUC estándar:

### A. Situación Financiera (Corte al 31 de Diciembre)
*   **Activo Corriente**: Cuentas que inician con 11 (Disponible), 12 (Inversiones), 13 (Deudores), 14 (Inventarios).
*   **Activo No Corriente**: Resto de la clase 1 (Propiedades, Planta y Equipo, Intangibles, etc.).
*   **Pasivo Corriente**: Cuentas que inician con 21 (Obligaciones Financieras), 22 (Proveedores), 23 (Cuentas por Pagar), 24 (Impuestos), 25 (Laborales).
*   **Pasivo No Corriente**: Resto de la clase 2.
*   **Patrimonio Neto**: Clase 3.

### B. Estado de Resultados (Periodo del 01 de Enero al 31 de Diciembre)
*   **Ingresos Actividades Ordinarias**: Clase 41.
*   **Otros Ingresos**: Clase 42.
*   **Costo de Ventas**: Clase 6.
*   **Gastos de Administración**: Clase 51.
*   **Gastos de Venta**: Clase 52.
*   **Gastos Financieros**: Clase 5305.
*   **Utilidad/Pérdida Neta**: Consolidado de (Ingresos - Gastos - Costos).

## 3. Componentes de Interfaz (UI/UX)

Se creará una nueva pestaña en el módulo de Estados Financieros:

*   **Pestaña**: "Cámara de Comercio (RUES)".
*   **Vista**: Cuadrícula de tarjetas (Cards) por cada campo del formulario.
*   **Funcionalidades**:
    *   **Botón Copiar**: Cada card tendrá un botón para copiar el valor numérico "limpio" (ej. `15000000` en lugar de `$ 15.000.000`) para facilitar el pegado en el portal web.
    *   **Indicador de Año**: Mostrará claramente "Datos para la renovación 2026 (Corte 31/Dic/2025)".
    *   **Validación Contable**: Indicador visual de si Activo = Pasivo + Patrimonio.
    *   **Copia Masiva**: Botón para copiar todo el resumen estructurado en texto plano.

## 4. Cambios Técnicos Requeridos

1.  **`src/lib/accounting/reports.ts`**:
    *   Añadir método `getRUESData`.
2.  **`src/components/accounting/ChamberOfCommerceReport.tsx`**:
    *   Nuevo componente para renderizar la cuadrícula de tarjetas.
3.  **`src/store/accountingStore.ts`**:
    *   Añadir el tipo de reporte `rues` al estado global.
4.  **`src/components/accounting/FinancialStatements.tsx`**:
    *   Integrar la nueva pestaña y renderizar el componente condicionalmente.

## 5. Pruebas y Validación
*   Verificar que los totales del RUES coincidan con el Balance General estándar generado para el mismo periodo.
*   Validar el copiado de portapapeles en diferentes sistemas operativos.
*   Verificar el comportamiento cuando no existen transacciones en el año anterior.
