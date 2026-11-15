import { after } from 'next/server';
import { NotificacionService } from '../../services/notificacion.service';
import { UsuarioService } from '../../services/usuario.service';

// Disparadores de avisos (historia 12). Corren después de responder (`after`), así un
// envío de push lento nunca demora un reporte ni un alta. Si fallan, solo se registra.

function enSegundoPlano(nombre: string, tarea: () => Promise<unknown>) {
  after(async () => {
    try { await tarea(); } catch (error) { console.error(`Error enviando avisos (${nombre}):`, error); }
  });
}

async function nombreDe(usuarioId: string) {
  const perfil = await new UsuarioService().obtenerPerfil(usuarioId).catch(() => null);
  return perfil ? `${perfil.persona.nombre} ${perfil.persona.apellido}` : 'Una persona voluntaria';
}

export function avisarEmergenciaNueva(emergencia: { id: string; descripcion: string; prioridad: string }) {
  if (emergencia.prioridad !== 'ROJO') return;
  enSegundoPlano('caso rojo', () => new NotificacionService().casoRojoNuevo(emergencia));
}

export function avisarCertificadoNuevo(certificadoId: string, usuarioId: string) {
  enSegundoPlano('certificado', async () => new NotificacionService().validacionPendiente('certificado', certificadoId, await nombreDe(usuarioId), usuarioId));
}

export function avisarAscensoNuevo(solicitudId: string, usuarioId: string) {
  enSegundoPlano('ascenso', async () => new NotificacionService().validacionPendiente('ascenso', solicitudId, await nombreDe(usuarioId), usuarioId));
}
