import {
  ActualizarCursoData,
  CrearCursoData,
  CursoAtributoValorInput,
  CursoRepository,
} from '../repositories/curso.repository';
import { CursoAtributoRepository } from '../repositories/cursoAtributo.repository';

// Lo que llega del cliente: fechas como string ISO y sin usuarioCreacionId (sale del JWT).
export interface CursoInput {
  titulo?: string;
  descripcion?: string;
  fechaDesde?: string | Date;
  fechaHasta?: string | Date;
  atributos?: { campoId?: string; dato?: unknown; fechaHasta?: string | Date | null }[];
}

function parseFecha(valor: string | Date | null | undefined, codigoError: string): Date | undefined {
  if (valor === undefined || valor === null || valor === '') return undefined;
  const fecha = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(fecha.getTime())) {
    throw new Error(codigoError);
  }
  return fecha;
}

export class CursoService {
  private repo: CursoRepository;
  private atributoRepo: CursoAtributoRepository;

  constructor() {
    this.repo = new CursoRepository();
    this.atributoRepo = new CursoAtributoRepository();
  }

  // Normaliza y valida la lista de atributos: campoId + dato obligatorios, sin repetidos y existentes en la paramétrica.
  private async normalizarAtributos(
    atributos: CursoInput['atributos']
  ): Promise<CursoAtributoValorInput[] | undefined> {
    if (atributos === undefined) return undefined;
    if (!Array.isArray(atributos)) {
      throw new Error('ATRIBUTOS_DEBE_SER_LISTA');
    }

    const normalizados: CursoAtributoValorInput[] = [];
    const vistos = new Set<string>();

    for (const attr of atributos) {
      if (!attr?.campoId || attr.dato === undefined || attr.dato === null || attr.dato === '') {
        throw new Error('ATRIBUTO_INCOMPLETO_CAMPO_Y_DATO_REQUERIDOS');
      }
      if (vistos.has(attr.campoId)) {
        throw new Error('ATRIBUTO_DUPLICADO');
      }
      vistos.add(attr.campoId);

      normalizados.push({
        campoId: attr.campoId,
        dato: String(attr.dato),
        fechaHasta: parseFecha(attr.fechaHasta, 'FECHA_ATRIBUTO_INVALIDA') ?? null,
      });
    }

    if (normalizados.length > 0) {
      const existentes = await this.atributoRepo.contarVigentes(normalizados.map((a) => a.campoId));
      if (existentes !== normalizados.length) {
        throw new Error('ATRIBUTO_NO_ENCONTRADO');
      }
    }

    return normalizados;
  }

  private validarRangoFechas(desde: Date, hasta: Date) {
    if (hasta < desde) {
      throw new Error('RANGO_FECHAS_INVALIDO');
    }
  }

  async crear(data: CursoInput, usuarioCreacionId: string) {
    if (!usuarioCreacionId) {
      throw new Error('USUARIO_CREACION_REQUERIDO');
    }

    const titulo = data.titulo?.trim();
    const descripcion = data.descripcion?.trim();
    const fechaDesde = parseFecha(data.fechaDesde, 'FECHA_INVALIDA');
    const fechaHasta = parseFecha(data.fechaHasta, 'FECHA_INVALIDA');

    if (!titulo || !descripcion || !fechaDesde || !fechaHasta) {
      throw new Error('CAMPOS_OBLIGATORIOS_FALTANTES');
    }
    this.validarRangoFechas(fechaDesde, fechaHasta);

    const atributos = await this.normalizarAtributos(data.atributos);

    const payload: CrearCursoData = {
      titulo,
      descripcion,
      fechaDesde,
      fechaHasta,
      usuarioCreacionId,
      atributos,
    };

    return await this.repo.crearConAtributos(payload);
  }

  async listar() {
    return await this.repo.findAll();
  }

  async obtenerPorId(id: string) {
    const curso = await this.repo.findById(id);
    if (!curso) {
      throw new Error('CURSO_NO_ENCONTRADO');
    }
    return curso;
  }

  async actualizar(id: string, data: CursoInput, usuarioId: string) {
    const actual = await this.obtenerPorId(id);

    const cambios: ActualizarCursoData = {};

    if (data.titulo !== undefined) {
      const titulo = data.titulo.trim();
      if (!titulo) throw new Error('TITULO_VACIO');
      cambios.titulo = titulo;
    }
    if (data.descripcion !== undefined) {
      const descripcion = data.descripcion.trim();
      if (!descripcion) throw new Error('DESCRIPCION_VACIA');
      cambios.descripcion = descripcion;
    }
    if (data.fechaDesde !== undefined) {
      cambios.fechaDesde = parseFecha(data.fechaDesde, 'FECHA_INVALIDA');
    }
    if (data.fechaHasta !== undefined) {
      cambios.fechaHasta = parseFecha(data.fechaHasta, 'FECHA_INVALIDA');
    }

    // El rango se valida combinando lo nuevo con lo que ya tenía el curso.
    this.validarRangoFechas(cambios.fechaDesde ?? actual.fechaDesde, cambios.fechaHasta ?? actual.fechaHasta);

    cambios.atributos = await this.normalizarAtributos(data.atributos);

    if (Object.keys(cambios).every((k) => cambios[k as keyof ActualizarCursoData] === undefined)) {
      throw new Error('SIN_CAMBIOS');
    }

    return await this.repo.actualizar(id, cambios, usuarioId);
  }

  async eliminar(id: string, usuarioEliminacionId: string) {
    if (!usuarioEliminacionId) {
      throw new Error('USUARIO_ELIMINACION_REQUERIDO');
    }
    await this.obtenerPorId(id);
    return await this.repo.eliminar(id, usuarioEliminacionId);
  }
}
