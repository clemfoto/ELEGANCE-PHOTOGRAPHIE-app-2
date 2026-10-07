# Elegance Photographie — app de gestión

App interna (PWA, móvil primero) sobre la base de Airtable **Elegance Photographie CRM** (`appV0PordtxxqzY5C`). Es independiente de la app de Dreamcatcher Films. Ver `CLAUDE.md` para los requisitos.

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # rellenar las variables
npm run dev                  # http://localhost:3000
```

### Probar sin Airtable ni email

```bash
npm run dev:mock
```

Arranca un Airtable falso con datos inventados (`scripts/mock-airtable.mjs`).
Entra con `admin@elegance.test` o `socio@elegance.test` (Administradores) o `equipo@elegance.test` (Equipo), contraseña `demo1234`.
Para probar una invitación: `/registro` con `fede@elegance.test` y el código `EP-TEST-2345`.

## Despliegue en Vercel

1. Importar el repositorio en Vercel (framework: Next.js, sin más ajustes).
2. Añadir las variables de entorno de `.env.example`:
   - `AIRTABLE_TOKEN`: Personal Access Token con `data.records:read`, `data.records:write` y `schema.bases:read`, limitado a la base.
   - `AIRTABLE_BASE_ID`: `appV0PordtxxqzY5C` (base de Elegance; nunca la de Dreamcatcher).
   - `AUTH_SECRET`: `openssl rand -base64 32`.
3. Desplegar. En el móvil: abrir la URL → Compartir → "Añadir a pantalla de inicio" (iPhone) o "Instalar app" (Android).

### Variables de Telegram (automatizaciones)

- `TELEGRAM_BOT_TOKEN`: token del bot creado con @BotFather.
- `TELEGRAM_ADMIN_CHAT_ID`: grupo "Eventos Elegance" (`-5184336877`).
- `TELEGRAM_VIDEOS_CHAT_ID`: grupo "VIDEOS ELEGANCE" (`-1003944478257`).

**Al pasar de Make a la app:** apagar en Make los escenarios ELEGANCE APP 1/2 y VIDEOS ELEGANCE 1/2 y, justo después, en la app → Más → Automatizaciones → **Conectar el bot** (el bot solo puede enviar sus botones a un sitio a la vez).

Después: app → Más → Automatizaciones → **Conectar el bot** (una vez). Cada persona conecta su Telegram en Más → **Conectar Telegram**.
Las tareas programadas (`netlify/functions/auto-*.mjs`) solo corren en el despliegue de producción de Netlify.

### Dar acceso a alguien

1. En **Equipo** (app o Airtable): su fila con `Nombre`, `Email` y `Activo` marcado. El rol (Administrador = todo; Equipo = solo Tareas y Calendario) se elige en su ficha.
2. En la app → Equipo → su ficha → **Acceso a la app** → *Generar código de invitación* → *Enviar invitación* (lo manda por WhatsApp/Telegram).
3. La persona abre el enlace (`/registro`), escribe su email, el código y crea su contraseña. El código solo vale una vez.

- **Cancelar acceso**: invalida su código y su contraseña y le cierra la sesión al momento.
- **Olvidó la contraseña**: *Nuevo código* y vuelve a registrarse.
- Las contraseñas se guardan cifradas (scrypt) en `Clave (cifrada)`; la app oculta esos campos.

## Cómo está hecho

| Carpeta | Qué hay |
| --- | --- |
| `config/galerias.ts` | **Toda la configuración**: IDs de tablas, permisos, navegación, colores de chips y galerías a medida. |
| `lib/airtable.ts` | Cliente de Airtable (solo servidor): esquema, lectura con caché, escritura, subida de adjuntos, cola de ~4 peticiones/s. |
| `lib/esquema.ts` | Campos visibles, solo lectura, "(antiguo)", permisos por tabla y navegación. |
| `lib/auth.ts`, `lib/clave.ts`, `lib/token.ts`, `proxy.ts` | Email + contraseña con código de invitación personal; cookie de sesión firmada de 30 días. El rol y el acceso se releen de Equipo en cada petición. |
| `app/(app)/inicio`, `lib/panel.ts` | Panel "Lo que necesita decisión" (entregas en revisión, gastos por aprobar, leads sin contacto, pagos vencidos, clientes sin team, fechas duplicadas). Límites en `DECISIONES`. |
| `app/(app)/calendario`, `lib/calendario.ts`, `app/api/calendario` | Calendario mensual y suscripción `.ics` personal para iPhone/Mac/Google. |
| `app/(app)/t/[tabla]/…` | Motor genérico: lista, ficha, nuevo y editar para cualquier tabla. |
| `components/vistas/` | Diseños a medida de Clientes, Tareas, Entrega, Leads, Contabilidad, Gastos y Equipo. |
| `lib/automatizaciones.ts`, `lib/telegram.ts` | Avisos de clientes, confirmaciones, recordatorios de entrega y leads por Telegram. |
| `app/(app)/t/acciones.ts` | Guardar, marcar tarea, convertir lead y borrar (Server Actions con permisos). |

### Notas

- **Tablas y campos nuevos** aparecen solos (el esquema se refresca cada 5 min). Las tablas nuevas salen en "Más" y solo las ve el Administrador; para dárselas al rol Equipo, añadir su ID a `TABLAS_ROL_EQUIPO`.
- **Caché**: las lecturas se reutilizan 30 s (`CACHE_SEGUNDOS`) y se invalidan al guardar desde la app. Los cambios hechos directamente en Airtable tardan como mucho eso en verse.
- **Límite de la API**: el plan gratuito de Airtable tiene un tope mensual de llamadas; con uso diario conviene un plan de pago.
- **Login**: email + contraseña con código de invitación personal (sin Auth.js ni proveedor de email). Solo entran miembros de Equipo con `Activo` marcado y la invitación no cancelada.
- **Borrar** registros solo lo puede hacer un Administrador.
- Fotos: se comprimen en el móvil (≤1600 px) antes de subirlas; máximo 5 MB por archivo (límite de Airtable).
