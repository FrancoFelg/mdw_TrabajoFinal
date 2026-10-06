import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { EmergenciaController } from '../../../../../../controllers/emergencia.controller';
import { MODOS_VIAJE } from '../../../../../../services/rutas.service';
import { getUserFromRequest } from '@/lib/auth';

const controller = new EmergenciaController();

type Contexto = { params: Promise<{ id: string }> };

// Los query params llegan como string. Se exige no vacío antes de convertir
// porque Number("") da 0 (una coordenada válida). "abc" da NaN y z.number() lo rechaza.
const coordenada = (min: number, max: number) =>
  z.string().trim().min(1).transform(Number).pipe(z.number().min(min).max(max));

const QuerySchema = z.object({
  lat: coordenada(-90, 90),
  lng: coordenada(-180, 180),
  modo: z.enum(MODOS_VIAJE).optional(),
});

// GET /api/emergencias/:id/eta?lat=..&lng=..&modo=DRIVE — distancia y tiempo
// estimado de llegada desde la posición actual del voluntario (autenticado)
export async function GET(req: NextRequest, { params }: Contexto) {
  if (!getUserFromRequest(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const validacion = QuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!validacion.success) {
    return NextResponse.json(
      { error: `Parámetros inválidos: lat y lng son obligatorios; modo puede ser ${MODOS_VIAJE.join(', ')}.` },
      { status: 400 },
    );
  }

  try {
    const { id } = await params;
    const { lat, lng, modo } = validacion.data;
    const eta = await controller.calcularEta(id, { lat, lng }, modo);
    return NextResponse.json(eta, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : '';

    switch (mensaje) {
      case 'EMERGENCIA_NO_ENCONTRADA':
        return NextResponse.json({ error: 'La emergencia no existe.' }, { status: 404 });
      case 'EMERGENCIA_SIN_COORDENADAS':
        return NextResponse.json({ error: 'La emergencia no tiene coordenadas cargadas.' }, { status: 409 });
      case 'RUTA_NO_ENCONTRADA':
        return NextResponse.json(
          { error: 'No hay una ruta posible entre tu ubicación y la emergencia con ese modo de viaje.' },
          { status: 422 },
        );
      case 'GOOGLE_MAPS_NO_CONFIGURADO':
      case 'GOOGLE_MAPS_NO_DISPONIBLE':
        return NextResponse.json({ error: 'No se pudo calcular la ruta en este momento.' }, { status: 503 });
      default:
        console.error('Error en GET /api/emergencias/:id/eta:', error);
        return NextResponse.json({ error: 'Error al calcular el tiempo de llegada.' }, { status: 500 });
    }
  }
}
