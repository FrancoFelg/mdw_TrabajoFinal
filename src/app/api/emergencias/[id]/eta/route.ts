import { jsonPublico } from '@/lib/respuesta-publica';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { EmergenciaController } from '../../../../../../controllers/emergencia.controller';
import { MODOS_VIAJE } from '../../../../../../services/rutas.service';
import { getUserFromRequest } from '@/lib/auth';
import { db } from '@/lib/db';
import { casosVisibles } from '@/lib/acceso-casos';

const controller = new EmergenciaController();

type Contexto = { params: Promise<{ id: string }> };

// Los query params llegan como string. Se exige no vacío antes de convertir
// porque Number("") da 0 (una coordenada válida). "abc" da NaN y z.number() lo rechaza.
const coordenada = (min: number, max: number) =>
  z.string().trim().min(1).transform(Number).pipe(z.number().min(min).max(max));

const QuerySchema = z.object({
  coordenada_x: coordenada(-180, 180), // longitud
  coordenada_y: coordenada(-90, 90), // latitud
  modo: z.enum(MODOS_VIAJE).optional(),
});

// GET /api/emergencias/:id/eta?coordenada_x=..&coordenada_y=..&modo=DRIVE —
// distancia y tiempo estimado de llegada desde la posición actual del
// voluntario (autenticado)
export async function GET(req: NextRequest, { params }: Contexto) {
  const usuario = getUserFromRequest(req);
  if (!usuario) {
    return jsonPublico({ error: 'No autorizado' }, { status: 401 });
  }

  const validacion = QuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!validacion.success) {
    return jsonPublico(
      { error: `Parámetros inválidos: coordenada_x y coordenada_y son obligatorias; modo puede ser ${MODOS_VIAJE.join(', ')}.` },
      { status: 400 },
    );
  }

  try {
    const { id } = await params;
    const actor = await db.usuario.findUnique({ where: { id: usuario.id }, select: { id: true, rol: true } });
    if (!actor) return jsonPublico({ error: 'No autorizado' }, { status: 401 });
    if (!await db.emergencia.findFirst({ where: { AND: [{ id }, casosVisibles(actor)] }, select: { id: true } })) {
      return jsonPublico({ error: 'La emergencia no existe.' }, { status: 404 });
    }
    const { coordenada_x, coordenada_y, modo } = validacion.data;
    const eta = await controller.calcularEta(id, { lat: coordenada_y, lng: coordenada_x }, modo);
    return jsonPublico(eta, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : '';

    switch (mensaje) {
      case 'EMERGENCIA_NO_ENCONTRADA':
        return jsonPublico({ error: 'La emergencia no existe.' }, { status: 404 });
      case 'EMERGENCIA_SIN_COORDENADAS':
        return jsonPublico({ error: 'La emergencia no tiene coordenadas cargadas.' }, { status: 409 });
      case 'RUTA_NO_ENCONTRADA':
        return jsonPublico(
          { error: 'No hay una ruta posible entre tu ubicación y la emergencia con ese modo de viaje.' },
          { status: 422 },
        );
      case 'GOOGLE_MAPS_NO_CONFIGURADO':
      case 'GOOGLE_MAPS_NO_DISPONIBLE':
        return jsonPublico({ error: 'No se pudo calcular la ruta en este momento.' }, { status: 503 });
      default:
        console.error('Error en GET /api/emergencias/:id/eta:', error);
        return jsonPublico({ error: 'Error al calcular el tiempo de llegada.' }, { status: 500 });
    }
  }
}
