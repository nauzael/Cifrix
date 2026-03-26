# Cierre Contable Automatizado por PUC - Documento de Diseño

## Objetivo
Actualizar el servicio de cierre contable (`closing-process.ts`) para que utilice la misma lógica basada en el PUC (Plan Único de Cuentas) que el módulo de Estados Financieros, garantizando así un equilibrio matemático perfecto.

## Enfoque (Aprobado: Enfoque A - Sincronización por PUC)
El sistema actualizalo identificará las cuentas (Ingresos, Gastos, Costos) evaluando exclusivamente el primer dígito del código de la cuenta (`code[0]`), abandonando la dependencia de la propiedad manual `type`.

### Componentes Clave

#### 1. Selección de Cuentas
En lugar de filtrar cuentas usando `.and(acc => acc.type === 'INGRESO' / 'EGRESO')`, se utilizará:
*   **Ingresos:** Cuentas cuyo `code` empiece con `'4'`.
*   **Gastos y Costos:** Cuentas cuyo `code` empiece con `'5'`, `'6'` o `'7'`.

#### 2. Cálculo de Saldos
Se implementará la misma lógica de "naturaleza" validada en el componente `FinancialStatements.tsx`.
*   **Naturaleza DÉBITO (Gastos/Costos '5', '6', '7'):** `Saldo = (Total Débitos) - (Total Créditos)`
*   **Naturaleza CRÉDITO (Ingresos '4'):** `Saldo = (Total Créditos) - (Total Débitos)`

#### 3. Asiento de Cierre (Inverso)
*   **Cuentas Crédito (Ingresos):** Si saldo > 0, se crea un asiento Débito para cancelarla.
*   **Cuentas Débito (Gastos/Costos):** Si saldo > 0, se crea un asiento Crédito para cancelarla.

#### 4. Validación Preventiva (Ecuación de Cierre)
Antes de guardar el asiento en la base de datos, el sistema comparará la Utilidad Neta (Ingresos - Gastos) con la diferencia entre Cuentas Canceladas. Esto funcionará como un "fail-safe" programático para asegurar el 100% de integridad en la partida doble.

## Implementación
1.  Editar `src/lib/accounting/closing-process.ts`
2.  Refactorizar la recolección de `incomeAccounts` y `expenseAccounts`.
3.  Ajustar las llamadas a `calculateNetBalance` de acuerdo con la nueva lógica basada en el PUC.
4.  Probar el flujo de cierre con datos del periodo para certificar el cuadro en ceros.
