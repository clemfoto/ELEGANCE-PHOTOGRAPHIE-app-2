import "server-only";
import { getStore } from "@netlify/blobs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Guardado de datos: documentos JSON en Netlify Blobs (incluido en el sitio de Netlify, sin cuentas extra).
 * En local (ALMACEN=archivo) se guardan en la carpeta .datos/.
 */

const enArchivo = () => process.env.ALMACEN === "archivo";
const carpeta = () => path.join(process.cwd(), ".datos");

const store = () => getStore({ name: "organizador", consistency: "strong" });

export async function leer<T>(clave: string, porDefecto: T): Promise<T> {
  if (enArchivo()) {
    try {
      return JSON.parse(await readFile(path.join(carpeta(), `${clave}.json`), "utf8")) as T;
    } catch {
      return porDefecto;
    }
  }
  const v = (await store().get(clave, { type: "json" })) as T | null;
  return v ?? porDefecto;
}

export async function guardar(clave: string, valor: unknown): Promise<void> {
  if (enArchivo()) {
    await mkdir(carpeta(), { recursive: true });
    await writeFile(path.join(carpeta(), `${clave}.json`), JSON.stringify(valor, null, 1));
    return;
  }
  await store().setJSON(clave, valor);
}

/** Lee, cambia y guarda un documento; las escrituras del mismo proceso van en fila para no pisarse. */
let cola: Promise<unknown> = Promise.resolve();
export function modificar<T>(clave: string, porDefecto: T, cambio: (v: T) => T | void): Promise<T> {
  const paso = cola.then(async () => {
    const actual = await leer(clave, porDefecto);
    const nuevo = (cambio(actual) ?? actual) as T;
    await guardar(clave, nuevo);
    return nuevo;
  });
  cola = paso.catch(() => {});
  return paso;
}
