"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { guardarPagos } from "@/app/(app)/t/pagos";
import type { Pagos } from "@/lib/pagos";
import { dinero, fecha } from "@/lib/formato";

const IVA = 0.16;
const aTexto = (n: number | null) => (n == null ? "" : String(n));
const aNumero = (s: string) => (s.trim() === "" ? null : Number(s.replace(/[$,\s]/g, "")));
const redondear = (n: number) => Math.round(n * 100) / 100;

/**
 * Precio de cada servicio para este cliente (empieza con el de lista y se puede bajar, p. ej. con
 * un descuento), IVA, depósito y datos de contacto; los totales se recalculan al escribir.
 */
export default function FormPagos({ p, bloqueado }: { p: Pagos; bloqueado: boolean }) {
  const router = useRouter();
  const [precios, setPrecios] = useState(() => Object.fromEntries(p.servicios.map((s) => [s.id, aTexto(s.precio)])));
  const [aplicaIva, setAplicaIva] = useState(p.aplicaIva);
  const [deposito, setDeposito] = useState(aTexto(p.deposito));
  const [email, setEmail] = useState(p.email ?? "");
  const [telefono, setTelefono] = useState(p.telefono ?? "");
  const [pendiente, empezar] = useTransition();
  const [mensaje, setMensaje] = useState<{ ok?: string; error?: string }>({});

  const valores = Object.values(precios).map(aNumero).filter((n): n is number => n != null && !isNaN(n));
  const subtotal = redondear(valores.length ? valores.reduce((a, b) => a + b, 0) : (p.costoAnterior ?? 0));
  const iva = aplicaIva ? redondear(subtotal * IVA) : 0;
  const total = redondear(subtotal + iva);
  const balance = redondear(total - (aNumero(deposito) ?? 0));

  const guardar = (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje({});
    empezar(async () => {
      const r = await guardarPagos(p.id, {
        precios: Object.fromEntries(Object.entries(precios).map(([k, v]) => [k, aNumero(v)])),
        aplicaIva,
        deposito: aNumero(deposito),
        email: email || null,
        telefono: telefono || null,
      });
      setMensaje(r.error ? { error: r.error } : { ok: "Guardado ✓" });
      router.refresh();
    });
  };

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
            {s.lista != null && aNumero(precios[s.id]) !== s.lista && (
              <span className="campo-ayuda">
                Precio de lista {dinero(s.lista)}
                {aNumero(precios[s.id]) != null && aNumero(precios[s.id])! < s.lista && ` · descuento ${dinero(redondear(s.lista - aNumero(precios[s.id])!))}`}
              </span>
            )}
          </label>
        ))
      ) : (
        <p className="nota-chica">Este cliente no tiene servicios. Añádelos con «Editar».</p>
      )}
      {!valores.length && p.costoAnterior != null && (
        <p className="nota-chica">Sin precios por servicio todavía: se usa el costo que venía de Airtable ({dinero(p.costoAnterior)}).</p>
      )}

      <label className="campo campo-check">
        <span className="campo-label">Aplica IVA (16 %)</span>
        <input type="checkbox" checked={aplicaIva} onChange={(e) => setAplicaIva(e.target.checked)} />
      </label>

      <label className="campo">
        <span className="campo-label">Depósito</span>
        <span className="input-grupo">
          <span className="input-prefijo">$</span>
          <input className="input" inputMode="decimal" value={deposito} onChange={(e) => setDeposito(e.target.value)} />
        </span>
        <span className="campo-ayuda">
          {p.depositoPagadoEn ? `Pagado el ${fecha(p.depositoPagadoEn)}` : "Se marca como pagado al enviar el contrato con el invoice."}
        </span>
      </label>

      <dl className="totales">
        <div>
          <dt>Subtotal</dt>
          <dd>{dinero(subtotal, 2)}</dd>
        </div>
        {aplicaIva && (
          <div>
            <dt>IVA</dt>
            <dd>{dinero(iva, 2)}</dd>
          </div>
        )}
        <div className="total">
          <dt>Costo total</dt>
          <dd>{dinero(total, 2)} USD</dd>
        </div>
        <div>
          <dt>Depósito{p.depositoPagadoEn ? " ✓" : ""}</dt>
          <dd>{dinero(aNumero(deposito) ?? 0, 2)}</dd>
        </div>
        <div className="total">
          <dt>Balance</dt>
          <dd>{dinero(balance, 2)} USD</dd>
        </div>
      </dl>

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
