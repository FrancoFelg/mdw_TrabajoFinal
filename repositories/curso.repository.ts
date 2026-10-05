import { db } from '../config/database';
import { Cursos } from '@prisma/client';

export interface CursoAtributoValorInput {
  campoId: string;
  dato: string;
  fechaHasta?: Date | null;
}

export interface CrearCursoData {
  titulo: string;
  descripcion: string;
  fechaDesde: Date;
  fechaHasta: Date;
  usuarioCreacionId: string;
  atributos?: CursoAtributoValorInput[];
}

export interface ActualizarCursoData {
  titulo?: string;
  descripcion?: string;
  fechaDesde?: Date;
  fechaHasta?: Date;
  // Si viene, se reemplaza el set de atributos vigentes del curso por este.
  atributos?: CursoAtributoValorInput[];
}

// Include estándar: sólo los atributos no eliminados, con el nombre/tipo del campo.
const includeCurso = {
  cursosRelAtributos: {
    where: { fechaEliminacion: null },
    include: { campos: true },
  },
} as const;

export class CursoRepository {
  async crearConAtributos(data: CrearCursoData) {
    return await db.cursos.create({
      data: {
        titulo: data.titulo,
        descripcion: data.descripcion,
        fechaDesde: data.fechaDesde,
        fechaHasta: data.fechaHasta,
        usuarioCreacionId: data.usuarioCreacionId,
        cursosRelAtributos: data.atributos?.length
          ? {
              create: data.atributos.map((attr) => ({
                campoId: attr.campoId,
                dato: attr.dato,
                fechaHasta: attr.fechaHasta ?? null,
                usuarioCreacionId: data.usuarioCreacionId,
              })),
            }
          : undefined,
      },
      include: includeCurso,
    });
  }

  async findAll() {
    return await db.cursos.findMany({
      where: { fechaEliminacion: null },
      orderBy: { fechaCreacion: 'desc' },
      include: includeCurso,
    });
  }

  async findById(id: string) {
    return await db.cursos.findFirst({
      where: { id, fechaEliminacion: null },
      include: includeCurso,
    });
  }

  // Actualiza datos troncales y, si se envían atributos, reemplaza los vigentes en una transacción.
  async actualizar(id: string, data: ActualizarCursoData, usuarioId: string) {
    const { atributos, ...troncal } = data;

    return await db.$transaction(async (tx) => {
      await tx.cursos.update({ where: { id }, data: troncal });

      if (atributos) {
        // Baja lógica de los valores actuales
        await tx.cursosRelAtributos.updateMany({
          where: { cursoId: id, fechaEliminacion: null },
          data: { fechaEliminacion: new Date(), usuarioEliminacionId: usuarioId },
        });

        // Por el @@unique([cursoId, campoId]) no se puede insertar otra fila para el mismo campo:
        // se reutiliza la fila existente (upsert) y se la "revive" con el nuevo dato.
        for (const attr of atributos) {
          await tx.cursosRelAtributos.upsert({
            where: { cursoId_campoId: { cursoId: id, campoId: attr.campoId } },
            create: {
              cursoId: id,
              campoId: attr.campoId,
              dato: attr.dato,
              fechaHasta: attr.fechaHasta ?? null,
              usuarioCreacionId: usuarioId,
            },
            update: {
              dato: attr.dato,
              fechaHasta: attr.fechaHasta ?? null,
              fechaCreacion: new Date(),
              usuarioCreacionId: usuarioId,
              fechaEliminacion: null,
              usuarioEliminacionId: null,
            },
          });
        }
      }

      return await tx.cursos.findUniqueOrThrow({ where: { id }, include: includeCurso });
    });
  }

  // Baja lógica del curso y de sus valores de atributos.
  async eliminar(id: string, usuarioEliminacionId: string): Promise<Cursos> {
    const ahora = new Date();
    return await db.$transaction(async (tx) => {
      await tx.cursosRelAtributos.updateMany({
        where: { cursoId: id, fechaEliminacion: null },
        data: { fechaEliminacion: ahora, usuarioEliminacionId },
      });
      return await tx.cursos.update({
        where: { id },
        data: { fechaEliminacion: ahora, usuarioEliminacionId },
      });
    });
  }
}
