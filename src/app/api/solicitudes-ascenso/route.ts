import { jsonPublico } from '@/lib/respuesta-publica';
import { NextRequest } from 'next/server';

import { SolicitudAscensoController } from '../../../../controllers/solicitudAscenso.controller';
import { getUserFromRequest, esCoordinadorOAdmin } from '@/lib/auth';

const controller = new SolicitudAscensoController();

export async function POST(req: NextRequest) {
  const usuario = getUserFromRequest(req);

  if (!usuario) {
    return jsonPublico(
      { error: 'No autorizado' },
      { status: 401 },
    );
  }

  try {
    const solicitud = await controller.crear(usuario.id);

    return jsonPublico(solicitud, { status: 201 });
  } catch (error) {
    const mensaje =
      error instanceof Error ? error.message : 'Error al crear la solicitud';

    if (mensaje === 'SOLO_VOLUNTARIOS') return jsonPublico({ error: 'Solo los voluntarios pueden solicitar ascenso.' }, { status: 403 });

    if (mensaje === 'SOLICITUD_PENDIENTE_EXISTENTE') {
      return jsonPublico(
        { error: 'Ya existe una solicitud de ascenso pendiente.' },
        { status: 409 },
      );
    }

    return jsonPublico(
      { error: 'Error al crear la solicitud.' },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
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
    const solicitudes = await controller.listar();

    return jsonPublico(solicitudes);
  } catch {
    return jsonPublico(
      { error: 'Error al consultar las solicitudes.' },
      { status: 500 },
    );
  }
}
