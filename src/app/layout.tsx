import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navegacion } from '@/components/navegacion';
import { getSession } from '@/lib/session';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Red de Apoyo | Emergencias comunitarias",
  description: "Gestión de cursos y certificados. Trabajo final de Metodologías de Desarrollo Web, UAI.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body><a href="#contenido" className="skip-link">Saltar al contenido</a><Navegacion usuario={await getSession()} /><main id="contenido" className="container">{children}</main><footer className="site-footer"><strong>Red de Apoyo</strong><span>Comunidad, formación y asistencia · MDW · UAI</span></footer></body>
    </html>
  );
}
