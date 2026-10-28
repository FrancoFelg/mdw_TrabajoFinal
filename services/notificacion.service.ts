import webpush from 'web-push';
import { NotificacionRepository, type NuevaNotificacion } from '../repositories/notificacion.repository';

// Avisos de la historia 12: centro de avisos en la app + push opcional del navegador.
// Sin claves VAPID configuradas, los avisos se guardan igual y simplemente no se manda push.

const repo = new NotificacionRepository();

// Las claves se leen al usarlas (no al cargar el módulo), así siempre ven el entorno ya cargado.
let configurado = false;
function vapid() {
  const publica = process.env.VAPID_PUBLIC_KEY, privada = process.env.VAPID_PRIVATE_KEY;
  if (!publica || !privada) return null;
  if (!configurado) {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:avisos@example.com', publica, privada);
    configurado = true;
  }
  return publica;
}

export const clavePublicaPush = () => vapid();

// Minutos que un caso puede seguir libre antes de avisar a coordinación.
const UMBRAL_SIN_ATENDER_MIN = { ROJO: 10, AMARILLO: 30, VERDE: 120 } as const;
const NOMBRE = { ROJO: 'rojo', AMARILLO: 'amarillo', VERDE: 'verde' } as const;

const recortar = (texto: string, max = 120) => (texto.length > max ? `${texto.slice(0, max - 1)}…` : texto);

async function enviarPush(usuarioIds: string[], datos: NuevaNotificacion, urgente: boolean) {
  if (!vapid() || !usuarioIds.length) return;
  const subs = await repo.suscripciones(usuarioIds);
  const carga = JSON.stringify({ titulo: datos.titulo, cuerpo: datos.cuerpo, enlace: datos.enlace, etiqueta: datos.clave, urgente });
  await Promise.all(subs.map(async s => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, carga, { TTL: urgente ? 900 : 3600, urgency: urgente ? 'high' : 'normal', timeout: 8000 });
    } catch (error) {
      const estado = (error as { statusCode?: number }).statusCode;
      // 404/410: el navegador dio de baja la suscripción; se borra para no reintentar.
      if (estado === 404 || estado === 410) await repo.borrarSuscripcion(s.endpoint);
      else console.error('Error enviando push:', estado ?? error);
    }
  }));
}

async function notificar(usuarioIds: string[], datos: NuevaNotificacion, urgente = false) {
  const unicos = [...new Set(usuarioIds)];
  const nuevos = await repo.crearParaNuevos(unicos, datos);
  await enviarPush(nuevos, datos, urgente);
  return nuevos.length;
}

export class NotificacionService {
  // Caso rojo nuevo → voluntarios habilitados y coordinación.
  async casoRojoNuevo(emergencia: { id: string; descripcion: string }) {
    const [coordinacion, habilitados] = await Promise.all([repo.coordinacion(), repo.habilitados()]);
    return notificar([...coordinacion, ...habilitados], {
      tipo: 'CASO_ROJO',
      titulo: 'Caso rojo sin tomar',
      cuerpo: recortar(emergencia.descripcion),
      enlace: `/casos/${emergencia.id}`,
      clave: `caso_rojo:${emergencia.id}`,
    }, true);
  }

  // Certificado o pedido de ascenso nuevo → coordinación (nunca a quien lo cargó).
  async validacionPendiente(tipo: 'certificado' | 'ascenso', id: string, persona: string, autorId: string) {
    const coordinacion = (await repo.coordinacion()).filter(u => u !== autorId);
    return notificar(coordinacion, {
      tipo: 'VALIDACION_PENDIENTE',
      titulo: tipo === 'certificado' ? 'Certificado para validar' : 'Pedido de ascenso',
      cuerpo: tipo === 'certificado' ? `${persona} cargó un certificado.` : `${persona} pidió ascenso a coordinador.`,
      enlace: '/equipo',
      clave: `${tipo}:${id}`,
    });
  }

  // Casos que siguen libres más allá del umbral → coordinación, una sola vez por caso.
  async revisarSinAtender() {
    const coordinacion = await repo.coordinacion();
    if (!coordinacion.length) return 0;
    let avisos = 0;
    for (const prioridad of ['ROJO', 'AMARILLO', 'VERDE'] as const) {
      const limite = new Date(Date.now() - UMBRAL_SIN_ATENDER_MIN[prioridad] * 60000);
      for (const e of await repo.sinAtender(prioridad, limite)) {
        const minutos = Math.round((Date.now() - e.fecha.getTime()) / 60000);
        avisos += await notificar(coordinacion, {
          tipo: 'CASO_SIN_ATENDER',
          titulo: `Caso ${NOMBRE[prioridad]} sin atender hace ${minutos >= 60 ? `${Math.floor(minutos / 60)} h${minutos % 60 ? ` ${minutos % 60} min` : ''}` : `${minutos} min`}`,
          cuerpo: recortar(e.descripcion),
          enlace: `/casos/${e.id}`,
          clave: `sin_atender:${e.id}`,
        }, prioridad === 'ROJO');
      }
    }
    return avisos;
  }

  listar(usuarioId: string) { return repo.listar(usuarioId); }
  contarNoLeidas(usuarioId: string) { return repo.contarNoLeidas(usuarioId); }
  marcarLeida(id: string, usuarioId: string) { return repo.marcarLeida(id, usuarioId); }
  marcarTodas(usuarioId: string) { return repo.marcarTodas(usuarioId); }
  guardarSuscripcion(usuarioId: string, s: { endpoint: string; p256dh: string; auth: string }) { return repo.guardarSuscripcion(usuarioId, s); }
  borrarSuscripcion(usuarioId: string, endpoint: string) { return repo.borrarSuscripcion(endpoint, usuarioId); }
  tieneSuscripcion(usuarioId: string, endpoint: string) { return repo.tieneSuscripcion(usuarioId, endpoint); }
}

// La revisión de casos sin atender corre como mucho una vez por minuto por proceso,
// disparada por los pedidos de la campanita (no hace falta un cron).
let ultimaRevision = 0;
export async function revisarSinAtenderSiCorresponde() {
  if (Date.now() - ultimaRevision < 60000) return;
  ultimaRevision = Date.now();
  try {
    await new NotificacionService().revisarSinAtender();
  } catch (error) {
    console.error('Error revisando casos sin atender:', error);
  }
}
