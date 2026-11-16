import { jsonPublico } from '@/lib/respuesta-publica';
import { NextRequest } from 'next/server';

import { SolicitudAscensoController } from '../../../../../../controllers/solicitudAscenso.controller';
import { esCoordinadorOAdmin, getUserFromRequest } from '@/lib/auth';

const controller = new SolicitudAscensoController();

type Contexto = {
  params: Promise<{ id: string }>;
};

export async function POST(
  req: NextRequest,
  { params }: Contexto,
) {
  const usuario = getUserFromRequest(req);

  if (!usuario) {
    return jsonPublico(
      { error: 'No autorizado' },
      { status: 401 },
    );
  }

  if (!esCoordinadorOAdmin(usuario)) {
    return jsonPublico(
      { error: 'Prohibido' },
      { status: 403 },
    );
  }

  try {
    const { id } = await params;
    const solicitud = await controller.aprobar(id);

    return jsonPublico(solicitud);
  } catch (error) {
    const mensaje =
      error instanceof Error ? error.message : '';

    if (mensaje === 'SOLICITUD_NO_ENCONTRADA') {
      return jsonPublico(
        { error: 'Solicitud no encontrada.' },
        { status: 404 },
      );
    }

    if (mensaje === 'SOLICITUD_NO_PENDIENTE') {
      return jsonPublico(
        { error: 'La solicitud no está pendiente.' },
        { status: 409 },
      );
    }

    if (mensaje === 'USUARIO_YA_ES_COORDINADOR') {
      return jsonPublico(
        { error: 'El usuario ya es coordinador.' },
        { status: 409 },
      );
    }

    return jsonPublico(
      { error: 'Error al aprobar la solicitud.' },
      { status: 500 },
    );
  }
}