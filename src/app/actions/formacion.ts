'use server';

import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/session';
import { falloFormulario, type ResultadoFormulario } from '@/lib/formulario';
import { errorCertificado } from '@/lib/certificadoErrores';
import { mensajeErrorCurso } from '@/lib/cursoErrores';
import { resolverCertificado } from '@/lib/certificados';
import { avisarCertificadoNuevo } from '@/lib/avisos';
import { CertificadoService } from '../../../services/certificado.service';
import { CursoService } from '../../../services/curso.service';

// Server Actions de «Formación»: certificados, cursos y revisión. Usan los mismos servicios que la API,
// así las reglas (dueño, estados, copia de datos del curso, único activo por curso) son las mismas.

const bien: ResultadoFormulario = { ok: true, error: '', campos: {} };

async function actor(coordinacion = false) {
  const usuario = await getSession(); // Rol vigente leído de la base.
  if (!usuario) throw new Error('SIN_SESION');
  if (coordinacion && usuario.rol !== 'COORDINADOR' && usuario.rol !== 'ADMIN') throw new Error('SIN_PERMISO');
  return usuario;
}

// `campo` de los errores de certificados → `name` del control en el formulario.
const CAMPO_CERTIFICADO: Record<string, string> = { atributos: 'datosAdicionales' };
const CAMPO_CURSO: Record<string, string> = {
  TITULO_VACIO: 'titulo', DESCRIPCION_VACIA: 'descripcion', RANGO_FECHAS_INVALIDO: 'fechaHasta',
  HORAS_INVALIDAS: 'horas', CERTIFICADO_INCOMPLETO: 'certificadoNombre',
  ATRIBUTO_DUPLICADO: 'datosAdicionales', ATRIBUTO_NO_ENCONTRADO: 'datosAdicionales', ATRIBUTO_INCOMPLETO_CAMPO_Y_DATO_REQUERIDOS: 'datosAdicionales',
};

const MENSAJE_CURSO_EN_PANTALLA: Record<string, string> = {
  ATRIBUTO_INCOMPLETO_CAMPO_Y_DATO_REQUERIDOS: 'Completá o quitá los datos adicionales vacíos.',
  RANGO_FECHAS_INVALIDO: 'La fecha de fin no puede ser anterior a la de inicio.',
  FECHA_INVALIDA: 'Elegí fechas de inicio y fin válidas.',
  CAMPOS_OBLIGATORIOS_FALTANTES: 'Completá el título, la descripción y las fechas.',
};

// Error de negocio con campo → debajo del campo; sin campo → arriba del formulario.
function fallo(error: unknown, tipo: 'certificado' | 'curso'): ResultadoFormulario {
  const codigo = error instanceof Error ? error.message : '';
  const enCampo = (campo: string | undefined, mensaje: string): ResultadoFormulario =>
    campo ? { ok: false, error: '', campos: { [campo]: mensaje } } : { ok: false, error: mensaje, campos: {} };
  const certificado = tipo === 'certificado' ? errorCertificado(codigo) : null;
  if (certificado) return enCampo(certificado.campo && (CAMPO_CERTIFICADO[certificado.campo] ?? certificado.campo), certificado.mensaje);
  // Algunos mensajes de la API nombran campos técnicos; en pantalla se explican con las palabras del formulario.
  const curso = MENSAJE_CURSO_EN_PANTALLA[codigo] ?? mensajeErrorCurso(codigo);
  if (curso) return enCampo(tipo === 'curso' ? CAMPO_CURSO[codigo] : undefined, curso);
  if (codigo !== 'SIN_SESION' && codigo !== 'SIN_PERMISO') console.error(`Error en el formulario de ${tipo}:`, error);
  return falloFormulario(error);
}

function texto(datos: FormData, nombre: string) {
  const valor = datos.get(nombre);
  return typeof valor === 'string' ? valor : undefined;
}

// Los datos adicionales llegan como JSON en un campo oculto.
function atributos(datos: FormData, error: string) {
  const crudo = texto(datos, 'atributos');
  if (crudo === undefined) return undefined;
  try { return JSON.parse(crudo); } catch { throw new Error(error); }
}

function revalidar() {
  revalidatePath('/certificados', 'layout');
  revalidatePath('/cursos', 'layout');
  revalidatePath('/notificaciones');
  revalidatePath('/casos', 'layout');
}

// `id` null = cargar uno nuevo; si no, editar ese (solo el dueño, la regla está en el servicio).
export async function guardarCertificadoAction(id: string | null, datos: FormData): Promise<ResultadoFormulario> {
  try {
    const quien = await actor();
    const subido = datos.get('archivo');
    const archivo = subido instanceof File && subido.size > 0 ? { bytes: new Uint8Array(await subido.arrayBuffer()), nombre: subido.name } : null;
    const entrada = {
      nombre: texto(datos, 'nombre'),
      entidadEmisora: texto(datos, 'entidadEmisora'),
      fechaEmision: texto(datos, 'fechaEmision'),
      codigoVerificacion: texto(datos, 'codigoVerificacion'),
      cursoId: texto(datos, 'cursoId'),
      atributos: atributos(datos, 'ATRIBUTO_VALOR_INVALIDO'),
    };
    const servicio = new CertificadoService();
    if (id) await servicio.actualizar(id, entrada, archivo, quien);
    else {
      const creado = await servicio.crear(entrada, archivo, quien);
      avisarCertificadoNuevo(creado.id, quien.id);
    }
    revalidar();
    return bien;
  } catch (error) { return fallo(error, 'certificado'); }
}

export async function darDeBajaCertificadoAction(id: string): Promise<ResultadoFormulario> {
  try {
    const quien = await actor();
    await new CertificadoService().eliminar(id, quien);
    revalidar();
    return bien;
  } catch (error) { return fallo(error, 'certificado'); }
}

// Misma regla que `PATCH /api/certificados/:id`: motivo obligatorio al rechazar, aviso a la persona.
export async function revisarCertificadoAction(id: string, datos: FormData): Promise<ResultadoFormulario> {
  try {
    const quien = await actor(true);
    await resolverCertificado(id, datos.get('estado'), datos.get('motivo'), quien.id);
    revalidar();
    return bien;
  } catch (error) { return fallo(error, 'certificado'); }
}

export async function guardarCursoAction(id: string | null, datos: FormData): Promise<ResultadoFormulario> {
  try {
    const quien = await actor(true);
    // Sin la casilla, el curso no otorga certificado (al editar, eso lo quita).
    const otorga = datos.get('otorgaCertificado') === 'si';
    const certificadoNombre = otorga ? (texto(datos, 'certificadoNombre') ?? '').trim() : null;
    const certificadoEmisor = otorga ? (texto(datos, 'certificadoEmisor') ?? '').trim() : null;
    if (otorga && (!certificadoNombre || !certificadoEmisor)) throw new Error('CERTIFICADO_INCOMPLETO');
    const entrada = {
      titulo: texto(datos, 'titulo'),
      descripcion: texto(datos, 'descripcion'),
      fechaDesde: texto(datos, 'fechaDesde'),
      fechaHasta: texto(datos, 'fechaHasta'),
      horas: texto(datos, 'horas') ?? null,
      certificadoNombre,
      certificadoEmisor,
      atributos: atributos(datos, 'ATRIBUTOS_DEBE_SER_LISTA'),
    };
    const servicio = new CursoService();
    if (id) await servicio.actualizar(id, entrada, quien.id);
    else await servicio.crear(entrada, quien.id);
    revalidar();
    return bien;
  } catch (error) { return fallo(error, 'curso'); }
}

// La baja de un curso no toca los certificados ya cargados.
export async function darDeBajaCursoAction(id: string): Promise<ResultadoFormulario> {
  try {
    const quien = await actor(true);
    await new CursoService().eliminar(id, quien.id);
    revalidar();
    return bien;
  } catch (error) { return fallo(error, 'curso'); }
}
