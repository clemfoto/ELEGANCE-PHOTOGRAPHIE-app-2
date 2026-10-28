"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { guardarPagos } from "@/app/(app)/t/pagos";
import type { Pagos } from "@/lib/pagos";
import { dinero, fecha } from "@/lib/formato";
import { calcularPagos, porcentaje, redondear, type Pago } from "@/lib/impuestos";

const aTexto = (n: number | null) => (n == null ? "" : String(n));
const aNumero = (s: string) => (s.trim() === "" ? null : Number(s.replace(/[$,%\s]/g, "")));
/** "3.5" → 0.035; vacío o 0 → null (no se usa). */
const aFraccion = (s: string) => {
  const n = aNumero(s);
  return n == null || isNaN(n) || n === 0 ? null : n / 100;
};

/**
 * Precio de cada paquete para este cliente (empieza con el de lista y se puede bajar, p. ej. con
 * un descuento), depósito y balance con su IVA y % adicional si se usan, y datos de contacto.
 * Los paquetes van sin impuestos; los totales se recalculan al escribir.
 */
export default function FormPagos({ p, bloqueado }: { p: Pagos; bloqueado: boolean }) {
  const router = useRouter();
  const [precios, setPrecios] = useState(() => Object.fromEntries(p.servicios.map((s) => [s.id, aTexto(s.precio)])));
  const [deposito, setDeposito] = useState(aTexto(p.deposito));
  const [depositoIva, setDepositoIva] = useState(p.depositoIva);
  const [depositoExtra, setDepositoExtra] = useState(porcentaje(p.depositoExtra));
  const [balanceIva, setBalanceIva] = useState(p.balanceIva);
  const [balanceExtra, setBalanceExtra] = useState(porcentaje(p.balanceExtra));
  const [email, setEmail] = useState(p.email ?? "");
  const [telefono, setTelefono] = useState(p.telefono ?? "");
  const [elegidas, setElegidas] = useState<string[]>(p.resumenOpciones);
  const [resumenTexto, setResumenTexto] = useState(p.resumenTexto);
  const [pendiente, empezar] = useTransition();
  const [mensaje, setMensaje] = useState<{ ok?: string; error?: string }>({});

  const valores = Object.values(precios).map(aNumero).filter((n): n is number => n != null && !isNaN(n));
  const subtotal = redondear(valores.length ? valores.reduce((a, b) => a + b, 0) : (p.costoAnterior ?? 0));
  const t = calcularPagos(
    subtotal,
    aNumero(deposito) ?? 0,
    { iva: depositoIva, extra: aFraccion(depositoExtra) },
    { iva: balanceIva, extra: aFraccion(balanceExtra) },
  );

  const guardar = (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje({});
    empezar(async () => {
      const r = await guardarPagos(p.id, {
        precios: Object.fromEntries(Object.entries(precios).map(([k, v]) => [k, aNumero(v)])),
        deposito: aNumero(deposito),
        depositoIva,
        depositoExtra: aFraccion(depositoExtra),
        balanceIva,
        balanceExtra: aFraccion(balanceExtra),
        email: email || null,
        telefono: telefono || null,
        resumenOpciones: elegidas,
        resumenTexto,
      });
      setMensaje(r.error ? { error: r.error } : { ok: "Guardado ✓" });
      router.refresh();
    });
  };

  // Opciones para el resumen: las de sus servicios, más las ya elegidas que ya no estén en la lista
  const grupos = p.servicios.filter((s) => s.opciones.length).map((s) => ({ titulo: s.nombre, opciones: s.opciones }));
  const conocidas = new Set(grupos.flatMap((g) => g.opciones));
  const sueltas = elegidas.filter((o) => !conocidas.has(o));
  if (sueltas.length) grupos.push({ titulo: "Elegidas antes", opciones: sueltas });
  const alternar = (o: string) => setElegidas(elegidas.includes(o) ? elegidas.filter((x) => x !== o) : [...elegidas, o]);

  return (
    <form className="form" onSubmit={guardar}>
      {bloqueado && <p className="nota-chica">El contrato ya se envió: si cambias algo aquí, no cambia el contrato.</p>}

      {p.servicios.length ? (
        p.servicios.map((s) => (
          <label key={s.id} className="campo">
            <span className="campo-label">{s.nombre}</span>
            <span className="input-grupo">
              <span className="input-prefijo">$</span>
              <input
                className="input"
                inputMode="decimal"
                value={precios[s.id]}
                placeholder={s.lista != null ? String(s.lista) : "Precio"}
                onChange={(e) => setPrecios({ ...precios, [s.id]: e.target.value })}
              />
            </span>
            {s.descripcion && <span className="campo-ayuda">{s.descripcion}</span>}
            {s.lista != null && aNumero(precios[s.id]) !== s.lista && (
              <span className="campo-ayuda">
                Precio de lista {dinero(s.lista)}
                {aNumero(precios[s.id]) != null && aNumero(precios[s.id])! < s.lista && ` · descuento ${dinero(redondear(s.lista - aNumero(precios[s.id])!))}`}
              </span>
            )}
          </label>
        ))
      ) : (
        <p className="nota-chica">Este cliente no tiene paquetes. Añádelos con «Editar».</p>
      )}
      {!valores.length && p.costoAnterior != null && (
        <p className="nota-chica">Sin precios por paquete todavía: se usa el costo que venía de Airtable ({dinero(p.costoAnterior)}).</p>
      )}

      <fieldset className="campo">
        <legend className="campo-label">Resumen del servicio</legend>
        <span className="campo-ayuda">Va en el contrato, debajo de los paquetes.</span>
        {grupos.map((g) => (
          <div key={g.titulo} className="resumen-grupo">
            {grupos.length > 1 && <span className="resumen-titulo">{g.titulo}</span>}
            {g.opciones.map((o) => (
              <label key={o} className="resumen-opcion">
                <input type="checkbox" checked={elegidas.includes(o)} onChange={() => alternar(o)} />
                <span>{o}</span>
              </label>
            ))}
          </div>
        ))}
        {!grupos.length && (
          <span className="campo-ayuda">Para elegir opciones, añádelas en Paquetes → «Opciones del resumen».</span>
        )}
        <textarea
          className="input"
          rows={3}
          value={resumenTexto}
          placeholder="Detalle del servicio o solicitudes especiales"
          onChange={(e) => setResumenTexto(e.target.value)}
        />
      </fieldset>

      <label className="campo">
        <span className="campo-label">Depósito (sin impuestos)</span>
        <span className="input-grupo">
          <span className="input-prefijo">$</span>
          <input className="input" inputMode="decimal" value={deposito} onChange={(e) => setDeposito(e.target.value)} />
        </span>
        <span className="campo-ayuda">
          {p.depositoPagadoEn ? `Pagado el ${fecha(p.depositoPagadoEn)}` : "Se marca como pagado al enviar el invoice."}
        </span>
      </label>
      <Cargos
        titulo="depósito"
        iva={depositoIva}
        setIva={setDepositoIva}
        extra={depositoExtra}
        setExtra={setDepositoExtra}
      />
      <Cargos titulo="balance" iva={balanceIva} setIva={setBalanceIva} extra={balanceExtra} setExtra={setBalanceExtra} />

      <dl className="totales">
        <div>
          <dt>Costo de paquetes (sin impuestos)</dt>
          <dd>{dinero(subtotal, 2)}</dd>
        </div>
        <Detalle titulo="Depósito" pago={t.deposito} extra={depositoExtra} />
        <Detalle titulo="Balance" pago={t.balance} extra={balanceExtra} />
        {(t.iva > 0 || t.extra > 0) && (
          <div className="total">
            <dt>Total a cobrar</dt>
            <dd>{dinero(t.total, 2)} USD</dd>
          </div>
        )}
      </dl>
      {t.balance.base < 0 && <p className="error">El depósito es mayor que el costo de los paquetes.</p>}

      <label className="campo">
        <span className="campo-label">Email del cliente</span>
        <input className="input" type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} />
        <span className="campo-ayuda">Ahí le llegan el contrato y el invoice.</span>
      </label>
      <label className="campo">
        <span className="campo-label">Teléfono</span>
        <input className="input" type="tel" autoComplete="off" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
      </label>

      <button type="submit" className="btn btn-primario btn-bloque" disabled={pendiente}>
        {pendiente ? "Guardando…" : "Guardar"}
      </button>
      {mensaje.error && <p className="error">{mensaje.error}</p>}
      {mensaje.ok && <p className="nota-chica">{mensaje.ok}</p>}
    </form>
  );
}

/** IVA y % adicional de un pago (depósito o balance). */
function Cargos({
  titulo,
  iva,
  setIva,
  extra,
  setExtra,
}: {
  titulo: string;
  iva: boolean;
  setIva: (v: boolean) => void;
  extra: string;
  setExtra: (v: string) => void;
}) {
  return (
    <fieldset className="campo cargos">
      <legend className="campo-label">Impuestos del {titulo}</legend>
      <label className="resumen-opcion">
        <input type="checkbox" checked={iva} onChange={(e) => setIva(e.target.checked)} />
        <span>IVA 16 %</span>
      </label>
      <label className="cargos-extra">
        <span>% adicional</span>
        <span className="input-grupo">
          <input className="input" inputMode="decimal" placeholder="0" value={extra} onChange={(e) => setExtra(e.target.value)} />
          <span className="input-sufijo">%</span>
        </span>
      </label>
    </fieldset>
  );
}

/** Un pago con su detalle: base, IVA y % adicional (solo los que se usan) y lo que se cobra. */
function Detalle({ titulo, pago, extra }: { titulo: string; pago: Pago; extra: string }) {
  const conCargos = pago.iva > 0 || pago.extra > 0;
  return (
    <>
      <div className={conCargos ? undefined : "total"}>
        <dt>{titulo}{conCargos ? " (sin impuestos)" : ""}</dt>
        <dd>{dinero(pago.base, 2)}{conCargos ? "" : " USD"}</dd>
      </div>
      {pago.iva > 0 && (
        <div className="totales-sub">
          <dt>+ IVA 16 %</dt>
          <dd>{dinero(pago.iva, 2)}</dd>
        </div>
      )}
      {pago.extra > 0 && (
        <div className="totales-sub">
          <dt>+ {extra.trim()} % adicional</dt>
          <dd>{dinero(pago.extra, 2)}</dd>
        </div>
      )}
      {conCargos && (
        <div className="total">
          <dt>{titulo} a cobrar</dt>
          <dd>{dinero(pago.total, 2)} USD</dd>
        </div>
      )}
    </>
  );
}
