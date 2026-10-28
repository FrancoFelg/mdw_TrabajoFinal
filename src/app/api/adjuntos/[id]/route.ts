import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { RESPUESTA_NO_AUTORIZADO } from '@/lib/cursoErrores';
import { AdjuntoService } from '../../../../../services/adjunto.service';

const service = new AdjuntoService();

// GET /api/adjuntos/[id] — foto o audio de un reporte. Solo con sesión:
// son imágenes y voces de personas en situación vulnerable.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!getUserFromRequest(req)) return RESPUESTA_NO_AUTORIZADO();
  try {
    const { adjunto, datos } = await service.obtener((await params).id);
    return new NextResponse(new Uint8Array(datos), {
      status: 200,
      headers: {
        'Content-Type': adjunto.mime,
        'Content-Length': String(datos.length),
        'Content-Disposition': 'inline',
        'Cache-Control': 'private, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    if (error instanceof Error && (error.message === 'ADJUNTO_NO_ENCONTRADO' || ('code' in error && error.code === 'ENOENT'))) {
      return NextResponse.json({ error: 'El archivo no existe.' }, { status: 404 });
    }
    console.error('Error en GET /api/adjuntos/[id]:', error);
    return NextResponse.json({ error: 'No pudimos obtener el archivo.' }, { status: 500 });
  }
}
