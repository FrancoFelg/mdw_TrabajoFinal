import { AtributoTipo, CertificadoEstado, Rol } from '@prisma/client';
import {
  AtributoValor,
  CambiosCertificado,
  CertificadoDetalle,
  CertificadoRepository,
} from '../repositories/certificado.repository';
import { CertificadoAtributoRepository } from '../repositories/certificadoAtributo.repository';
import { CursoRepository } from '../repositories/curso.repository';
import { MAX_ARCHIVO, guardarArchivo, borrarArchivo, nombreSeguro, tipoArchivo } from '../src/lib/archivos-certificado';

export interface Solicitante {
  id: string;
  rol?: Rol;
}

export interface ArchivoEntrada {
  bytes: Uint8Array;
  nombre: string;
}

// Como llega del formulario: sin normalizar.
export interface CertificadoEntrada {
  nombre?: unknown;
  entidadEmisora?: unknown;
  fechaEmision?: unknown;
  codigoVerificacion?: unknown;
  cursoId?: unknown;
  atributos?: unknown;
}

export interface FiltroCertificados {
  estado?: CertificadoEstado;
  usuarioId?: string;
}

const ZONA = 'America/Argentina/Buenos_Aires';
const diaAR = (fecha: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: ZONA }).format(fecha);
const esCoordinacion = (s: Solicitante) => s.rol === Rol.COORDINADOR || s.rol === Rol.ADMIN;

// Texto recortado; undefined si no vino o vino vacío.
function texto(valor: unknown): string | undefined {
  if (valor === undefined || valor === null) return undefined;
  if (typeof valor !== 'string') throw new Error('CAMPOS_OBLIGATORIOS_FALTANTES');
  return valor.trim() || undefined;
}

function esDiaValido(valor: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const fecha = new Date(`${valor}T12:00:00.000Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
}

// Un día (YYYY-MM-DD) se guarda a mediodía UTC para que no cambie de día al mostrarlo.
// No puede ser posterior a hoy en Argentina.
function fechaEmision(valor: string): Date {
  let fecha: Date;
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    if (!esDiaValido(valor)) throw new Error('FECHA_INVALIDA');
    fecha = new Date(`${valor}T12:00:00.000Z`);
  } else {
    fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) throw new Error('FECHA_INVALIDA');
  }
  if (diaAR(fecha) > diaAR(new Date())) throw new Error('FECHA_INVALIDA');
  return fecha;
}

export function validarDatoAtributo(tipo: AtributoTipo, dato: unknown): string {
  const valor = typeof dato === 'string' || typeof dato === 'number' || typeof dato === 'boolean' ? String(dato).trim() : '';
  const valido =
    tipo === AtributoTipo.NUMERO ? valor !== '' && Number.isFinite(Number(valor))
    : tipo === AtributoTipo.FECHA ? esDiaValido(valor)
    : tipo === AtributoTipo.BOOLEANO ? valor === 'true' || valor === 'false'
    : valor !== '';
  if (!valido) throw new Error('ATRIBUTO_VALOR_INVALIDO');
  return valor;
}

function validarArchivo(archivo: ArchivoEntrada | null) {
  if (!archivo || !archivo.bytes.length) throw new Error('ARCHIVO_REQUERIDO');
  if (archivo.bytes.length > MAX_ARCHIVO) throw new Error('ARCHIVO_DEMASIADO_GRANDE');
  const tipo = tipoArchivo(archivo.bytes);
  if (!tipo) throw new Error('ARCHIVO_INVALIDO');
  return { archivoTipo: tipo, archivoNombre: nombreSeguro(archivo.nombre) };
}

export class CertificadoService {
  private repo = new CertificadoRepository();
  private atributoRepo = new CertificadoAtributoRepository();
  private cursoRepo = new CursoRepository();

  // Certificado de un curso: nombre y emisor se copian del curso y la fecha de emisión es su fin.
  // Copiarlos (y no leerlos del curso) hace que editar el curso no cambie certificados ya cargados.
  private async datosDelCurso(cursoId: string) {
    const curso = await this.cursoRepo.findById(cursoId);
    if (!curso) throw new Error('CURSO_NO_ENCONTRADO');
    if (!curso.certificadoNombre || !curso.certificadoEmisor) throw new Error('CURSO_SIN_CERTIFICADO');
    // Los cursos guardan días a medianoche UTC: ese día es el de emisión.
    const dia = curso.fechaHasta.toISOString().slice(0, 10);
    if (dia > diaAR(new Date())) throw new Error('CURSO_NO_FINALIZADO');
    return { cursoId, nombre: curso.certificadoNombre, entidadEmisora: curso.certificadoEmisor, fechaEmision: new Date(`${dia}T12:00:00.000Z`) };
  }

  // Sin curso: la persona carga nombre, emisor y fecha.
  private datosManuales(entrada: CertificadoEntrada) {
    const nombre = texto(entrada.nombre);
    const entidadEmisora = texto(entrada.entidadEmisora);
    const fecha = texto(entrada.fechaEmision);
    if (!nombre || !entidadEmisora || !fecha) throw new Error('CAMPOS_OBLIGATORIOS_FALTANTES');
    return { cursoId: null, nombre, entidadEmisora, fechaEmision: fechaEmision(fecha) };
  }

  // Valida la lista de datos adicionales contra el catálogo vigente y el tipo de cada campo.
  private async normalizarAtributos(atributos: unknown): Promise<AtributoValor[] | undefined> {
    if (atributos === undefined) return undefined;
    if (!Array.isArray(atributos)) throw new Error('ATRIBUTO_VALOR_INVALIDO');
    if (!atributos.length) return [];
    const catalogo = new Map((await this.atributoRepo.findAll()).map((a) => [a.id, a.tipo]));
    const vistos = new Set<string>();
    return atributos.map((attr) => {
      const campoId = typeof attr?.campoId === 'string' ? attr.campoId : '';
      if (vistos.has(campoId)) throw new Error('ATRIBUTO_DUPLICADO');
      vistos.add(campoId);
      const tipo = catalogo.get(campoId);
      if (!tipo) throw new Error('ATRIBUTO_NO_ENCONTRADO');
      return { campoId, dato: validarDatoAtributo(tipo, attr.dato) };
    });
  }

  async crear(entrada: CertificadoEntrada, archivo: ArchivoEntrada | null, solicitante: Solicitante): Promise<CertificadoDetalle> {
    const cursoId = texto(entrada.cursoId);
    const identidad = cursoId ? await this.datosDelCurso(cursoId) : this.datosManuales(entrada);
    const datosArchivo = validarArchivo(archivo);
    const atributos = (await this.normalizarAtributos(entrada.atributos)) ?? [];

    let escrito: string | null = null;
    try {
      return await this.repo.crearConArchivo(
        {
          usuarioId: solicitante.id,
          ...identidad,
          codigoVerificacion: texto(entrada.codigoVerificacion) ?? null,
          ...datosArchivo,
          atributos,
        },
        async (id) => {
          escrito = id;
          await guardarArchivo(id, archivo!.bytes);
        }
      );
    } catch (error) {
      if (escrito) await borrarArchivo(escrito).catch(() => {});
      throw error;
    }
  }

  async listar(filtro: FiltroCertificados, solicitante: Solicitante): Promise<CertificadoDetalle[]> {
    if (!esCoordinacion(solicitante)) return this.repo.findAll({ usuarioId: solicitante.id, estado: filtro.estado });
    return this.repo.findAll(filtro);
  }

  async obtener(id: string, solicitante: Solicitante): Promise<CertificadoDetalle> {
    const certificado = await this.repo.findById(id);
    if (!certificado || (!esCoordinacion(solicitante) && certificado.usuarioId !== solicitante.id)) {
      throw new Error('CERTIFICADO_NO_ENCONTRADO');
    }
    return certificado;
  }

  // Solo el dueño, y solo mientras está PENDIENTE o RECHAZADO. Editar un rechazado lo reenvía a revisión:
  // `alReenviar` se llama entonces con el certificado ya guardado (para avisar a coordinación).
  async actualizar(
    id: string,
    entrada: CertificadoEntrada,
    archivo: ArchivoEntrada | null,
    solicitante: Solicitante,
    alReenviar?: (certificado: CertificadoDetalle) => void
  ): Promise<CertificadoDetalle> {
    const actual = await this.repo.findById(id);
    if (!actual || actual.usuarioId !== solicitante.id) throw new Error('CERTIFICADO_NO_ENCONTRADO');
    if (actual.estado !== CertificadoEstado.PENDIENTE && actual.estado !== CertificadoEstado.RECHAZADO) {
      throw new Error('NO_EDITABLE');
    }
    if (entrada.cursoId !== undefined) throw new Error('CURSO_NO_EDITABLE');
    if (actual.cursoId && (entrada.nombre !== undefined || entrada.entidadEmisora !== undefined || entrada.fechaEmision !== undefined)) {
      throw new Error('DATOS_DEL_CURSO');
    }

    const cambios: CambiosCertificado = {};
    for (const campo of ['nombre', 'entidadEmisora'] as const) {
      if (entrada[campo] === undefined) continue;
      const valor = texto(entrada[campo]);
      if (!valor) throw new Error('CAMPOS_OBLIGATORIOS_FALTANTES');
      cambios[campo] = valor;
    }
    if (entrada.fechaEmision !== undefined) {
      const valor = texto(entrada.fechaEmision);
      if (!valor) throw new Error('CAMPOS_OBLIGATORIOS_FALTANTES');
      cambios.fechaEmision = fechaEmision(valor);
    }
    if (entrada.codigoVerificacion !== undefined) cambios.codigoVerificacion = texto(entrada.codigoVerificacion) ?? null;
    const archivoNuevo = archivo && archivo.bytes.length ? archivo : null;
    if (archivoNuevo) Object.assign(cambios, validarArchivo(archivoNuevo));
    const atributos = await this.normalizarAtributos(entrada.atributos);

    if (!Object.keys(cambios).length && atributos === undefined) throw new Error('SIN_CAMBIOS');
    const reenvia = actual.estado === CertificadoEstado.RECHAZADO;
    if (reenvia) {
      Object.assign(cambios, { estado: CertificadoEstado.PENDIENTE, motivoRechazo: null, fechaRevision: null, usuarioRevisionId: null });
    }

    const actualizado = await this.repo.actualizar(id, cambios, {
      atributos,
      usuarioId: solicitante.id,
      escribir: archivoNuevo ? () => guardarArchivo(id, archivoNuevo.bytes) : undefined,
      condicion: { estados: [CertificadoEstado.PENDIENTE, CertificadoEstado.RECHAZADO], error: 'NO_EDITABLE' },
      unicoDelCurso: reenvia && actual.cursoId ? { cursoId: actual.cursoId, usuarioId: solicitante.id } : undefined,
    });
    if (reenvia) alReenviar?.(actualizado);
    return actualizado;
  }

  // El dueño en cualquier estado, o coordinación.
  async eliminar(id: string, solicitante: Solicitante): Promise<void> {
    await this.obtener(id, solicitante);
    await this.repo.eliminar(id, solicitante.id);
  }
}
