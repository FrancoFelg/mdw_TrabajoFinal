import { NextRequest, NextResponse } from 'next/server';

import { SolicitudAscensoController } from '../../../../../controllers/solicitudAscenso.controller';
import { esCoordinadorOAdmin, getUserFromRequest } from '@/lib/auth';

const controller = new SolicitudAscensoController();

type Contexto = {
  params: Promise<{ id: string }>;
};

export async function GET(
  req: NextRequest,
  { params }: Contexto,
) {
  const usuario = getUserFromRequest(req);

  if (!usuario) {
    return NextResponse.json(
      { error: 'No autorizado' },
      { status: 401 },
    );
  }

  if (!esCoordinadorOAdmin(usuario)) {
    return NextResponse.json(
      { error: 'Prohibido' },
      { status: 403 },
    );
  }

  try {
    const { id } = await params;
    const solicitud = await controller.obtenerPorId(id);

    return NextResponse.json(solicitud);
  } catch (error) {
    const mensaje =
      error instanceof Error ? error.message : '';

    if (mensaje === 'SOLICITUD_NO_ENCONTRADA') {
      return NextResponse.json(
        { error: 'Solicitud no encontrada.' },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: 'Error al consultar la solicitud.' },
      { status: 500 },
    );
  }
}