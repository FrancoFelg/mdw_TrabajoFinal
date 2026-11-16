import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../../config/database';
import { esCoordinadorOAdmin } from '@/lib/auth';
import { actorActual } from '@/lib/actor-actual';
import { leerCertificado, tipoCertificado } from '@/lib/archivos-certificados';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await actorActual(req);
  if (!actor) return new NextResponse(null, { status: 401 });
  const { id } = await params;
  const certificado = await db.certificado.findFirst({ where: { id, fechaEliminacion: null } });
  if (!certificado || (!esCoordinadorOAdmin(actor) && certificado.usuarioId !== actor.id)) {
    return new NextResponse(null, { status: 404 });
  }
  try {
    const bytes = await leerCertificado(id);
    return new NextResponse(new Uint8Array(bytes), { headers: {
      'Content-Type': tipoCertificado(bytes) || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="certificado-${id}"`,
      'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, no-store',
    } });
  } catch { return new NextResponse(null, { status: 404 }); }
}
