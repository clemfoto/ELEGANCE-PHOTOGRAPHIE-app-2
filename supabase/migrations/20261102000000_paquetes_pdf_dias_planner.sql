-- Paquetes del PDF "Elegance Photographie Pricing 2026", días y horarios del servicio y wedding planner.
--
-- 1. PAQUETES (tabla servicios): los paquetes viejos se ARCHIVAN, no se borran. Desaparecen de la
--    lista de Paquetes y del selector, pero los clientes que ya los tienen los conservan con su precio.
--    Se cargan los paquetes del PDF en su orden (servicios.orden), con su categoría, descripción y
--    precio de lista sin impuestos. Siguen siendo editables y se enlazan con los clientes como antes.
-- 2. Días y horarios: clientes.jornadas = [{ "fecha": "AAAA-MM-DD", "inicio": "HH:MM", "fin": "HH:MM" }],
--    de 1 a 7 días. El día 1 es la fecha del evento. Así un evento de 3 días es un solo cliente.
-- 3. Wedding planner: nombre y comisión (un monto, no un porcentaje). Solo informativa: no cambia
--    lo que paga el cliente.

/* ---------- 1. paquetes ---------- */

alter table public.servicios
  add column archivado boolean not null default false,
  add column categoria text,
  add column orden int;

update public.servicios set archivado = true;

insert into public.servicios (nombre, categoria, descripcion, precio, orden) values
  ('Elopement · 1 hour', 'Petit-Coverage', '1 photographer · 50 HD digital and web format · Online gallery
Coverage: ceremony, newlyweds portraits', 495, 10),
  ('Ever after · 2 hours', 'Petit-Coverage', '1 photographer · 100 HD digital and web format · Online gallery
Coverage: getting ready, ceremony, newlyweds portraits', 990, 20),
  ('Amour · 4 hours', 'Petit-Coverage', '1 photographer · 200 HD digital and web format · Online gallery
Coverage: getting ready, ceremony, newlyweds and group portraits, cocktail hour', 1474, 30),
  ('Romance · 6 hours', 'Full-Coverage', '1 photographer · 300 HD digital and web format · Online gallery
Coverage: getting ready, first look / first touch, ceremony venue details, ceremony, newlyweds, bridal party, family and friends portraits, cocktail hour, reception venue details, grand entrance, first dance, family dances, toasts and speeches', 2090, 40),
  ('Eternal love · 8 hours', 'Full-Coverage', '1 photographer · 400 HD digital and web format · Online gallery
Coverage: getting ready, first look / first touch, ceremony venue details, ceremony, newlyweds, bridal party, family and friends portraits, cocktail hour, reception venue details, grand entrance, first dance, family dances, toasts and speeches, cake cutting, candid moments, bouquet and garter toss, party shots, grand exit', 2720, 50),
  ('Monaco · 4 hours', 'Two-Photographers', '2 photographers · 200 HD digital and web format · Online gallery · 1 slideshow · 1 photo sneak peek', 1892, 60),
  ('Saint Tropez · 6 hours', 'Two-Photographers', '2 photographers · 300 HD digital and web format · Online gallery · 1 slideshow · 1 photo sneak peek', 2772, 70),
  ('Paris · 8 hours', 'Two-Photographers', '2 photographers · 1 premium photobook album · 50 photos printed · 400 HD digital and web format · Online gallery · 1 slideshow · 1 photo sneak peek', 3608, 80),
  ('Blissful · 4 hours', 'Photo & Video', '1 photographer · 1 videographer · 200 HD digital and web format · Online gallery · 15 min of edited video · One highlight video of 3 min', 2324, 90),
  ('Pure love · 6 hours', 'Photo & Video', '1 photographer · 1 videographer · 300 HD digital and web format · Online gallery · 20 min of edited video · One highlight video of 3 min', 3390, 100),
  ('Serenity · 8 hours', 'Photo & Video', '1 photographer · 1 videographer · 400 HD digital and web format · Online gallery · 30 min of edited video · One highlight video of 3 min', 4420, 110),
  ('Cannes · 4 hours', 'Two + One', '2 photographers · 1 videographer · 4 hours of photo & video services · 200 HD digital and web format · Online gallery · 15 min of edited video · One highlight video of 3 min · 1 slideshow · 1 photo sneak peek', 2749, 120),
  ('Biarritz · 6 hours', 'Two + One', '2 photographers · 1 videographer · 6 hours of photo & video services · 300 HD digital and web format · Online gallery · 20 min of edited video · One highlight video of 3 min · 1 slideshow · 1 photo sneak peek', 4049, 130),
  ('Provence · 8 hours', 'Two + One', '2 photographers · 1 videographer · 8 hours of photo & video services · 400 HD digital and web format · Online gallery · 1 premium photobook album · 50 photos printed · 30 min of edited video · One highlight video of 3 min · 1 slideshow · 1 photo sneak peek', 5349, 140),
  ('Saint Maxime · 4 hours', 'Two + Two', '2 photographers · 2 videographers · 4 hours of photo & video services · 200 HD digital and web format · Online gallery · 15 min of edited video · One highlight video of 3 min · Coming soon of 1 min · 1 slideshow · 1 photo sneak peek', 2992, 150),
  ('Deauville · 6 hours', 'Two + Two', '2 photographers · 2 videographers · 6 hours of photo & video services · 300 HD digital and web format · Online gallery · 20 min of edited video · One highlight video of 3 min · Coming soon of 1 min · 1 h drone service · 1 slideshow · 1 photo sneak peek', 4422, 160),
  ('Courchevel · 8 hours', 'Two + Two', '2 photographers · 2 videographers · 400 HD digital and web format · Online gallery · 1 premium photobook album · 50 photos printed · 30 min of edited video · One highlight video of 3 min · Coming soon of 1 min · 1 h drone service · 1 Instagram reel · 1 slideshow photo · 1 photo sneak peek', 5808, 170),
  ('Engagement session · 1 hour', 'Engagement Photo-Session', 'Photo session at your wedding venue or another destination', 385, 180),
  ('Rehearsal dinner · 2 hours', 'A la carte · Before the big day', 'Photo', 660, 190),
  ('Bridal boudoir session · 45 min', 'A la carte · Before the big day', 'Photo', 275, 200),
  ('Trash the dress on the beach', 'A la carte · After the big day', null, 385, 210),
  ('Trash the dress in cenote', 'A la carte · After the big day', null, 2090, 220),
  ('1 photobook album', 'A la carte · Additional services', null, 275, 230),
  ('One hour of drone video', 'A la carte · Additional services', null, 385, 240),
  ('2 highlight reel / TikTok 40 sec', 'A la carte · Additional services', null, 400, 250),
  ('Extra hour – 1 photographer', 'A la carte · Extra hours', 'Per hour', 350, 260),
  ('Extra hour – 2 photographers', 'A la carte · Extra hours', 'Per hour', 470, 270),
  ('Extra hour – Photo & video', 'A la carte · Extra hours', 'Per hour', 565, 280),
  ('Extra hour – Two + One', 'A la carte · Extra hours', 'Per hour', 685, 290),
  ('Extra hour – Two + Two', 'A la carte · Extra hours', 'Per hour', 745, 300);

/* ---------- 2 y 3. días, horarios y wedding planner ---------- */

alter table public.clientes
  add column jornadas jsonb not null default '[]',
  add column planner_nombre text,
  add column planner_comision numeric(12,2);

/* ---------- esquema de la app ---------- */

update public.app_esquema
set definicion = jsonb_set(definicion, '{fields}', definicion->'fields' || jsonb_build_array(
  jsonb_build_object('id', 'fldEPservCatego01', 'name', 'Categoría', 'type', 'singleLineText',
                     'description', 'Grupo del paquete, p. ej. Petit-Coverage o A la carte.'),
  jsonb_build_object('id', 'fldEPservOrden001', 'name', 'Orden', 'type', 'number',
                     'description', 'Posición en la lista de Paquetes (de menor a mayor).', 'options', jsonb_build_object('precision', 0)),
  jsonb_build_object('id', 'fldEPservArchiv01', 'name', 'Archivado', 'type', 'checkbox',
                     'description', 'No sale en Paquetes ni se puede elegir para clientes nuevos; los clientes que ya lo tienen lo conservan.',
                     'options', jsonb_build_object('icon', 'check', 'color', 'grayBright'))
))
where id = 'tblst8FBjp9HUIU5v';

update public.app_esquema
set definicion = jsonb_set(definicion, '{fields}', definicion->'fields' || jsonb_build_array(
  jsonb_build_object('id', 'fldEPclienPlanNo1', 'name', 'Wedding planner', 'type', 'singleLineText',
                     'description', 'Nombre del wedding planner.'),
  jsonb_build_object('id', 'fldEPclienPlanCo1', 'name', 'Comisión planner', 'type', 'currency',
                     'description', 'Comisión del wedding planner (monto). Solo informativa: no cambia lo que paga el cliente.',
                     'options', jsonb_build_object('precision', 2, 'symbol', '$'))
))
where id = 'tbl6nQUYzRSY8PWZ4';
