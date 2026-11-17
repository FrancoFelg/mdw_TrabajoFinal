import { jsonPublico } from '@/lib/respuesta-publica';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../../config/database';
import { getUserFromRequest } from '@/lib/auth';
import { guardarFoto, leerFoto, tipoFoto, verificarPermisoFoto } from '@/lib/fotos-emergencia';
import { MAX_FOTO } from '@/lib/reporte';

export const runtime = 'nodejs';
type Contexto = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Contexto) {
  const { id } = await params;
  try {
    if (!verificarPermisoFoto(id, req.headers.get('x-permiso-foto') ?? '')) {
      return jsonPublico({ error: 'El permiso para adjuntar la foto venció o no es válido.' }, { status: 403 });
    }
    if (!await db.emergencia.findUnique({ where: { id }, select: { id: true } })) {
      return jsonPublico({ error: 'El reporte no existe.' }, { status: 404 });
    }
    // El cuerpo es binario: se limita mientras llega, antes de reservar más memoria.
    const lector = req.body?.getReader();
    if (!lector) return jsonPublico({ error: 'Elegí una foto.' }, { status: 400 });
    const partes: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await lector.read();
      if (done) break;
      total += value.length;
      if (total > MAX_FOTO) {
        await lector.cancel();
        return jsonPublico({ error: 'La foto debe pesar hasta 5 MB.' }, { status: 413 });
      }
      partes.push(value);
    }
    const bytes = Buffer.concat(partes);
    if (!tipoFoto(bytes)) return jsonPublico({ error: 'Elegí una foto JPG, PNG o WebP válida.' }, { status: 400 });
    await guardarFoto(id, bytes);
    await db.emergencia.update({ where: { id }, data: { imagen: `/api/emergencias/${id}/foto` } });
    return jsonPublico({ ok: true });
  } catch (error) {
    console.error('Error guardando foto:', error);
    return jsonPublico({ error: 'El reporte está guardado. No pudimos adjuntar la foto; podés reintentar.' }, { status: 503 });
  }
}

export async function GET(req: NextRequest, { params }: Contexto) {
  if (!getUserFromRequest(req)) return new NextResponse(null, { status: 401 });
  const { id } = await params;
  try {
    const bytes = await leerFoto(id);
    return new NextResponse(new Uint8Array(bytes), { headers: {
      'Content-Type': tipoFoto(bytes) ?? 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    } });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
