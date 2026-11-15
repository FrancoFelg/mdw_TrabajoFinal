'use server';

import { revalidatePath } from 'next/cache';
import { NotificacionService } from '../../../services/notificacion.service';
import { getSession } from '@/lib/session';

export async function marcarLeidaAction(id: string) {
  const sesion = await getSession();
  if (!sesion) return;
  await new NotificacionService().marcarLeida(id, sesion.id);
  revalidatePath('/notificaciones');
}

export async function marcarTodasAction() {
  const sesion = await getSession();
  if (!sesion) return;
  await new NotificacionService().marcarTodas(sesion.id);
  revalidatePath('/notificaciones');
}

type Suscripcion = { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };

// El navegador entrega la suscripción Web Push; se guarda asociada a la sesión.
export async function guardarSuscripcionAction(sub: Suscripcion): Promise<{ ok: boolean; error?: string }> {
  const sesion = await getSession();
  if (!sesion) return { ok: false, error: 'Tu sesión venció. Volvé a ingresar.' };
  const { endpoint, keys } = sub ?? {};
  if (typeof endpoint !== 'string' || !/^https:\/\//.test(endpoint) || endpoint.length > 512 || typeof keys?.p256dh !== 'string' || typeof keys?.auth !== 'string') {
    return { ok: false, error: 'El navegador devolvió una suscripción inválida. Probá de nuevo.' };
  }
  await new NotificacionService().guardarSuscripcion(sesion.id, { endpoint, p256dh: keys.p256dh, auth: keys.auth });
  return { ok: true };
}

export async function borrarSuscripcionAction(endpoint: string) {
  const sesion = await getSession();
  if (!sesion || typeof endpoint !== 'string') return;
  await new NotificacionService().borrarSuscripcion(sesion.id, endpoint);
}

export async function estaSuscriptoAction(endpoint: string) {
  const sesion = await getSession();
  if (!sesion || typeof endpoint !== 'string') return false;
  return new NotificacionService().tieneSuscripcion(sesion.id, endpoint);
}
