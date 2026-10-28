import { db } from '../config/database';
import { NotificacionTipo } from '@prisma/client';

export type NuevaNotificacion = { tipo: NotificacionTipo; titulo: string; cuerpo: string; enlace: string; clave: string };

export class NotificacionRepository {
  // Coordinadores y admins activos (destinatarios de la cola y de los casos sin atender).
  async coordinacion() {
    return (await db.usuario.findMany({ where: { rol: { in: ['COORDINADOR', 'ADMIN'] } }, select: { id: true } })).map(u => u.id);
  }

  // Voluntarios habilitados para casos rojos: al menos un certificado APROBADO vigente.
  async habilitados() {
    const filas = await db.certificado.findMany({ where: { estado: 'APROBADO', fechaEliminacion: null }, select: { usuarioId: true }, distinct: ['usuarioId'] });
    return filas.map(f => f.usuarioId);
  }

  // Crea el aviso solo para quienes todavía no lo tienen (misma clave) y devuelve a quiénes se creó.
  async crearParaNuevos(usuarioIds: string[], datos: NuevaNotificacion) {
    if (!usuarioIds.length) return [];
    const ya = await db.notificacion.findMany({ where: { clave: datos.clave, usuarioId: { in: usuarioIds } }, select: { usuarioId: true } });
    const nuevos = usuarioIds.filter(id => !ya.some(y => y.usuarioId === id));
    if (nuevos.length) await db.notificacion.createMany({ data: nuevos.map(usuarioId => ({ usuarioId, ...datos })), skipDuplicates: true });
    return nuevos;
  }

  async listar(usuarioId: string, limite = 50) {
    return await db.notificacion.findMany({ where: { usuarioId }, orderBy: { creadoEn: 'desc' }, take: limite });
  }

  async contarNoLeidas(usuarioId: string) {
    return await db.notificacion.count({ where: { usuarioId, leidaEn: null } });
  }

  async marcarLeida(id: string, usuarioId: string) {
    await db.notificacion.updateMany({ where: { id, usuarioId, leidaEn: null }, data: { leidaEn: new Date() } });
  }

  async marcarTodas(usuarioId: string) {
    await db.notificacion.updateMany({ where: { usuarioId, leidaEn: null }, data: { leidaEn: new Date() } });
  }

  async suscripciones(usuarioIds: string[]) {
    return await db.suscripcionPush.findMany({ where: { usuarioId: { in: usuarioIds } } });
  }

  async guardarSuscripcion(usuarioId: string, s: { endpoint: string; p256dh: string; auth: string }) {
    await db.suscripcionPush.upsert({ where: { endpoint: s.endpoint }, update: { usuarioId, p256dh: s.p256dh, auth: s.auth }, create: { usuarioId, ...s } });
  }

  async borrarSuscripcion(endpoint: string, usuarioId?: string) {
    await db.suscripcionPush.deleteMany({ where: { endpoint, ...(usuarioId ? { usuarioId } : {}) } });
  }

  async tieneSuscripcion(usuarioId: string, endpoint: string) {
    return !!(await db.suscripcionPush.findFirst({ where: { usuarioId, endpoint } }));
  }

  // Casos SIN_GESTIONAR creados antes de `desde` para una prioridad.
  async sinAtender(prioridad: 'ROJO' | 'AMARILLO' | 'VERDE', desde: Date) {
    return await db.emergencia.findMany({ where: { estado: 'SIN_GESTIONAR', prioridad, fecha: { lte: desde } }, select: { id: true, descripcion: true, fecha: true, prioridad: true } });
  }
}
