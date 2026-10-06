import { CertificadoEstado } from '@prisma/client';
import {
    ActualizarCertificadoData,
  CertificadoRepository,
  CrearCertificadoConAtributosData,
} from '../repositories/certificado.repository';

export type CrearCertificadoInput = Omit<
  CrearCertificadoConAtributosData,
  'usuarioCreacionId' | 'estado'
> & {
  estado?: CertificadoEstado;
};

export class CertificadoService {
  private repo: CertificadoRepository;

  constructor() {
    this.repo = new CertificadoRepository();
  }

  async crearCertificado(data: CrearCertificadoInput, usuarioCreacionId: string) {
    // 1. Validar presencia del ID de usuario
    if (!usuarioCreacionId) {
      throw new Error('USUARIO_CREACION_REQUERIDO');
    }

    // 2. Validar campos obligatorios de negocio (cursoId es opcional)
    const { usuarioId, codigoVerificacion } = data;
    if (!usuarioId || !codigoVerificacion) {
      throw new Error('CAMPOS_OBLIGATORIOS_FALTANTES');
    }

    // 3. Lógica para los atributos
    if (data.atributos && data.atributos.length > 0) {
      for (const attr of data.atributos) {
        if (!attr.campoId || attr.dato === undefined || attr.dato === null) {
          throw new Error('ATRIBUTO_INCOMPLETO_CAMPO_Y_VALOR_REQUERIDOS');
        }
      }
    }

    // 4. Inyección de valores por defecto y usuario de creación
    const payloadCompleto: CrearCertificadoConAtributosData = {
      ...data,
      estado: data.estado || CertificadoEstado.PENDIENTE,
      usuarioCreacionId,
    };

    return await this.repo.crearConAtributos(payloadCompleto);
  }

  async listarCertificados() {
    return await this.repo.findAll();
  }

  async obtenerPorId(id: string) {
    const certificado = await this.repo.findById(id);
    if (!certificado) {
      throw new Error('CERTIFICADO_NO_ENCONTRADO');
    }
    return certificado;
  }

  async actualizar(id: string, data: ActualizarCertificadoData) {
    await this.obtenerPorId(id);
    return await this.repo.actualizar(id, data);
  }

  async cambiarEstado(id: string, nuevoEstado: CertificadoEstado) {
    if (nuevoEstado !== CertificadoEstado.APROBADO && nuevoEstado !== CertificadoEstado.RECHAZADO) {
      throw new Error('ESTADO_INVALIDO');
    }

    const certificado = await this.obtenerPorId(id);

    if (certificado.estado !== CertificadoEstado.PENDIENTE) {
      throw new Error('ESTADO_NO_PENDIENTE');
    }

    return await this.repo.actualizar(id, { estado: nuevoEstado });
  }


  async eliminar(id: string, usuarioEliminacionId: string) {
    await this.obtenerPorId(id);
    return await this.repo.eliminar(id, usuarioEliminacionId);
  }
}