import { NextRequest, NextResponse } from 'next/server';
import { esCoordinadorOAdmin, getUserFromRequest } from '@/lib/auth';
import { RESPUESTA_NO_AUTORIZADO, RESPUESTA_PROHIBIDO } from '@/lib/cursoErrores';
import { CertificadoService } from '../../../../../../services/certificado.service';

const service = new CertificadoService();

// GET /api/certificados/[id]/archivo — PDF o imagen del certificado.
// Lo ven su dueño y la coordinación (regla de AGENTS.md para datos de una persona).
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const usuario = getUserFromRequest(req);
  if (!usuario) return RESPUESTA_NO_AUTORIZADO();
  try {
    const { certificado, datos } = await service.leerArchivo((await params).id);
    if (certificado.usuarioId !== usuario.id && !esCoordinadorOAdmin(usuario)) return RESPUESTA_PROHIBIDO();
    return new NextResponse(new Uint8Array(datos), {
      status: 200,
      headers: {
        'Content-Type': certificado.archivoMime ?? 'application/octet-stream',
        'Content-Length': String(datos.length),
        'Content-Disposition': 'inline',
        'Cache-Control': 'private, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    if (error instanceof Error && (error.message === 'CERTIFICADO_NO_ENCONTRADO' || error.message === 'ARCHIVO_NO_ENCONTRADO')) {
      return NextResponse.json({ error: 'El certificado no tiene archivo.' }, { status: 404 });
    }
    console.error('Error en GET /api/certificados/[id]/archivo:', error);
    return NextResponse.json({ error: 'No pudimos obtener el archivo.' }, { status: 500 });
  }
}
