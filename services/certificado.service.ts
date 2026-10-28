import { randomUUID } from 'node:crypto';
import { CertificadoEstado } from '@prisma/client';
import { detectarArchivo } from './adjunto.service';
import { almacenamiento } from './almacenamiento';
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

export const ARCHIVO_MAX_BYTES = 5 * 1024 * 1024;

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

  // Aprobar o rechazar. Nadie valida su propio certificado (regla 2: los casos rojos los toma
  // quien tiene una capacitación validada por otra persona). Rechazar exige motivo (historia 6).
  async cambiarEstado(id: string, nuevoEstado: CertificadoEstado, revisorId: string, motivo?: string) {
    if (nuevoEstado !== CertificadoEstado.APROBADO && nuevoEstado !== CertificadoEstado.RECHAZADO) {
      throw new Error('ESTADO_INVALIDO');
    }

    const certificado = await this.obtenerPorId(id);

    if (certificado.usuarioId === revisorId) {
      throw new Error('AUTOVALIDACION_NO_PERMITIDA');
    }
    if (certificado.estado !== CertificadoEstado.PENDIENTE) {
      throw new Error('ESTADO_NO_PENDIENTE');
    }
    const motivoLimpio = motivo?.trim();
    if (nuevoEstado === CertificadoEstado.RECHAZADO && (!motivoLimpio || motivoLimpio.length < 5)) {
      throw new Error('MOTIVO_RECHAZO_REQUERIDO');
    }

    return await this.repo.actualizar(id, {
      estado: nuevoEstado,
      motivoRechazo: nuevoEstado === CertificadoEstado.RECHAZADO ? motivoLimpio : null,
    });
  }

  // Archivo del certificado: PDF o imagen, hasta 5 MB, validado por su contenido real.
  // Se valida antes de crear el certificado, así un archivo inválido no deja nada a medias.
  async validarArchivo(archivo: File) {
    if (archivo.size === 0) throw new Error('ARCHIVO_VACIO');
    if (archivo.size > ARCHIVO_MAX_BYTES) throw new Error('ARCHIVO_DEMASIADO_GRANDE');
    const datos = Buffer.from(await archivo.arrayBuffer());
    const firma = detectarArchivo(datos, ['DOCUMENTO', 'IMAGEN']);
    if (!firma) throw new Error('ARCHIVO_TIPO_NO_PERMITIDO');
    return { datos, firma };
  }

  async guardarArchivo(certificadoId: string, { datos, firma }: Awaited<ReturnType<CertificadoService['validarArchivo']>>) {
    const clave = `certificados/${certificadoId}/${randomUUID()}.${firma.ext}`;
    await almacenamiento().guardar(clave, datos, firma.mime);
    return await this.repo.actualizar(certificadoId, { archivoClave: clave, archivoMime: firma.mime, archivoTamano: datos.length });
  }

  async leerArchivo(id: string) {
    const certificado = await this.obtenerPorId(id);
    if (!certificado.archivoClave || !certificado.archivoMime) throw new Error('ARCHIVO_NO_ENCONTRADO');
    return { certificado, datos: await almacenamiento().leer(certificado.archivoClave) };
  }


  // Borrado físico: solo para un alta que falló a mitad de camino (libera el código de verificación).
  async descartarAlta(id: string) {
    await this.repo.borrarDefinitivo(id);
  }

  async eliminar(id: string, usuarioEliminacionId: string) {
    await this.obtenerPorId(id);
    return await this.repo.eliminar(id, usuarioEliminacionId);
  }
}