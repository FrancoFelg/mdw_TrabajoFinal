import { db } from '../../config/database';
import { CertificadoEstado } from '@prisma/client';
import { jsonPublico } from './respuesta-publica';

// `revisorId`: quién decide (se guarda junto con la fecha de revisión).
export async function resolverCertificado(id: string, estado: unknown, motivo: unknown, revisorId?: string) {
  if (estado !== 'APROBADO' && estado !== 'RECHAZADO') throw new Error('ESTADO_INVALIDO');
  if (estado === 'RECHAZADO' && (typeof motivo !== 'string' || !motivo.trim() || motivo.length > 2000)) {
    throw new Error('MOTIVO_REQUERIDO');
  }
  return db.$transaction(async tx => {
    const certificado = await tx.certificado.findFirst({ where: { id, fechaEliminacion: null } });
    if (!certificado) throw new Error('CERTIFICADO_NO_ENCONTRADO');
    const cambio = await tx.certificado.updateMany({
      where: { id, estado: CertificadoEstado.PENDIENTE, fechaEliminacion: null },
      data: {
        estado, motivoRechazo: estado === 'RECHAZADO' ? (motivo as string).trim() : null,
        fechaRevision: new Date(), usuarioRevisionId: revisorId ?? null,
      },
    });
    if (cambio.count !== 1) throw new Error('ESTADO_NO_PENDIENTE');
    await tx.notificacion.create({ data: {
      usuarioId: certificado.usuarioId, tipo: 'VALIDACION_PENDIENTE',
      titulo: estado === 'APROBADO' ? 'Certificado aprobado' : 'Certificado rechazado',
      cuerpo: estado === 'APROBADO' ? 'Tu certificado fue aprobado.' : (motivo as string).trim(),
      enlace: '/certificados', clave: `certificado_resuelto:${id}`,
    } });
    return tx.certificado.findUniqueOrThrow({ where: { id } });
  });
}

export function errorCertificado(error: unknown) {
  const codigo = error instanceof Error ? error.message : '';
  const status = ({ ESTADO_INVALIDO: 400, MOTIVO_REQUERIDO: 400, BODY_INVALIDO: 400,
    CERTIFICADO_NO_ENCONTRADO: 404, ESTADO_NO_PENDIENTE: 409 } as Record<string, number>)[codigo];
  if (status) return jsonPublico({ error: codigo }, { status });
  console.error('Error procesando certificado:', error);
  return jsonPublico({ error: 'No se pudo procesar el certificado.' }, { status: 500 });
}
