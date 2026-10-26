-- Elegance Photographie: copia exacta de la base de Airtable "Elegance Photographie CRM" (appV0PordtxxqzY5C).
--
-- Reglas para no perder información:
-- * Cada fila conserva su ID de Airtable ("rec…") como clave primaria, así los enlaces y la app siguen igual.
--   Las filas nuevas reciben un ID con el mismo formato.
-- * Cada fila guarda además el registro original completo en `airtable_raw` (respaldo literal).
-- * Los enlaces entre tablas van en tablas puente; los campos inversos de Airtable salen de ellas.
-- * Los adjuntos se copian a Storage (bucket privado "adjuntos") y se registran en la tabla `adjuntos`.
-- * Las selecciones se guardan como texto (sin restricciones) para no rechazar ningún valor existente.
--
-- Acceso: RLS activado y sin políticas públicas. Solo el servidor de la app (service_role) lee y escribe,
-- igual que hoy con el token de Airtable.

create or replace function public.nuevo_id() returns text
language sql volatile set search_path = '' as $$
  select 'rec' || string_agg(substr('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
                                    1 + floor(random() * 62)::int, 1), '')
  from generate_series(1, 14);
$$;

create or replace function public.tocar_modificado() returns trigger
language plpgsql set search_path = '' as $$
begin
  -- Si quien actualiza ya trae la fecha (p. ej. la importación desde Airtable), se respeta.
  if new.modificado_en is not distinct from old.modificado_en then
    new.modificado_en := now();
  end if;
  return new;
end;
$$;

/* ---------- Equipo ---------- */

create table public.equipo (
  id                  text primary key default public.nuevo_id(),
  nombre              text,
  rol                 text,                 -- Administrador | Equipo
  email               text,
  telefono            text,
  usuario_telegram    text,
  activo              boolean not null default false,
  telegram_chat_id    text,
  codigo_invitacion   text,
  estado_invitacion   text,                 -- Pendiente | Usada | Cancelada
  clave_cifrada       text,                 -- scrypt, la escribe la app
  creado_en           timestamptz not null default now(),
  modificado_en       timestamptz not null default now(),
  airtable_raw        jsonb
);
create unique index equipo_email_unico on public.equipo (lower(email)) where email is not null and email <> '';

/* ---------- SERVICIOS ---------- */

create table public.servicios (
  id                  text primary key default public.nuevo_id(),
  nombre              text,
  descripcion         text,
  notas_internas      text,
  clientes_texto      text,                 -- campo "Clientes" (texto libre)
  creado_en           timestamptz not null default now(),
  modificado_en       timestamptz not null default now(),
  airtable_raw        jsonb
);

/* ---------- Clientes ---------- */

create table public.clientes (
  id                      text primary key default public.nuevo_id(),
  nombre                  text,
  fecha_evento            date,
  venue                   text,
  costo                   numeric(12,2),
  solicitud_especial      text,
  team_members_antiguo    text[] not null default '{}',
  estado                  text[] not null default '{}',   -- TENTATIVO | CONFIRMADO | CANCELADO
  notificado              boolean not null default false,
  aviso_confirmado        boolean not null default false,
  creado_por              jsonb,                           -- {id, email, name} del usuario de Airtable
  creado_en               timestamptz not null default now(),
  modificado_en           timestamptz not null default now(),
  -- enlace con TuGiroSuite (contrato e invoice)
  tugirosuite_cliente_id  text,
  tugirosuite_contrato_id text,
  tugirosuite_invoice_id  text,
  tugirosuite_estado      text,
  airtable_raw            jsonb
);
create index clientes_fecha_evento on public.clientes (fecha_evento);

create table public.cliente_servicios (
  cliente_id  text not null references public.clientes (id) on delete cascade,
  servicio_id text not null references public.servicios (id) on delete cascade,
  orden       int not null default 0,
  primary key (cliente_id, servicio_id)
);

-- Team Members / Confirmados / Invitados Telegram
create table public.cliente_equipo (
  cliente_id text not null references public.clientes (id) on delete cascade,
  equipo_id  text not null references public.equipo (id) on delete cascade,
  tipo       text not null check (tipo in ('asignado', 'confirmado', 'invitado_telegram')),
  orden      int not null default 0,
  primary key (cliente_id, equipo_id, tipo)
);

/* ---------- Tareas ---------- */

create table public.tareas (
  id                    text primary key default public.nuevo_id(),
  tarea                 text,
  responsable_antiguo   text,
  color                 text,
  cliente_antiguo       text,
  descripcion           text,
  fecha_limite          date,
  colaboradores         jsonb not null default '[]',   -- colaboradores de Airtable
  estado                text,                          -- Por Hacer | En Proceso | Completada
  creado_en             timestamptz not null default now(),
  modificado_en         timestamptz not null default now(),
  airtable_raw          jsonb
);

create table public.tarea_responsables (
  tarea_id  text not null references public.tareas (id) on delete cascade,
  equipo_id text not null references public.equipo (id) on delete cascade,
  orden     int not null default 0,
  primary key (tarea_id, equipo_id)
);

create table public.tarea_clientes (
  tarea_id   text not null references public.tareas (id) on delete cascade,
  cliente_id text not null references public.clientes (id) on delete cascade,
  orden      int not null default 0,
  primary key (tarea_id, cliente_id)
);

/* ---------- Calendario ---------- */

create table public.calendario (
  id             text primary key default public.nuevo_id(),
  nombre_evento  text,
  fecha          date,
  venue          text,
  servicio       text,
  color          text,
  cliente        text,
  creado_en      timestamptz not null default now(),
  modificado_en  timestamptz not null default now(),
  airtable_raw   jsonb
);

/* ---------- Leads ---------- */

create table public.leads (
  id                      text primary key default public.nuevo_id(),
  nombre                  text,
  fecha_evento            date,
  venue                   text,
  estado                  text,
  cliente_convertido      text,
  field_6                 text,
  recordatorios_enviados  int,
  notas                   text,
  email                   text,
  origen                  text,              -- Web | WeddingWire | Instagram | Otro
  ubicacion               text,
  creado_en               timestamptz not null default now(),
  modificado_en           timestamptz not null default now(),
  airtable_raw            jsonb
);

-- 1er, 2do, 3er y 4to Contacto
create table public.lead_contactos (
  lead_id   text not null references public.leads (id) on delete cascade,
  numero    smallint not null check (numero between 1 and 4),
  equipo_id text not null references public.equipo (id) on delete cascade,
  orden     int not null default 0,
  primary key (lead_id, numero, equipo_id)
);

create table public.lead_clientes (
  lead_id    text not null references public.leads (id) on delete cascade,
  cliente_id text not null references public.clientes (id) on delete cascade,
  orden      int not null default 0,
  primary key (lead_id, cliente_id)
);

/* ---------- VIDEOS (Entrega) ---------- */

create table public.entregas (
  id                      text primary key default public.nuevo_id(),
  nombre_cliente          text,
  fecha_entrega_original  date,
  status                  text,
  link_entrega            text,
  notas_cambios           text,
  recordatorio_enviado    boolean not null default false,
  aviso_enviado           boolean not null default false,
  creado_en               timestamptz not null default now(),
  modificado_en           timestamptz not null default now(),
  airtable_raw            jsonb
);

create table public.entrega_clientes (
  entrega_id text not null references public.entregas (id) on delete cascade,
  cliente_id text not null references public.clientes (id) on delete cascade,
  orden      int not null default 0,
  primary key (entrega_id, cliente_id)
);

create table public.entrega_responsables (
  entrega_id text not null references public.entregas (id) on delete cascade,
  equipo_id  text not null references public.equipo (id) on delete cascade,
  orden      int not null default 0,
  primary key (entrega_id, equipo_id)
);

/* ---------- Contabilidad ---------- */

create table public.contabilidad (
  id              text primary key default public.nuevo_id(),
  concepto        text,
  deposito        numeric(12,2),
  fecha_deposito  date,
  fecha_balance   date,
  notas           text,
  creado_en       timestamptz not null default now(),
  modificado_en   timestamptz not null default now(),
  airtable_raw    jsonb
);

create table public.contabilidad_clientes (
  contabilidad_id text not null references public.contabilidad (id) on delete cascade,
  cliente_id      text not null references public.clientes (id) on delete cascade,
  orden           int not null default 0,
  primary key (contabilidad_id, cliente_id)
);

-- Monto Total (rollup: suma del costo de los clientes) y Monto Pendiente (Total - DEPOSITO), como en Airtable.
create view public.contabilidad_saldos with (security_invoker = true) as
select c.id,
       coalesce(sum(cl.costo), 0)                              as monto_total,
       coalesce(sum(cl.costo), 0) - coalesce(c.deposito, 0)    as monto_pendiente
from public.contabilidad c
left join public.contabilidad_clientes cc on cc.contabilidad_id = c.id
left join public.clientes cl on cl.id = cc.cliente_id
group by c.id, c.deposito;

/* ---------- Gastos ---------- */

create table public.gastos (
  id             text primary key default public.nuevo_id(),
  gasto          text,
  fecha          date,
  cantidad       numeric(12,2),
  forma_pago     text,
  categoria      text,
  aprobacion     text,                 -- Pendiente | Aprobado | Rechazado
  creado_en      timestamptz not null default now(),
  modificado_en  timestamptz not null default now(),
  airtable_raw   jsonb
);

create table public.gasto_clientes (
  gasto_id   text not null references public.gastos (id) on delete cascade,
  cliente_id text not null references public.clientes (id) on delete cascade,
  orden      int not null default 0,
  primary key (gasto_id, cliente_id)
);

-- "Persona que hizo el pago" (pago) y "Aprobado por" (aprobacion)
create table public.gasto_equipo (
  gasto_id  text not null references public.gastos (id) on delete cascade,
  equipo_id text not null references public.equipo (id) on delete cascade,
  tipo      text not null check (tipo in ('pago', 'aprobacion')),
  orden     int not null default 0,
  primary key (gasto_id, equipo_id, tipo)
);

/* ---------- Adjuntos (Archivos adjuntos, CAMBIOS DESEADOS, Comprobante) ---------- */

create table public.adjuntos (
  id             uuid primary key default gen_random_uuid(),
  tabla          text not null,       -- clientes | entregas | gastos
  registro_id    text not null,
  campo          text not null,       -- archivos | cambios_deseados | comprobante
  orden          int not null default 0,
  airtable_id    text unique,         -- "att…"
  nombre         text,
  tipo_mime      text,
  tamano         bigint,
  ancho          int,
  alto           int,
  storage_path   text not null,       -- ruta en el bucket "adjuntos"
  creado_en      timestamptz not null default now()
);
create index adjuntos_registro on public.adjuntos (tabla, registro_id, campo);

-- Al borrar un registro se borran sus filas de adjuntos (los ficheros en Storage los limpia la app).
create or replace function public.borrar_adjuntos() returns trigger
language plpgsql set search_path = '' as $$
begin
  delete from public.adjuntos where tabla = tg_table_name and registro_id = old.id;
  return old;
end;
$$;

/* ---------- triggers, índices de enlaces y RLS ---------- */

do $$
declare t text;
begin
  foreach t in array array['equipo','servicios','clientes','tareas','calendario','leads','entregas','contabilidad','gastos'] loop
    execute format('create trigger %I before update on public.%I for each row execute function public.tocar_modificado()', t || '_modificado', t);
  end loop;
  foreach t in array array['clientes','entregas','gastos'] loop
    execute format('create trigger %I after delete on public.%I for each row execute function public.borrar_adjuntos()', t || '_adjuntos', t);
  end loop;
  foreach t in array array['equipo','servicios','clientes','cliente_servicios','cliente_equipo','tareas','tarea_responsables',
                           'tarea_clientes','calendario','leads','lead_contactos','lead_clientes','entregas','entrega_clientes',
                           'entrega_responsables','contabilidad','contabilidad_clientes','gastos','gasto_clientes','gasto_equipo','adjuntos'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

create index cliente_servicios_servicio on public.cliente_servicios (servicio_id);
create index cliente_equipo_equipo on public.cliente_equipo (equipo_id);
create index tarea_responsables_equipo on public.tarea_responsables (equipo_id);
create index tarea_clientes_cliente on public.tarea_clientes (cliente_id);
create index lead_contactos_equipo on public.lead_contactos (equipo_id);
create index lead_clientes_cliente on public.lead_clientes (cliente_id);
create index entrega_clientes_cliente on public.entrega_clientes (cliente_id);
create index entrega_responsables_equipo on public.entrega_responsables (equipo_id);
create index contabilidad_clientes_cliente on public.contabilidad_clientes (cliente_id);
create index gasto_clientes_cliente on public.gasto_clientes (cliente_id);
create index gasto_equipo_equipo on public.gasto_equipo (equipo_id);

revoke execute on function public.nuevo_id() from anon, authenticated;

/* ---------- Storage ---------- */

insert into storage.buckets (id, name, public)
values ('adjuntos', 'adjuntos', false)
on conflict (id) do nothing;
