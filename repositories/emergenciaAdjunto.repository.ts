import { db } from '../config/database';
import { AdjuntoTipo } from '@prisma/client';

export class EmergenciaAdjuntoRepository {
  async crear(datos: { emergenciaId: string; tipo: AdjuntoTipo; mime: string; tamano: number; clave: string; duracionSegundos?: number }) {
    return await db.emergenciaAdjunto.create({ data: datos });
  }

  async findById(id: string) {
    return await db.emergenciaAdjunto.findUnique({ where: { id } });
  }

  async findByEmergencia(emergenciaId: string) {
    return await db.emergenciaAdjunto.findMany({ where: { emergenciaId }, orderBy: { creadoEn: 'asc' } });
  }
}
