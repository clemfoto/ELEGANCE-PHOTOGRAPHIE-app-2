-- Control de la importación desde Airtable (se elimina al terminar la migración).
-- migracion_clave: clave que exige la función migrar-airtable (RLS sin políticas: solo service_role).
-- respaldos: bucket privado con la copia literal de Airtable (datos.json + adjuntos) de cada ejecución.
create table public.migracion_clave (clave text primary key);
alter table public.migracion_clave enable row level security;

insert into storage.buckets (id, name, public)
values ('respaldos', 'respaldos', false)
on conflict (id) do nothing;
