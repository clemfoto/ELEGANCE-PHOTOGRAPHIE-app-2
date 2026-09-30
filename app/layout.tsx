import { MARCA } from "@/config/galerias";
import type { Metadata, Viewport } from "next";
import { Fraunces, Hanken_Grotesk } from "next/font/google";
import RegistrarSW from "@/components/RegistrarSW";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-titulo", display: "swap" });
const hanken = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-texto", display: "swap" });

export const metadata: Metadata = {
  title: { default: MARCA.nombre, template: `%s · ${MARCA.corto}` },
  description: `Gestión interna de ${MARCA.nombre}`,
  applicationName: MARCA.corto,
  appleWebApp: { capable: true, title: MARCA.corto, statusBarStyle: "default" },
  formatDetection: { telephone: false },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F2F5F5",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${fraunces.variable} ${hanken.variable}`}>
      <body>
        {children}
        <RegistrarSW />
      </body>
    </html>
  );
}
