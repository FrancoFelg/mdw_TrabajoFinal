import type { Metadata, Viewport } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";
import { Navegacion } from '@/components/navegacion';
import { getSession } from '@/lib/session';
import { UsuarioService } from '../../services/usuario.service';
import { iniciales } from '@/components/marcas';
import { cookies } from 'next/headers';
import { COOKIE_TEMA, leerTema } from '@/lib/tema';

// Figtree: sans geométrica de apps móviles actuales; legible en pantallas chicas y con números tabulares.
const texto = Figtree({
  variable: "--font-texto",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Red de Apoyo | Emergencias comunitarias",
  description: "Reportá una emergencia de una persona en situación de calle. Trabajo final de Metodologías de Desarrollo Web, UAI.",
};

// Con un tema elegido a mano, la barra del navegador lo sigue; sin elección, sigue al sistema.
export async function generateViewport(): Promise<Viewport> {
  const tema = leerTema((await cookies()).get(COOKIE_TEMA)?.value);
  if (tema) return { themeColor: tema === 'dark' ? '#000000' : '#ffffff' };
  return { themeColor: [{ media: "(prefers-color-scheme: light)", color: "#ffffff" }, { media: "(prefers-color-scheme: dark)", color: "#000000" }] };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const usuario = await getSession();
  const tema = leerTema((await cookies()).get(COOKIE_TEMA)?.value);
  // Iniciales del nombre real para el avatar del encabezado (el token solo trae el nombre de usuario).
  const perfil = usuario ? await new UsuarioService().obtenerPerfil(usuario.id).catch(() => null) : null;
  return (
    <html lang="es" className={texto.variable} data-theme={tema ?? undefined}>
      <body className={usuario ? 'con-sesion' : undefined}><a href="#contenido" className="skip-link">Saltar al contenido</a><Navegacion usuario={usuario} iniciales={perfil ? iniciales(`${perfil.persona.nombre} ${perfil.persona.apellido}`) : undefined} /><main id="contenido" className="container">{children}</main><footer className="site-footer"><strong>Red de Apoyo</strong><span>Trabajo final · Metodologías de Desarrollo Web · UAI</span></footer></body>
    </html>
  );
}
