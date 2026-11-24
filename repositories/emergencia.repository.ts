import { db } from '../config/database';
import { Emergencia, EmergenciaEstado, Prioridad, CertificadoEstado, Provincia, Prisma } from '@prisma/client';

// Un caso EN_CAMINO solo lo puede finalizar un voluntario, así que nadie con un caso en camino
// puede dejar de serlo. Bloquea la fila del usuario, igual que tomarEmergencia: tomar un caso y
// cambiar el rol quedan serializados y ninguno decide con datos viejos.
export async function asegurarSinCasoEnCamino(tx: Prisma.TransactionClient, usuarioId: string) {
  await tx.$queryRaw`SELECT id FROM Usuario WHERE id = ${usuarioId} FOR UPDATE`;
  // Lectura con bloqueo: con REPEATABLE READ, un SELECT común puede reusar la foto tomada en la
  // primera lectura de la transacción, anterior al bloqueo, y no ver un caso recién tomado.
  const activas = await tx.$queryRaw<{ id: string }[]>`
    SELECT e.id FROM Emergencia e JOIN UsuarioEmergencia ue ON ue.emergenciaId = e.id
    WHERE ue.usuarioId = ${usuarioId} AND e.estado = 'EN_CAMINO' LIMIT 1 FOR SHARE`;
  if (activas.length) throw new Error('CASO_EN_CAMINO');
}

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
    id?: string;
    descripcion: string;
    imagen?: string;
    prioridad: Prioridad;
    coordenada_x: number | null;
    coordenada_y: number | null;
    provincia: Provincia | null;
    direccion?: string;
  }): Promise<Emergencia> {
    return await db.emergencia.create({
      data: {
        id: datos.id,
        descripcion: datos.descripcion,
        imagen: datos.imagen,
        fecha: new Date(),
        prioridad: datos.prioridad,
        ubicacion: {
          create: {
            coordenada_x: datos.coordenada_x,
            coordenada_y: datos.coordenada_y,
            provincia: datos.provincia,
            direccion: datos.direccion,
          },
        },
      },
    });
  }

  // Listar todas las emergencias
  async findAll(where: Prisma.EmergenciaWhereInput = {}) {
    return await db.emergencia.findMany({
      where,
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
  async findById(id: string, where: Prisma.EmergenciaWhereInput = {}) {
    return await db.emergencia.findFirst({
      where: { AND: [{ id }, where] },
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
        // Un certificado dado de baja deja de habilitar casos rojos.
        fechaEliminacion: null,
      },
    });
    return !!certificado;
  }

  // Tomar/Asignar emergencia utilizando una transacción
  async tomarEmergencia(emergenciaId: string, usuarioId: string): Promise<boolean> {
    return await db.$transaction(async (tx) => {
      // Serializa asignaciones del mismo usuario incluso cuando compite por casos distintos.
      // La lectura de la activa sucede después de adquirir el bloqueo de fila en MySQL.
      // El rol se vuelve a leer con la misma lectura que bloquea la fila: un ascenso confirmado
      // después de la verificación del servicio dejaría a un coordinador con un caso que no puede finalizar.
      const [usuario] = await tx.$queryRaw<{ rol: string }[]>`SELECT rol FROM Usuario WHERE id = ${usuarioId} FOR UPDATE`;
      if (usuario?.rol !== 'VOLUNTARIO') throw new Error('ROL_VOLUNTARIO_REQUERIDO');
      const activa = await tx.emergencia.findFirst({
        where: { estado: EmergenciaEstado.EN_CAMINO, usuarios: { some: { usuarioId } } },
      });
      if (activa) throw new Error('VOLUNTARIO_CON_EMERGENCIA_ACTIVA');
      // 1. Verificar si la emergencia sigue estando SIN_GESTIONAR
      const emergencia = await tx.emergencia.findUnique({
        where: { id: emergenciaId },
      });

      if (!emergencia || emergencia.estado !== EmergenciaEstado.SIN_GESTIONAR) {
        return false;
      }

      // 2. Cambiar estado a EN_CAMINO
      const cambio = await tx.emergencia.updateMany({
        where: { id: emergenciaId, estado: EmergenciaEstado.SIN_GESTIONAR },
        data: {
          estado: EmergenciaEstado.EN_CAMINO,
        },
      });
      if (cambio.count !== 1) return false;

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
  async finalizarEmergencia(emergenciaId: string, observaciones: string) {
    return await db.$transaction(async tx => {
      const cambio = await tx.emergencia.updateMany({
        where: { id: emergenciaId, estado: EmergenciaEstado.EN_CAMINO },
        data: { estado: EmergenciaEstado.GESTIONADA, observacionesCierre: observaciones },
      });
      if (cambio.count !== 1) throw new Error('EMERGENCIA_NO_ESTA_EN_PROCESO');
      return tx.emergencia.findUniqueOrThrow({ where: { id: emergenciaId }, include: { ubicacion: true, usuarios: true } });
    });
  }
}
