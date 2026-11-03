-- Más correos por cliente (además de clientes.email): reciben también el contrato, los invoices
-- y la versión firmada. Se editan en Costo y pagos con el botón «+» junto al email (hasta 5 más).
alter table public.clientes add column emails_extra text[] not null default '{}';
