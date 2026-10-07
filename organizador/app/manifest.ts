import type { MetadataRoute } from "next";
import { APP } from "@/config/negocios";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP.nombre,
    short_name: APP.corto,
    description: "Tareas, calendario y contabilidad de Elegance, Signatap y tugirodigital.mx",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F2F5F5",
    theme_color: "#F2F5F5",
    lang: "es",
    icons: [
      { src: "/icons/icon-192-v1.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512-v1.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512-v1.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
