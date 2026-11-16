import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { RESPUESTA_NO_AUTORIZADO, leerBody } from '@/lib/cursoErrores'; // O la librería genérica de errores de tu app
import { UsuarioService } from '../../../../../services/usuario.service';
import { editarUsuario } from '@/lib/usuarios-admin';
import { ZodError } from 'zod';

const service = new UsuarioService();

// GET /api/usuarios/me — Obtener perfil del usuario autenticado
export async function GET(req: NextRequest) {
  const usuario = getUserFromRequest(req);
  if (!usuario) return RESPUESTA_NO_AUTORIZADO();

  try {
    const perfil = await service.obtenerPerfil(usuario.id);
    return NextResponse.json(perfil);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al obtener el perfil del usuario.' },
      { status: 500 }
    );
  }
}

// PATCH /api/usuarios/me — Actualizar datos personales del usuario autenticado
export async function PATCH(req: NextRequest) {
  const usuario = getUserFromRequest(req);
  if (!usuario) return RESPUESTA_NO_AUTORIZADO();

  try {
    const body = await leerBody(req);
    const perfilActualizado = await editarUsuario(usuario.id, body, true);
    
    return NextResponse.json(perfilActualizado);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof ZodError ? 'Datos inválidos.' : (error as { code?: string })?.code === 'P2002' ? 'Ese nombre de usuario ya existe.' : 'No se pudo actualizar el perfil.' },
      { status: (error as { code?: string })?.code === 'P2002' ? 409 : 400 }
    );
  }
}
