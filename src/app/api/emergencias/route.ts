import { NextRequest, NextResponse } from 'next/server';
import { EmergenciaController } from '../../../../controllers/emergencia.controller';
import { CrearEmergenciaSchema } from '../../../../services/emergencia.service';
import { getUserFromRequest } from '@/lib/auth';

const controller = new EmergenciaController();

// GET /api/emergencias — emergencias activas con coordenadas, para el mapa (autenticado)
export async function GET(req: NextRequest) {
  if (!getUserFromRequest(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const emergencias = await controller.listarParaMapa();
    return NextResponse.json(emergencias, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Error en GET /api/emergencias:', error);
    return NextResponse.json({ error: 'Error al obtener las emergencias.' }, { status: 500 });
  }
}

// POST /api/emergencias — reportar una emergencia (autenticado).
// Body: { descripcion, imagen?, prioridad?, direccion }
//    ó { descripcion, imagen?, prioridad?, coordenada_x, coordenada_y, provincia }
// coordenada_x = longitud, coordenada_y = latitud. Sin prioridad, nace VERDE.
export async function POST(req: NextRequest) {
  if (!getUserFromRequest(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'El body debe ser un JSON válido.' }, { status: 400 });
  }

  const validacion = CrearEmergenciaSchema.safeParse(body);
  if (!validacion.success) {
    return NextResponse.json(
      { error: validacion.error.issues.map((i) => i.message).join(' ') },
      { status: 400 },
    );
  }

  try {
    const emergencia = await controller.crear(validacion.data);
    return NextResponse.json(emergencia, { status: 201 });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : '';

    switch (mensaje) {
      case 'DIRECCION_NO_ENCONTRADA':
        return NextResponse.json(
          { error: 'No se encontró la dirección indicada. Revisá calle, altura y localidad.' },
          { status: 422 },
        );
      case 'PROVINCIA_NO_RECONOCIDA':
        return NextResponse.json(
          { error: 'No se pudo determinar la provincia de la dirección indicada.' },
          { status: 422 },
        );
      // La key falta, está mal restringida o Google no responde: no es culpa
      // del que reporta, y puede reintentar mandando su ubicación por GPS
      case 'GOOGLE_MAPS_NO_CONFIGURADO':
      case 'GOOGLE_MAPS_NO_DISPONIBLE':
        return NextResponse.json(
          { error: 'No se pudo ubicar la dirección en este momento. Intentá enviando tu ubicación GPS.' },
          { status: 503 },
        );
      default:
        console.error('Error en POST /api/emergencias:', error);
        return NextResponse.json({ error: 'Error al registrar la emergencia.' }, { status: 500 });
    }
  }
}
