# Levantamiento de Requerimientos: Software Contable PWA (Multitenant & Iglesias)

## 1. Introducción
El objetivo es desarrollar una aplicación web progresiva (PWA) de contabilidad que sea versátil, escalable y capaz de funcionar tanto para iglesias (control de diezmos y ofrendas) como para pequeñas y medianas empresas (contabilidad general) en el contexto colombiano.

---

## 2. Requerimientos Funcionales (RF)

### 2.1 Módulo Contable Base (Estándar Colombia)
- **RF-01: Plan Único de Cuentas (PUC) Dinámico:** Preconfigurado para Colombia pero editable. Soporte para niveles (Clase, Grupo, Cuenta, Subcuenta, Auxiliar).
- **RF-02: Asientos Contables:** Registro de transacciones con partida doble.
- **RF-03: Libros Obligatorios:** Generación de Libro Diario, Libro Mayor y Libros Auxiliares.
- **RF-04: Estados Financieros (NIIF):** 
    - Estado de Situación Financiera (Balance General).
    - Estado de Resultados Integral.
    - Estado de Flujos de Efectivo.
- **RF-05: Centros de Costos:** Permite asignar ingresos y gastos a diferentes proyectos o sedes.
- **RF-06: Gestión de Impuestos:** Configuración de IVA, Retención en la Fuente, ICA y autorretenciones según normativa DIAN.

### 2.2 Módulo Específico para Iglesias (ESAL)
- **RF-07: Gestión de Membresía:** Base de datos de miembros con información de contacto y familia.
- **RF-08: Control de Diezmos y Ofrendas:** Registro rápido con búsqueda por miembro, categorización (General, Construcción, Misiones, etc.).
- **RF-09: Certificados de Donación:** Generación automática de certificados para deducción de impuestos (Estatuto Tributario Art. 125-1).
- **RF-10: Contabilidad por Fondos:** Manejo de fondos restringidos y no restringidos para proyectos específicos.
- **RF-11: Reportes de Mayordomía:** Informes para asambleas sobre la ejecución presupuestal y contribuciones.

### 2.3 Facturación y Nómina (Sugerencia Adicional)
- **RF-12: Facturación Electrónica:** Integración con API para emisión de facturas XML (estándar UBL 2.1) requeridas por la DIAN.
- **RF-13: Nómina Electrónica:** Registro y reporte de pagos a empleados/pastores.

---

## 3. Requerimientos Técnicos (PWA & Offline)

- **RT-01: Arquitectura Offline-First:** Uso de IndexedDB para almacenamiento local y Service Workers para sincronización en segundo plano.
- **RT-02: Sincronización de Conflictos:** Estrategia para resolver discrepancias cuando múltiples usuarios editan los mismos datos offline.
- **RT-03: Seguridad Multitenant:** Aislamiento estricto de datos entre diferentes organizaciones.
- **RT-04: Autenticación de Dos Factores (2FA):** Opcional para tesoreros y administradores debido a la sensibilidad de los datos financieros.

---

## 4. Requerimientos No Funcionales (RNF)

- **RNF-01: Usabilidad:** Interfaz minimalista optimizada para entrada rápida de datos numéricos.
- **RNF-02: Rendimiento:** Tiempo de carga inicial inferior a 2 segundos mediante lazy loading de módulos contables.
- **RNF-03: Auditoría (Log Inmutable):** Registro de cada cambio en la base de datos (quién, cuándo, qué valor previo).
- **RNF-04: Cumplimiento Legal:** Adaptabilidad a cambios frecuentes en la reforma tributaria colombiana.

---

## 5. Sugerencias de Diferenciación

1.  **Dashboard de Salud Financiera:** No solo tablas, sino visualizaciones que indiquen el "runway" de la organización.
2.  **Escaneo de Recibos con IA:** Captura de fotos de facturas físicas y extracción automática de datos (OCR) para egresos.
3.  **Bot de Notificaciones (WhatsApp/Telegram):** Envío de resúmenes diarios de ingresos o alertas de vencimiento de impuestos.
4.  **Presupuestación Dinámica:** Comparación en tiempo real entre lo presupuestado y lo ejecutado por fondo/ministerio.

---

## 6. Fases de Desarrollo Propuestas

### Fase 1: Núcleo y PWA (MVP)
- Autenticación y Multitenancy.
- PUC y Asientos Contables básicos.
- Funcionalidad PWA (Instalación y Cache).
- Ingresos y Egresos simples.

### Fase 2: Especialización Iglesia
- Módulo de Miembros.
- Diezmos y Ofrendas con certificados.
- Reportes específicos de ESAL.

### Fase 3: Cumplimiento DIAN
- Integración de Facturación Electrónica.
- Reportes de Medios Magnéticos (Información Exógena).

### Fase 4: Inteligencia y Automatización
- OCR para facturas.
- Dashboard avanzado con IA.
- Sincronización bancaria automática.
