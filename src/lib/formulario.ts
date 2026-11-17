import { ZodError } from 'zod';

export type ResultadoFormulario = { ok: boolean; error: string; campos: Record<string, string> };
export const formularioInicial: ResultadoFormulario = { ok: false, error: '', campos: {} };
export function falloFormulario(error: unknown): ResultadoFormulario {
  if (error instanceof ZodError) {
    const campos: Record<string, string> = {};
    for (const issue of error.issues) {
      const ruta = issue.path.join('.');
      const campo = ruta.replace(/^persona\./, '');
      campos[campo] = issue.message;
    }
    return { ok: false, error: campos[''] ?? '', campos };
  }
  const codigo = (error as { code?: string })?.code;
  const mensaje = error instanceof Error ? error.message : '';
  const mensajes: Record<string, string> = {
    SIN_SESION: 'Tu sesión venció. Volvé a ingresar.',
    SIN_PERMISO: 'No tenés permiso para realizar esta operación.',
    ADMIN_PROTEGIDO: 'No se permite modificar administradores.',
    SOLICITUD_PROPIA: 'No podés resolver tu propia solicitud.',
    SOLICITUD_PENDIENTE_EXISTENTE: 'Ya existe una solicitud de ascenso pendiente.',
    SOLICITUD_NO_PENDIENTE: 'La solicitud ya fue resuelta.',
    SOLICITUD_NO_ENCONTRADA: 'Solicitud no encontrada.',
    USUARIO_YA_ES_COORDINADOR: 'Solo voluntarios pueden recibir un ascenso.',
    CASO_EN_CAMINO: 'Tiene un caso en camino: tiene que finalizarlo antes del ascenso.',
    SOLO_VOLUNTARIOS: 'Solo voluntarios pueden solicitar ascenso.',
    ESTADO_NO_PENDIENTE: 'El certificado ya fue resuelto.',
    CERTIFICADO_NO_ENCONTRADO: 'Certificado no encontrado.',
    USUARIO_NO_ENCONTRADO: 'Usuario no encontrado.',
  };
  return { ok: false, campos: {}, error: codigo === 'P2002' ? 'Ese nombre de usuario, email o código ya está registrado.' : mensajes[mensaje] ?? 'No pudimos guardar el cambio. Intentá nuevamente.' };
}
