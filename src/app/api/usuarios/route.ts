import { NextRequest, NextResponse } from 'next/server';
import { UsuarioService } from '../../../../services/usuario.service';

const usuarioService = new UsuarioService();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nombreUsuario, password, rol, persona } = body;

    if (!nombreUsuario || !password || !persona?.nombre || !persona?.apellido || !persona?.fechaNac) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios para el registro.' },
        { status: 400 }
      );
    }

    const nuevoUsuario = await usuarioService.registrarUsuario({
      nombreUsuario,
      password,
      rol,
      persona: {
        ...persona,
        fechaNac: new Date(persona.fechaNac),
      },
    });

    return NextResponse.json(nuevoUsuario, { status: 201 });
  } catch (error: any) {
    if (error.message === 'NOMBRE_USUARIO_EXISTENTE') {
      return NextResponse.json(
        { error: 'El nombre de usuario ya está registrado.' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Error interno al registrar el usuario.' },
      { status: 500 }
    );
  }
}