import { MARCA } from "@/config/galerias";
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: MARCA.nombre,
    short_name: MARCA.corto,
    description: `Gestión interna de ${MARCA.nombre}`,
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F2F5F5",
    theme_color: "#F2F5F5",
    lang: "es",
    icons: [
      // Al cambiar un icono, cambiar también el nombre del archivo (-v3…): Android compara
      // el icono que tiene el móvil con el que descarga Google y, si no coinciden, no instala.
      { src: "/icons/icon-192-v1.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512-v1.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512-v1.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
