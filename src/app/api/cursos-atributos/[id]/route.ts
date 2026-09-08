import { NextRequest, NextResponse } from 'next/server';
import { CursoAtributoController } from '../../../../../controllers/cursoAtributo.controller';
import { esCoordinadorOAdmin, getUserFromRequest } from '@/lib/auth';
import { RESPUESTA_NO_AUTORIZADO, RESPUESTA_PROHIBIDO, responderErrorCurso } from '@/lib/cursoErrores';

const controller = new CursoAtributoController();

type Contexto = { params: Promise<{ id: string }> };

// GET /api/cursos-atributos/:id
export async function GET(req: NextRequest, { params }: Contexto) {
  if (!getUserFromRequest(req)) return RESPUESTA_NO_AUTORIZADO();
  try {
    const { id } = await params;
    return NextResponse.json(await controller.obtenerPorId(id));
  } catch (error) {
    return responderErrorCurso(error, 'Error al consultar el atributo de curso.');
  }
}

// DELETE /api/cursos-atributos/:id — baja lógica (coordinador/admin)
export async function DELETE(req: NextRequest, { params }: Contexto) {
  const usuario = getUserFromRequest(req);
  if (!usuario) return RESPUESTA_NO_AUTORIZADO();
  if (!esCoordinadorOAdmin(usuario)) return RESPUESTA_PROHIBIDO();

  try {
    const { id } = await params;
    await controller.eliminar(id, usuario.id);
    return NextResponse.json({ mensaje: 'Atributo eliminado correctamente.' });
  } catch (error) {
    return responderErrorCurso(error, 'Error al eliminar el atributo de curso.');
  }
}
