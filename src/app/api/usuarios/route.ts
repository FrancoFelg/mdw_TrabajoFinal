import { NextRequest, NextResponse } from 'next/server';
import { UsuarioService } from '../../../../services/usuario.service';
import { RESPUESTA_NO_AUTORIZADO } from '@/lib/cursoErrores';
import { getUserFromRequest } from '@/lib/auth';

const usuarioService = new UsuarioService();

export async function GET(req: NextRequest) {
  try {
    const usuario = getUserFromRequest(req);
    if (!usuario) return RESPUESTA_NO_AUTORIZADO();
    const usuarios = await usuarioService.listarUsuarios();

    return NextResponse.json(usuarios, { status: 200 });
  } catch (error: any) {
    console.error('Error en GET /api/usuarios:', error);
    return NextResponse.json(
      { error: 'Error interno al obtener los usuarios.' },
      { status: 500 }
    );
  }
}

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