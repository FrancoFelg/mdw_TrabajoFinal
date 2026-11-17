import { jsonPublico } from '@/lib/respuesta-publica';
import { NextRequest } from 'next/server';
import { CursoController } from '../../../../controllers/curso.controller';
import { esCoordinadorOAdmin } from '@/lib/auth';
import { actorActual } from '@/lib/actor-actual';
import { leerBody, RESPUESTA_NO_AUTORIZADO, RESPUESTA_PROHIBIDO, responderErrorCurso } from '@/lib/cursoErrores';

const controller = new CursoController();

// GET /api/cursos — catálogo de cursos (autenticado)
export async function GET(req: NextRequest) {
  if (!await actorActual(req)) return RESPUESTA_NO_AUTORIZADO();
  try {
    const cursos = await controller.listar();
    return jsonPublico(cursos);
  } catch (error) {
    return responderErrorCurso(error, 'Error al obtener los cursos.');
  }
}

// POST /api/cursos — crear curso (coordinador/admin)
export async function POST(req: NextRequest) {
  const usuario = await actorActual(req);
  if (!usuario) return RESPUESTA_NO_AUTORIZADO();
  if (!esCoordinadorOAdmin(usuario)) return RESPUESTA_PROHIBIDO();

  try {
    const body = await leerBody(req);
    const nuevoCurso = await controller.crear(body, usuario.id);
    return jsonPublico(nuevoCurso, { status: 201 });
  } catch (error) {
    return responderErrorCurso(error, 'Error al crear el curso.');
  }
}
