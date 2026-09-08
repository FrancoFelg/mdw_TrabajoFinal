import { NextRequest, NextResponse } from 'next/server';

import { SolicitudAscensoController } from '../../../../controllers/solicitudAscenso.controller';
import { getUserFromRequest, esCoordinadorOAdmin } from '@/lib/auth';

const controller = new SolicitudAscensoController();

export async function POST(req: NextRequest) {
  const usuario = getUserFromRequest(req);

  if (!usuario) {
    return NextResponse.json(
      { error: 'No autorizado' },
      { status: 401 },
    );
  }

  try {
    const solicitud = await controller.crear(usuario.id);

    return NextResponse.json(solicitud, { status: 201 });
  } catch (error) {
    const mensaje =
      error instanceof Error ? error.message : 'Error al crear la solicitud';

    if (mensaje === 'SOLICITUD_PENDIENTE_EXISTENTE') {
      return NextResponse.json(
        { error: 'Ya existe una solicitud de ascenso pendiente.' },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: 'Error al crear la solicitud.' },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
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
    const solicitudes = await controller.listar();

    return NextResponse.json(solicitudes);
  } catch {
    return NextResponse.json(
      { error: 'Error al consultar las solicitudes.' },
      { status: 500 },
    );
  }
}