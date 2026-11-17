import { db } from '../config/database';
import { CertificadoEstado, Prisma } from '@prisma/client';

export interface AtributoValor {
  campoId: string;
  dato: string;
}

export interface CrearCertificadoData {
  usuarioId: string;
  cursoId: string | null;
  nombre: string;
  entidadEmisora: string;
  fechaEmision: Date;
  codigoVerificacion: string | null;
  archivoTipo: string;
  archivoNombre: string;
  atributos: AtributoValor[];
}

export interface FiltroCertificadosRepo {
  usuarioId?: string;
  estado?: CertificadoEstado;
}

export type CambiosCertificado = Partial<{
  nombre: string;
  entidadEmisora: string;
  fechaEmision: Date;
  codigoVerificacion: string | null;
  archivoTipo: string;
  archivoNombre: string;
  estado: CertificadoEstado;
  motivoRechazo: string | null;
  fechaRevision: Date | null;
  usuarioRevisionId: string | null;
}>;

// Solo los datos adicionales (EAV) vigentes, con nombre y tipo del campo.
const includeDetalle = {
  curso: { select: { id: true, titulo: true } },
  certificadosRelAtributos: {
    where: { fechaEliminacion: null },
    include: { campos: true },
  },
} satisfies Prisma.CertificadoInclude;

export type CertificadoDetalle = Prisma.CertificadoGetPayload<{ include: typeof includeDetalle }>;

const ACTIVOS = [CertificadoEstado.PENDIENTE, CertificadoEstado.APROBADO];

// Una persona no puede tener dos certificados activos (pendiente o aprobado) del mismo curso.
// Bloquea la fila del curso hasta el fin de la transacción: dos cargas simultáneas se ordenan
// y la segunda ve a la primera. `vigente` exige además que el curso no esté dado de baja.
async function asegurarUnicoDelCurso(
  tx: Prisma.TransactionClient,
  { cursoId, usuarioId, excepto, vigente }: { cursoId: string; usuarioId: string; excepto?: string; vigente: boolean }
) {
  const filas = await tx.$queryRaw<{ id: string; fechaEliminacion: Date | null }[]>`SELECT id, fechaEliminacion FROM Cursos WHERE id = ${cursoId} FOR UPDATE`;
  if (vigente && (!filas.length || filas[0].fechaEliminacion)) throw new Error('CURSO_NO_ENCONTRADO');
  const activos = await tx.certificado.count({
    where: { usuarioId, cursoId, fechaEliminacion: null, estado: { in: ACTIVOS }, ...(excepto ? { id: { not: excepto } } : {}) },
  });
  if (activos) throw new Error('CERTIFICADO_DUPLICADO');
}

export class CertificadoRepository {
  // Crea la fila y sus atributos; `escribir` guarda el archivo dentro de la transacción,
  // así un fallo de disco revierte la fila.
  async crearConArchivo(data: CrearCertificadoData, escribir: (id: string) => Promise<void>): Promise<CertificadoDetalle> {
    return await db.$transaction(async (tx) => {
      const { atributos, ...troncal } = data;
      if (data.cursoId) await asegurarUnicoDelCurso(tx, { cursoId: data.cursoId, usuarioId: data.usuarioId, vigente: true });
      const creado = await tx.certificado.create({
        data: {
          ...troncal,
          estado: CertificadoEstado.PENDIENTE,
          usuarioCreacionId: data.usuarioId,
          certificadosRelAtributos: atributos.length
            ? { create: atributos.map((a) => ({ campoId: a.campoId, dato: a.dato, usuarioCreacionId: data.usuarioId })) }
            : undefined,
        },
        include: includeDetalle,
      });
      await escribir(creado.id);
      return creado;
    });
  }

  async findAll(filtro: FiltroCertificadosRepo = {}): Promise<CertificadoDetalle[]> {
    return await db.certificado.findMany({
      where: { fechaEliminacion: null, usuarioId: filtro.usuarioId, estado: filtro.estado },
      orderBy: { fechaCreacion: 'desc' },
      include: includeDetalle,
    });
  }

  async findById(id: string): Promise<CertificadoDetalle | null> {
    return await db.certificado.findFirst({
      where: { id, fechaEliminacion: null },
      include: includeDetalle,
    });
  }

  // `atributos`, si viene, reemplaza el set vigente. `escribir` reemplaza el archivo dentro de la transacción.
  // `condicion`: la escritura solo aplica si el certificado sigue en alguno de esos estados al momento
  // de escribir (si otra persona lo cambió después de leerlo, lanza `condicion.error`).
  async actualizar(
    id: string,
    cambios: CambiosCertificado,
    opciones: {
      atributos?: AtributoValor[];
      usuarioId?: string;
      escribir?: () => Promise<void>;
      condicion?: { estados: CertificadoEstado[]; error: string };
      // Si el certificado vuelve a revisión, que no quede otro activo del mismo curso.
      unicoDelCurso?: { cursoId: string; usuarioId: string };
    } = {}
  ): Promise<CertificadoDetalle> {
    const { atributos, usuarioId, escribir, condicion, unicoDelCurso } = opciones;
    return await db.$transaction(async (tx) => {
      if (unicoDelCurso) await asegurarUnicoDelCurso(tx, { ...unicoDelCurso, excepto: id, vigente: false });
      const { count } = await tx.certificado.updateMany({
        where: { id, fechaEliminacion: null, ...(condicion ? { estado: { in: condicion.estados } } : {}) },
        data: cambios,
      });
      if (!count) throw new Error(condicion?.error ?? 'CERTIFICADO_NO_ENCONTRADO');

      if (atributos && usuarioId) {
        await tx.certificadosRelAtributos.updateMany({
          where: { certificadoId: id, fechaEliminacion: null },
          data: { fechaEliminacion: new Date(), usuarioEliminacionId: usuarioId },
        });
        // Por el @@unique([certificadoId, campoId]) se revive la fila existente en lugar de insertar otra.
        for (const attr of atributos) {
          await tx.certificadosRelAtributos.upsert({
            where: { certificadoId_campoId: { certificadoId: id, campoId: attr.campoId } },
            create: { certificadoId: id, campoId: attr.campoId, dato: attr.dato, usuarioCreacionId: usuarioId },
            update: {
              dato: attr.dato,
              fechaCreacion: new Date(),
              usuarioCreacionId: usuarioId,
              fechaEliminacion: null,
              usuarioEliminacionId: null,
            },
          });
        }
      }

      if (escribir) await escribir();
      return await tx.certificado.findUniqueOrThrow({ where: { id }, include: includeDetalle });
    });
  }

  // Baja lógica del certificado y de sus datos adicionales. El archivo se conserva.
  async eliminar(id: string, usuarioEliminacionId: string): Promise<void> {
    const ahora = new Date();
    await db.$transaction(async (tx) => {
      await tx.certificadosRelAtributos.updateMany({
        where: { certificadoId: id, fechaEliminacion: null },
        data: { fechaEliminacion: ahora, usuarioEliminacionId },
      });
      await tx.certificado.update({ where: { id }, data: { fechaEliminacion: ahora, usuarioEliminacionId } });
    });
  }
}
