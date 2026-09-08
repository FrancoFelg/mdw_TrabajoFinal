import { db } from '../config/database';
import { SolicitudAscensoEstado, Rol } from '@prisma/client';

export class SolicitudAscensoRepository {
  async crear(usuarioId: string) {
    return await db.solicitudAscenso.create({
      data: {
        usuarioId,
        estado: SolicitudAscensoEstado.PENDIENTE,
      },
    });
  }

  async findPendienteByUsuarioId(usuarioId: string) {
    return await db.solicitudAscenso.findFirst({
      where: {
        usuarioId,
        estado: SolicitudAscensoEstado.PENDIENTE,
      },
    });
  }

  async findById(id: string) {
    return await db.solicitudAscenso.findUnique({
      where: { id },
      include: {
        usuario: true,
      },
    });
  }

  async findAll() {
    return await db.solicitudAscenso.findMany({
      orderBy: {
        creadoEn: 'desc',
      },
      include: {
        usuario: true,
      },
    });
  }

  async actualizarEstado(
    id: string,
    estado: SolicitudAscensoEstado,
  ) {
    return await db.solicitudAscenso.update({
      where: { id },
      data: { estado },
    });
  }

  async aprobar(id: string, usuarioId: string) {
    return await db.$transaction(async (tx) => {
      const solicitud = await tx.solicitudAscenso.update({
        where: { id },
        data: {
          estado: SolicitudAscensoEstado.APROBADO,
        },
      });

      await tx.usuario.update({
        where: { id: usuarioId },
        data: {
          rol: Rol.COORDINADOR,
        },
      });

      return solicitud;
    });
  }
}