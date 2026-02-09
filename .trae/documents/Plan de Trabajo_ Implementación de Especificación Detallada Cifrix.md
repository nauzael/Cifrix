He analizado el documento de especificación detallada y lo he comparado con el estado actual de la aplicación. Para llevar a Cifrix al nivel de funcionalidad descrito, he diseñado un plan de trabajo estructurado en 6 fases lógicas, priorizando la estabilidad del sistema contable y la experiencia del usuario.

## **Fase 1: Base de Datos y Seguridad (Core & Auth)**
*   **Roles y Permisos (RBAC)**: Implementar la tabla de roles (Super Admin, Tesorero, Contador, etc.) y restringir el acceso a funciones específicas según el perfil.
*   **Auditoría y Logs**: Crear un sistema de trazabilidad que registre quién creó, editó o eliminó cada registro (Transacciones, Miembros, Asientos).
*   **Mejora de Auth**: Implementar el flujo de recuperación de contraseña por OTP y el Wizard de Onboarding para nuevas organizaciones.

## **Fase 2: Contabilidad Avanzada y Categorización**
*   **Jerarquía de Categorías**: Evolucionar las categorías simples a una estructura de niveles (Padre > Hijo) con iconos y colores personalizados.
*   **PUC Profesional**: Ampliar el Plan Único de Cuentas para soportar niveles, naturaleza de cuenta (Débito/Crédito) e importación desde Excel.
*   **Libros Contables**: Desarrollar el Libro Mayor y el Balance de Comprobación con filtros por niveles.
*   **Conciliación Bancaria**: Crear la herramienta para importar extractos (CSV) y realizar el "matching" automático con los registros de libros.

## **Fase 3: Expansión del Módulo de Iglesia**
*   **Ficha de Miembro Extendida**: Agregar datos ministeriales (ministerios, fecha de bautismo) y seguimiento de actividad.
*   **Compromisos de Fe**: Implementar el seguimiento de metas de ahorro o promesas de aportes con barras de progreso.
*   **Certificados DIAN**: Generar automáticamente certificados de donación en PDF con firma digital y código QR de validación.
*   **Gestión de Proyectos**: Módulo para campañas específicas (ej: Construcción, Misiones) con metas financieras propias.

## **Fase 4: Facturación y Gestión de Cartera**
*   **Módulo de Clientes**: Gestión de terceros para organizaciones que no son iglesias o para cobros externos.
*   **Facturación**: Creación de facturas con cálculo automático de impuestos (IVA, Retenciones) y envío por email.
*   **Cuentas por Cobrar (CXC)**: Dashboard de cartera vencida y recordatorios automáticos.

## **Fase 5: PWA, Sincronización e IA**
*   **Offline Robusto**: Configurar Workbox para asegurar que la app funcione 100% offline, encolando transacciones para sincronización en segundo plano.
*   **Sugerencias con IA**: Implementar un motor de reglas simple (y luego NLP) que sugiera categorías contables basadas en la descripción de la transacción.
*   **Notificaciones Push**: Alertas de vencimientos y confirmaciones de sincronización directamente al dispositivo.

## **Fase 6: Reportes Analíticos y UX Final**
*   **Dashboard Interactivo**: Selector de períodos (Hoy, Mes, Año), gráficos de flujo de caja (Chart.js) y widgets personalizables (Drag & Drop).
*   **Constructor de Reportes**: Permitir al usuario elegir qué columnas y filtros desea para exportar datos a Excel/PDF.
*   **Cierre Contable**: Proceso guiado para bloquear períodos y generar asientos de cierre automáticos.

---
**¿Deseas que comencemos con la Fase 1 (Roles, Auditoría y Mejoras de Auth) o hay algún módulo específico de la lista que consideres prioritario?**