import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { RESPUESTA_NO_AUTORIZADO, leerBody } from '@/lib/cursoErrores'; // O la librería genérica de errores de tu app
import { UsuarioController } from '../../../../../controllers/usuario.controller';
import { UsuarioService } from '../../../../../services/usuario.service';

const controller = new UsuarioController();
const service = new UsuarioService();

// GET /api/usuarios/me — Obtener perfil del usuario autenticado
export async function GET(req: NextRequest) {
  const usuario = getUserFromRequest(req);
  if (!usuario) return RESPUESTA_NO_AUTORIZADO();

  try {
    const perfil = await service.obtenerPerfil(usuario.id);
    return NextResponse.json(perfil);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Error al obtener el perfil del usuario.' },
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
    const perfilActualizado = await service.actualizarPerfil(usuario.id, body);
    
    return NextResponse.json(perfilActualizado);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Error al actualizar el perfil del usuario.' },
      { status: 400 }
    );
  }
}