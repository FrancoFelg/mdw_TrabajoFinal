import { NextRequest } from 'next/server';
import { db } from '../../../../config/database';
import { esCoordinadorOAdmin } from '@/lib/auth';
import { actorActual } from '@/lib/actor-actual';
import { RESPUESTA_NO_AUTORIZADO, ACCESO_NO_AUTORIZADO } from '@/lib/cursoErrores';
import { jsonPublico } from '@/lib/respuesta-publica';
import { usuarioPublicoSelect } from '@/lib/usuario-publico';

export async function GET(req: NextRequest) {
  const actor = await actorActual(req);
  if (!actor) return RESPUESTA_NO_AUTORIZADO();
  if (!esCoordinadorOAdmin(actor)) return ACCESO_NO_AUTORIZADO();
  const certificados = await db.certificado.findMany({
    where: { fechaEliminacion: null }, orderBy: { fechaCreacion: 'desc' },
    include: { curso: true, usuario: { select: usuarioPublicoSelect } },
  });
  return jsonPublico(certificados);
}
