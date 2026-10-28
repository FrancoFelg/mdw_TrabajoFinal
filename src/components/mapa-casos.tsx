'use client';

import { useEffect, useRef, useState } from 'react';
import type * as Leaflet from 'leaflet';
import { LocateFixed } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { codigoCaso, distanciaMetros, PRIORIDADES } from '@/lib/casos';
import type { MiUbicacion } from '@/lib/mi-ubicacion';
import type { CasoFila } from './casos-vista';

// Formas de las marcas, iguales a los íconos de la lista: octógono, triángulo, reloj de arena.
const FORMAS = {
  ROJO: '<path d="M7.9 2h8.2L22 7.9v8.2L16.1 22H7.9L2 16.1V7.9z"/><path d="M12 8v4M12 16h.01"/>',
  AMARILLO: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  VERDE: '<path d="M5 22h14M5 2h14M17 22v-4.2a2 2 0 0 0-.6-1.4L12 12l-4.4 4.4a2 2 0 0 0-.6 1.4V22M7 2v4.2a2 2 0 0 0 .6 1.4L12 12l4.4-4.4a2 2 0 0 0 .6-1.4V2"/>',
};

const CENTRO_ARGENTINA: [number, number] = [-34.6, -58.45];

type Props = { casos: CasoFila[]; solo?: boolean; etiqueta?: string; yo?: MiUbicacion };

// El mapa se crea una sola vez. Los casos y la ubicación propia se actualizan como capas,
// así el refresco de 30 s y el GPS en vivo no le cambian el encuadre a quien lo está mirando.
export default function MapaCasos({ casos, solo = false, etiqueta, yo }: Props) {
  const nodo = useRef<HTMLDivElement>(null);
  const L = useRef<typeof Leaflet | null>(null);
  const mapa = useRef<Leaflet.Map | null>(null);
  const capaCasos = useRef<Leaflet.LayerGroup | null>(null);
  const marcaYo = useRef<Leaflet.Marker | null>(null);
  const circuloYo = useRef<Leaflet.Circle | null>(null);
  const encuadrado = useRef(false);
  const encuadradoConmigo = useRef(false);
  // Encuadre pendiente: se vuelve a aplicar si el mapa cambia de tamaño, hasta que la persona lo mueva.
  const marco = useRef<(() => void) | null>(null);
  const tocado = useRef(false);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    let cancelado = false;
    let observador: ResizeObserver | null = null;
    import('leaflet').then(mod => {
      if (cancelado || !nodo.current) return;
      L.current = mod;
      const m = mod.map(nodo.current, { zoomControl: !solo, attributionControl: true, scrollWheelZoom: !solo });
      mod.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(m);
      m.setView(CENTRO_ARGENTINA, 11);
      mapa.current = m;
      capaCasos.current = mod.layerGroup().addTo(m);
      // Leaflet calcula encuadres con el tamaño del contenedor: si la hoja o la ventana cambian, hay que avisarle.
      observador = new ResizeObserver(() => { m.invalidateSize(); if (!tocado.current) marco.current?.(); });
      observador.observe(nodo.current);
      const marcarTocado = () => { tocado.current = true; };
      nodo.current.addEventListener('pointerdown', marcarTocado);
      nodo.current.addEventListener('wheel', marcarTocado, { passive: true });
      setListo(true);
    });
    return () => { cancelado = true; observador?.disconnect(); mapa.current?.remove(); mapa.current = null; };
  }, [solo]);

  // Marcas de los casos
  useEffect(() => {
    const mod = L.current, m = mapa.current, capa = capaCasos.current;
    if (!listo || !mod || !m || !capa) return;
    capa.clearLayers();
    const puntos: [number, number][] = [];
    for (const c of casos) {
      if (c.lat === null || c.lng === null) continue;
      puntos.push([c.lat, c.lng]);
      const icono = mod.divIcon({
        className: '',
        html: `<span class="pin pin-${c.prioridad.toLowerCase()}${c.estado === 'EN_CAMINO' ? ' pin-tomado' : ''}"><span class="pin-disco"><svg viewBox="0 0 24 24" aria-hidden="true">${FORMAS[c.prioridad]}</svg></span><b>${etiqueta ?? `#${codigoCaso(c.id)}`}</b></span>`,
        iconSize: [0, 0],
      });
      const marca = mod.marker([c.lat, c.lng], { icon: icono, title: etiqueta ?? `Caso #${codigoCaso(c.id)}, prioridad ${PRIORIDADES[c.prioridad].nombre}`, keyboard: !solo });
      if (!solo) {
        const enlace = document.createElement('a');
        enlace.href = `/casos/${c.id}`;
        enlace.className = 'pin-enlace';
        enlace.textContent = `Ver caso #${codigoCaso(c.id)}`;
        const caja = document.createElement('div');
        const texto = document.createElement('p');
        texto.textContent = c.descripcion.length > 120 ? `${c.descripcion.slice(0, 120)}…` : c.descripcion;
        caja.append(texto, enlace);
        marca.bindPopup(caja);
      }
      marca.addTo(capa);
    }
    // Encuadre solo la primera vez: después manda quien mira el mapa.
    if (!encuadrado.current && puntos.length && !encuadradoConmigo.current) {
      encuadrado.current = true;
      marco.current = () => puntos.length === 1
        ? m.setView(puntos[0], 15, { animate: false })
        : m.fitBounds(mod.latLngBounds(puntos), { padding: [40, 40], maxZoom: 15, animate: false });
      marco.current();
    }
  }, [listo, casos, solo, etiqueta]);

  // Mi ubicación en vivo
  const yoActiva = yo?.estado === 'activa' ? yo : null;
  useEffect(() => {
    const mod = L.current, m = mapa.current;
    if (!listo || !mod || !m) return;
    if (!yoActiva) {
      marcaYo.current?.remove(); marcaYo.current = null;
      circuloYo.current?.remove(); circuloYo.current = null;
      return;
    }
    const punto: [number, number] = [yoActiva.lat, yoActiva.lng];
    if (!marcaYo.current) {
      circuloYo.current = mod.circle(punto, { radius: yoActiva.precision, className: 'yo-precision', interactive: false }).addTo(m);
      marcaYo.current = mod.marker(punto, {
        icon: mod.divIcon({ className: '', html: '<span class="yo"><span class="yo-pulso"></span><span class="yo-punto"></span></span>', iconSize: [0, 0] }),
        title: 'Tu ubicación', keyboard: false, zIndexOffset: 1000, interactive: false,
      }).addTo(m);
    } else {
      marcaYo.current.setLatLng(punto);
      circuloYo.current?.setLatLng(punto).setRadius(yoActiva.precision);
    }
    // Primera ubicación: encuadrar lo que tengo cerca (hasta 15 km) junto conmigo; si no hay nada cerca, centrarme.
    if (!encuadradoConmigo.current) {
      encuadradoConmigo.current = true;
      encuadrado.current = true;
      const cerca = casos
        .filter(c => c.lat !== null && c.lng !== null && distanciaMetros(yoActiva, { lat: c.lat, lng: c.lng }) <= 15000)
        .map(c => [c.lat, c.lng] as [number, number]);
      marco.current = () => {
        m.invalidateSize();
        if (cerca.length) m.fitBounds(mod.latLngBounds([...cerca, punto]), { padding: [56, 56], maxZoom: 16, animate: false });
        else m.setView(punto, 15, { animate: false });
      };
      marco.current();
    }
  }, [listo, yoActiva?.lat, yoActiva?.lng, yoActiva?.precision]); // eslint-disable-line react-hooks/exhaustive-deps

  function centrarEnMi() {
    tocado.current = true;
    if (yoActiva && mapa.current) mapa.current.setView([yoActiva.lat, yoActiva.lng], Math.max(mapa.current.getZoom(), 16));
  }

  const sinUbicar = casos.filter(c => c.lat === null || c.lng === null).length;
  return <div className={solo ? 'mapa mapa-chico' : 'mapa'}>
    <div ref={nodo} className="mapa-lienzo" role="region" aria-label={solo ? 'Ubicación del caso' : `Mapa con ${casos.length} casos`} />
    {yoActiva && <button type="button" className="centrar" onClick={centrarEnMi} aria-label="Centrar el mapa en tu ubicación"><LocateFixed aria-hidden="true" size={22} /></button>}
    {!solo && !casos.length && <p className="mapa-aviso" role="status">No hay casos para mostrar en el mapa con este filtro.</p>}
    {sinUbicar > 0 && <p className="mapa-aviso">{sinUbicar} caso{sinUbicar > 1 ? 's' : ''} sin coordenadas: miralos en la lista.</p>}
  </div>;
}
