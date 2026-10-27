-- Precios por servicio, IVA por cliente, depósito y balance.
--
-- * SERVICIOS.precio: precio de lista.
-- * cliente_servicios.precio: precio de ese servicio para ese cliente (p. ej. con descuento);
--   vacío = aún sin precio. Si un cliente no tiene ningún precio por servicio, se usa el costo
--   que venía de Airtable (clientes.costo) como subtotal.
-- * clientes: email y teléfono (para el contrato), "Aplica IVA", depósito y fecha en que se pagó.
-- * Vista clientes_totales: subtotal, IVA 16 % (si aplica), costo total y balance.

alter table public.servicios add column precio numeric(12,2);
alter table public.cliente_servicios add column precio numeric(12,2);
alter table public.clientes
  add column email text,
  add column telefono text,
  add column aplica_iva boolean not null default false,
  add column deposito numeric(12,2),
  add column deposito_pagado_en date;

-- Al enlazar un servicio a un cliente, su precio empieza con el de lista (luego se puede cambiar).
create function public.precio_de_lista() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.precio is null then
    select s.precio into new.precio from public.servicios s where s.id = new.servicio_id;
  end if;
  return new;
end $$;
create trigger cliente_servicios_precio before insert on public.cliente_servicios
  for each row execute function public.precio_de_lista();

-- Clientes de Airtable con un solo servicio: ese servicio vale lo que costaba el cliente.
update public.cliente_servicios cs set precio = c.costo
from public.clientes c
where c.id = cs.cliente_id and c.costo is not null
  and (select count(*) from public.cliente_servicios x where x.cliente_id = c.id) = 1;

create view public.clientes_totales with (security_invoker = true) as
select c.id,
       t.subtotal,
       t.iva,
       t.subtotal + t.iva                               as total,
       c.deposito,
       t.subtotal + t.iva - coalesce(c.deposito, 0)    as balance
from public.clientes c
cross join lateral (
  select coalesce(case when count(cs.precio) > 0 then sum(cs.precio) end, c.costo, 0) as subtotal
  from public.cliente_servicios cs
  where cs.cliente_id = c.id
) p
cross join lateral (
  select p.subtotal, case when c.aplica_iva then round(p.subtotal * 0.16, 2) else 0 end as iva
) t;

-- Contabilidad: el Monto Total sale ahora del costo total del cliente (servicios + IVA).
create or replace view public.contabilidad_saldos with (security_invoker = true) as
select c.id,
       coalesce(sum(ct.total), 0)                              as monto_total,
       coalesce(sum(ct.total), 0) - coalesce(c.deposito, 0)    as monto_pendiente
from public.contabilidad c
left join public.contabilidad_clientes cc on cc.contabilidad_id = c.id
left join public.clientes_totales ct on ct.id = cc.cliente_id
group by c.id, c.deposito;

/* ---------- esquema de la app ---------- */

-- Clientes: "costo" pasa a ser el costo total calculado; campos nuevos al final.
update public.app_esquema
set definicion = jsonb_set(definicion, '{fields}', (
  select jsonb_agg(
           case when f->>'id' = 'fldX48Mc1qMb95Kpq' then
             jsonb_build_object(
               'id', 'fldX48Mc1qMb95Kpq', 'name', 'Costo total', 'type', 'formula',
               'description', 'Suma de los precios de los servicios del cliente, más IVA si aplica.',
               'options', jsonb_build_object('result', jsonb_build_object('type', 'currency', 'options', jsonb_build_object('precision', 2, 'symbol', '$'))))
           else f end order by n)
  from jsonb_array_elements(definicion->'fields') with ordinality as x(f, n)
) || jsonb_build_array(
  jsonb_build_object('id', 'fldEPclienEmail01', 'name', 'Email', 'type', 'email', 'description', 'Correo del cliente: ahí le llegan el contrato y el invoice.'),
  jsonb_build_object('id', 'fldEPclienTelef01', 'name', 'Teléfono', 'type', 'phoneNumber'),
  jsonb_build_object('id', 'fldEPclienIva0001', 'name', 'Aplica IVA', 'type', 'checkbox', 'description', 'Suma 16 % de IVA a los servicios.', 'options', jsonb_build_object('icon', 'check', 'color', 'greenBright')),
  jsonb_build_object('id', 'fldEPclienSubtot1', 'name', 'Subtotal', 'type', 'formula', 'description', 'Suma de los precios de los servicios.', 'options', jsonb_build_object('result', jsonb_build_object('type', 'currency', 'options', jsonb_build_object('precision', 2, 'symbol', '$')))),
  jsonb_build_object('id', 'fldEPclienImpIva1', 'name', 'IVA', 'type', 'formula', 'description', '16 % del subtotal cuando aplica IVA.', 'options', jsonb_build_object('result', jsonb_build_object('type', 'currency', 'options', jsonb_build_object('precision', 2, 'symbol', '$')))),
  jsonb_build_object('id', 'fldEPclienDepos01', 'name', 'Depósito', 'type', 'currency', 'options', jsonb_build_object('precision', 2, 'symbol', '$')),
  jsonb_build_object('id', 'fldEPclienDepPag1', 'name', 'Depósito pagado', 'type', 'date', 'description', 'Fecha en que se recibió el depósito. Se llena sola al enviar el contrato y el invoice.', 'options', jsonb_build_object('dateFormat', jsonb_build_object('name', 'local', 'format', 'l'))),
  jsonb_build_object('id', 'fldEPclienBalanc1', 'name', 'Balance', 'type', 'formula', 'description', 'Costo total menos el depósito.', 'options', jsonb_build_object('result', jsonb_build_object('type', 'currency', 'options', jsonb_build_object('precision', 2, 'symbol', '$'))))
))
where id = 'tbl6nQUYzRSY8PWZ4';

-- SERVICIOS: precio de lista.
update public.app_esquema
set definicion = jsonb_set(definicion, '{fields}', definicion->'fields' || jsonb_build_array(
  jsonb_build_object('id', 'fldEPservPrecio01', 'name', 'Precio', 'type', 'currency', 'description', 'Precio de lista (sin IVA). En cada cliente se puede poner otro, p. ej. con descuento.', 'options', jsonb_build_object('precision', 2, 'symbol', '$'))
))
where id = 'tblst8FBjp9HUIU5v';
