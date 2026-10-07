# Mi organizador (Elegance · Signatap · tugirodigital.mx)

App personal (PWA, móvil primero) para organizar las tareas y la contabilidad de los tres negocios.
Es independiente de la app de gestión de Elegance: **otro sitio de Netlify**, sin Airtable. Los datos se guardan en **Netlify Blobs** del propio sitio.

## Qué hace

- **Hoy**: atrasadas (con «Pasar a hoy / A mañana»), tareas de hoy, mañana y próximos días de los 3 negocios.
- **Un apartado por negocio** (`/n/elegance`, `/n/signatap`, `/n/tugiro`): pendientes, repetitivas, hechas y balance del mes.
- **Tareas** con fecha, hora, duración, notas, repetición (diaria, semanal con días, mensual, anual; cada N; hasta) y recordatorios. En las repetitivas, cada día se marca como hecho por separado y se puede quitar un solo día.
- **Calendario** mensual, semanal y diario con los 3 negocios (colores) y filtro por negocio.
- **Recordatorios**: por Telegram (con botones «✅ Hecha» y «⏰ 30 min», funcionan con la app cerrada) y avisos del móvil mientras la app está abierta.
- **Dinero**: ingresos y gastos por negocio y categoría, balance del mes, resumen anual y exportación CSV.

Negocios, colores, zona horaria, categorías y opciones de recordatorio: `config/negocios.ts`.

## En local

```bash
cd organizador
npm install
npm run dev     # http://localhost:3100 · contraseña demo1234 · datos en .datos/
```

## Despliegue en Netlify

1. Netlify → *Add new site* → *Import an existing project* → este repositorio.
2. **Base directory: `organizador`** (lo demás lo toma de `organizador/netlify.toml`). Rama: la que quieras publicar.
3. Variables de entorno:
   - `CLAVE_ACCESO`: tu contraseña para entrar.
   - `AUTH_SECRET`: `openssl rand -base64 32`.
   - `TELEGRAM_BOT_TOKEN` (opcional): crea un bot nuevo con @BotFather (mejor no reutilizar @Eleganceapp_bot: un bot solo puede tener un webhook).
4. Desplegar. Netlify Blobs no necesita configuración.
5. En la app → Ajustes → **Conectar Telegram** → «Iniciar» en el chat del bot → «Mensaje de prueba».
6. En el móvil: Safari → Compartir → «Añadir a pantalla de inicio» (Android: «Instalar app»).

Los recordatorios por Telegram los envía la tarea programada `netlify/functions/recordatorios.mjs` cada 5 minutos (solo en el despliegue de producción).
