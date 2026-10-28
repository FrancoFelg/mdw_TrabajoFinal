'use server';

import { revalidatePath } from 'next/cache';
import { CertificadoService } from '../../../services/certificado.service';
import { CursoService } from '../../../services/curso.service';
import { getSession } from '@/lib/session';
import { esCoordinador } from '@/lib/casos';
import { avisarCertificadoNuevo } from '@/lib/avisos';

// `campo` dice qué control marcar con aria-invalid y enfocar; sin campo, el error es del formulario.
export type Resultado = { ok: boolean; error: string; campo?: string; mensaje?: string };

const ERRORES: Record<string, { texto: string; campo?: string }> = {
  CAMPOS_OBLIGATORIOS_FALTANTES: { texto: 'Completá todos los campos obligatorios.' },
  RANGO_FECHAS_INVALIDO: { texto: 'La fecha de fin no puede ser anterior a la de inicio.', campo: 'fechaHasta' },
  FECHA_INVALIDA: { texto: 'Revisá las fechas: alguna no es válida.', campo: 'fechaDesde' },
  ESTADO_NO_PENDIENTE: { texto: 'Este certificado ya fue revisado por otra persona.' },
  CERTIFICADO_NO_ENCONTRADO: { texto: 'Este certificado ya no existe.' },
  AUTOVALIDACION_NO_PERMITIDA: { texto: 'No podés revisar tu propio certificado: lo revisa otra persona de coordinación.' },
  MOTIVO_RECHAZO_REQUERIDO: { texto: 'Contá el motivo del rechazo (al menos 5 caracteres): la persona lo va a ver.', campo: 'motivo' },
  ARCHIVO_DEMASIADO_GRANDE: { texto: 'El archivo pesa más de 5 MB. Sacale una foto o exportá el PDF más liviano.', campo: 'archivo' },
  ARCHIVO_TIPO_NO_PERMITIDO: { texto: 'El archivo tiene que ser un PDF o una imagen (JPG, PNG o WEBP).', campo: 'archivo' },
  ARCHIVO_VACIO: { texto: 'El archivo llegó vacío. Elegilo de nuevo.', campo: 'archivo' },
};

function fallo(error: unknown): Resultado {
  if (error instanceof Error && 'code' in error && error.code === 'P2002') return { ok: false, error: 'Ese código de verificación ya está cargado.', campo: 'codigo' };
  const conocido = error instanceof Error ? ERRORES[error.message] : undefined;
  if (!conocido) console.error('Error en formación:', error);
  return { ok: false, error: conocido?.texto ?? 'No pudimos guardar el cambio. Intentá de nuevo.', campo: conocido?.campo };
}

// El voluntario carga su propio certificado con el archivo (historia 5); queda PENDIENTE (regla 6).
export async function cargarCertificadoAction(_estado: Resultado, datos: FormData): Promise<Resultado> {
  const sesion = await getSession();
  if (!sesion) return { ok: false, error: 'Tu sesión venció. Volvé a ingresar.' };
  const codigoVerificacion = String(datos.get('codigo') ?? '').trim();
  const curso = String(datos.get('cursoId') ?? '');
  const cursoId = curso && curso !== 'externo' ? curso : undefined;
  const archivo = datos.get('archivo');
  if (!(archivo instanceof File) || archivo.size === 0) return { ok: false, error: 'Adjuntá el certificado: una foto o el PDF.', campo: 'archivo' };
  if (codigoVerificacion.length < 3) return { ok: false, error: 'Ingresá el código de verificación que figura en el certificado.', campo: 'codigo' };
  const servicio = new CertificadoService();
  let validado: Awaited<ReturnType<CertificadoService['validarArchivo']>>;
  let id: string;
  try {
    validado = await servicio.validarArchivo(archivo);
    id = (await servicio.crearCertificado({ usuarioId: sesion.id, codigoVerificacion, cursoId }, sesion.id)).id;
  } catch (error) {
    return fallo(error);
  }
  try {
    await servicio.guardarArchivo(id, validado);
  } catch (error) {
    // Sin archivo no hay nada que verificar: se descarta el alta y el código queda libre para reintentar.
    await servicio.descartarAlta(id).catch(() => {});
    return fallo(error);
  }
  avisarCertificadoNuevo(id, sesion.id);
  revalidatePath('/formacion');
  revalidatePath('/cuenta');
  revalidatePath('/equipo');
  return { ok: true, error: '', mensaje: 'Certificado cargado. Queda en revisión hasta que lo apruebe alguien de coordinación.' };
}

export async function revisarCertificadoAction(id: string, aprobar: boolean, motivo?: string): Promise<Resultado> {
  const sesion = await getSession();
  if (!sesion || !esCoordinador(sesion.rol)) return { ok: false, error: 'Solo coordinadores pueden validar certificados.' };
  try {
    await new CertificadoService().cambiarEstado(id, aprobar ? 'APROBADO' : 'RECHAZADO', sesion.id, motivo);
  } catch (error) {
    return fallo(error);
  }
  revalidatePath('/equipo');
  revalidatePath('/formacion');
  return { ok: true, error: '' };
}

export async function crearCursoAction(_estado: Resultado, datos: FormData): Promise<Resultado> {
  const sesion = await getSession();
  if (!sesion || !esCoordinador(sesion.rol)) return { ok: false, error: 'Solo coordinadores pueden crear cursos.' };
  const leer = (campo: string) => String(datos.get(campo) ?? '').trim();
  for (const [campo, texto] of [['titulo', 'Poné un título al curso.'], ['descripcion', 'Contá de qué se trata el curso.'], ['fechaDesde', 'Elegí la fecha de inicio.'], ['fechaHasta', 'Elegí la fecha de fin.']] as const) {
    if (!leer(campo)) return { ok: false, error: texto, campo };
  }
  try {
    await new CursoService().crear({ titulo: leer('titulo'), descripcion: leer('descripcion'), fechaDesde: leer('fechaDesde'), fechaHasta: leer('fechaHasta') }, sesion.id);
  } catch (error) {
    return fallo(error);
  }
  revalidatePath('/formacion');
  return { ok: true, error: '', mensaje: 'Curso creado.' };
}
