import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { RESPUESTA_NO_AUTORIZADO, leerBody } from '@/lib/cursoErrores';
import { EmergenciaService } from '../../../../../services/emergencia.service';

const service = new EmergenciaService();

type ContextoRoute = {
  params: Promise<{ id: string }>;
};

// GET /api/emergencias/[id] — Obtener una emergencia por ID
export async function GET(req: NextRequest, { params }: ContextoRoute) {
  const usuario = getUserFromRequest(req);
  if (!usuario) return RESPUESTA_NO_AUTORIZADO();

  try {
    const { id } = await params;
    const emergencia = await service.obtenerPorId(id);

    if (!emergencia) {
      return NextResponse.json(
        { error: 'Emergencia no encontrada.' },
        { status: 404 }
      );
    }

    return NextResponse.json(emergencia, { status: 200 });
  } catch (error: any) {
    console.error('Error en GET /api/emergencias/[id]:', error);
    return NextResponse.json(
      { error: 'Error interno al obtener la emergencia.' },
      { status: 500 }
    );
  }
}