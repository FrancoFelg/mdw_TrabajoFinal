import { NextRequest, NextResponse } from 'next/server';
import { CursoController } from '../../../../../controllers/curso.controller';
import { esCoordinadorOAdmin, getUserFromRequest } from '@/lib/auth';
import { leerBody, RESPUESTA_NO_AUTORIZADO, RESPUESTA_PROHIBIDO, responderErrorCurso } from '@/lib/cursoErrores';

const controller = new CursoController();

type Contexto = { params: Promise<{ id: string }> };

// GET /api/cursos/:id — detalle (autenticado)
export async function GET(req: NextRequest, { params }: Contexto) {
  if (!getUserFromRequest(req)) return RESPUESTA_NO_AUTORIZADO();
  try {
    const { id } = await params;
    const curso = await controller.obtenerPorId(id);
    return NextResponse.json(curso);
  } catch (error) {
    return responderErrorCurso(error, 'Error al consultar el curso.');
  }
}

// PATCH /api/cursos/:id — editar datos y/o atributos (coordinador/admin)
export async function PATCH(req: NextRequest, { params }: Contexto) {
  const usuario = getUserFromRequest(req);
  if (!usuario) return RESPUESTA_NO_AUTORIZADO();
  if (!esCoordinadorOAdmin(usuario)) return RESPUESTA_PROHIBIDO();

  try {
    const { id } = await params;
    const body = await leerBody(req);
    const actualizado = await controller.actualizar(id, body, usuario.id);
    return NextResponse.json(actualizado);
  } catch (error) {
    return responderErrorCurso(error, 'Error al actualizar el curso.');
  }
}

// PUT se acepta como alias de PATCH para mantener consistencia con /api/certificados/:id
export const PUT = PATCH;

// DELETE /api/cursos/:id — baja lógica (coordinador/admin)
export async function DELETE(req: NextRequest, { params }: Contexto) {
  const usuario = getUserFromRequest(req);
  if (!usuario) return RESPUESTA_NO_AUTORIZADO();
  if (!esCoordinadorOAdmin(usuario)) return RESPUESTA_PROHIBIDO();

  try {
    const { id } = await params;
    await controller.eliminar(id, usuario.id);
    return NextResponse.json({ mensaje: 'Curso eliminado correctamente.' });
  } catch (error) {
    return responderErrorCurso(error, 'Error al eliminar el curso.');
  }
}
