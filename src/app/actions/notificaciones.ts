'use server';

import { revalidatePath } from 'next/cache';
import { NotificacionService } from '../../../services/notificacion.service';
import { getSession } from '@/lib/session';
import { falloFormulario, type ResultadoFormulario } from '@/lib/formulario';

// Todos los roles registrados pueden administrar exclusivamente sus propios avisos.
async function sesionAvisos() {
  const sesion = await getSession();
  return sesion?.rol && ['VOLUNTARIO', 'COORDINADOR', 'ADMIN'].includes(sesion.rol) ? sesion : null;
}

export async function marcarLeidaAction(id: string) {
  const sesion = await sesionAvisos();
  if (!sesion) return;
  await new NotificacionService().marcarLeida(id, sesion.id);
  revalidatePath('/notificaciones');
}

export async function marcarTodasAction(): Promise<ResultadoFormulario> {
  try {
    const sesion = await sesionAvisos();
    if (!sesion) throw new Error('SIN_SESION');
    await new NotificacionService().marcarTodas(sesion.id);
    revalidatePath('/notificaciones');
    return { ok: true, error: '', campos: {} };
  } catch (error) { return falloFormulario(error); }
}

type Suscripcion = { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };

// El navegador entrega la suscripción Web Push; se guarda asociada a la sesión.
export async function guardarSuscripcionAction(sub: Suscripcion): Promise<{ ok: boolean; error?: string }> {
  const sesion = await sesionAvisos();
  if (!sesion) return { ok: false, error: 'Tu sesión venció. Volvé a ingresar.' };
  const { endpoint, keys } = sub ?? {};
  if (typeof endpoint !== 'string' || !/^https:\/\//.test(endpoint) || endpoint.length > 512 || typeof keys?.p256dh !== 'string' || typeof keys?.auth !== 'string') {
    return { ok: false, error: 'El navegador devolvió una suscripción inválida. Probá de nuevo.' };
  }
  await new NotificacionService().guardarSuscripcion(sesion.id, { endpoint, p256dh: keys.p256dh, auth: keys.auth });
  revalidatePath('/notificaciones');
  return { ok: true };
}

export async function borrarSuscripcionAction(endpoint: string) {
  const sesion = await sesionAvisos();
  if (!sesion || typeof endpoint !== 'string') return;
  await new NotificacionService().borrarSuscripcion(sesion.id, endpoint);
  revalidatePath('/notificaciones');
}

export async function estaSuscriptoAction(endpoint: string) {
  const sesion = await sesionAvisos();
  if (!sesion || typeof endpoint !== 'string') return false;
  return new NotificacionService().tieneSuscripcion(sesion.id, endpoint);
}
