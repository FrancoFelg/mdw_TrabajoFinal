import { CertificadoService, CrearCertificadoInput } from '../services/certificado.service';
import {
    ActualizarCertificadoData,
  CrearCertificadoConAtributosData,
} from '../repositories/certificado.repository';

export class CertificadoController {
  private service: CertificadoService;

  constructor() {
    this.service = new CertificadoService();
  }

  async crear(datos: CrearCertificadoInput, usuarioCreacionId: string) {
    return await this.service.crearCertificado(datos, usuarioCreacionId);
  }

  async listar() {
    return await this.service.listarCertificados();
  }

  async obtenerPorId(id: string) {
    return await this.service.obtenerPorId(id);
  }

  async actualizar(id: string, datos: ActualizarCertificadoData) {
    return await this.service.actualizar(id, datos);
  }

  async eliminar(id: string, usuarioEliminacionId: string) {
    if (!usuarioEliminacionId) {
      throw new Error('USUARIO_ELIMINACION_REQUERIDO');
    }
    return await this.service.eliminar(id, usuarioEliminacionId);
  }
}