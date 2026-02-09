# Especificación Funcional Detallada por Módulo

## 1. MÓDULO DE AUTENTICACIÓN Y USUARIOS

### 1.1 Registro de Usuario/Organización
**Flujo:**
1. Usuario accede a la pantalla de registro
2. Completa formulario con:
   - Nombre de la organización
   - Tipo (Iglesia / Empresa / Otro)
   - Nombre del administrador
   - Email
   - Contraseña (con validación de fortaleza)
   - País/Región (para configuraciones locales)
3. Sistema envía email de verificación
4. Usuario confirma email
5. Sistema crea:
   - Organización en base de datos
   - Usuario administrador principal
   - Plan de cuentas por defecto según tipo
   - Configuraciones iniciales

**Funcionalidades:**
- Validación en tiempo real (email único, contraseña fuerte)
- Opción de registro con Google/Microsoft (OAuth)
- Wizard de onboarding post-registro

### 1.2 Login
**Flujo:**
1. Usuario ingresa email y contraseña
2. Sistema valida credenciales
3. Genera token JWT con expiración
4. Redirige al dashboard
5. Guarda sesión en localStorage (PWA)

**Funcionalidades:**
- "Recordarme" para sesión persistente
- Login biométrico en móviles (fingerprint/face)
- Detección de múltiples sesiones
- Bloqueo tras 5 intentos fallidos

### 1.3 Gestión de Usuarios
**Roles predefinidos:**
- **Super Admin**: Control total
- **Administrador**: Gestión general sin eliminar organización
- **Contador**: Acceso a módulos contables, no configuración
- **Tesorero**: Registro de transacciones, visualización de reportes
- **Auditor**: Solo lectura de todo
- **Usuario básico**: Visualización limitada

**Funcionalidades:**
- Crear/editar/desactivar usuarios
- Asignar roles múltiples
- Permisos granulares por módulo:
  - Ver / Crear / Editar / Eliminar / Exportar
- Log de actividad por usuario
- Invitación por email
- Reseteo de contraseña por admin

### 1.4 Recuperación de Contraseña
**Flujo:**
1. Usuario solicita recuperación
2. Sistema envía código de 6 dígitos al email
3. Código válido por 15 minutos
4. Usuario ingresa código y nueva contraseña
5. Sistema invalida tokens anteriores

---

## 2. MÓDULO DE DASHBOARD PRINCIPAL

### 2.1 Vista General
**Componentes superiores:**
- **Selector de período**: Hoy / Esta semana / Este mes / Este año / Personalizado
- **Indicador de sincronización**: Online/Offline con último sync
- **Saludo personalizado**: "Buenos días, [Nombre]"

### 2.2 Tarjetas de KPIs (4 principales)
**KPI 1 - Balance Actual:**
- Monto grande y destacado
- Variación vs período anterior (+/- %)
- Color verde si positivo, rojo si negativo
- Minigráfico de tendencia

**KPI 2 - Ingresos del Período:**
- Total de ingresos
- Comparación con período anterior
- Cantidad de transacciones
- Categoría top de ingresos

**KPI 3 - Egresos del Período:**
- Total de egresos
- Comparación con período anterior
- Cantidad de transacciones
- Categoría top de gastos

**KPI 4 - Cuentas por Cobrar/Pagar:**
- Total pendiente
- Vencimientos próximos (próximos 7 días)
- Vencidos

### 2.3 Gráfico de Flujo de Efectivo
**Características:**
- Gráfico de líneas o barras combinadas
- Eje X: Tiempo (días/semanas/meses según período)
- Eje Y: Monto
- 3 líneas/barras:
  - Ingresos (verde)
  - Egresos (rojo/naranja)
  - Balance neto (azul)
- Interactivo: hover muestra valores exactos
- Zoom y pan en períodos largos

### 2.4 Últimas Transacciones
**Lista de 5-10 transacciones recientes:**
- Fecha
- Descripción
- Categoría (con icono)
- Monto (+ verde para ingresos, - rojo para egresos)
- Estado (pendiente/completado)
- Click para ver detalle

**Funcionalidades:**
- Botón "Ver todas" que lleva al módulo de transacciones
- Filtro rápido: Todas / Ingresos / Egresos

### 2.5 Accesos Rápidos
**Botones de acción:**
- ➕ Nueva transacción
- 📊 Ver reportes
- 👥 Registrar diezmo (si es iglesia)
- 📄 Nueva factura
- ⚙️ Configuración

### 2.6 Widgets Opcionales (configurables)
- Gráfico de gastos por categoría (dona)
- Calendario de pagos próximos
- Alertas y notificaciones
- Objetivos financieros

**Personalización:**
- Usuario puede ocultar/mostrar widgets
- Reordenar mediante drag & drop
- Guardar preferencia de vista

---

## 3. MÓDULO DE TRANSACCIONES

### 3.1 Listado de Transacciones
**Vista principal:**
- Tabla/Lista responsive
- Columnas:
  - Fecha
  - Tipo (Ingreso/Egreso con badge)
  - Descripción
  - Categoría
  - Método de pago
  - Monto
  - Estado
  - Acciones

**Funcionalidades de filtrado:**
- Por rango de fechas (date picker)
- Por tipo (Ingreso/Egreso/Todos)
- Por categoría (multiselect)
- Por método de pago
- Por estado
- Por rango de montos
- Búsqueda por texto en descripción

**Ordenamiento:**
- Por fecha (ascendente/descendente)
- Por monto
- Por categoría

**Acciones masivas:**
- Selección múltiple con checkbox
- Exportar seleccionadas
- Eliminar seleccionadas (con confirmación)
- Cambiar estado

**Paginación:**
- 20/50/100 registros por página
- Scroll infinito (opcional)

### 3.2 Registro de Nueva Transacción
**Formulario con campos:**

**Obligatorios:**
- **Tipo**: Radio buttons (Ingreso / Egreso)
- **Fecha**: Date picker (default: hoy)
- **Monto**: Input numérico con formato de moneda
- **Categoría**: Dropdown jerárquico
- **Descripción**: Textarea (máx 500 caracteres)

**Opcionales:**
- **Método de pago**: Dropdown (Efectivo, Transferencia, Tarjeta, Cheque, Otro)
- **Referencia/Número**: Input texto
- **Comprobante**: Upload de archivo (imagen/PDF, máx 5MB)
- **Cuenta contable**: Autocompletar del plan de cuentas
- **Proyecto**: Si aplica (para iglesias: campañas específicas)
- **Notas internas**: Textarea

**Características:**
- Validación en tiempo real
- Cálculo automático de balance proyectado
- Sugerencias de categoría basadas en descripción (IA opcional)
- Opción de "Repetir transacción" (para recurrentes)
- Guardar como borrador
- Programar para fecha futura

**Flujo:**
1. Usuario completa formulario
2. Sistema valida datos
3. Muestra resumen de transacción
4. Usuario confirma
5. Sistema:
   - Guarda en base de datos
   - Actualiza balance
   - Genera asiento contable automático
   - Guarda comprobante en storage
   - Registra en auditoría
6. Muestra confirmación con opción de:
   - Ver transacción
   - Agregar otra
   - Volver al listado

### 3.3 Detalle de Transacción
**Vista modal o página:**
- Todos los datos de la transacción
- Comprobante adjunto (preview)
- Información de auditoría:
  - Creado por
  - Fecha de creación
  - Última modificación
  - Modificado por
- Asiento contable generado
- Comentarios/notas

**Acciones disponibles:**
- Editar (según permisos)
- Eliminar (con confirmación y justificación)
- Duplicar
- Descargar comprobante
- Compartir (generar PDF)
- Agregar comentario

### 3.4 Edición de Transacción
**Reglas:**
- Solo usuarios con permiso pueden editar
- No se puede editar si el período está cerrado
- Se registra log de cambios (auditoría)
- Muestra diff de cambios antes de confirmar

**Campos editables:**
- Todos excepto ID y usuario creador
- Si cambia monto o cuenta, recalcula balance
- Si cambia fecha a período cerrado, solicita autorización especial

### 3.5 Transacciones Recurrentes
**Configuración:**
- Crear plantilla de transacción
- Frecuencia: Diaria / Semanal / Quincenal / Mensual / Anual
- Fecha de inicio
- Fecha de fin o número de repeticiones
- Opción de ajuste automático (ejemplo: fin de mes)

**Funcionamiento:**
- Cron job diario verifica transacciones pendientes
- Crea automáticamente según programación
- Notifica al usuario
- Usuario puede confirmar/modificar antes de guardar
- Log de transacciones generadas automáticamente

---

## 4. MÓDULO DE CATEGORÍAS

### 4.1 Gestión de Categorías
**Estructura jerárquica:**
- Categorías padre
- Subcategorías (hasta 3 niveles)

**Categorías predefinidas (Ingresos):**
- Ventas
  - Productos
  - Servicios
- Diezmos (para iglesias)
- Ofrendas (para iglesias)
  - Especiales
  - Misiones
  - Construcción
- Donaciones
- Inversiones
- Otros ingresos

**Categorías predefinidas (Egresos):**
- Operativos
  - Servicios públicos
  - Arriendo
  - Salarios
  - Suministros
- Ministeriales (para iglesias)
  - Misiones
  - Eventos
  - Ayuda social
- Administrativos
- Impuestos
- Otros egresos

**Funcionalidades:**
- Crear categoría personalizada
- Editar nombre y descripción
- Asignar icono (librería predefinida)
- Asignar color
- Activar/desactivar (no eliminar si tiene transacciones)
- Mover entre categorías padre
- Ordenar manualmente

### 4.2 Asignación Automática
**IA/Reglas:**
- Palabras clave → Categoría
- Ejemplo: "pago luz" → Servicios Públicos
- Usuario puede entrenar el sistema
- Aprende de correcciones manuales

---

## 5. MÓDULO ESPECÍFICO PARA IGLESIAS

### 5.1 Gestión de Miembros
**Registro de miembro:**
- Datos personales:
  - Nombre completo
  - Número de identificación
  - Fecha de nacimiento
  - Email
  - Teléfono
  - Dirección
- Datos ministeriales:
  - Fecha de ingreso a la iglesia
  - Fecha de bautismo
  - Ministerio/Grupo
  - Estado (Activo/Inactivo)
- Foto (opcional)

**Funcionalidades:**
- Búsqueda rápida por nombre/ID
- Filtros: Activos/Inactivos, Por ministerio
- Exportar listado
- Importar desde Excel/CSV
- Historial de contribuciones por miembro
- Generar certificado de donaciones (para impuestos)

### 5.2 Registro de Diezmos y Ofrendas
**Formulario específico:**
- **Selección de miembro**: Autocompletar con búsqueda
- **Tipo**: Diezmo / Ofrenda
- **Subtipo** (si es ofrenda):
  - Ofrenda regular
  - Ofrenda especial (especificar proyecto)
  - Misiones
  - Construcción
  - Dorcas/Ayuda social
  - Otro
- **Fecha de contribución**
- **Monto**
- **Método de pago**
- **Número de sobre** (si aplica)
- **Comprobante**
- **Notas**

**Funcionalidades especiales:**
- Registro rápido durante servicio (modo express)
- Registro por lotes (múltiples contribuciones a la vez)
- Opción de anónimo (para ofrendas sin identificar)
- Envío automático de recibo por email
- Compromiso de fe:
  - Monto comprometido
  - Período
  - Seguimiento de cumplimiento
  - Recordatorios automáticos

### 5.3 Reportes para Iglesias
**Reportes específicos:**

**Reporte de Diezmos:**
- Por miembro (individual)
- General (todos los miembros)
- Comparativo mensual/anual
- Miembros que diezmaron vs total de miembros
- Promedio de diezmo

**Reporte de Ofrendas:**
- Por proyecto/destino
- Evolución temporal
- Ofrendas especiales destacadas

**Certificado de Donaciones:**
- Generación automática anual
- Formato fiscal válido
- Desglose por tipo de contribución
- Exportar PDF personalizado por miembro

**Compromiso de Fe:**
- Listado de compromisos activos
- Seguimiento de cumplimiento (%)
- Alertas de compromisos vencidos
- Proyección de ingresos futuros

### 5.4 Proyectos Especiales
**Gestión de campañas:**
- Crear proyecto (ej: "Construcción templo", "Misión África")
- Meta financiera
- Fecha inicio y fin
- Descripción y fotos
- Tracking de progreso visual (barra de progreso)
- Contribuciones asignadas al proyecto
- Reportes de gastos del proyecto
- Estado: Activo / Completado / Cancelado

**Visualización pública (opcional):**
- URL compartible
- Dashboard público de progreso
- Donaciones online integradas (si hay pasarela)

---

## 6. MÓDULO CONTABLE AVANZADO

### 6.1 Plan de Cuentas
**Estructura:**
- Clasificación estándar:
  - 1. Activos
    - 1.1 Activos corrientes
    - 1.2 Activos no corrientes
  - 2. Pasivos
    - 2.1 Pasivos corrientes
    - 2.2 Pasivos no corrientes
  - 3. Patrimonio
  - 4. Ingresos
  - 5. Gastos
  - 6. Costos

**Funcionalidades:**
- Ver árbol completo de cuentas
- Crear cuenta nueva
  - Código (numérico o alfanumérico)
  - Nombre
  - Tipo (Activo/Pasivo/etc)
  - Nivel (cuenta padre o subcuenta)
  - Naturaleza (Deudora/Acreedora)
  - Acepta movimiento (Sí/No - las cuentas padre generalmente no)
- Editar cuenta (si no tiene movimientos o con autorización)
- Desactivar cuenta
- Importar plan de cuentas desde plantilla
- Exportar plan actual

**Plantillas predefinidas:**
- Plan de cuentas para iglesias
- Plan de cuentas comercial básico
- Plan de cuentas servicios
- Plan de cuentas según normativa local (Colombia - PUC)

### 6.2 Asientos Contables
**Creación manual:**
- Número de comprobante (autoincremental)
- Fecha
- Tipo de comprobante (Diario, Ingreso, Egreso, Ajuste)
- Descripción general
- Líneas del asiento:
  - Cuenta (autocompletar)
  - Débito
  - Crédito
  - Descripción de línea
  - Centro de costo (opcional)
- Validación: Σ Débitos = Σ Créditos
- Adjuntar comprobante
- Estado: Borrador / Confirmado

**Creación automática:**
- Al registrar transacción simple (ingreso/egreso):
  - Sistema genera asiento automático
  - Configurable: mapeo Categoría → Cuenta contable
- Al registrar factura
- Al hacer conciliación bancaria
- Al registrar depreciación

**Funcionalidades:**
- Listar asientos con filtros:
  - Por fecha
  - Por tipo
  - Por cuenta
  - Por usuario
- Ver detalle de asiento
- Editar borrador
- Eliminar borrador
- Anular asiento confirmado (genera asiento de reversa)
- Duplicar asiento
- Exportar a Excel

**Asientos recurrentes:**
- Plantillas de asientos repetitivos
- Programación automática (mensual, anual)
- Ejemplos: depreciación, amortización, provisiones

### 6.3 Libro Mayor
**Visualización:**
- Seleccionar cuenta
- Rango de fechas
- Tabla con movimientos:
  - Fecha
  - Comprobante
  - Descripción
  - Débito
  - Crédito
  - Saldo
- Saldo inicial del período
- Totales de débitos y créditos
- Saldo final

**Funcionalidades:**
- Ver movimiento contable completo (click en línea)
- Exportar a PDF/Excel
- Imprimir
- Gráfico de evolución de saldo

### 6.4 Balance de Comprobación
**Generación:**
- Seleccionar período
- Muestra todas las cuentas con movimiento
- Columnas:
  - Código de cuenta
  - Nombre de cuenta
  - Saldo anterior débito
  - Saldo anterior crédito
  - Movimiento débito
  - Movimiento crédito
  - Saldo actual débito
  - Saldo actual crédito
- Totales verificados (cuadre contable)

**Funcionalidades:**
- Filtrar por nivel de cuenta (1, 2, 3 dígitos)
- Mostrar solo cuentas con saldo
- Comparativo entre períodos
- Exportar a Excel
- Imprimir formato oficial

### 6.5 Estados Financieros

**Balance General:**
- Estructura:
  - Activos (Corrientes + No Corrientes)
  - Pasivos (Corrientes + No Corrientes)
  - Patrimonio
- Validación: Activos = Pasivos + Patrimonio
- Comparativo con período anterior
- Análisis horizontal (variación %)
- Análisis vertical (% sobre total)
- Gráficos:
  - Composición de activos
  - Composición de pasivos
  - Ratios financieros básicos

**Estado de Resultados:**
- Estructura:
  - Ingresos operacionales
  - Costos
  - Gastos operacionales
  - Utilidad operacional
  - Ingresos/gastos no operacionales
  - Utilidad antes de impuestos
  - Impuestos
  - Utilidad neta
- Comparativo multiperíodo
- Gráfico de evolución de utilidad
- Márgenes (bruto, operacional, neto)

**Flujo de Efectivo:**
- Métodos: Directo / Indirecto
- Clasificación:
  - Actividades operativas
  - Actividades de inversión
  - Actividades de financiación
- Conciliación con saldo de caja y bancos

**Cambios en el Patrimonio:**
- Capital inicial
- Aportes/retiros
- Utilidad/pérdida del período
- Capital final

**Notas a los Estados Financieros:**
- Campo de texto rico para notas explicativas
- Referencias cruzadas

**Funcionalidades generales:**
- Generación automática desde contabilidad
- Selector de período flexible
- Exportar a PDF (formato formal)
- Exportar a Excel (análisis)
- Programar generación automática (mensual/trimestral)
- Envío automático por email a stakeholders
- Comparación entre períodos (lado a lado)
- Drill-down: click en cuenta → ver detalle

### 6.6 Conciliación Bancaria
**Proceso:**
1. Seleccionar cuenta bancaria
2. Seleccionar mes a conciliar
3. Ingresar saldo según extracto bancario
4. Sistema muestra:
   - Saldo en libros
   - Movimientos no conciliados
   
**Conciliación:**
- Lista de movimientos del banco (importar extracto o manual)
- Lista de movimientos en libros
- Marcar movimientos que coinciden (matching manual o automático)
- Identificar:
  - Partidas en libros no en banco (cheques en tránsito, depósitos no registrados)
  - Partidas en banco no en libros (cargos bancarios, notas débito/crédito)
- Crear ajustes necesarios
- Cuadre final: Saldo libros + Ajustes = Saldo banco + Pendientes

**Funcionalidades:**
- Importar extracto bancario (CSV, Excel, PDF con OCR)
- Matching automático por monto y fecha (rango ±3 días)
- Sugerencias de ajustes comunes
- Historial de conciliaciones
- Reportes de partidas recurrentes sin conciliar
- Alertas de diferencias significativas

---

## 7. MÓDULO DE FACTURACIÓN (Opcional avanzado)

### 7.1 Clientes
**Gestión:**
- Datos básicos (nombre, NIT/ID, dirección, contacto)
- Términos de pago (contado, 30 días, etc)
- Límite de crédito
- Estado de cuenta
- Historial de facturas
- Notas

### 7.2 Creación de Facturas
**Formulario:**
- Número de factura (autoincremental con prefijo configurable)
- Cliente (autocompletar)
- Fecha de emisión
- Fecha de vencimiento
- Items:
  - Descripción
  - Cantidad
  - Precio unitario
  - % Descuento
  - % Impuesto
  - Subtotal
- Notas/Términos
- Método de pago

**Cálculos automáticos:**
- Subtotal
- Descuentos
- Impuestos (IVA, retenciones)
- Total

**Funcionalidades:**
- Plantillas de factura (diseño personalizable)
- Facturas recurrentes
- Envío automático por email
- Recordatorios de pago
- Registro de pagos parciales
- Notas de crédito/débito
- Estados: Borrador / Enviada / Pagada / Vencida / Anulada

### 7.3 Cuentas por Cobrar
**Dashboard:**
- Total por cobrar
- Vencido por antigüedad (0-30, 31-60, 61-90, +90 días)
- Próximos vencimientos
- Clientes con mayor deuda

**Gestión de cobranza:**
- Envío automático de recordatorios
- Notas de gestión de cobranza
- Reportes de cartera

---

## 8. MÓDULO DE REPORTES Y ANÁLISIS

### 8.1 Constructor de Reportes Personalizados
**Interfaz drag & drop:**
- Seleccionar fuente de datos:
  - Transacciones
  - Cuentas contables
  - Miembros (iglesias)
  - Facturas
- Campos disponibles para incluir
- Filtros personalizados
- Agrupaciones
- Ordenamiento
- Cálculos (sumas, promedios, conteos)

**Visualizaciones:**
- Tabla
- Gráficos (líneas, barras, dona, dispersión)
- KPIs (tarjetas numéricas)
- Mapas de calor

**Guardar y compartir:**
- Guardar reporte personalizado
- Programar envío automático
- Compartir con otros usuarios
- Exportar (PDF, Excel, CSV, imagen)

### 8.2 Reportes Predefinidos

**Financieros básicos:**
- Ingresos vs Egresos (comparativo)
- Flujo de caja proyectado
- Gastos por categoría
- Evolución de balance
- Rentabilidad por proyecto/departamento

**Fiscales:**
- Reporte de impuestos (IVA, retenciones)
- Libro de ventas
- Libro de compras
- Declaraciones (plantillas pre-llenadas)

**Operativos:**
- Transacciones por método de pago
- Transacciones por usuario
- Velocidad de cobro (DSO)
- Ciclo de pago (DPO)

**Para iglesias:**
- Resumen de diezmos y ofrendas
- Contribuciones por miembro
- Ofrendas por proyecto
- Crecimiento de contribuciones
- Cumplimiento de compromisos de fe

### 8.3 Dashboard Analítico
**Análisis inteligente:**
- Detección de anomalías (gastos inusuales)
- Tendencias y patrones
- Predicciones (basadas en histórico)
- Alertas inteligentes:
  - Gastos excediendo presupuesto
  - Caída de ingresos
  - Pagos próximos a vencer
  - Balance bajo

**Benchmarking:**
- Comparación con promedios del sector
- Evolución vs objetivos propios

---

## 9. MÓDULO DE CONFIGURACIÓN

### 9.1 Datos de la Organización
**Información general:**
- Nombre legal
- NIT/RUC/Identificación fiscal
- Dirección física
- Teléfono, email, sitio web
- Logo (upload de imagen)
- Representante legal
- Tipo de organización
- Régimen tributario

### 9.2 Configuraciones Contables
**Parámetros:**
- Moneda principal (USD, COP, EUR, etc)
- Formato de números (separadores)
- Ejercicio fiscal:
  - Fecha de inicio
  - Fecha de cierre
- Método de costeo (FIFO, promedio ponderado, etc)
- Manejo de impuestos:
  - Tasas de IVA
  - Retenciones aplicables
  - Cálculo automático Sí/No

**Plan de cuentas:**
- Seleccionar plantilla base
- Configurar mapeo automático:
  - Categoría de transacción → Cuenta contable
  - Método de pago → Cuenta contable

### 9.3 Preferencias de Usuario
**Personalización individual:**
- Idioma (Español, Inglés, etc)
- Zona horaria
- Formato de fecha
- Tema (Claro/Oscuro/Automático)
- Notificaciones:
  - Email
  - Push (PWA)
  - En app
- Dashboard personalizado (widgets activos)
- Reportes favoritos

### 9.4 Numeración y Prefijos
**Configuración de consecutivos:**
- Prefijo de facturas
- Prefijo de recibos
- Prefijo de comprobantes
- Prefijo de órdenes de pago
- Número inicial
- Longitud mínima (relleno con ceros)
- Reinicio anual Sí/No

### 9.5 Integraciones
**Conexiones externas:**
- Pasarelas de pago:
  - PayPal
  - Stripe
  - Mercado Pago
  - Wompi (Colombia)
- Bancos (Open Banking - según disponibilidad):
  - Importación automática de extractos
  - Sincronización de saldos
- Email:
  - SMTP personalizado
  - Plantillas de emails
- Almacenamiento:
  - Google Drive
  - Dropbox
  - OneDrive (para backups)
- Contabilidad externa:
  - Exportación a formatos estándar (DIAN para Colombia)

### 9.6 Seguridad y Respaldo
**Opciones:**
- Autenticación de dos factores (2FA)
- Sesiones activas (ver y cerrar remotamente)
- Política de contraseñas
- Backup automático:
  - Frecuencia (diaria, semanal)
  - Retención (30, 60, 90 días)
  - Destino (local, nube)
- Restauración de backup:
  - Listar backups disponibles
  - Preview de contenido
  - Restaurar total o parcial
- Exportación completa de datos (portabilidad)
- Logs de auditoría:
  - Retención
  - Acceso solo admin
  - Exportación

### 9.7 Cierre Contable
**Proceso de cierre de período:**
1. Verificación pre-cierre:
   - Balance de comprobación cuadrado
   - Conciliaciones bancarias completas
   - Asientos de ajuste finalizados
2. Generar estados financieros finales
3. Bloquear período:
   - Impide nuevas transacciones en el período
   - Impide modificaciones a transacciones existentes
4. Asiento de cierre (automático):
   - Traslado de resultados a patrimonio
   - Cierre de cuentas de ingresos y gastos
5. Asiento de apertura siguiente período
6. Confirmación de cierre (irreversible sin autorización especial)

**Funcionalidades:**
- Checklist de actividades pre-cierre
- Alertas de pendientes
- Apertura de período especial (para ajustes post-cierre con autorización)
- Historial de cierres
- Comparación entre cierres

---

## 10. MÓDULO DE AUDITORÍA Y TRAZABILIDAD

### 10.1 Registro de Actividad
**Log automático de:**
- Login/Logout
- Creación de registros
- Modificaciones (con diff - antes/después)
- Eliminaciones
- Cambios de configuración
- Exportaciones de datos
- Intentos fallidos de acceso

**Información registrada:**
- Usuario
- Timestamp exacto
- IP address
- Dispositivo/navegador
- Acción realizada
- Datos afectados
- Resultado (éxito/fallo)

### 10.2 Consulta de Auditoría
**Filtros:**
- Por usuario
- Por tipo de acción
- Por módulo
- Por rango de fechas
- Por resultado

**Visualización:**
- Timeline de eventos
- Detalle completo de cada evento
- Exportación de logs
- Alertas de actividades sospechosas

### 10.3 Trazabilidad de Documentos
**Para cada transacción/documento:**
- Historial completo de cambios
- Versiones anteriores
- Quién vio el documento
- Quién lo descargó/exportó
- Comentarios asociados

---

## 11. MÓDULO DE NOTIFICACIONES

### 11.1 Centro de Notificaciones
**Tipos de notificaciones:**
- **Alertas** (requieren atención):
  - Balance bajo
  - Pago próximo a vencer
  - Factura vencida
  - Período contable por cerrar
  - Actividad sospechosa
- **Informativas**:
  - Nueva transacción registrada
  - Reporte generado
  - Backup completado
  - Usuario nuevo agregado
- **Recordatorios**:
  - Compromiso de fe pendiente
  - Conciliación bancaria pendiente
  - Declaración fiscal próxima

**Funcionalidades:**
- Bandeja de entrada de notificaciones
- Badge con contador
- Marcar como leída/no leída
- Eliminar notificación
- Configuración granular:
  - Qué notificaciones recibir
  - Por qué canal (email, push, in-app)
  - Frecuencia de resúmenes
  - No molestar (horarios)

### 11.2 Notificaciones Push (PWA)
**Implementación:**
- Solicitar permiso al usuario
- Service Worker para recibir push
- Notificaciones emergentes en escritorio/móvil
- Click en notificación → navegar a sección relevante

### 11.3 Emails Automáticos
**Plantillas personalizables:**
- Bienvenida a usuario nuevo
- Recuperación de contraseña
- Resumen semanal/mensual de actividad
- Recordatorios de pago
- Reportes programados
- Certificados de donación
- Alertas críticas

---

## 12. MÓDULO PWA ESPECÍFICO

### 12.1 Funcionalidad Offline
**Estrategia de caché:**
- **Cache First**: Assets estáticos (CSS, JS, imágenes, fuentes)
- **Network First con fallback**: Datos dinámicos
- **Stale While Revalidate**: Datos que cambian poco

**Datos sincronizables:**
- Últimas 100 transacciones
- Plan de cuentas completo
- Categorías
- Configuración de usuario
- Miembros (para iglesias)

**Funcionalidades offline:**
- Ver dashboard (datos cacheados)
- Ver transacciones recientes
- Registrar nueva transacción (queda en cola)
- Ver reportes (con datos disponibles)
- Indicador claro de modo offline

**Sincronización:**
- Automática cuando vuelve conexión
- Manual con botón "Sincronizar ahora"
- Indicador de progreso
- Resolución de conflictos:
  - Last-write-wins (por defecto)
  - Notificar al usuario si hay conflicto crítico
- Log de sincronización

### 12.2 Instalación de la App
**Prompts:**
- Banner de instalación (después de 2-3 visitas)
- Tutorial de cómo instalar
- Beneficios de instalar:
  - Acceso desde home screen
  - Funcionamiento offline
  - Notificaciones push
  - Mejor rendimiento

**Manifest.json configurado:**
- Nombre de la app
- Iconos (192x192, 512x512, favicon)
- Splash screens
- Colores de tema
- Orientación
- Display mode (standalone)

### 12.3 Optimizaciones de Rendimiento
**Técnicas:**
- Code splitting por ruta
- Lazy loading de módulos pesados
- Compresión de assets (gzip/brotli)
- Optimización de imágenes (WebP, lazy loading)
- Precarga de recursos críticos
- Service Worker eficiente
- Virtual scrolling para listas largas
- Debouncing en búsquedas
- Throttling en eventos de scroll

**Métricas objetivo:**
- First Contentful Paint < 1.5s
- Time to Interactive < 3.5s
- Largest Contentful Paint < 2.5s
- Cumulative Layout Shift < 0.1
- Lighthouse score > 90

---

## 13. MÓDULO DE AYUDA Y SOPORTE

### 13.1 Documentación
**Secciones:**
- Guía de inicio rápido
- Tutoriales paso a paso (con screenshots)
- Video tutoriales (embebidos)
- Glosario de términos contables
- FAQs por módulo
- Casos de uso comunes

**Búsqueda:**
- Búsqueda full-text en documentación
- Sugerencias mientras escribe
- Artículos relacionados

### 13.2 Ayuda Contextual
**Tooltips:**
- Iconos de ayuda (?) al lado de campos complejos
- Hover muestra explicación
- Click muestra más detalles o video

**Tours guiados:**
- Onboarding interactivo para nuevos usuarios
- Tours por módulo (opcional)
- Resaltado de elementos importantes
- Progreso guardado (puede retomar)

### 13.3 Soporte
**Canal de soporte:**
- Formulario de contacto
- Chat en vivo (horario limitado o bot)
- Email de soporte
- Base de conocimientos
- Foro comunitario (opcional)

**Sistema de tickets:**
- Crear ticket
- Categoría (técnico, consulta, sugerencia)
- Prioridad
- Adjuntar capturas
- Seguimiento de estado
- Respuestas por email

---

## FLUJOS CRÍTICOS INTEGRADOS

### Flujo 1: Desde Transacción hasta Estados Financieros
1. Usuario registra ingreso/egreso
2. Sistema crea transacción en BD
3. Sistema genera asiento contable automático
4. Asiento actualiza cuentas en libro mayor
5. Balance de comprobación se recalcula
6. Estados financieros actualizan datos en tiempo real

### Flujo 2: Ciclo de Facturación
1. Crear factura a cliente
2. Enviar por email automáticamente
3. Factura genera asiento contable (cuenta por cobrar)
4. Recordatorios automáticos pre-vencimiento
5. Registro de pago
6. Pago genera asiento (caja/banco + cuenta por cobrar)
7. Actualización de estado de cuenta del cliente

### Flujo 3: Conciliación Bancaria
1. Importar extracto bancario
2. Sistema hace matching automático
3. Usuario revisa y confirma matches
4. Identifica diferencias
5. Crea ajustes necesarios
6. Ajustes generan asientos contables
7. Conciliación se marca como completa

### Flujo 4: Cierre de Período (Iglesia)
1. Verificación de todos los diezmos registrados
2. Generación de certificados de donación
3. Envío masivo de certificados por email
4. Generación de reportes anuales
5. Cierre contable del ejercicio
6. Apertura de nuevo período
