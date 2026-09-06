import { db } from '../config/database';
import { Emergencia, EmergenciaEstado, Prioridad, CertificadoEstado } from '@prisma/client';

export class EmergenciaRepository {

  // Buscar emergencia por ID
  async findById(id: string): Promise<Emergencia | null> {
    return await db.emergencia.findUnique({
      where: { id },
    });
  }

  // Verificar si el voluntario ya tiene otra emergencia activa (EN_CAMINO)
  async findActivaByVoluntario(usuarioId: string): Promise<Emergencia | null> {
    const registro = await db.usuarioEmergencia.findFirst({
      where: {
        usuarioId: usuarioId,
        emergencia: {
          estado: EmergenciaEstado.EN_CAMINO,
        },
      },
      include: {
        emergencia: true,
      },
    });

    return registro ? registro.emergencia : null;
  }

  // Verificar si el usuario posee al menos un certificado en estado APROBADO
  async tieneCertificadoAprobado(usuarioId: string): Promise<boolean> {
    const count = await db.certificado.count({
      where: {
        usuarioId: usuarioId, // Mapea directamente al campo 'usuarioId' de la relacion CertificadoAlumno
        estado: CertificadoEstado.APROBADO,
        fechaEliminacion: null, // Garantiza que no sea un registro borrado lógicamente
      },
    });

    return count > 0;
  }

  // Asignar voluntario a la emergencia y cambiar su estado a EN_CAMINO (Transacción atómica)
  async tomarEmergencia(emergenciaId: string, usuarioId: string): Promise<boolean> {
    return await db.$transaction(async (tx) => {
      // 1. Intenta actualizar el estado de la emergencia de forma condicional (evita condiciones de carrera)
      const updateResult = await tx.emergencia.updateMany({
        where: {
          id: emergenciaId,
          estado: EmergenciaEstado.SIN_GESTIONAR,
        },
        data: {
          estado: EmergenciaEstado.EN_CAMINO,
        },
      });

      // Si count es 0, significa que otro voluntario la tomó simultáneamente
      if (updateResult.count === 0) {
        return false;
      }

      // 2. Crea la relación de asignación en la tabla pivote UsuarioEmergencia
      await tx.usuarioEmergencia.create({
        data: {
          usuarioId: usuarioId,
          emergenciaId: emergenciaId,
        },
      });

      return true;
    });
  }

}