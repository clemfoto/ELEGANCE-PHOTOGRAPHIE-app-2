import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Las fotos se comprimen en el móvil antes de subir; esto deja margen para PDFs pequeños.
    serverActions: { bodySizeLimit: "5mb" },
    // Permite forbidden() para los permisos por rol.
    authInterrupts: true,
  },
};

export default nextConfig;
