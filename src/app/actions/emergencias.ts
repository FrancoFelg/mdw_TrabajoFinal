'use server';

import { revalidatePath } from 'next/cache';
import { EmergenciaService } from '../../../services/emergencia.service';
import { getSession } from '@/lib/session';

// Acciones sobre un caso (historias 10 y 11). El reporte vive con su pantalla.

export type ResultadoCaso = { ok: boolean; error: string };

const ERRORES_CASO: Record<string, string> = {
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
  const informe = String(datos.get('informe') ?? '').trim();
  if (informe.length < 10) return { ok: false, error: 'Contá en al menos 10 caracteres cómo terminó la atención.' };
  try {
    await new EmergenciaService().finalizarEmergencia(id, sesion.id, informe);
  } catch (error) {
    return errorCaso(error);
  }
  revalidatePath('/casos');
  revalidatePath(`/casos/${id}`);
  return { ok: true, error: '' };
}
