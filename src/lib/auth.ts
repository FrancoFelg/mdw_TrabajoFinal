import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { Rol } from '@prisma/client';

export interface UsuarioToken {
  id: string;
  nombreUsuario?: string;
  rol?: Rol;
}

// Devuelve el payload del JWT (id, nombreUsuario, rol) o null si no hay token válido.
export function getUserFromRequest(req: NextRequest): UsuarioToken | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as UsuarioToken;
    return decoded;
  } catch {
    return null;
  }
}

export function getUserIdFromRequest(req: NextRequest): string | null {
  return getUserFromRequest(req)?.id ?? null;
}

// true si el usuario tiene rol COORDINADOR o ADMIN (los únicos que gestionan el catálogo).
export function esCoordinadorOAdmin(usuario: UsuarioToken | null): boolean {
  return usuario?.rol === Rol.COORDINADOR || usuario?.rol === Rol.ADMIN;
}
