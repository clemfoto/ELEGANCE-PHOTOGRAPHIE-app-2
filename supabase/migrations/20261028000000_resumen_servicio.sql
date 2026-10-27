-- Resumen del servicio en el contrato.
--
-- * SERVICIOS.opciones: detalles que se pueden elegir para el resumen de un cliente (uno por línea),
--   p. ej. "Sesión de compromiso" o "Álbum impreso 30x30".
-- * clientes.resumen_opciones: los detalles elegidos para ese cliente. El texto libre sigue en
--   clientes.solicitud_especial (campo "solicitud especial"; en la ficha se edita como "Resumen del servicio").
-- * La descripción de cada servicio (servicios.descripcion) ya existía; ahora también va al contrato.

alter table public.servicios add column opciones text;
alter table public.clientes add column resumen_opciones text[] not null default '{}';

/* ---------- esquema de la app ---------- */

-- SERVICIOS: opciones para el resumen.
update public.app_esquema
set definicion = jsonb_set(definicion, '{fields}', definicion->'fields' || jsonb_build_array(
  jsonb_build_object('id', 'fldEPservOpcion01', 'name', 'Opciones del resumen', 'type', 'multilineText',
                     'description', 'Una por línea. En cada cliente se eligen las que aplican y van al contrato.')
))
where id = 'tblst8FBjp9HUIU5v';
