# Homologación Formatos DIAN ↔ PUC colombiano

Este documento establece la correspondencia entre los formatos de información exógena requeridos por la DIAN y las cuentas del Plan Único de Cuentas (PUC) colombiano.

---

## Formato 1001 - Pagos o Abonos en Cuenta y Retenciones Practicadas

**Propósito:** Reportar los pagos o abonos en cuenta realizados a terceros durante el año gravable, junto con las retenciones en la fuente practicadas.

### Cuentas PUC a Utilizar

| Código PUC | Nombre Cuenta | Código DIAN | Concepto Exógeno |
|------------|---------------|-------------|------------------|
| **2205** | Proveedores | R1301 | Pagos por servicios |
| **2207** | Cuentas por Pagar | R1301 | Servicios varios |
| **2365** | Retención en la Fuente | R1301-X | Retención servicios |
| **2367** | Retención IVA | R1301-I | Retención IVA |
| **5111** | Gastos de Personal | R4902 | Salarios |
| **5120** | Servicios | R1301 | Honorarios |
| **5125** | Arrendamientos | R1304 | Arrendamientos |
| **5135** | Mantenimiento y Reparaciones | R1305 | Mantenimiento |
| **5145** | Servicios Públicos | R1307 | Servicios públicos |
| **5155** | Seguros | R1308 | Seguros |
| **5195** | Diversos | R1399 | Otros pagos deducibles |
| **5200** | Costo de Ventas | R1401 | Compras |
| **5305** | Gastos Financieros | R4200 | Intereses |
| **5310** | Comisiones | R1303 | Comisiones |

### Detalle por Concepto DIAN

| Código DIAN | Descripción | Cuenta Principal | Cuenta Retención |
|-------------|-------------|------------------|------------------|
| R1301 | Servicios profesionales y técnicos | 2205/2207 | 2365 (10%) |
| R1302 | Servicios de consultoría | 2205/2207 | 2365 (10%) |
| R1303 | Comisiones | 2205 | 2365 (10%) |
| R1304 | Arrendamientos | 2205/5125 | 2365 (2.5%) |
| R1305 | Mantenimiento y reparaciones | 2205 | 2365 (10%) |
| R1306 | Publicidad | 2205 | 2365 (10%) |
| R1307 | Servicios públicos | 2205 | - |
| R1308 | Seguros | 2205/5155 | 2365 (1.5%) |
| R1309 | viáticos | 2205 | 2365 (10%) |
| R1399 | Otros pagos | 2205/5195 | 2365 según caso |
| R4100 | Devoluciones en venta | 4135 | - |
| R4200 | Intereses | 5305 | 2365 (7%) |
| R4902 | Salarios | 5111 | 2362 (no aplica retefuente) |

---

## Formato 1003 - Retenciones en la Fuente que le Practicaron

**Propósito:** Reportar las retenciones en la fuente que le practicaron a la empresa como beneficiario de pagos.

### Cuentas PUC a Utilizar

| Código PUC | Nombre Cuenta | Descripción |
|------------|---------------|-------------|
| **1350** | Anticipo de Impuestos | Saldo a favor por retenciones |
| **1355** | Retención en la Fuente | Retenciones aplicadas a la empresa |
| **2360** | Retención en la Fuente por Pagar | Retenciones que practicó la empresa |
| **2365** | Retención en la Fuente | Detalle de retenciones |

### Mapeo por Tipo de Ingreso

| Código DIAN | Concepto | Cuenta que Recibe |
|-------------|----------|-------------------|
| R1301 | Por servicios recibidos | 2360-01 |
| R4100 | Por ingresos por ventas | 2360-02 |
| R4200 | Por intereses | 2360-03 |
| R4400 | Por dividendos | 2360-04 |

---

## Formato 1004 - Descuentos Tributarios Solicitados

**Propósito:** Reportar los descuentos tributarios solicitados en la declaración de renta.

### Cuentas PUC a Utilizar

| Código PUC | Nombre Cuenta | Descripción |
|------------|---------------|-------------|
| **2408** | Impuesto sobre las Ventas | IVA descontable |
| **5115** | Donaciones | Descuentos tributarios |
| **5116** | Inversiones | Descuentos por inversión |
| **5120** | ICA | Descuentos por impuestos |

---

## Formato 1005 - Impuesto a las Ventas Descontable (IVA)

**Propósito:** Reportar el IVA descontable provenientes de compras.

### Cuentas PUC a Utilizar

| Código PUC | Nombre Cuenta | Descripción |
|------------|---------------|-------------|
| **240801** | IVA Descontable Generado | IVA en compras |
| **240802** | IVA Descontable por Remesas | IVA en remesas |
| **240803** | IVA Descontable - Imports | IVA en importaciones |
| **2205** | Proveedores | Base IVA en compras |
| **1516** |Importaciones en Tránsito |IVA en importaciones|

### Detalle

| Concepto | Cuenta Débito | Cuenta Crédito |
|----------|---------------|----------------|
| Compras con IVA | 240801 | 2205 |
| Importaciones | 240803 | 1516 |
| Remesas recibidas | 240802 | 2205 |

---

## Formato 1006 - Impuesto a las Ventas Generado (IVA)

**Propósito:** Reportar el IVA generado por ventas.

### Cuentas PUC a Utilizar

| Código PUC | Nombre Cuenta | Descripción |
|------------|---------------|-------------|
| **240805** | IVA Generado - Ventas | IVA por ventas |
| **240806** | IVA Generado - Servicios | IVA por servicios |
| **240807** | IVA Generado - Exports | IVA por exportaciones |
| **1305** | Clientes | Base IVA en ventas |
| **4135** | Devoluciones en Ventas | IVA en devoluciones |

---

## Formato 1007 - Ingresos Recibidos

**Propósito:** Reportar los ingresos recibidos por la empresa.

### Cuentas PUC a Utilizar

| Código PUC | Nombre Cuenta | Código DIAN | Concepto |
|------------|---------------|-------------|----------|
| **4105** | Ingresos por Ventas | R4100 | Ventas de bienes |
| **4115** | Ingresos por Servicios | R4110 | Servicios |
| **4120** | Ingresos por Trabajo | R4120 | Arrendamientos |
| **4135** | Devoluciones en Ventas | R4100 | (Negativo) |
| **4145** | Ingresos Financieros | R4200 | Intereses |
| **4210** | Dividendos | R4400 | Dividendos |
| **4220** | Comisiones | R4300 | Comisiones |
| **4235** | Arrendamientos | R4120 | Arrendamientos |
| **4290** | Otros Ingresos | R4195 | Otros ingresos |
| **1305** | Clientes | - | Cartera (base) |

### Detalle por Concepto DIAN

| Código DIAN | Descripción | Cuenta PUC |
|-------------|-------------|------------|
| R4100 | Ingresos por ventas de bienes | 4105 |
| R4110 | Ingresos por servicios | 4115 |
| R4111 | Servicios educativos | 4115 |
| R4112 | Servicios de salud | 4115 |
| R4120 | Ingresos por trabajo | 4120 |
| R4195 | Otros ingresos | 4290 |
| R4200 | Intereses financieros | 4145 |
| R4300 | Comisiones | 4220 |
| R4400 | Dividendos y participaciones | 4210 |

---

## Formato 1008 - Cuentas por Cobrar al 31 de Diciembre

**Propósito:** Reportar las cuentas por cobrar a terceros a cierre del año.

### Cuentas PUC a Utilizar

| Código PUC | Nombre Cuenta | Descripción |
|------------|---------------|-------------|
| **1305** | Deudores por Ventas | Cartera clientes |
| **1310** | Clientes | Facturas por cobrar |
| **1315** | Cuentas Corrientes | Clientes corrientes |
| **1320** | Anticipos | Anticipos de clientes |
| **1380** | Deudores Varios | Otros deudores |
| **1385** | Deuderos Incobrables | Provisión cartera |
| **1390** | Préstamos a Empleados | Préstamos |

### Mapeo por Antigüedad

| Concepto | Cuenta PUC | Código DIAN |
|----------|------------|-------------|
| Cartera hasta 360 días | 1305/1310 | R1501 |
| Cartera > 360 días | 1305-99 | R1502 |
| Anticipos | 1320 | R1503 |
| Préstamos | 1390 | R1504 |

---

## Formato 1009 - Cuentas por Pagar al 31 de Diciembre

**Propósito:** Reportar las cuentas por pagar a terceros a cierre del año.

### Cuentas PUC a Utilizar

| Código PUC | Nombre Cuenta | Descripción |
|------------|---------------|-------------|
| **2205** | Proveedores | Facturas por pagar |
| **2207** | Cuentas por Pagar | Obligaciones varias |
| **2210** | Costos por Pagar | Costos acumulado |
| **2215** | Acreedores Varios | Otros acreedores |
| **2220** | Anticipos | Anticipos recibidos |
| **2230** | Dividendos por Pagar | Dividendos pendientes |
| **2360** | Retención en la Fuente | Retenciones por pagar |

### Mapeo

| Concepto | Cuenta PUC | Código DIAN |
|----------|------------|-------------|
| Proveedores nacionales | 2205 | R1601 |
| Proveedores del exterior | 2205-99 | R1602 |
| Costos por pagar | 2210 | R1603 |
| Acreedores varios | 2215 | R1604 |
| Anticipos | 2220 | R1605 |

---

## Formato 1010 - Información de Socios, Accionistas, Comuneros y Asociados

**Propósito:** Reportar información de los propietarios de la entidad.

### Cuentas PUC a Utilizar

| Código PUC | Nombre Cuenta | Descripción |
|------------|---------------|-------------|
| **3105** | Capital Suscrito y Pagado | Capital social |
| **3110** | Aportes Extraordinarios | Aportes adicionales |
| **3115** | Prima en Colocación de Acciones | Primas |
| **3120** | Reservas | Reservas obligatorias |
| **3125** | Revalorización del Patrimonio | Revalorización |
| **3130** | Resultados del Ejercicio | Utilidades/pérdidas |
| **3140** | Resultados de Ejercicios Anteriores | Utilidades acumuladas |

### Datos a Reportar

| Campo | Cuenta PUC | Descripción |
|-------|------------|-------------|
| NIT Socio | - | Identificación |
| Nombre | - | Razón social/Nombre |
| Tipo socio | 3105/3110 | Capital/Aporte |
| Participación % | 3105 | % Capital |
| Dividendos | 2230/4210 | Dividendos pagados |
| Primas | 3115 | Prima en colocación |

---

## Formato 1012 - Información de Arrendatarios

**Propósito:** Reportar información de pagos a arrendadores de inmuebles.

### Cuentas PUC a Utilizar

| Código PUC | Nombre Cuenta | Descripción |
|------------|---------------|-------------|
| **5125** | Gastos de Arrendamiento | Pagos por rentals |
| **2205** | Arrendadores | Obligaciones por rentar |
| **2365** | Retención Arrendamiento | Retención 2.5% |

### Detalle

| Código DIAN | Descripción | Cuenta PUC |
|-------------|-------------|------------|
| R1304 | Arrendamientos | 5125 |
| R1304-RET | Retenciónarrendamiento | 2365 |

---

## Formato 2276 - Información de Ingresos y Retenciones por Rentas de Trabajo y Pensiones (Nómina Electrónica)

**Propósito:** Reportar información de nómina electrónica.

### Cuentas PUC a Utilizar

| Código PUC | Nombre Cuenta | Descripción |
|------------|---------------|-------------|
| **5105** | Gastos de Personal | Salarios |
| **5110** | Auxilio de Transporte | Auxilio |
| **5115** | bonificaciones | bonificaciones |
| **5120** | Horas Extras | Recargos |
| **5130** | Prima de Servicios | Prima legal |
| **5135** | Vacaciones | Vacaciones |
| **5140** | Cesantías | Cesantías |
| **5145** | Intereses sobre Cesantías | Intereses |
| **5155** | Aportes a Seguridad Social | Salud/Pensión |
| **2360** | Retención por Pagar | Retefte nómina |
| **2365** | Retención en la Fuente | Reteftetrabajador |

### Detalle por Concepto

| Código DIAN | Concepto | Cuenta PUC |
|-------------|----------|------------|
| R4901 | Salario | 5105 |
| R4902 | Auxilio de transporte | 5110 |
| R4903 | bonificación | 5115 |
| R4904 | Prima legal | 5130 |
| R4905 | Vacaciones | 5135 |
| R4906 | Cesantías | 5140 |
| R4907 | Intereses cesantías | 5145 |
| R4908 | Salud | 5155 |
| R4909 | Pensión | 5155 |
| R4910 | Riesgos laborales | 5155 |

---

## Formato 2516 - Conciliación Fiscal

**Propósito:** Reportar la conciliación entre la utilidad contable y la renta gravable.

### Cuentas PUC a Utilizar

| Código PUC | Nombre Cuenta | Descripción |
|------------|---------------|-------------|
| **5905** | Ganancia (Pérdida) | Resultado del ejercicio |
| **5900** | Pérdida del Ejercicio | Pérdida del periodo |
| **5100-5200** | Gastos/Costos | Partidas deducibles |
| **4100** | Ingresos | Partidas gravables |
| **2408** | IVA | IVA |
| **2305** | Provisiones | Provisiones deducibles |

### Estructura de Conciliación

| Concepto | Cuenta PUC | Campo Formato |
|----------|------------|---------------|
| Utilidad contable | 5905 | Base |
| (+) Gastos no deducibles | 5111-5195 | Adiciones |
| (-) Ingresos no gravables | 4100-4200 | Exclusiones |
| (-) Costos deducibles | 5200 | Deducciones |
| (=) Renta gravable | - | Resultado |

---

## Resumen de Homologación

| Formato | Cuentas Principales |
|---------|-------------------|
| 1001 | 2xxx (Pasivos), 5xxx (Gastos), 2365 |
| 1003 | 1355, 2360 |
| 1004 | 2408, 5115, 5116 |
| 1005 | 240801-240803 |
| 1006 | 240805-240807 |
| 1007 | 4xxx (Ingresos) |
| 1008 | 1xxx (Activos) |
| 1009 | 2xxx (Pasivos) |
| 1010 | 3xxx (Patrimonio) |
| 1012 | 5125 |
| 2276 | 5xxx (Gastos personal) |
| 2516 | 5xxx, 4xxx, 5905 |

---

## Notas Importantes

1. **Código único por empresa:** Cada empresa puede tener su propio plan de cuentas derivado del PUC, por lo que se recomienda validar la homologación.

2. **Retenciones:** Las cuentas de retención (2365, 2367) deben detallarse por tipo de retención según el concepto DIAN.

3. **Año gravable:** Los saldos deben corresponder al año gravable reportado (ej: AG 2025 = saldo a 31 Dic 2025).

4. **Monto mínimo:** Los terceros con operaciones menores a 3 UVT pueden reportarse en forma agregada.
