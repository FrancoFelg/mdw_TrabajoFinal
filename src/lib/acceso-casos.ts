import { type Prisma, type Rol } from '@prisma/client';

// Los casos activos son compartidos para coordinar la asistencia.
// Los cerrados quedan disponibles para el asignado y para coordinación.
export function casosVisibles(actor: { id: string; rol?: Rol }): Prisma.EmergenciaWhereInput {
  if (actor.rol === 'COORDINADOR' || actor.rol === 'ADMIN') return {};
  return {
    OR: [
      { estado: { in: ['SIN_GESTIONAR', 'EN_CAMINO'] } },
      { usuarios: { some: { usuarioId: actor.id } } },
    ],
  };
}
