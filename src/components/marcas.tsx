import type { CertificadoEstado, EmergenciaEstado, Prioridad } from '@prisma/client';
import Link from 'next/link';
import { CalendarX, CircleCheck, CircleDashed, CircleX, Clock, Hourglass, Navigation, OctagonAlert, ShieldAlert, ShieldCheck, ShieldEllipsis, TriangleAlert } from 'lucide-react';
import { ESTADOS, PRIORIDADES, codigoCaso, type EstadoHabilitacion } from '@/lib/casos';

// Marcas compartidas: prioridad, estado, código de caso, asignado y etapas.
// Prioridad y estado siempre llevan texto + ícono propio, nunca solo color.

const ICONO_PRIORIDAD = { ROJO: OctagonAlert, AMARILLO: TriangleAlert, VERDE: Hourglass };

export function IconoPrioridad({ prioridad, grande = false }: { prioridad: Prioridad; grande?: boolean }) {
  const Icono = ICONO_PRIORIDAD[prioridad];
  return <span className={`disco disco-${prioridad.toLowerCase()}${grande ? ' disco-grande' : ''}`} aria-hidden="true">
    <Icono size={grande ? 20 : 14} strokeWidth={2.6} />
  </span>;
}

export function MarcaPrioridad({ prioridad, detalle = false }: { prioridad: Prioridad; detalle?: boolean }) {
  const p = PRIORIDADES[prioridad];
  return <span className="prioridad">
    <IconoPrioridad prioridad={prioridad} />
    {p.nombre}{detalle && <span className="prioridad-detalle"> · {p.detalle}</span>}
  </span>;
}

const ICONO_ESTADO = { SIN_GESTIONAR: CircleDashed, EN_CAMINO: Navigation, GESTIONADA: CircleCheck, CANCELADA: CircleX };

export function MarcaEstado({ estado }: { estado: EmergenciaEstado }) {
  const Icono = ICONO_ESTADO[estado];
  return <span className={`estado estado-${estado.toLowerCase().replace('_', '-')}`}>
    <Icono aria-hidden="true" size={15} strokeWidth={2.4} />{ESTADOS[estado]}
  </span>;
}

// Certificados y solicitudes de ascenso comparten PENDIENTE / APROBADO / RECHAZADO.
const REVISION: Record<CertificadoEstado, { nombre: string; Icono: typeof Clock }> = {
  PENDIENTE: { nombre: 'Pendiente', Icono: Clock },
  APROBADO: { nombre: 'Aprobado', Icono: ShieldCheck },
  RECHAZADO: { nombre: 'Rechazado', Icono: CircleX },
  VENCIDO: { nombre: 'Vencido', Icono: CalendarX },
};

export function MarcaRevision({ estado }: { estado: CertificadoEstado }) {
  const { nombre, Icono } = REVISION[estado];
  return <span className={`estado revision-${estado.toLowerCase()}`}>
    <Icono aria-hidden="true" size={15} strokeWidth={2.4} />{nombre}
  </span>;
}

// Código corto del caso: el mismo en la lista, el mapa y el detalle.
export function CodigoCaso({ id }: { id: string }) {
  return <span className="codigo" translate="no"><span className="sr-only">Caso </span>#{codigoCaso(id)}</span>;
}

export function iniciales(nombre: string) {
  return nombre.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p.charAt(0).toUpperCase()).join('');
}

// Quién atiende el caso: avatar con iniciales, como el conductor en una app de viajes.
export function Asignado({ nombre, propio = false }: { nombre?: string | null; propio?: boolean }) {
  if (!nombre) return <span className="libre">Sin asignar</span>;
  return <span className={`asignado${propio ? ' asignado-propio' : ''}`}>
    <span className="avatar-mini" aria-hidden="true">{propio ? 'V' : iniciales(nombre)}</span>
    <span><span className="sr-only">Lo atiende </span>{propio ? 'Vos' : nombre}</span>
  </span>;
}

const ETAPAS: { estado: EmergenciaEstado; nombre: string }[] = [
  { estado: 'SIN_GESTIONAR', nombre: 'Reportada' },
  { estado: 'EN_CAMINO', nombre: 'En camino' },
  { estado: 'GESTIONADA', nombre: 'Gestionada' },
];

export function EtapasCaso({ estado, detalles }: { estado: EmergenciaEstado; detalles: Partial<Record<EmergenciaEstado, string>> }) {
  if (estado === 'CANCELADA') return <p className="etapas-cancelada"><MarcaEstado estado="CANCELADA" /> Este caso se canceló.</p>;
  const actual = ETAPAS.findIndex(e => e.estado === estado);
  return <ol className="etapas" aria-label="Etapas del caso">
    {ETAPAS.map((etapa, i) => <li key={etapa.estado} className={i < actual ? 'etapa hecha' : i === actual ? 'etapa actual' : 'etapa'} aria-current={i === actual ? 'step' : undefined}>
      <strong>{etapa.nombre}</strong>
      {i <= actual && detalles[etapa.estado] && <span>{detalles[etapa.estado]}</span>}
    </li>)}
  </ol>;
}

// Habilitación para casos rojos: el principio "la capacitación habilita" hecho visible, con su próximo paso.
const HABILITACION: Record<EstadoHabilitacion, { Icono: typeof ShieldCheck; titulo: string; texto: string; accion?: string }> = {
  aprobado: { Icono: ShieldCheck, titulo: 'Podés tomar casos rojos', texto: 'Tenés un certificado aprobado.' },
  revision: { Icono: ShieldEllipsis, titulo: 'Tu certificado está en revisión', texto: 'Cuando alguien de coordinación lo apruebe, vas a poder tomar casos rojos.' },
  rechazado: { Icono: ShieldAlert, titulo: 'Tu certificado fue rechazado', texto: 'Mirá el motivo y cargá uno nuevo para poder tomar casos rojos.', accion: 'Cargar otro certificado' },
  sin: { Icono: ShieldAlert, titulo: 'Todavía no podés tomar casos rojos', texto: 'Cargá un certificado de capacitación; alguien de coordinación lo revisa.', accion: 'Cargar un certificado' },
};

export function Habilitacion({ estado, enlace = true }: { estado: EstadoHabilitacion; enlace?: boolean }) {
  const h = HABILITACION[estado];
  return <div className={`habilitacion habilitacion-${estado}`} role="status">
    <h.Icono aria-hidden="true" size={24} />
    <span className="habilitacion-texto">
      <strong>{h.titulo}</strong>
      <span>{h.texto}</span>
      {enlace && h.accion && <Link className="text-link" href="/formacion#cargar">{h.accion}</Link>}
    </span>
  </div>;
}
