-- Descripción de los paquetes como en el PDF de precios: un elemento por línea
-- ("1 photographer" / "400 HD digital and web format" / "Online gallery"), sin la parte de
-- "Coverage: …". Así el contrato ("The Agreed Package Includes") los muestra uno debajo del otro.
update public.servicios
set descripcion = nullif(trim(both E'\n' from regexp_replace(replace(descripcion, ' · ', E'\n'), E'\\n?Coverage:[^\\n]*', '', 'g')), '')
where not archivado and descripcion is not null;
