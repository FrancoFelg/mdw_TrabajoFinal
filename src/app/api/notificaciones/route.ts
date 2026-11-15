import { NextRequest, NextResponse } from 'next/server';
import { esCoordinadorOAdmin, getUserFromRequest } from '@/lib/auth';
import { RESPUESTA_NO_AUTORIZADO } from '@/lib/cursoErrores';
import { NotificacionService, revisarSinAtenderSiCorresponde } from '../../../../services/notificacion.service';

const service = new NotificacionService();

// GET /api/notificaciones — avisos del usuario (historia 12).
// `?resumen=1` devuelve solo `{ noLeidas }` (lo consulta la campanita cada 30 s).
// Si consulta coordinación, de paso se revisan los casos sin atender (como mucho una vez por minuto).
export async function GET(req: NextRequest) {
  const usuario = getUserFromRequest(req);
  if (!usuario) return RESPUESTA_NO_AUTORIZADO();
  try {
    if (esCoordinadorOAdmin(usuario)) await revisarSinAtenderSiCorresponde();
    const noLeidas = await service.contarNoLeidas(usuario.id);
    if (req.nextUrl.searchParams.get('resumen')) return NextResponse.json({ noLeidas }, { headers: { 'Cache-Control': 'no-store' } });
    return NextResponse.json({ noLeidas, avisos: await service.listar(usuario.id) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Error en GET /api/notificaciones:', error);
    return NextResponse.json({ error: 'No pudimos cargar los avisos.' }, { status: 500 });
  }
}
