import { db } from '../config/database';
import { Prisma, SolicitudAscensoEstado } from '@prisma/client';

// Nunca devolver contraseñas dentro del historial de solicitudes.
const usuarioPublico = { select: { id: true, nombreUsuario: true, rol: true, persona: { select: { nombre: true, apellido: true } } } };

async function aviso(tx: Prisma.TransactionClient, usuarioId: string, clave: string, titulo: string, cuerpo: string, enlace = '/ascensos') {
  await tx.notificacion.create({ data: { usuarioId, clave, titulo, cuerpo, enlace, tipo: 'VALIDACION_PENDIENTE' } });
}

export class SolicitudAscensoRepository {
  async crear(usuarioId: string) {
    return db.$transaction(async tx => {
      // Bloquear la fila evita dos solicitudes pendientes ante envíos simultáneos.
      const bloqueo = await tx.usuario.updateMany({ where: { id: usuarioId, rol: 'VOLUNTARIO' }, data: { rol: 'VOLUNTARIO' } });
      if (!bloqueo.count) throw new Error('USUARIO_YA_ES_COORDINADOR');
      const persona = await tx.usuario.findUniqueOrThrow({ where: { id: usuarioId }, select: { nombreUsuario: true } });
      if (await tx.solicitudAscenso.findFirst({ where: { usuarioId, estado: 'PENDIENTE' } })) throw new Error('SOLICITUD_PENDIENTE_EXISTENTE');
      const solicitud = await tx.solicitudAscenso.create({ data: { usuarioId, estado: 'PENDIENTE' } });
      await aviso(tx, usuarioId, `ascenso:enviado:${solicitud.id}`, 'Solicitud de ascenso enviada', 'Tu solicitud está pendiente de evaluación.');
      const coordinadores = await tx.usuario.findMany({ where: { rol: { in: ['COORDINADOR', 'ADMIN'] } }, select: { id: true } });
      for (const coordinador of coordinadores) {
        await aviso(tx, coordinador.id, `ascenso:nuevo:${solicitud.id}`, 'Pedido de ascenso', `${persona.nombreUsuario} pidió ascenso a coordinador.`, `/usuarios/${usuarioId}/solicitudes`);
      }
      return solicitud;
    });
  }

  findPendienteByUsuarioId(usuarioId: string) {
    return db.solicitudAscenso.findFirst({ where: { usuarioId, estado: 'PENDIENTE' } });
  }
  findById(id: string) {
    return db.solicitudAscenso.findUnique({ where: { id }, include: { usuario: usuarioPublico } });
  }
  findAll(usuarioId?: string) {
    return db.solicitudAscenso.findMany({ where: usuarioId ? { usuarioId } : {}, orderBy: { creadoEn: 'desc' }, include: { usuario: usuarioPublico } });
  }

  async resolver(id: string, estado: SolicitudAscensoEstado, actorId?: string) {
    return db.$transaction(async tx => {
      const solicitud = await tx.solicitudAscenso.findUnique({ where: { id } });
      if (!solicitud) throw new Error('SOLICITUD_NO_ENCONTRADA');
      if (actorId === solicitud.usuarioId) throw new Error('SOLICITUD_PROPIA');
      const cambio = await tx.solicitudAscenso.updateMany({ where: { id, estado: 'PENDIENTE' }, data: { estado } });
      if (!cambio.count) throw new Error('SOLICITUD_NO_PENDIENTE');
      if (estado === 'APROBADO') {
        const cambioRol = await tx.usuario.updateMany({ where: { id: solicitud.usuarioId, rol: 'VOLUNTARIO' }, data: { rol: 'COORDINADOR' } });
        if (!cambioRol.count) throw new Error('USUARIO_YA_ES_COORDINADOR');
      }
      const resultado = estado === 'APROBADO' ? 'aprobada' : 'rechazada';
      await aviso(tx, solicitud.usuarioId, `ascenso:resultado:${id}`, `Solicitud de ascenso ${resultado}`, estado === 'APROBADO' ? 'Tu rol cambió a Coordinador. Volvé a iniciar sesión para actualizar tus permisos.' : 'Tu solicitud fue rechazada. Podés presentar una nueva solicitud.');
      if (actorId) await aviso(tx, actorId, `ascenso:gestion:${id}`, `Solicitud ${resultado}`, 'La decisión se guardó correctamente.', `/usuarios/${solicitud.usuarioId}/solicitudes`);
      return { ...solicitud, estado };
    });
  }
  actualizarEstado(id: string, estado: SolicitudAscensoEstado, actorId?: string) { return this.resolver(id, estado, actorId); }
  aprobar(id: string, _usuarioId: string, actorId?: string) { return this.resolver(id, SolicitudAscensoEstado.APROBADO, actorId); }
}
