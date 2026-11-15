// Tema elegido a mano; sin elección (null) la app sigue al sistema.
export type Tema = 'light' | 'dark';
export const COOKIE_TEMA = 'tema';

export function leerTema(valor: string | undefined): Tema | null {
  return valor === 'light' || valor === 'dark' ? valor : null;
}
