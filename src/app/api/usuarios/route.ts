import { jsonPublico } from '@/lib/respuesta-publica';
import { NextRequest } from 'next/server';
import { UsuarioService } from '../../../../services/usuario.service';
import { RESPUESTA_NO_AUTORIZADO } from '@/lib/cursoErrores';
import { getUserFromRequest } from '@/lib/auth';
import { puedeGestionarUsuarios } from '@/lib/usuarios-admin';
import { RegistroApiSchema } from '@/lib/registro';

const usuarioService = new UsuarioService();

export async function GET(req: NextRequest) {
  try {
    const usuario = getUserFromRequest(req);
    if (!usuario) return RESPUESTA_NO_AUTORIZADO();
    if (!await puedeGestionarUsuarios(usuario.id)) {
      return jsonPublico({ error: 'El directorio requiere rol coordinador o administrador.' }, { status: 403 });
    }
    const usuarios = await usuarioService.listarUsuarios();

    return jsonPublico(usuarios, { status: 200 });
  } catch (error: any) {
    console.error('Error en GET /api/usuarios:', error);
    return jsonPublico(
      { error: 'Error interno al obtener los usuarios.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try { body = await req.json(); } catch { return jsonPublico({ error: 'El body debe ser un JSON válido.' }, { status: 400 }); }
    const validacion = RegistroApiSchema.safeParse(body);
    if (!validacion.success) {
      return jsonPublico({ error: validacion.error.issues[0].message }, { status: 400 });
    }

    const nuevoUsuario = await usuarioService.registrarUsuario(validacion.data);

    return jsonPublico(nuevoUsuario, { status: 201 });
  } catch (error: any) {

    if (error.message === 'NOMBRE_USUARIO_EXISTENTE' || error.code === 'P2002') {
      return jsonPublico(
        { error: 'El nombre de usuario o email ya está registrado.' },
        { status: 409 }
      );
    }
    return jsonPublico(
      { error: 'Error interno al registrar el usuario.' },
      { status: 500 }
    );
  }
}
