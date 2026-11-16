import { jsonPublico } from '@/lib/respuesta-publica';
import { NextRequest } from 'next/server';
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
      return jsonPublico(
        { error: 'Emergencia no encontrada.' },
        { status: 404 }
      );
    }

    return jsonPublico(emergencia, { status: 200 });
  } catch (error: any) {
    if (error.message === 'EMERGENCIA_NO_ENCONTRADA') {
      return jsonPublico({ error: 'Emergencia no encontrada.' }, { status: 404 });
    }
    console.error('Error en GET /api/emergencias/[id]:', error);
    return jsonPublico(
      { error: 'Error interno al obtener la emergencia.' },
      { status: 500 }
    );
  }
}
