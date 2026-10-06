import { db } from '../config/database';
import { EmergenciaEstado, Prioridad, CertificadoEstado, Prisma, Provincia } from '@prisma/client';

export interface CrearEmergenciaDTO {
  descripcion: string;
  fecha: Date;
  prioridad: Prioridad;
  coordenada_x?: number;
  coordenada_y?: number;
  provincia: Provincia;
  imagen?: string;
  creadorId?: string;
}

export class EmergenciaRepository {
  // Crear una nueva emergencia
  async crear(data: CrearEmergenciaDTO) {
    return await db.emergencia.create({
      data: {
        descripcion: data.descripcion,
        fecha: new Date(data.fecha),
        prioridad: data.prioridad,
        imagen: data.imagen,
        estado: EmergenciaEstado.SIN_GESTIONAR,
        // Crea automáticamente la Ubicación anidada
        ubicacion: {
          create: {
            coordenada_x: data.coordenada_x !== undefined ? Number(data.coordenada_x) : null,
            coordenada_y: data.coordenada_y !== undefined ? Number(data.coordenada_y) : null,
            provincia: data.provincia,
          },
        },
      },
      include: {
        ubicacion: true,
      },
    });
  }

  // Listar todas las emergencias
  async findAll() {
    return await db.emergencia.findMany({
      include: {
        ubicacion: true,
        usuarios: {
          include: {
            usuario: {
              select: {
                id: true,
                nombreUsuario: true,
                persona: {
                  select: {
                    nombre: true,
                    apellido: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        creadoEn: 'desc',
      },
    });
  }

  // Buscar una emergencia por ID
  async findById(id: string) {
    return await db.emergencia.findUnique({
      where: { id },
      include: {
        ubicacion: true,
        usuarios: {
          include: {
            usuario: {
              select: {
                id: true,
                nombreUsuario: true,
                persona: true,
              },
            },
          },
        },
      },
    });
  }

  // Verificar si un voluntario tiene actualmente una emergencia activa (EN_CAMINO)
  async findActivaByVoluntario(usuarioId: string) {
    return await db.emergencia.findFirst({
      where: {
        estado: EmergenciaEstado.EN_CAMINO,
        usuarios: {
          some: {
            usuarioId,
          },
        },
      },
    });
  }

  // Verificar si el voluntario posee un certificado APROBADO
  async tieneCertificadoAprobado(usuarioId: string): Promise<boolean> {
    const certificado = await db.certificado.findFirst({
      where: {
        usuarioId,
        estado: CertificadoEstado.APROBADO,
      },
    });
    return !!certificado;
  }

  // Tomar/Asignar emergencia utilizando una transacción
  async tomarEmergencia(emergenciaId: string, usuarioId: string): Promise<boolean> {
    return await db.$transaction(async (tx: any) => {
      // 1. Verificar si la emergencia sigue estando SIN_GESTIONAR
      const emergencia = await tx.emergencia.findUnique({
        where: { id: emergenciaId },
      });

      if (!emergencia || emergencia.estado !== EmergenciaEstado.SIN_GESTIONAR) {
        return false;
      }

      // 2. Cambiar estado a EN_CAMINO
      await tx.emergencia.update({
        where: { id: emergenciaId },
        data: {
          estado: EmergenciaEstado.EN_CAMINO,
        },
      });

      // 3. Crear el registro en UsuarioEmergencia
      await tx.usuarioEmergencia.create({
        data: {
          emergenciaId,
          usuarioId,
        },
      });

      return true;
    });
  }

  // Finalizar la emergencia
  async finalizarEmergencia(emergenciaId: string) {
    return await db.emergencia.update({
      where: { id: emergenciaId },
      data: {
        estado: EmergenciaEstado.GESTIONADA,
      },
      include: {
        ubicacion: true,
        usuarios: true,
      },
    });
  }
}