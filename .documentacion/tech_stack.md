# Stack Tecnológico Recomendado: Software Contable PWA

Para cumplir con los requerimientos de **offline-first**, **multitenancy** y **escalabilidad**, se propone el siguiente conjunto de tecnologías:

## 1. Frontend (La Interfaz)
- **Framework:** [React.js](https://react.dev/) con [Vite](https://vitejs.dev/)
  - *Razón:* Velocidad de desarrollo, ecosistema masivo y excelente soporte para PWAs.
- **Estilos:** [Tailwind CSS](https://tailwindcss.com/)
  - *Razón:* Permite crear interfaces personalizadas y responsivas rápidamente.
- **Componentes UI:** [Shadcn/UI](https://ui.shadcn.com/) + [Lucide Icons](https://lucide.dev/)
  - *Razón:* Componentes accesibles, estéticos y fáciles de personalizar.
- **Animaciones:** [Framer Motion](https://www.framer.com/motion/)
  - *Razón:* Microinteracciones fluidas que mejoran la experiencia de usuario.

## 2. Estado y Capacidades Offline
- **Gestión de Datos:** [TanStack Query](https://tanstack.com/query/latest) (React Query)
  - *Razón:* Manejo automático de caché, re-intentos de peticiones y sincronización.
- **Base de Datos Local (Navegador):** [Dexie.js](https://dexie.org/) (Wrapper de IndexedDB)
  - *Razón:* Permite almacenar grandes volúmenes de datos (asientos, miembros) localmente con una API amigable tipo SQL.
- **Service Workers:** [Vite PWA Plugin](https://vite-pwa-org.netlify.app/)
  - *Razón:* Facilita la configuración del manifiesto y las estrategias de cacheo (Stale-While-Revalidate).

## 3. Backend y Base de Datos (El Motor)
- **Plataforma de Backend:** [Supabase](https://supabase.com/)
  - *Razón:* Proporciona instantáneamente:
    - **PostgreSQL:** Base de datos relacional potente.
    - **Auth:** Manejo de usuarios, roles y 2FA.
    - **Realtime:** Suscripciones a cambios en la base de datos.
    - **Edge Functions:** Para lógica de negocio compleja o integraciones (DIAN).
    - **Storage:** Para guardar recibos y certificados.
- **ORM (si no se usa Supabase directo):** [Prisma](https://www.prisma.io/)
  - *Razón:* Tipado fuerte y migraciones sencillas.

## 4. Integraciones y Servicios Externos
- **Facturación Electrónica:** APIs como [Facturatech](https://www.facturatech.co/) o [Siigo](https://www.siigo.com/api-siigo/) (comunes en Colombia).
- **Notificaciones:** [Twilio](https://www.twilio.com/) (WhatsApp) o [Resend](https://resend.com/) (Emails).
- **OCR / IA:** [Google Cloud Vision](https://cloud.google.com/vision) o [Azure Form Recognizer](https://azure.microsoft.com/en-us/products/ai-services/ai-document-intelligence) para escanear facturas.

## 5. Arquitectura Sugerida
1.  **Multitenancy por ID:** Cada tabla tiene una columna `organization_id` protegida por políticas de seguridad a nivel de fila (RLS) en Postgres.
2.  **Sincronización:** El cliente guarda en Dexie.js inmediatamente. TanStack Query intenta subir al servidor. Si falla (offline), una cola de tareas en Dexie reintenta cuando detecte conexión.
3.  **Seguridad:** Tokens JWT de corta duración y validación estricta de esquemas con [Zod](https://zod.dev/).
