import { MONEDA } from "@/config/negocios";

const f = new Intl.NumberFormat(MONEDA.locale, { style: "currency", currency: MONEDA.codigo, maximumFractionDigits: 2, minimumFractionDigits: 0 });
export const dinero = (n: number) => f.format(n);
