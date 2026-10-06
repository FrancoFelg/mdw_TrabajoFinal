import { db } from '../config/database';
import { Emergencia, EmergenciaEstado, Prioridad, CertificadoEstado, Provincia } from '@prisma/client';

export class EmergenciaRepository {
  // Emergencia con sus coordenadas (para calcular rutas hacia ella)
  async findByIdConUbicacion(id: string) {
    return await db.emergencia.findUnique({
      where: { id },
      select: {
        id: true,
        estado: true,
        ubicacion: { select: { coordenada_x: true, coordenada_y: true } },
      },
    });
  }

  // Crea la ubicación y la emergencia juntas (nested create = una sola transacción).
  // Convención de Ubicacion: coordenada_x = longitud, coordenada_y = latitud.
  async crear(datos: {
    descripcion: string;
    imagen?: string;
    prioridad: Prioridad;
    coordenada_x: number;
    coordenada_y: number;
    provincia: Provincia;
  }): Promise<Emergencia> {
    return await db.emergencia.create({
      data: {
        descripcion: datos.descripcion,
        imagen: datos.imagen,
        fecha: new Date(),
        prioridad: datos.prioridad,
        ubicacion: {
          create: {
            coordenada_x: datos.coordenada_x,
            coordenada_y: datos.coordenada_y,
            provincia: datos.provincia,
          },
        },
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