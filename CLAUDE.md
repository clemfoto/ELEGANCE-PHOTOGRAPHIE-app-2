# App de gestión — Elegance Photographie

App interna de gestión para Elegance Photographie (fotografía y video de bodas y eventos). Es una copia independiente de la app de Dreamcatcher Films: **otro repositorio, otra base de Airtable y otro sitio de Netlify**; no comparten datos ni configuración. La usan el dueño y su equipo, **sobre todo desde el móvil**. No la usan los clientes finales. El proyecto lo desarrolla Clem para venderlo al videógrafo, con cuota de mantenimiento.

## Objetivo principal

1. **Móvil primero.** Es una PWA instalable (icono en la pantalla de inicio, pantalla completa, sin barra del navegador). Se diseña primero para 390 px de ancho; el escritorio es secundario.
2. **Airtable es la base de datos y la fuente de la estructura.** Si el dueño crea una tabla o un campo en Airtable, debe aparecer en la app sin tocar código. La app lee el esquema con la Metadata API de Airtable y genera las galerías de forma genérica. Las galerías principales tienen además una configuración de diseño a medida (ver "Galerías").
3. **Mantenimiento sencillo.** Código claro, pocas dependencias y configuración en un solo lugar.

## Stack

- Next.js (App Router) + TypeScript, desplegado en Vercel.
- PWA: manifest, service worker, iconos, `viewport-fit=cover` y safe areas para iPhone.
- Airtable como único backend. **Nunca** llamar a Airtable desde el navegador: todas las llamadas pasan por rutas de servidor (Route Handlers / Server Actions), con el token en variables de entorno.
- Autenticación: email + contraseña con **código de invitación personal** (Equipo → `Código de invitación`, `Estado invitación` Pendiente/Usada/Cancelada, `Clave (cifrada)` con scrypt). El administrador genera, reenvía o cancela el código desde la ficha de cada persona; cancelar cierra su sesión. Solo pueden entrar los emails de **Equipo** con `Activo` marcado; el email no puede repetirse y la sesión guarda el ID de la fila. El rol sale de `Equipo.Rol`.
- Estilos: CSS propio o Tailwind, respetando los tokens de diseño de abajo.

### Variables de entorno

```
AIRTABLE_TOKEN=            # Personal Access Token con scopes: data.records:read, data.records:write, schema.bases:read
AIRTABLE_BASE_ID=appV0PordtxxqzY5C
AUTH_SECRET=
TELEGRAM_BOT_TOKEN=          # token de @Eleganceapp_bot
TELEGRAM_ADMIN_CHAT_ID=      # grupo "Eventos Elegance": -5184336877
TELEGRAM_VIDEOS_CHAT_ID=     # grupo "VIDEOS ELEGANCE": -1003944478257
```

### Límites de Airtable a tener en cuenta

- Unas 5 peticiones por segundo por base: cachear lecturas (revalidación corta) y agrupar escrituras.
- Revisar el plan de Airtable del cliente: los planes gratuitos tienen un límite mensual de llamadas a la API que una app de uso diario puede superar.

## Base de Airtable (Elegance Photographie CRM)

Consultar siempre el esquema real con la Metadata API; esta tabla es una referencia y puede quedar desactualizada. Los nombres de campo de esta base son distintos a los de Dreamcatcher: todos se configuran en `config/galerias.ts`.

| Tabla | ID | Campo principal | Notas |
| --- | --- | --- | --- |
| Clientes | tbl6nQUYzRSY8PWZ4 | nombre del cliente | fecha del evento, Venue, costo, ESTADO DEL CLIENTE (selección múltiple), servicios → SERVICIOS, Team Members → Equipo |
| Tareas | tbl4okeRHTWLcbwC7 | tarea | Fecha Limite, Estado de Tarea, Responsables → Equipo, Cliente Asociado → Clientes |
| VIDEOS (hace de Entrega) | tblltg6JFKtSwnXnm | NOMBRE DEL CLIENTE | Status (selección simple), FECHA DE ENTREGA ORIGINAL, Cliente, Responsable Entrega |
| Leads | tbl7sBK5QD0ZHIDMA | nombre del lead | fecha de evento, estado, 1er–4to Contacto → Equipo |
| Contabilidad | tbl0hZCWeLtmriphU | Concepto | Cliente, DEPOSITO, Fecha Depósito, Fecha Balance; Monto Total = rollup del costo; Monto Pendiente = fórmula |
| Gastos | tblVtMgHzjUYHX5nv | GASTOS | Cantidad, Categoría, Comprobante, Persona que hizo el pago, Aprobación |
| Equipo | tbljsGsSe2Ep1Fnjy | Nombre | Rol, Email, Activo, campos de invitación (ocultos) |
| SERVICIOS | tblst8FBjp9HUIU5v | Nombre del Servicio | Catálogo de servicios enlazado desde Clientes |
| Mi calendario | tbl4yBMt9o0V4tkuu | Evento | Privada (`PRIVADO`): Fecha, Hora, Lugar, Tipo, Notas |
| Tareas diversas | tblcWvZ0Y1rpp0Zps | Tarea | Privada (`PRIVADO`): Fecha límite, Estado (Por hacer/En progreso/Hecha), Prioridad, Notas; vista de Tareas |
| Mis gastos | tblFKkR1QAaXiVNgs | Concepto | Privada (`PRIVADO`): Fecha, Cantidad, Categoría, Forma de Pago, Comprobante |
| Calendario | tblSpztRvvebMefcg | nombre del evento | Oculta en la app (`TABLAS_OCULTAS`): la app tiene su propio calendario |

Reglas:
- Los campos calculados (fórmula, rollup, lookup, count) son de solo lectura en la app.
- Ignorar los campos cuyo nombre termine en "(antiguo)" si todavía existen.
- Los campos de enlace se editan con un selector que busca en la tabla enlazada; los de Equipo se muestran como avatares con iniciales.

## Permisos

- **Administrador:** acceso a todo, incluidas Contabilidad, Gastos y Equipo.
- **Equipo:** solo Tareas y Calendario (en el calendario ve eventos, entregas y tareas, sin poder abrir Clientes ni Entrega). En sus tareas ve nombre, fecha, venue y servicio del cliente, nunca precios ni otros datos (`resumenClientes`). Sin panel de inicio, Clientes, Entrega, Leads, Contabilidad, Gastos ni Equipo.
- **Apartado privado** (`PRIVADO` en `config/galerias.ts`): las tablas de `PRIVADO.tablas` (Mi calendario, Tareas diversas, Mis gastos) solo las ven y editan las filas de Equipo en `PRIVADO.propietarios` (por ID de fila, no por rol ni email), ni siquiera los demás administradores. Salen en "Más → Privado"; Mi calendario se suma a su calendario y .ics, con recordatorio por Telegram privado (tarea diaria), y Mis gastos manda un resumen mensual solo a su Telegram. En Airtable, quien tenga acceso a la base sí las ve.
- El rol se elige en la ficha de la persona (Equipo → "Rol y acceso a la app").
- Los permisos se comprueban en el servidor, no solo ocultando botones.

## Galerías

Motor genérico: cualquier tabla de la base se muestra como lista de tarjetas, con su ficha de detalle y un formulario de alta/edición generados a partir del tipo de cada campo. Encima, configuración a medida (un único archivo, p. ej. `config/galerias.ts`) para las galerías principales:

- **Clientes:** tarjetas con nombre, estado (chip de color), fecha del evento, servicio, venue, avatares del team y precio. Filtros por estado. La ficha muestra todos los campos y accesos a las tareas, entregas y pagos del cliente.
- **Tareas:** lista agrupada ("Esta semana" / "Próximas" / "Hechas"), marcar como hecha con un toque, fecha límite en rojo si vence pronto.
- **Entrega:** tarjetas filtrables por status, con los cambios deseados destacados.
- **Leads:** tarjetas con los cuatro contactos como pasos (1º–4º) y quién hizo cada uno; acción para convertir un lead en cliente.
- **Contabilidad** (solo administrador): total pendiente arriba y una tarjeta por cliente con total, depósito, pendiente y fecha de balance.
- **Gastos** (solo administrador): lista con categoría, fecha, quién pagó y monto; botón destacado "Foto del ticket" que sube la imagen a Comprobante.
- **Equipo** (solo administrador): personas, rol y número de eventos. La ficha oculta los enlaces inversos y el Telegram Chat ID (`ocultar` en la configuración de Equipo).

- **Inicio** (`/inicio`): "Lo que necesita decisión": entregas "En revisión" (visto bueno → "Aprobada"), gastos por encima de `DECISIONES.limiteGasto` (los aprueba un socio distinto de quien pagó), leads sin 1er contacto en 24 h, pagos vencidos (saldo de Contabilidad con fecha de balance pasada hace más de 7 días), clientes próximos sin team y fechas duplicadas. Más "Tus próximos eventos" y "Tus tareas".
- **Calendario** (`/calendario`): mes con eventos, leads, entregas, vencimientos de tareas y cobros de balance (admin); enlace `webcal://…/api/calendario/<token>.ics` personal para suscribirse.

Navegación móvil: barra inferior con Inicio, Clientes, Tareas, Entrega, Leads y "Más" (Calendario, Contabilidad, Gastos, Equipo y cualquier tabla nueva). En escritorio, barra lateral.

## Diseño (del prototipo aprobado)

- Marca en `MARCA` de `config/galerias.ts`: mientras no hay logo se muestra "Elegance Photographie" en texto; con logo, ponerlo en `public/marca/` y rellenar `MARCA.logo`. Iconos provisionales "EP" en `public/icons/`.
- Paleta provisional (la misma base neutra que Dreamcatcher, hasta tener el logo de Elegance): fondo `#F2F5F5`; tarjetas `#FFFFFF` con borde `#DDE4E5`; texto `#2B2F32`; texto secundario `#687175`.
- Acento pizarra `#4A565D` (botones principales); azul niebla del logo `#E4ECED`; barra lateral de escritorio `#2B3033`.
- Tipografía: Fraunces para títulos y nombres de clientes; Hanken Grotesk para el resto.
- Esquinas de 12–16 px, botones táctiles de al menos 44 px e inputs de 16 px (para que iOS no haga zoom).
- Chips de estado: Reservado `#E4ECF5`/`#274766`, Anticipo pagado `#FBEBD9`/`#7A3F0C`, En edición `#EFE6F3`/`#55336A`, Entregado `#E3EEDF`/`#2F5226`. Las opciones nuevas de un select toman un color por defecto.
- Referencia visual: el prototipo en el lienzo de diseño de Claude (versión móvil y escritorio).

## Plan de trabajo

1. Proyecto base: Next.js, PWA, despliegue en Vercel y variables de entorno.
2. Cliente de Airtable en el servidor: lectura del esquema, listado, detalle, creación y edición de registros, subida de adjuntos y caché.
3. Login con email, contraseña y código de invitación, y control por rol a partir de Equipo.
4. Motor genérico de galerías (lista, ficha y formulario por tipo de campo).
5. Diseño a medida de Clientes, Tareas, Entrega y Leads, en móvil primero.
6. Contabilidad, Gastos y Equipo.
7. Pruebas en iPhone y Android reales, instalación como app y ajustes.
8. Fase 2: automatizaciones con bot de Telegram, dentro de la propia app (ver "Automatizaciones").

## Automatizaciones

Viven en la app (`lib/automatizaciones.ts`, `lib/telegram.ts`) y sustituyen a los escenarios de Make "ELEGANCE APP 1/2" y "VIDEOS ELEGANCE 1/2". Las ejecutan tareas programadas de Netlify (`netlify/functions/auto-*.mjs`) que llaman a `/api/automatizaciones`; el bot (@Eleganceapp_bot) recibe mensajes y botones en `/api/telegram`. Parámetros en `AUTOMATIZACIONES` de `config/galerias.ts`.

- Nuevo cliente → aviso al grupo de administradores ("Eventos Elegance", `TELEGRAM_ADMIN_CHAT_ID`) con fecha, venue, servicios, team, solicitudes y estado. (Antes ELEGANCE APP 1.)
- Cliente que pasa a CONFIRMADO → aviso al mismo grupo, una sola vez (`Aviso confirmado`). (Antes ELEGANCE APP 2.)
- Video nuevo en VIDEOS → mensaje al grupo "VIDEOS ELEGANCE" (`TELEGRAM_VIDEOS_CHAT_ID`) con los cambios y el botón "✅ MARCAR COMO ENTREGADO"; al tocarlo, el video pasa a ENTREGADO y se avisa en el grupo. También funcionan los botones antiguos de Make (`entregado|rec…`). (Antes VIDEOS ELEGANCE 1 y 2.)
- Team members → invitación por Telegram con botón (o respuesta "confirmo"); se guarda en `Clientes.Confirmados`.
- Videos → aviso al responsable 7 días antes de la fecha de entrega.
- Leads → recordatorio a administradores a los 7, 14 y 21 días para el 2º, 3º y 4º contacto.
- El informe contable mensual al grupo está **quitado** a petición del cliente: la contabilidad no se manda a Telegram. El día 1 solo sale el resumen privado de "Mis gastos" al Telegram del dueño.
- La entrega automática a 9 semanas de Dreamcatcher está desactivada (`crearEntregaAuto: false`): en Elegance, VIDEOS son videos con cambios pedidos.
- Campos internos ocultos en la app: `CAMPOS_OCULTOS`.

Trabajar fase por fase, con una versión desplegada y probable en el móvil al final de cada una.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
