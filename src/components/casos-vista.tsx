'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import type { EmergenciaEstado, Prioridad } from '@prisma/client';
import { Camera, ChevronRight, Mic, Navigation } from 'lucide-react';
import { Asignado, CodigoCaso, IconoPrioridad, MarcaPrioridad } from './marcas';
import { PRIORIDADES, distanciaMetros, formatoDistancia } from '@/lib/casos';
import { reintentarUbicacion, useMiUbicacion } from '@/lib/mi-ubicacion';

const MapaCasos = dynamic(() => import('./mapa-casos'), { ssr: false, loading: () => <div className="mapa mapa-cargando" role="status">Cargando mapa…</div> });

export type CasoFila = {
  id: string; descripcion: string; prioridad: Prioridad; estado: EmergenciaEstado; hace: string; fecha: string;
  provincia: string; lat: number | null; lng: number | null; asignado: string | null; propio: boolean;
  foto?: boolean; audio?: boolean;
};

type Filtro = 'libres' | 'en-camino';

export function CasosVista({ casos, mio }: { casos: CasoFila[]; mio: CasoFila | null }) {
  const [filtro, setFiltro] = useState<Filtro>('libres');
  const [prioridad, setPrioridad] = useState<Prioridad | null>(null);
  const [cercania, setCercania] = useState(false);
  const yo = useMiUbicacion();
  const yoActiva = yo.estado === 'activa' ? yo : null;

  const deEstado = useMemo(() => casos.filter(c => c.estado === (filtro === 'libres' ? 'SIN_GESTIONAR' : 'EN_CAMINO')), [casos, filtro]);
  // Memorizada: el GPS en vivo re-renderiza seguido y el mapa no tiene que redibujar las marcas por eso.
  const visibles = useMemo(() => prioridad ? deEstado.filter(c => c.prioridad === prioridad) : deEstado, [deEstado, prioridad]);
  const distancia = (c: CasoFila) => yoActiva && c.lat !== null && c.lng !== null ? distanciaMetros(yoActiva, { lat: c.lat, lng: c.lng }) : null;
  const ordenados = cercania && yoActiva
    ? [...visibles].sort((a, b) => (distancia(a) ?? Infinity) - (distancia(b) ?? Infinity))
    : visibles;
  const libres = casos.filter(c => c.estado === 'SIN_GESTIONAR').length;
  const enCamino = casos.length - libres;
  const sufijo = prioridad ? ` ${PRIORIDADES[prioridad].nombre.toLowerCase()}s` : '';

  return <div className="casos-vista">
    <div className="casos-mapa"><MapaCasos casos={visibles} yo={yo} /></div>

    <div className="hoja">
      <header className="hoja-cabecera">
        <h1>Casos</h1>
        <p className="muted">Se actualiza solo cada 30 segundos</p>
      </header>

      <EstadoUbicacion yo={yo} />

      {mio && <Link href={`/casos/${mio.id}`} className="mi-caso">
        <IconoPrioridad prioridad={mio.prioridad} grande />
        <span className="mi-caso-texto">
          <span className="mi-caso-titulo">Tu caso en camino</span>
          <span className="mi-caso-desc">{mio.descripcion}</span>
        </span>
        <span className="mi-caso-accion">Finalizar<ChevronRight aria-hidden="true" size={18} /></span>
      </Link>}

      <div className="segmentos" role="group" aria-label="Estado de los casos">
        <button aria-pressed={filtro === 'libres'} onClick={() => setFiltro('libres')}>Libres <span className="contador">{libres}</span></button>
        <button aria-pressed={filtro === 'en-camino'} onClick={() => setFiltro('en-camino')}>En camino <span className="contador">{enCamino}</span></button>
      </div>

      <div className="filtro-prioridad" role="group" aria-label="Filtrar por prioridad">
        {(['ROJO', 'AMARILLO', 'VERDE'] as Prioridad[]).map(p => <button key={p} className="chip" aria-pressed={prioridad === p} onClick={() => setPrioridad(prioridad === p ? null : p)}>
          <MarcaPrioridad prioridad={p} /><span className="contador">{deEstado.filter(c => c.prioridad === p).length}</span>
        </button>)}
      </div>

      {yoActiva && <div className="orden" role="group" aria-label="Orden de la lista">
        <button className="chip" aria-pressed={!cercania} onClick={() => setCercania(false)}>Más graves primero</button>
        <button className="chip" aria-pressed={cercania} onClick={() => setCercania(true)}><Navigation aria-hidden="true" size={16} />Más cerca</button>
      </div>}

      {visibles.length
        ? <ul className="filas" aria-label={filtro === 'libres' ? 'Casos libres' : 'Casos en camino'}>
          {ordenados.map(c => { const d = distancia(c); return <li key={c.id}>
            <Link href={`/casos/${c.id}`} className="fila">
              <IconoPrioridad prioridad={c.prioridad} grande />
              <span className="fila-texto">
                <span className="fila-desc">{c.descripcion}</span>
                <span className="fila-meta"><CodigoCaso id={c.id} /> {d !== null && <strong className="distancia">a {formatoDistancia(d)}</strong>} {PRIORIDADES[c.prioridad].nombre} · {c.hace}{d === null && ` · ${c.provincia}`}{c.foto && <Camera className="fila-adjunto" size={14} aria-label="con foto" />}{c.audio && <Mic className="fila-adjunto" size={14} aria-label="con audio" />}</span>
              </span>
              <span className="fila-fin">{c.asignado ? <Asignado nombre={c.asignado} propio={c.propio} /> : <ChevronRight aria-hidden="true" size={20} />}</span>
            </Link>
          </li>; })}
        </ul>
        : <div className="vacio" role="status">
          <h2>{filtro === 'libres' ? `No hay casos${sufijo} libres` : `Nadie va en camino a un caso${sufijo}`}</h2>
          <p>{filtro === 'libres' ? 'Cuando alguien reporte una emergencia, aparece acá.' : 'Los casos que tomen los voluntarios aparecen acá con su nombre.'}</p>
          {prioridad && <button className="button button-secondary" onClick={() => setPrioridad(null)}>Ver todas las prioridades</button>}
        </div>}
    </div>
  </div>;
}

function EstadoUbicacion({ yo }: { yo: ReturnType<typeof useMiUbicacion> }) {
  if (yo.estado === 'activa') return <p className="ubicacion-viva" role="status"><span className="vivo" aria-hidden="true" />Tu ubicación en vivo · margen de {formatoDistancia(yo.precision)}</p>;
  if (yo.estado === 'buscando' || yo.estado === 'inactiva') return <p className="ubicacion-viva buscando" role="status"><span className="vivo" aria-hidden="true" />Buscando tu ubicación…</p>;
  if (yo.estado === 'denegada') return <div className="aviso ubicacion-aviso" role="status">
    <span>Sin permiso de ubicación no podemos mostrarte qué casos tenés más cerca. Activalo en la configuración del navegador para este sitio.</span>
    <button type="button" className="button button-chico button-secondary" onClick={reintentarUbicacion}>Reintentar</button>
  </div>;
  return <p className="aviso ubicacion-aviso" role="status">Este navegador no comparte ubicación.</p>;
}
