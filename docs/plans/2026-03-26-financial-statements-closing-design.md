# Cierre Contable y Estados Financieros Directos - Documento de Diseño

## Objetivo
Simplificar la experiencia del usuario unificando la generación y visualización de Estados Financieros con el proceso de Cierre Anual en una sola pantalla. Se eliminará la necesidad de navegar a través de un "Wizard" (Asistente) multipaso.

## Enfoque (Aprobado: Enfoque A - Botón en Dashboard / Unificación)
Actualmente, existe la pestaña "Estados Fin." en el menú superior del módulo de Contabilidad que carga el componente `FinancialStatements.tsx`.
Modificaremos `FinancialStatements.tsx` para que, además de mostrar el balance interactivamente, ofrezca un botón prominente: **"Ejecutar Cierre Contable"**.

El componente `FinancialStatementsWizard.tsx` quedará obsoleto o será eliminado del flujo principal.

### Componentes Clave

#### 1. UI de FinancialStatements.tsx
*   **Sección de Filtros/Metadata:** Se añadirá una barra superior pequeña donde el usuario pueda ver el año en curso (ej. 2026).
*   **Acciones Principales:** Junto al botón actual "Vista previa / PDF", se colocará un nuevo botón: **"Ejecutar Cierre Anual"** (con un icono de candado o similar). Se usará color rojo/ámbar para denotar que es una acción crítica o destructiva.

#### 2. Lógica de Cierre
Se portará la función `handleClosing` desde el Wizard hacia `FinancialStatements.tsx`:
*   Validar la existencia de una cuenta de patrimonio (ej. `3605`) para la utilidad.
*   Llamada a `closingProcessService.performAnnualClosing(...)`.
*   Feedback visual usando `toast` tras el éxito o fallo.

#### 3. Control de Estado
*   Se añadirá una variable de estado booleana (`isClosingProcess`) para mostrar un loader en el botón de cierre y bloquear la interfaz mientras el servicio calcula los saldos y guarda el asiento final.

## Implementación
1.  Editar `src/components/accounting/FinancialStatements.tsx`.
2.  Importar `closingProcessService` y el store de autenticación (para el User ID).
3.  Añadir el botón de cierre en la fila de acciones (junto al selector Balance/P&L).
4.  Implementar la función de confirmación e invocación del cierre.
5.  Limpiar el archivo `/pages/Accounting.tsx` o menús laterales asegurando que la única vía a los Estados Financieros sea la pestaña integrada, mejorando la UX.
