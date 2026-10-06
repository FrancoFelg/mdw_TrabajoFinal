import { Request, Response } from 'express';
import { CrearEmergenciaInput, EmergenciaService } from '../services/emergencia.service';
import { ModoViaje, Punto } from '../services/rutas.service';

export class EmergenciaController {
  private emergenciaService: EmergenciaService;

  constructor() {
    this.emergenciaService = new EmergenciaService();
  }

  // POST /api/emergencias — reporte público
  async crear(datos: CrearEmergenciaInput) {
    return await this.emergenciaService.crear(datos);
  }

  // GET /api/emergencias/:id/eta — tiempo de llegada del voluntario
  async calcularEta(id: string, origen: Punto, modo?: ModoViaje) {
    return await this.emergenciaService.calcularEta(id, origen, modo);
  }

  // GET /api/emergencias — activas con ubicación, para el mapa
  async listarParaMapa() {
    return await this.emergenciaService.listarParaMapa();
  }

  // POST /api/emergencias/:id/tomar
  tomarEmergencia = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const usuarioId = req.user?.id; // Proviene del middleware de autenticación (JWT)

      if (!usuarioId) {
        return res.status(401).json({ error: 'Usuario no autenticado.' });
      }

      const resultado = await this.emergenciaService.tomarEmergencia(id as string, usuarioId);
      
      return res.status(200).json(resultado);
    } catch (error: any) {
      // Mapeo de errores de negocio a respuestas HTTP estandarizadas
      switch (error.message) {
        case 'EMERGENCIA_NO_ENCONTRADA':
          return res.status(404).json({ error: 'La emergencia no existe.' });

        case 'EMERGENCIA_YA_ASIGNADA':
        case 'CONCURRENCIA_EMERGENCIA_TOMADA':
          return res.status(409).json({ 
            error: 'La emergencia ya no se encuentra disponible (fue asignada a otro voluntario).' 
          });

        case 'VOLUNTARIO_CON_EMERGENCIA_ACTIVA':
          return res.status(400).json({ 
            error: 'Ya posees una emergencia activa en estado EN_CAMINO.' 
          });

        case 'REQUIERE_CERTIFICADO_APROBADO':
          return res.status(403).json({ 
            error: 'Esta emergencia es de prioridad ROJA. Debes contar con al menos un certificado aprobado para tomarla.' 
          });

        default:
          console.error('Error no controlado al tomar emergencia:', error);
          return res.status(500).json({ error: 'Ocurrió un error interno en el servidor.' });
      }
    }
  };
}