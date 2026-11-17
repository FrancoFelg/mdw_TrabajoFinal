import { NextRequest } from 'next/server';
import { getUserFromRequest } from './auth';
import { db } from '../../config/database';

// El JWT identifica la cuenta; los permisos se consultan en la base vigente.
export async function actorActual(req: NextRequest) {
  const token = getUserFromRequest(req);
  return token ? db.usuario.findUnique({ where: { id: token.id }, select: { id: true, rol: true, nombreUsuario: true } }) : null;
}

// Para pantallas: ¿la cuenta es coordinación o admin según la base vigente?
export async function esCoordinacionVigente(usuarioId: string) {
  const usuario = await db.usuario.findUnique({ where: { id: usuarioId }, select: { rol: true } });
  return usuario?.rol === 'COORDINADOR' || usuario?.rol === 'ADMIN';
}
