import { randomUUID } from 'node:crypto';
import { NextRequest } from 'next/server';
import { jsonPublico } from './respuesta-publica';
import { db } from '../../config/database';
import { SolicitudAscensoService } from '../../services/solicitudAscenso.service';
import { getUserFromRequest } from './auth';

const errores: Record<string, [number, string]> = {
  SOLO_VOLUNTARIOS: [403, 'Solo los voluntarios pueden solicitar ascenso.'],
  SOLICITUD_PENDIENTE_EXISTENTE: [409, 'Ya existe una solicitud de ascenso pendiente.'],
  USUARIO_YA_ES_COORDINADOR: [409, 'Solo los voluntarios pueden solicitar y recibir un ascenso.'],
  SOLICITUD_NO_ENCONTRADA: [404, 'Solicitud no encontrada.'],
  SOLICITUD_NO_PENDIENTE: [409, 'La solicitud ya fue resuelta.'],
  SOLICITUD_PROPIA: [403, 'No podés resolver tu propia solicitud.'],
  CASO_EN_CAMINO: [409, 'Tiene un caso en camino: tiene que finalizarlo antes del ascenso.'],
};

export async function operarAscenso(req: NextRequest, operacion: 'crear' | 'aprobar' | 'rechazar', id?: string) {
  const token = getUserFromRequest(req);
  if (!token?.id) return jsonPublico({ error: 'No autorizado' }, { status: 401 });
  try {
    // Consultar el rol actual: el JWT puede ser anterior al ascenso.
    const usuario = await db.usuario.findUnique({ where: { id: token.id }, select: { rol: true } });
    if (!usuario) return jsonPublico({ error: 'No autorizado' }, { status: 401 });
    if (operacion !== 'crear' && usuario.rol !== 'COORDINADOR' && usuario.rol !== 'ADMIN') throw new Error('PROHIBIDO');
    const servicio = new SolicitudAscensoService();
    const solicitud = operacion === 'crear' ? await servicio.crear(token.id) : await servicio[operacion](id!, token.id);
    return jsonPublico(solicitud, { status: operacion === 'crear' ? 201 : 200 });
  } catch (error) {
    const codigo = error instanceof Error ? error.message : '';
    const [status, mensaje] = codigo === 'PROHIBIDO' ? [403, 'Solo coordinación puede resolver solicitudes.'] : errores[codigo] ?? [500, 'No se pudo completar la operación. Reintentá consultando primero el historial.'];
    // Un fallo no cambia el estado del trámite; el aviso queda separado del historial.
    try {
      await db.notificacion.create({ data: { usuarioId: token.id, tipo: 'VALIDACION_PENDIENTE', clave: `ascenso:error:${randomUUID()}`, titulo: 'Operación de ascenso no completada', cuerpo: mensaje, enlace: '/ascensos' } });
    } catch (avisoError) { console.error('No se pudo guardar el aviso de ascenso:', avisoError); }
    return jsonPublico({ error: mensaje }, { status });
  }
}

export async function listarAscensos(req: NextRequest) {
  const token = getUserFromRequest(req);
  if (!token?.id) return jsonPublico({ error: 'No autorizado' }, { status: 401 });
  try {
    const usuario = await db.usuario.findUnique({ where: { id: token.id }, select: { rol: true } });
    if (!usuario) return jsonPublico({ error: 'No autorizado' }, { status: 401 });
    const coordina = usuario.rol === 'COORDINADOR' || usuario.rol === 'ADMIN';
    const filtro = coordina ? req.nextUrl.searchParams.get('usuarioId') || undefined : token.id;
    return jsonPublico(await new SolicitudAscensoService().listar(filtro));
  } catch { return jsonPublico({ error: 'No se pudo consultar el historial.' }, { status: 500 }); }
}
