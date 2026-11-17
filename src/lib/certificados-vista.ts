import type { CertificadoEstado } from '@prisma/client';
import type { CertificadoDetalle } from '../../repositories/certificado.repository';

// Forma serializable que reciben los componentes client de certificados.
export type CertificadoVista = {
  id: string;
  nombre: string;
  entidadEmisora: string;
  fechaEmision: string;
  codigoVerificacion: string | null;
  estado: CertificadoEstado;
  motivoRechazo: string | null;
  archivoNombre: string;
  // Título del curso si el certificado es de un curso del catálogo.
  curso: string | null;
  atributos: { campoId: string; nombre: string; tipo: string; dato: string }[];
};

export function aVista(c: CertificadoDetalle): CertificadoVista {
  return {
    id: c.id,
    nombre: c.nombre,
    entidadEmisora: c.entidadEmisora,
    fechaEmision: c.fechaEmision.toISOString(),
    codigoVerificacion: c.codigoVerificacion,
    estado: c.estado,
    motivoRechazo: c.motivoRechazo,
    archivoNombre: c.archivoNombre,
    curso: c.curso?.titulo ?? null,
    atributos: c.certificadosRelAtributos.map((r) => ({ campoId: r.campoId, nombre: r.campos.nombre, tipo: r.campos.tipo, dato: r.dato })),
  };
}

export const editable = (estado: CertificadoEstado) => estado === 'PENDIENTE' || estado === 'RECHAZADO';

// Valor de un dato adicional para mostrar.
export const valorAtributo = (tipo: string, dato: string) =>
  tipo === 'BOOLEANO' ? (dato === 'true' ? 'Sí' : 'No') : tipo === 'FECHA' ? fechaLegible(`${dato}T12:00:00.000Z`) : dato;

// Día de emisión tal como se cargó (se guarda a mediodía UTC).
export const fechaLegible = (iso: string) =>
  new Date(iso).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: 'numeric', month: 'long', year: 'numeric' });
