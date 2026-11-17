'use server';

import { revalidatePath } from 'next/cache';
import { EmergenciaService } from '../../../services/emergencia.service';
import { getSession } from '@/lib/session';

// Acciones sobre un caso (historias 10 y 11). El reporte vive con su pantalla.

export type ResultadoCaso = { ok: boolean; error: string; campos?: Record<string, string> };

const ERRORES_CASO: Record<string, string> = {
  ROL_VOLUNTARIO_REQUERIDO: 'Solo voluntarios pueden atender emergencias.',
  INFORME_INVALIDO: 'Ingresá un informe de 10 a 10000 caracteres.',
  EMERGENCIA_NO_ENCONTRADA: 'Este caso ya no existe.',
  EMERGENCIA_YA_ASIGNADA: 'Otro voluntario tomó este caso antes que vos.',
  CONCURRENCIA_EMERGENCIA_TOMADA: 'Otro voluntario tomó este caso antes que vos.',
  VOLUNTARIO_CON_EMERGENCIA_ACTIVA: 'Ya tenés un caso en camino. Finalizalo antes de tomar otro.',
  REQUIERE_CERTIFICADO_APROBADO: 'Los casos rojos los toma quien tiene un certificado aprobado.',
  EMERGENCIA_NO_ESTA_EN_PROCESO: 'Este caso no está en camino, así que no se puede finalizar.',
  NO_ES_EL_VOLUNTARIO_ASIGNADO: 'Solo quien tomó el caso lo puede finalizar.',
};

function errorCaso(error: unknown) {
  const mensaje = error instanceof Error ? ERRORES_CASO[error.message] : undefined;
  if (!mensaje) console.error('Error en acción de caso:', error);
  return { ok: false, error: mensaje ?? 'No pudimos guardar el cambio. Intentá de nuevo.' };
}

export async function tomarCasoAction(id: string): Promise<ResultadoCaso> {
  const sesion = await getSession();
  if (!sesion) return { ok: false, error: 'Tu sesión venció. Volvé a ingresar.' };
  if (sesion.rol !== 'VOLUNTARIO') return { ok: false, error: 'Solo voluntarios pueden atender emergencias.' };
  try {
    await new EmergenciaService().tomarEmergencia(id, sesion.id);
  } catch (error) {
    revalidatePath(`/casos/${id}`);
    return errorCaso(error);
  }
  revalidatePath('/casos');
  revalidatePath(`/casos/${id}`);
  return { ok: true, error: '' };
}

export async function finalizarCasoAction(id: string, _estado: ResultadoCaso, datos: FormData): Promise<ResultadoCaso> {
  const sesion = await getSession();
  if (!sesion) return { ok: false, error: 'Tu sesión venció. Volvé a ingresar.' };
  if (sesion.rol !== 'VOLUNTARIO') return { ok: false, error: 'Solo voluntarios pueden atender emergencias.' };
  const informe = String(datos.get('informe') ?? '').trim();
  if (informe.length < 10 || informe.length > 10000) return { ok: false, error: '', campos: { informe: 'Contá cómo terminó la atención (10 a 10000 caracteres).' } };
  try {
    await new EmergenciaService().finalizarEmergencia(id, sesion.id, informe);
  } catch (error) {
    return errorCaso(error);
  }
  revalidatePath('/casos');
  revalidatePath(`/casos/${id}`);
  return { ok: true, error: '' };
}
