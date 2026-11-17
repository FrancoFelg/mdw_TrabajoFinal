import { NextRequest } from 'next/server';
import { esCoordinadorOAdmin } from '@/lib/auth';
import { actorActual } from '@/lib/actor-actual';
import { RESPUESTA_NO_AUTORIZADO, ACCESO_NO_AUTORIZADO, leerBody } from '@/lib/cursoErrores';
import { resolverCertificado, errorCertificado } from '@/lib/certificados';
import { jsonPublico } from '@/lib/respuesta-publica';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await actorActual(req);
  if (!actor) return RESPUESTA_NO_AUTORIZADO();
  if (!esCoordinadorOAdmin(actor)) return ACCESO_NO_AUTORIZADO();
  try {
    const body = await leerBody(req);
    return jsonPublico(await resolverCertificado((await params).id, body.estado, body.motivo, actor.id));
  } catch (error) { return errorCertificado(error); }
}
