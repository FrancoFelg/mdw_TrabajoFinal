import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { DireccionController } from '../../../../../controllers/direccion.controller';

const controller = new DireccionController();

const QuerySchema = z.object({
  q: z.string().trim().min(3).max(200),
  sessionToken: z.string().max(100).optional(),
});

// GET /api/direcciones/sugerencias?q=corrientes 12&sessionToken=<uuid>
// Autocompletado de direcciones para el formulario de reporte. Público, igual
// que el alta de emergencias. La key de Google queda en el server.
export async function GET(req: NextRequest) {
  const validacion = QuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!validacion.success) {
    return NextResponse.json(
      { error: 'El parámetro q es obligatorio y debe tener entre 3 y 200 caracteres.' },
      { status: 400 },
    );
  }

  try {
    const { q, sessionToken } = validacion.data;
    const sugerencias = await controller.sugerir(q, sessionToken);
    return NextResponse.json(sugerencias, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : '';
    if (mensaje === 'GOOGLE_MAPS_NO_CONFIGURADO' || mensaje === 'GOOGLE_MAPS_NO_DISPONIBLE') {
      return NextResponse.json({ error: 'Las sugerencias no están disponibles en este momento.' }, { status: 503 });
    }
    console.error('Error en GET /api/direcciones/sugerencias:', error);
    return NextResponse.json({ error: 'Error al buscar direcciones.' }, { status: 500 });
  }
}
