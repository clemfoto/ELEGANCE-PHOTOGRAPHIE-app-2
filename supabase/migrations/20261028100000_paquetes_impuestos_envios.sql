-- Paquetes, impuestos por pago, mensaje para clientes e historial de documentos enviados.
--
-- 1. SERVICIOS se llama PAQUETES en la app (solo cambian los nombres del esquema; la tabla
--    `servicios` y sus IDs siguen igual).
-- 2. Impuestos por pago: el costo de los paquetes va siempre sin impuestos. El IVA (16 %) y un
--    porcentaje adicional (el que se quiera, p. ej. comisión de tarjeta) se eligen por separado
--    para el depósito y para el balance, y se calculan sobre cada uno:
--      paquetes 2000 · depósito 1000 + IVA 160 = 1160 · balance 1000 (sin impuestos) = 1000.
--    clientes.aplica_iva queda en la base solo como histórico: se copia a los dos pagos.
-- 3. app_ajustes: mensaje (machote) y asunto del correo que acompaña a los documentos; el mismo
--    para todos los clientes, editable desde la app (Más → Mensaje para clientes).
-- 4. documentos_enviados: historial de cada envío (qué documentos, a quién, cuándo, quién y con
--    qué mensaje).

/* ---------- 2. impuestos por pago ---------- */

alter table public.clientes
  add column deposito_iva boolean not null default false,
  add column deposito_extra numeric(7,4),   -- fracción: 0.03 = 3 %
  add column balance_iva boolean not null default false,
  add column balance_extra numeric(7,4);

update public.clientes set deposito_iva = aplica_iva, balance_iva = aplica_iva;

-- Las vistas que dependen de clientes_totales se vuelven a crear con las columnas nuevas.
drop view public.contabilidad_saldos;
drop view public.clientes_totales;

create view public.clientes_totales with (security_invoker = true) as
select c.id,
       p.subtotal,
       coalesce(c.deposito, 0)                                              as deposito,
       d.iva                                                                as deposito_iva,
       d.extra                                                              as deposito_extra,
       coalesce(c.deposito, 0) + d.iva + d.extra                            as deposito_total,
       b.base                                                               as balance_base,
       b.iva                                                                as balance_iva,
       b.extra                                                              as balance_extra,
       b.base + b.iva + b.extra                                             as balance,
       d.iva + b.iva                                                        as iva,
       d.extra + b.extra                                                    as extra,
       coalesce(c.deposito, 0) + d.iva + d.extra + b.base + b.iva + b.extra as total
from public.clientes c
cross join lateral (
  select coalesce(case when count(cs.precio) > 0 then sum(cs.precio) end, c.costo, 0) as subtotal
  from public.cliente_servicios cs
  where cs.cliente_id = c.id
) p
cross join lateral (
  select case when c.deposito_iva then round(coalesce(c.deposito, 0) * 0.16, 2) else 0 end   as iva,
         round(coalesce(c.deposito, 0) * coalesce(c.deposito_extra, 0), 2)                 as extra
) d
cross join lateral (
  select x.base,
         case when c.balance_iva then round(x.base * 0.16, 2) else 0 end as iva,
         round(x.base * coalesce(c.balance_extra, 0), 2)                 as extra
  from (select p.subtotal - coalesce(c.deposito, 0) as base) x
) b;

-- Contabilidad: el Monto Total es lo que paga el cliente (paquetes + impuestos de cada pago).
create view public.contabilidad_saldos with (security_invoker = true) as
select c.id,
       coalesce(sum(ct.total), 0)                              as monto_total,
       coalesce(sum(ct.total), 0) - coalesce(c.deposito, 0)    as monto_pendiente
from public.contabilidad c
left join public.contabilidad_clientes cc on cc.contabilidad_id = c.id
left join public.clientes_totales ct on ct.id = cc.cliente_id
group by c.id, c.deposito;

/* ---------- 3. mensaje para clientes ---------- */

create table public.app_ajustes (
  clave text primary key,
  valor text not null,
  actualizado_en timestamptz not null default now(),
  actualizado_por text
);
alter table public.app_ajustes enable row level security;

insert into public.app_ajustes (clave, valor) values
  ('correo_asunto', 'Elegance Photographie — {documentos}'),
  ('correo_mensaje',
   E'Hi {nombre},\n\nThank you for choosing Elegance Photographie! Please find your documents below.\n\n' ||
   E'We can''t wait to be part of your day.');

/* ---------- 4. historial de documentos enviados ---------- */

create table public.documentos_enviados (
  id bigint generated always as identity primary key,
  cliente_id text not null references public.clientes(id) on delete cascade,
  enviado_en timestamptz not null default now(),
  enviado_por text,
  destinatario text,
  contrato_no text,
  -- [{ "id": "...", "titulo": "Invoice depósito" }, …]
  documentos jsonb not null default '[]',
  asunto text,
  mensaje text,
  -- 'enviar' (documentos elegidos) o 'firmar' (versión final firmada)
  tipo text not null default 'enviar'
);
create index documentos_enviados_cliente on public.documentos_enviados (cliente_id, enviado_en desc);
alter table public.documentos_enviados enable row level security;

/* ---------- esquema de la app ---------- */

-- 1. SERVICIOS → PAQUETES
update public.app_esquema
set definicion = jsonb_set(definicion, '{name}', '"PAQUETES"')
where id = 'tblst8FBjp9HUIU5v';

update public.app_esquema
set definicion = jsonb_set(definicion, '{fields}', (
  select jsonb_agg(
           case f->>'id'
             when 'fld3bkLBfAeI9Q5sV' then f || '{"name": "Nombre del Paquete"}'
             when 'fldbRfcqIdObgAlub' then f || '{"name": "Descripción del Paquete"}'
             when 'fldGfTCoU054QIzMZ' then f || '{"name": "Clientes con este paquete"}'
             when 'fldEPservPrecio01' then f || '{"description": "Precio de lista (sin impuestos). En cada cliente se puede poner otro, p. ej. con descuento."}'
             else f end order by n)
  from jsonb_array_elements(definicion->'fields') with ordinality as x(f, n)
))
where id = 'tblst8FBjp9HUIU5v';

-- Clientes: "Paquetes", impuestos por pago y descripciones de los calculados.
update public.app_esquema
set definicion = jsonb_set(definicion, '{fields}', (
  select jsonb_agg(
           case f->>'id'
             when 'fldjlxe5Ut8V7KwPJ' then f || '{"name": "Paquetes"}'
             when 'fldX48Mc1qMb95Kpq' then f || '{"description": "Total a cobrar: paquetes más el IVA y el % adicional de cada pago."}'
             when 'fldEPclienSubtot1' then f || '{"name": "Costo de paquetes", "description": "Suma de los precios de los paquetes, sin impuestos."}'
             when 'fldEPclienImpIva1' then f || '{"description": "IVA (16 %) del depósito y del balance, solo donde se usa."}'
             when 'fldEPclienBalanc1' then f || '{"description": "Paquetes menos el depósito, más su IVA y % adicional si se usan."}'
             else f end order by n)
  from jsonb_array_elements(definicion->'fields') with ordinality as x(f, n)
  where f->>'id' <> 'fldEPclienIva0001'
) || jsonb_build_array(
  jsonb_build_object('id', 'fldEPclienDepIva1', 'name', 'IVA en depósito', 'type', 'checkbox',
                     'description', 'Suma 16 % de IVA al depósito.', 'options', jsonb_build_object('icon', 'check', 'color', 'greenBright')),
  jsonb_build_object('id', 'fldEPclienDepExt1', 'name', '% adicional en depósito', 'type', 'percent',
                     'description', 'Porcentaje extra sobre el depósito (vacío = no se usa).', 'options', jsonb_build_object('precision', 2)),
  jsonb_build_object('id', 'fldEPclienBalIva1', 'name', 'IVA en balance', 'type', 'checkbox',
                     'description', 'Suma 16 % de IVA al balance.', 'options', jsonb_build_object('icon', 'check', 'color', 'greenBright')),
  jsonb_build_object('id', 'fldEPclienBalExt1', 'name', '% adicional en balance', 'type', 'percent',
                     'description', 'Porcentaje extra sobre el balance (vacío = no se usa).', 'options', jsonb_build_object('precision', 2)),
  jsonb_build_object('id', 'fldEPclienDepTot1', 'name', 'Depósito a cobrar', 'type', 'formula',
                     'description', 'Depósito más su IVA y % adicional si se usan.',
                     'options', jsonb_build_object('result', jsonb_build_object('type', 'currency', 'options', jsonb_build_object('precision', 2, 'symbol', '$')))),
  jsonb_build_object('id', 'fldEPclienExtra01', 'name', '% adicional', 'type', 'formula',
                     'description', 'Monto del porcentaje adicional del depósito y del balance.',
                     'options', jsonb_build_object('result', jsonb_build_object('type', 'currency', 'options', jsonb_build_object('precision', 2, 'symbol', '$'))))
))
where id = 'tbl6nQUYzRSY8PWZ4';
