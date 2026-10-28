'use server';

import { revalidatePath } from 'next/cache';
import { SolicitudAscensoService } from '../../../services/solicitudAscenso.service';
import { getSession } from '@/lib/session';
import { esCoordinador } from '@/lib/casos';
import { avisarAscensoNuevo } from '@/lib/avisos';

export type Resultado = { ok: boolean; error: string };

const ERRORES: Record<string, string> = {
  SOLICITUD_PENDIENTE_EXISTENTE: 'Ya tenés una solicitud esperando respuesta.',
  SOLICITUD_NO_PENDIENTE: 'Esta solicitud ya fue respondida.',
  USUARIO_YA_ES_COORDINADOR: 'Esta persona ya es coordinadora.',
  SOLICITUD_NO_ENCONTRADA: 'Esta solicitud ya no existe.',
};

function fallo(error: unknown): Resultado {
  const mensaje = error instanceof Error ? ERRORES[error.message] : undefined;
  if (!mensaje) console.error('Error en ascensos:', error);
  return { ok: false, error: mensaje ?? 'No pudimos guardar el cambio. Intentá de nuevo.' };
}

export async function solicitarAscensoAction(): Promise<Resultado> {
  const sesion = await getSession();
  if (!sesion) return { ok: false, error: 'Tu sesión venció. Volvé a ingresar.' };
  if (sesion.rol !== 'VOLUNTARIO') return { ok: false, error: 'Ya tenés rol de coordinación.' };
  try {
    const solicitud = await new SolicitudAscensoService().crear(sesion.id);
    avisarAscensoNuevo(solicitud.id, sesion.id);
  } catch (error) {
    return fallo(error);
  }
  revalidatePath('/cuenta');
  revalidatePath('/equipo');
  return { ok: true, error: '' };
}

export async function responderAscensoAction(id: string, aprobar: boolean): Promise<Resultado> {
  const sesion = await getSession();
  if (!sesion || !esCoordinador(sesion.rol)) return { ok: false, error: 'Solo coordinadores pueden responder solicitudes.' };
  try {
    const servicio = new SolicitudAscensoService();
    if (aprobar) await servicio.aprobar(id);
    else await servicio.rechazar(id);
  } catch (error) {
    return fallo(error);
  }
  revalidatePath('/equipo');
  return { ok: true, error: '' };
}
