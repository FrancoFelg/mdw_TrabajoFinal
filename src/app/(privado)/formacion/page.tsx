import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/session';
import { db } from '../../../../config/database';

// Ruta anterior de Formación: coordinación va a la cola de revisión, el resto a sus certificados.
export default async function FormacionPage() {
  const sesion = await requireSession('/formacion');
  const actor = await db.usuario.findUnique({ where: { id: sesion.id }, select: { rol: true } });
  redirect(actor?.rol === 'COORDINADOR' || actor?.rol === 'ADMIN' ? '/certificados/revisar' : '/certificados');
}
