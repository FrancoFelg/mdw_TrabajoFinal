import { NextRequest, NextResponse } from 'next/server';
import { CursoController } from '../../../../controllers/curso.controller';
import { esCoordinadorOAdmin, getUserFromRequest } from '@/lib/auth';
import { leerBody, RESPUESTA_NO_AUTORIZADO, RESPUESTA_PROHIBIDO, responderErrorCurso } from '@/lib/cursoErrores';

const controller = new CursoController();

// GET /api/cursos — catálogo de cursos (autenticado)
export async function GET(req: NextRequest) {
  if (!getUserFromRequest(req)) return RESPUESTA_NO_AUTORIZADO();
  try {
    const cursos = await controller.listar();
    return NextResponse.json(cursos);
  } catch (error) {
    return responderErrorCurso(error, 'Error al obtener los cursos.');
  }
}

// POST /api/cursos — crear curso (coordinador/admin)
export async function POST(req: NextRequest) {
  const usuario = getUserFromRequest(req);
  if (!usuario) return RESPUESTA_NO_AUTORIZADO();
  if (!esCoordinadorOAdmin(usuario)) return RESPUESTA_PROHIBIDO();

  try {
    const body = await leerBody(req);
    const nuevoCurso = await controller.crear(body, usuario.id);
    return NextResponse.json(nuevoCurso, { status: 201 });
  } catch (error) {
    return responderErrorCurso(error, 'Error al crear el curso.');
  }
}
