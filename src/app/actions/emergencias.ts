'use server';

import { revalidatePath } from 'next/cache';
import { CrearEmergenciaSchema, EmergenciaService } from '../../../services/emergencia.service';
import { AdjuntoService } from '../../../services/adjunto.service';
import { getSession } from '@/lib/session';
import { codigoCaso, estimarProvincia } from '@/lib/casos';
import { avisarEmergenciaNueva } from '@/lib/avisos';

export type ResultadoReporte = { ok: true; codigo: string; direccion?: string; avisos: string[] } | { ok: false; error: string };

const ERRORES_REPORTE: Record<string, string> = {
  DIRECCION_NO_ENCONTRADA: 'No encontramos esa dirección. Revisá calle, altura y localidad.',
  PROVINCIA_NO_RECONOCIDA: 'No pudimos saber en qué provincia queda esa dirección. Agregá la localidad.',
  GOOGLE_MAPS_NO_CONFIGURADO: 'Ahora no podemos ubicar direcciones escritas. Probá con “Usar mi ubicación”.',
  GOOGLE_MAPS_NO_DISPONIBLE: 'Ahora no podemos ubicar direcciones escritas. Probá con “Usar mi ubicación”.',
};

const ERRORES_ADJUNTO: Record<string, string> = {
  ADJUNTO_DEMASIADO_GRANDE: 'es demasiado pesado',
  AUDIO_DEMASIADO_LARGO: 'dura más de un minuto',
  ADJUNTO_TIPO_NO_PERMITIDO: 'no tiene un formato que podamos guardar',
  ADJUNTO_VACIO: 'llegó vacío',
};

type Validado = Awaited<ReturnType<AdjuntoService['validar']>>;
const NOMBRES = { IMAGEN: 'La foto', AUDIO: 'El audio' } as const;

function motivo(error: unknown) {
  const m = error instanceof Error ? ERRORES_ADJUNTO[error.message] : undefined;
  if (!m) console.error('Error con un adjunto del reporte:', error);
  return m;
}

// Primero se validan foto y audio (sin guardar), así se sabe si el audio puede reemplazar al texto.
async function validarAdjuntos(archivos?: FormData) {
  const validos: Partial<Record<'IMAGEN' | 'AUDIO', Validado>> = {};
  const avisos: string[] = [];
  if (!archivos) return { validos, avisos };
  const servicio = new AdjuntoService();
  const duracion = Number(archivos.get('audioDuracion'));
  for (const tipo of ['IMAGEN', 'AUDIO'] as const) {
    const archivo = archivos.get(tipo === 'IMAGEN' ? 'imagen' : 'audio');
    if (!(archivo instanceof File) || archivo.size === 0) continue;
    try {
      validos[tipo] = await servicio.validar(tipo, archivo, tipo === 'AUDIO' && Number.isFinite(duracion) ? Math.round(duracion) : undefined);
    } catch (error) {
      const m = motivo(error);
      avisos.push(`${NOMBRES[tipo]} no se pudo guardar${m ? ` porque ${m}` : ''}.`);
    }
  }
  return { validos, avisos };
}

// Se guardan después de crear el reporte: si fallan, la emergencia igual queda registrada.
async function guardarAdjuntos(emergenciaId: string, validos: Partial<Record<'IMAGEN' | 'AUDIO', Validado>>) {
  const avisos: string[] = [];
  const servicio = new AdjuntoService();
  for (const tipo of ['IMAGEN', 'AUDIO'] as const) {
    const v = validos[tipo];
    if (!v) continue;
    try {
      await servicio.guardar(emergenciaId, v);
    } catch (error) {
      motivo(error);
      avisos.push(`${NOMBRES[tipo]} no se pudo guardar.`);
    }
  }
  return avisos;
}

// Reporte público: no pide sesión (spec §6, regla 1).
export async function reportarAction(datos: unknown, archivos?: FormData): Promise<ResultadoReporte> {
  // Con GPS, la provincia la resuelve el servidor: no se le pregunta a quien reporta.
  const entrada = (datos && typeof datos === 'object' ? { ...datos } : {}) as Record<string, unknown>;
  const { validos, avisos: avisosValidacion } = await validarAdjuntos(archivos);
  // Con audio no hace falta escribir: la descripción remite al audio adjunto.
  const texto = typeof entrada.descripcion === 'string' ? entrada.descripcion.trim() : '';
  if (texto.length < 5) {
    if (!validos.AUDIO) return { ok: false, error: avisosValidacion.find(a => a.startsWith('El audio')) ?? 'Contá qué está pasando: escribilo (al menos 5 caracteres) o grabá un audio.' };
    entrada.descripcion = texto ? `${texto} · Reporte por audio` : 'Reporte por audio: escuchá el audio adjunto.';
  }
  if (typeof entrada.coordenada_x === 'number' && typeof entrada.coordenada_y === 'number' && entrada.provincia === undefined) {
    entrada.provincia = estimarProvincia(entrada.coordenada_y, entrada.coordenada_x);
  }
  const validacion = CrearEmergenciaSchema.safeParse(entrada);
  if (!validacion.success) return { ok: false, error: validacion.error.issues.map(i => i.message).join(' ') };
  try {
    const emergencia = await new EmergenciaService().crear(validacion.data);
    avisarEmergenciaNueva(emergencia);
    const avisos = [...avisosValidacion, ...await guardarAdjuntos(emergencia.id, validos)];
    revalidatePath('/casos');
    return { ok: true, codigo: codigoCaso(emergencia.id), direccion: emergencia.direccionFormateada, avisos };
  } catch (error) {
    const mensaje = error instanceof Error ? ERRORES_REPORTE[error.message] : undefined;
    if (!mensaje) console.error('Error al reportar emergencia:', error);
    return { ok: false, error: mensaje ?? 'No pudimos enviar el reporte. Intentá de nuevo en unos segundos; lo que escribiste sigue acá.' };
  }
}

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
