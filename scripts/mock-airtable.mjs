// Servidor falso de Airtable para desarrollo local (npm run dev:mock).
// Imita el esquema real de la base con datos inventados; los cambios viven en memoria.
import http from "node:http";
import { randomBytes, scryptSync } from "node:crypto";

// Misma forma que lib/clave.ts: "scrypt$sal$hash".
const cifrar = (clave) => {
  const sal = randomBytes(16);
  return `scrypt$${sal.toString("base64url")}$${scryptSync(clave, sal, 32).toString("base64url")}`;
};

const PUERTO = 4010;
let n = 0;
const id = (p) => `${p}${String(++n).padStart(14, "0").replace(/^0/, "M")}`.slice(0, 17);
const ch = (...nombres) => ({ choices: nombres.map((name) => ({ id: id("sel"), name, color: "blueLight2" })) });
const link = (linkedTableId, inverseLinkFieldId) => ({ linkedTableId, inverseLinkFieldId, prefersSingleRecordLink: false });
const cur = { symbol: "$", precision: 0 };

const T = {
  clientes: "tbl6nQUYzRSY8PWZ4",
  tareas: "tbl4okeRHTWLcbwC7",
  videos: "tblltg6JFKtSwnXnm",
  leads: "tbl7sBK5QD0ZHIDMA",
  conta: "tbl0hZCWeLtmriphU",
  gastos: "tblVtMgHzjUYHX5nv",
  equipo: "tbljsGsSe2Ep1Fnjy",
  servicios: "tblst8FBjp9HUIU5v",
  calendario: "tblSpztRvvebMefcg",
};
const cur2 = { symbol: "$", precision: 2 };

// Imita la base "Elegance Photographie CRM" ya adaptada. [id, nombre, tipo, opciones]
const esquema = {
  [T.clientes]: ["Clientes", [
    ["fldCliNombre0000", "nombre del cliente", "singleLineText"],
    ["fldCliFecha00000", "fecha del evento", "date"],
    ["fldCliVenue00000", "Venue", "singleLineText"],
    ["fldCliServicio00", "Nombre del Servicio (from SERVICIO)", "multipleRecordLinks", link(T.servicios, "fldSerClientes00")],
    ["fldCliCosto00000", "costo", "currency", cur2],
    ["fldCliSolicitud0", "solicitud especial", "multilineText"],
    ["fldCliTeamAnt000", "TEAM MEMBERS (antiguo)", "multipleSelects", ch("CLEM", "OSS", "FEDE", "GABY")],
    ["fldCliCreado0000", "Creado por", "createdBy"],
    ["fldCliEstado0000", "ESTADO DEL CLIENTE", "multipleSelects", ch("TENTATIVO", "CONFIRMADO", "CANCELADO")],
    ["fldCliArchivos00", "Archivos adjuntos", "multipleAttachments"],
    ["fldCliTeam000000", "Team Members", "multipleRecordLinks", link(T.equipo, "fldEquEventos000")],
    ["fldCliConfirm000", "Confirmados", "multipleRecordLinks", link(T.equipo, "fldEquConfirm000")],
    ["fldCliNotific000", "Notificado", "checkbox"],
    ["fldCliInvitad000", "Invitados Telegram", "multipleRecordLinks", link(T.equipo, "fldEquInvitad000")],
    ["fldCliTareas0000", "Tareas", "multipleRecordLinks", link(T.tareas, "fldTarCliente000")],
    ["fldCliEntrega000", "Entrega", "multipleRecordLinks", link(T.videos, "fldVidCliente000")],
    ["fldCliLeads00000", "Leads", "multipleRecordLinks", link(T.leads, "fldLeaCliente000")],
    ["fldCliConta00000", "Contabilidad", "multipleRecordLinks", link(T.conta, "fldConCliente000")],
    ["fldCliGastos0000", "Gastos", "multipleRecordLinks", link(T.gastos, "fldGasCliente000")],
  ]],
  [T.tareas]: ["Tareas", [
    ["fldTarTarea00000", "tarea", "multilineText"],
    ["fldTarRespAnt000", "persona responsable (antiguo)", "singleLineText"],
    ["fldTarColor00000", "color", "singleSelect", ch("Rojo", "Azul", "Verde")],
    ["fldTarCliAnt0000", "cliente asociado (antiguo)", "singleLineText"],
    ["fldTarDesc000000", "DESCRIPCION", "multilineText"],
    ["fldTarFecha00000", "Fecha Limite", "date"],
    ["fldTarResp000000", "Responsables", "multipleRecordLinks", link(T.equipo, "fldEquTareas0000")],
    ["fldTarCliente000", "Cliente Asociado", "multipleRecordLinks", link(T.clientes, "fldCliTareas0000")],
    ["fldTarEstado0000", "Estado de Tarea", "singleSelect", ch("Por Hacer", "En Proceso", "Completada")],
  ]],
  [T.videos]: ["VIDEOS", [
    ["fldVidNombre0000", "NOMBRE DEL CLIENTE", "singleLineText"],
    ["fldVidFecha00000", "FECHA DE ENTREGA ORIGINAL", "date"],
    ["fldVidStatus0000", "Status", "singleSelect", ch("INICIANDO CAMBIOS", "CAMBIOS EN PROCESO", "SUBIDO A LA NUBE", "ENTREGADO", "EN ESPERA")],
    ["fldVidCambios000", "CAMBIOS DESEADOS", "multipleAttachments"],
    ["fldVidCliente000", "Cliente", "multipleRecordLinks", link(T.clientes, "fldCliEntrega000")],
    ["fldVidResp000000", "Responsable Entrega", "multipleRecordLinks", link(T.equipo, "fldEquEntregas00")],
    ["fldVidLink000000", "Link de Entrega", "url"],
    ["fldVidNotas00000", "Notas de cambios", "multilineText"],
    ["fldVidRecord0000", "Recordatorio enviado", "checkbox"],
  ]],
  [T.leads]: ["Leads", [
    ["fldLeaNombre0000", "nombre del lead", "singleLineText"],
    ["fldLeaFecha00000", "fecha de evento", "date"],
    ["fldLeaVenue00000", "Venue", "singleLineText"],
    ["fldLeaEstado0000", "estado", "singleSelect", ch("en proceso", "cerrado", "cancelado", "Nuevo", "Contactado", "En negociación", "Ganado", "Perdido")],
    ["fldLeaConvert000", "cliente convertido", "singleLineText"],
    ["fldLeaC10000000", "1er Contacto", "multipleRecordLinks", link(T.equipo, "fldEquL100000000")],
    ["fldLeaC20000000", "2do Contacto", "multipleRecordLinks", link(T.equipo, "fldEquL200000000")],
    ["fldLeaC30000000", "3er Contacto", "multipleRecordLinks", link(T.equipo, "fldEquL300000000")],
    ["fldLeaC40000000", "4to Contacto", "multipleRecordLinks", link(T.equipo, "fldEquL400000000")],
    ["fldLeaCliente000", "Relacionado a Cliente", "multipleRecordLinks", link(T.clientes, "fldCliLeads00000")],
    ["fldLeaRecord0000", "Recordatorios enviados", "number", { precision: 0 }],
    ["fldLeaNotas00000", "Notas de Lead", "multilineText"],
  ]],
  [T.servicios]: ["SERVICIOS", [
    ["fldSerNombre0000", "Nombre del Servicio", "singleLineText"],
    ["fldSerDesc000000", "Descripción del Servicio", "multilineText"],
    ["fldSerClientes00", "Clientes 2", "multipleRecordLinks", link(T.clientes, "fldCliServicio00")],
  ]],
  [T.calendario]: ["Calendario", [
    ["fldCalNombre0000", "nombre del evento", "singleLineText"],
    ["fldCalFecha00000", "fecha", "date"],
  ]],
  [T.conta]: ["Contabilidad", [
    ["fldConConcepto00", "Concepto", "singleLineText"],
    ["fldConCliente000", "Cliente", "multipleRecordLinks", link(T.clientes, "fldCliConta00000")],
    ["fldConDeposito00", "DEPOSITO", "currency", cur2],
    ["fldConFechaDep00", "Fecha Depósito", "date"],
    ["fldConFechaBal00", "Fecha Balance", "date"],
    ["fldConNotas00000", "Notas Contables", "multilineText"],
    ["fldConTotal00000", "Monto Total", "rollup", { result: { type: "number", options: { precision: 0 } } }],
    ["fldConPendiente0", "Monto Pendiente", "formula", { result: { type: "number", options: { precision: 0 } } }],
  ]],
  [T.gastos]: ["Gastos", [
    ["fldGasNombre0000", "GASTOS", "singleLineText"],
    ["fldGasFecha00000", "Fecha", "date"],
    ["fldGasCantidad00", "Cantidad", "currency", cur2],
    ["fldGasForma00000", "Forma de Pago", "singleSelect", ch("Efectivo", "Transferencia", "Tarjeta", "Otro")],
    ["fldGasCategoria0", "Categoría", "singleSelect", ch("Equipo y material", "Transporte", "Otros")],
    ["fldGasComprob000", "Comprobante", "multipleAttachments"],
    ["fldGasCliente000", "Cliente", "multipleRecordLinks", link(T.clientes, "fldCliGastos0000")],
    ["fldGasPagador000", "Persona que hizo el pago", "multipleRecordLinks", link(T.equipo, "fldEquGastos0000")],
    ["fldGasAprobac000", "Aprobación", "singleSelect", ch("Pendiente", "Aprobado", "Rechazado")],
    ["fldGasAprobPor00", "Aprobado por", "multipleRecordLinks", link(T.equipo, "fldEquGasAprob00")],
  ]],
  [T.equipo]: ["Equipo", [
    ["fldEquNombre0000", "Nombre", "singleLineText"],
    ["fldEquRol0000000", "Rol", "singleSelect", ch("Administrador", "Equipo")],
    ["fldEquEmail00000", "Email", "email"],
    ["fldEquTelefono00", "Teléfono", "phoneNumber"],
    ["fldEquTelegram00", "Usuario Telegram", "singleLineText"],
    ["fldEquActivo0000", "Activo", "checkbox"],
    ["fldEquTelegram01", "Telegram Chat ID", "singleLineText"],
    ["fldEquCodigo0000", "Código de invitación", "singleLineText"],
    ["fldEquEstInv0000", "Estado invitación", "singleSelect", ch("Pendiente", "Usada", "Cancelada")],
    ["fldEquClave00000", "Clave (cifrada)", "singleLineText"],
    ["fldEquEventos000", "Eventos asignados", "multipleRecordLinks", link(T.clientes, "fldCliTeam000000")],
    ["fldEquConfirm000", "Eventos confirmados", "multipleRecordLinks", link(T.clientes, "fldCliConfirm000")],
    ["fldEquInvitad000", "Invitaciones Telegram", "multipleRecordLinks", link(T.clientes, "fldCliInvitad000")],
    ["fldEquTareas0000", "Tareas asignadas", "multipleRecordLinks", link(T.tareas, "fldTarResp000000")],
    ["fldEquEntregas00", "Entregas a cargo", "multipleRecordLinks", link(T.videos, "fldVidResp000000")],
    ["fldEquL100000000", "Leads (1er contacto)", "multipleRecordLinks", link(T.leads, "fldLeaC10000000")],
    ["fldEquL200000000", "Leads (2do contacto)", "multipleRecordLinks", link(T.leads, "fldLeaC20000000")],
    ["fldEquL300000000", "Leads (3er contacto)", "multipleRecordLinks", link(T.leads, "fldLeaC30000000")],
    ["fldEquL400000000", "Leads (4to contacto)", "multipleRecordLinks", link(T.leads, "fldLeaC40000000")],
    ["fldEquGastos0000", "Gastos pagados", "multipleRecordLinks", link(T.gastos, "fldGasPagador000")],
    ["fldEquGasAprob00", "Gastos aprobados", "multipleRecordLinks", link(T.gastos, "fldGasAprobPor00")],
  ]],
};

const tablas = Object.entries(esquema).map(([tid, [name, campos]]) => ({
  id: tid,
  name,
  primaryFieldId: campos[0][0],
  fields: campos.map(([fid, fname, type, options]) => ({ id: fid, name: fname, type, ...(options ? { options } : {}) })),
}));
const tabla = (tid) => tablas.find((t) => t.id === tid || t.name === tid);

/* ---------- datos inventados ---------- */

const datos = Object.fromEntries(tablas.map((t) => [t.id, []]));
const dia = (d) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);
function crear(tid, fields, hace = 0) {
  const r = { id: id("rec"), createdTime: new Date(Date.now() - hace * 86400000).toISOString(), fields: {} };
  datos[tid].push(r);
  escribir(tid, r, fields);
  return r;
}

// Contraseña de prueba: demo1234. Fede tiene una invitación pendiente (código EP-TEST-2345).
const clave = cifrar("demo1234");
const clem = crear(T.equipo, { Nombre: "Clem", Rol: "Administrador", Email: "admin@elegance.test", Activo: true, "Estado invitación": "Usada", "Clave (cifrada)": clave });
const oss = crear(T.equipo, { Nombre: "Oss", Rol: "Equipo", Email: "equipo@elegance.test", Activo: true, "Estado invitación": "Usada", "Clave (cifrada)": clave });
const fede = crear(T.equipo, { Nombre: "Fede", Rol: "Equipo", Email: "fede@elegance.test", Activo: true, "Estado invitación": "Pendiente", "Código de invitación": "EP-TEST-2345" });
const gaby = crear(T.equipo, { Nombre: "Gaby", Rol: "Administrador", Email: "socio@elegance.test", Activo: true, "Estado invitación": "Usada", "Clave (cifrada)": clave });

const sFoto = crear(T.servicios, { "Nombre del Servicio": "Fotografia 8 horas" });
const sVideo = crear(T.servicios, { "Nombre del Servicio": "Videografia 8 horas" });
const sDron = crear(T.servicios, { "Nombre del Servicio": "Dron" });

const c1 = crear(T.clientes, { "nombre del cliente": "Melissa y Sean", "fecha del evento": dia(12), Venue: "Hacienda San Gabriel", costo: 1993.55, "ESTADO DEL CLIENTE": ["CONFIRMADO"], "Nombre del Servicio (from SERVICIO)": [sFoto.id, sDron.id], "Team Members": [clem.id, fede.id], Notificado: true, "solicitud especial": "Fotos de la familia al atardecer." });
const c2 = crear(T.clientes, { "nombre del cliente": "Estibaliz y Berna", "fecha del evento": dia(30), Venue: "Casa Lamm", costo: 3470, "ESTADO DEL CLIENTE": ["TENTATIVO"], "Nombre del Servicio (from SERVICIO)": [sFoto.id, sVideo.id], "Team Members": [oss.id], Notificado: true });
const c3 = crear(T.clientes, { "nombre del cliente": "Lily y Jason", "fecha del evento": dia(-40), Venue: "Playa Xcaret", costo: 2500, "ESTADO DEL CLIENTE": ["CONFIRMADO"], "Team Members": [clem.id, oss.id, fede.id], Notificado: true });
const c4 = crear(T.clientes, { "nombre del cliente": "Gabrielle y DaVante", "fecha del evento": dia(30), Venue: "Hotel Xcaret", costo: 4100, "ESTADO DEL CLIENTE": ["CONFIRMADO"], Notificado: true });

crear(T.tareas, { tarea: "Edición de fotos", "Fecha Limite": dia(1), "Estado de Tarea": "Por Hacer", Responsables: [oss.id], "Cliente Asociado": [c3.id], DESCRIPCION: "Pasar a blanco y negro las fotos 528 y 557." });
crear(T.tareas, { tarea: "Correccion de coloracion", "Fecha Limite": dia(9), "Estado de Tarea": "En Proceso", Responsables: [clem.id], "Cliente Asociado": [c1.id] });

crear(T.videos, { "NOMBRE DEL CLIENTE": "Lily y Jason", "FECHA DE ENTREGA ORIGINAL": dia(3), Status: "SUBIDO A LA NUBE", Cliente: [c3.id], "Responsable Entrega": [oss.id], "Notas de cambios": "Cambiar la canción del final." });

crear(T.leads, { "nombre del lead": "Kyle y Jewel", "fecha de evento": dia(200), Venue: "Tulum", estado: "Nuevo" }, 3);

crear(T.conta, { Concepto: "Boda Melissa y Sean", Cliente: [c1.id], DEPOSITO: 500, "Fecha Depósito": dia(-30), "Fecha Balance": dia(-10) });

crear(T.gastos, { GASTOS: "Lente 35mm", Fecha: dia(-2), Cantidad: 9800, Categoría: "Equipo y material", "Persona que hizo el pago": [clem.id], Aprobación: "Pendiente" });

const telegram = [];

/* ---------- lógica ---------- */

function escribir(tid, r, fields) {
  const t = tabla(tid);
  for (const [clave, valor] of Object.entries(fields)) {
    const f = t.fields.find((x) => x.name === clave || x.id === clave);
    if (!f) throw Object.assign(new Error(`Unknown field name: "${clave}"`), { status: 422 });
    if (f.type === "multipleRecordLinks") {
      const antes = r.fields[f.name] ?? [];
      const despues = valor ?? [];
      const inv = f.options.inverseLinkFieldId;
      const tInv = tabla(f.options.linkedTableId);
      const fInv = tInv.fields.find((x) => x.id === inv);
      for (const otro of datos[tInv.id]) {
        const lista = otro.fields[fInv.name] ?? [];
        if (antes.includes(otro.id) && !despues.includes(otro.id)) otro.fields[fInv.name] = lista.filter((x) => x !== r.id);
        if (despues.includes(otro.id) && !lista.includes(r.id)) otro.fields[fInv.name] = [...lista, r.id];
      }
    }
    if (valor == null || valor === "" || valor === false || (Array.isArray(valor) && !valor.length)) delete r.fields[f.name];
    else r.fields[f.name] = valor;
  }
}

function calculado(tid, r) {
  const out = { ...r, fields: { ...r.fields } };
  for (const [k, v] of Object.entries(out.fields)) if (Array.isArray(v) && !v.length) delete out.fields[k];
  const cliente = (r.fields.Cliente ?? [])[0] && datos[T.clientes].find((c) => c.id === r.fields.Cliente[0]);
  if (tid === T.conta) {
    const total = cliente?.fields.costo ?? 0;
    out.fields["Monto Total"] = total;
    out.fields["Monto Pendiente"] = total - (r.fields.DEPOSITO ?? 0);
  }
  return out;
}

function responder(res, status, cuerpo) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(cuerpo));
}

http
  .createServer(async (req, res) => {
    let cuerpo = "";
    for await (const trozo of req) cuerpo += trozo;
    const json = cuerpo ? JSON.parse(cuerpo) : {};
    const url = new URL(req.url, `http://localhost:${PUERTO}`);
    const partes = url.pathname.split("/").filter(Boolean); // v0, ...
    try {
      if (partes[0]?.startsWith("bot")) {
        const metodo = partes[1];
        if (metodo === "getMe") return responder(res, 200, { ok: true, result: { username: "elegance_prueba_bot" } });
        telegram.push({ metodo, ...json });
        console.log(`[telegram] ${metodo} → ${json.chat_id ?? ""} ${String(json.text ?? json.url ?? "").replace(/\n/g, " / ").slice(0, 160)}`);
        return responder(res, 200, { ok: true, result: { message_id: telegram.length, url: "", pending_update_count: 0 } });
      }
      if (partes[0] === "__telegram") return responder(res, 200, telegram);
      if (partes[1] === "meta") return responder(res, 200, { tables: tablas });

      if (partes[4] === "uploadAttachment") {
        const recId = partes[2];
        for (const [tid, regs] of Object.entries(datos)) {
          const r = regs.find((x) => x.id === recId);
          if (!r) continue;
          const f = tabla(tid).fields.find((x) => x.id === partes[3]);
          const dataUrl = `data:${json.contentType};base64,${json.file}`;
          const adj = { id: id("att"), url: dataUrl, filename: json.filename, type: json.contentType, thumbnails: json.contentType.startsWith("image/") ? { large: { url: dataUrl } } : undefined };
          r.fields[f.name] = [...(r.fields[f.name] ?? []), adj];
          return responder(res, 200, { id: r.id, fields: {} });
        }
        return responder(res, 404, { error: { type: "NOT_FOUND" } });
      }

      const t = tabla(decodeURIComponent(partes[2] ?? ""));
      if (!t) return responder(res, 404, { error: { type: "TABLE_NOT_FOUND" } });
      const regs = datos[t.id];
      const recId = partes[3];

      if (req.method === "GET" && recId) {
        const r = regs.find((x) => x.id === recId);
        return r ? responder(res, 200, calculado(t.id, r)) : responder(res, 404, { error: { type: "NOT_FOUND" } });
      }
      if (req.method === "GET") {
        const desde = Number(url.searchParams.get("offset") ?? 0);
        const tam = Number(url.searchParams.get("pageSize") ?? 100);
        const pagina = regs.slice(desde, desde + tam).map((r) => calculado(t.id, r));
        return responder(res, 200, { records: pagina, ...(desde + tam < regs.length ? { offset: String(desde + tam) } : {}) });
      }
      if (req.method === "POST") {
        const creados = json.records.map((x) => calculado(t.id, crear(t.id, x.fields)));
        return responder(res, 200, { records: creados });
      }
      if (req.method === "PATCH") {
        const hechos = json.records.map((x) => {
          const r = regs.find((y) => y.id === x.id);
          if (!r) throw Object.assign(new Error("Record not found"), { status: 404 });
          escribir(t.id, r, x.fields);
          return calculado(t.id, r);
        });
        return responder(res, 200, { records: hechos });
      }
      if (req.method === "DELETE" && recId) {
        const r = regs.find((x) => x.id === recId);
        if (r) {
          const vacios = Object.fromEntries(t.fields.filter((f) => f.type === "multipleRecordLinks").map((f) => [f.name, []]));
          escribir(t.id, r, vacios);
          regs.splice(regs.indexOf(r), 1);
        }
        return responder(res, 200, { id: recId, deleted: true });
      }
      responder(res, 405, { error: { type: "METHOD_NOT_ALLOWED" } });
    } catch (e) {
      responder(res, e.status ?? 500, { error: { type: "ERROR", message: e.message } });
    }
  })
  .listen(PUERTO, () => console.log(`Airtable falso en http://localhost:${PUERTO}`));
