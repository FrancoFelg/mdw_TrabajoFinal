import { jsonPublico } from '@/lib/respuesta-publica';
import { NextRequest } from 'next/server';
import { CursoAtributoController } from '../../../../controllers/cursoAtributo.controller';
import { esCoordinadorOAdmin } from '@/lib/auth';
import { actorActual } from '@/lib/actor-actual';
import { leerBody, RESPUESTA_NO_AUTORIZADO, RESPUESTA_PROHIBIDO, responderErrorCurso } from '@/lib/cursoErrores';

const controller = new CursoAtributoController();

// GET /api/cursos-atributos — paramétrica de atributos posibles para un curso (autenticado)
export async function GET(req: NextRequest) {
  if (!await actorActual(req)) return RESPUESTA_NO_AUTORIZADO();
  try {
    const atributos = await controller.listar();
    return jsonPublico(atributos);
  } catch (error) {
    return responderErrorCurso(error, 'Error al listar los atributos de curso.');
  }
}

// POST /api/cursos-atributos — alta de un atributo en la paramétrica (coordinador/admin)
export async function POST(req: NextRequest) {
  const usuario = await actorActual(req);
  if (!usuario) return RESPUESTA_NO_AUTORIZADO();
  if (!esCoordinadorOAdmin(usuario)) return RESPUESTA_PROHIBIDO();

  try {
    const body = await leerBody(req);
    const nuevo = await controller.crear(body, usuario.id);
    return jsonPublico(nuevo, { status: 201 });
  } catch (error) {
    return responderErrorCurso(error, 'Error al crear el atributo de curso.');
  }
}
