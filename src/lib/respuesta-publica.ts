import { NextResponse } from 'next/server';

// Defensa adicional al serializar cualquier respuesta de API, incluidas relaciones.
export function jsonPublico(body: unknown, init?: ResponseInit) {
  const publico = JSON.parse(JSON.stringify(body, (clave, valor) =>
    /^(password|passwordHash|password_hash|hashPassword)$/i.test(clave) ? undefined : valor));
  return NextResponse.json(publico, init);
}
