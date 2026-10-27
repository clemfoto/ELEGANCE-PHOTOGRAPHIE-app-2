-- Esquema que lee la app para generar galerías, fichas y formularios (mismo formato que la
-- Metadata API de Airtable: tablas con sus campos, tipos y opciones). La primera versión la copia
-- la función migrar-airtable; después se edita aquí al añadir un campo o una opción nueva.
create table public.app_esquema (
  id          text primary key,        -- ID de la tabla ("tbl…")
  orden       int not null default 0,
  definicion  jsonb not null           -- { id, name, description, primaryFieldId, fields: [...] }
);
alter table public.app_esquema enable row level security;
