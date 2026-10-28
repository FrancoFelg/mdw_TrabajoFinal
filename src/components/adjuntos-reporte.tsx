'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Camera, CircleAlert, Mic, Square, Trash2 } from 'lucide-react';

// Foto y audio opcionales del reporte. Todo pasa muy rápido en la calle:
// la foto se comprime en el teléfono y el audio corta solo al minuto, para que suban con mala señal.

export type Audio = { blob: Blob; segundos: number };

const AUDIO_MAX_S = 60;
const FOTO_MAX_PX = 1600;

async function comprimirFoto(archivo: File): Promise<Blob> {
  try {
    const imagen = await createImageBitmap(archivo, { imageOrientation: 'from-image' });
    const escala = Math.min(1, FOTO_MAX_PX / Math.max(imagen.width, imagen.height));
    const lienzo = document.createElement('canvas');
    lienzo.width = Math.round(imagen.width * escala);
    lienzo.height = Math.round(imagen.height * escala);
    lienzo.getContext('2d')?.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
    const blob = await new Promise<Blob | null>(ok => lienzo.toBlob(ok, 'image/jpeg', 0.72));
    if (blob) return blob;
  } catch { /* el navegador no puede decodificarla (p. ej. HEIC): se manda la original */ }
  return archivo;
}

function formatoTiempo(s: number) {
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

function tipoAudio() {
  if (typeof MediaRecorder === 'undefined') return null;
  for (const t of ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4']) if (MediaRecorder.isTypeSupported(t)) return t;
  return '';
}

export function AdjuntosReporte({ foto, onFoto, audio, onAudio }: { foto: Blob | null; onFoto: (f: Blob | null) => void; audio: Audio | null; onAudio: (a: Audio | null) => void }) {
  const entrada = useRef<HTMLInputElement>(null);
  const grabador = useRef<MediaRecorder | null>(null);
  const reloj = useRef<ReturnType<typeof setInterval> | null>(null);
  const inicio = useRef(0);
  const [grabando, setGrabando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [error, setError] = useState('');
  // En el servidor no hay micrófono: el botón aparece recién en el navegador, sin desajuste de hidratación.
  const puedeGrabar = useSyncExternalStore(() => () => {}, () => tipoAudio() !== null && !!navigator.mediaDevices?.getUserMedia, () => false);
  const urlFoto = useMemo(() => foto ? URL.createObjectURL(foto) : null, [foto]);
  const urlAudio = useMemo(() => audio ? URL.createObjectURL(audio.blob) : null, [audio]);
  useEffect(() => () => { if (urlFoto) URL.revokeObjectURL(urlFoto); }, [urlFoto]);
  useEffect(() => () => { if (urlAudio) URL.revokeObjectURL(urlAudio); }, [urlAudio]);
  useEffect(() => () => { if (reloj.current) clearInterval(reloj.current); grabador.current?.stream.getTracks().forEach(t => t.stop()); }, []);

  async function elegirFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;
    setError('');
    onFoto(await comprimirFoto(archivo));
  }

  async function grabar() {
    setError('');
    let flujo: MediaStream;
    try {
      flujo = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return setError('No pudimos usar el micrófono. Revisá el permiso o contalo por escrito.');
    }
    const tipo = tipoAudio() || undefined;
    const r = new MediaRecorder(flujo, tipo ? { mimeType: tipo, audioBitsPerSecond: 32000 } : undefined);
    const partes: Blob[] = [];
    r.ondataavailable = ev => { if (ev.data.size) partes.push(ev.data); };
    r.onstop = () => {
      flujo.getTracks().forEach(t => t.stop());
      if (reloj.current) clearInterval(reloj.current);
      const duracion = Math.min(AUDIO_MAX_S, (Date.now() - inicio.current) / 1000);
      setGrabando(false);
      if (partes.length) onAudio({ blob: new Blob(partes, { type: r.mimeType || 'audio/webm' }), segundos: Math.round(duracion) });
    };
    grabador.current = r;
    inicio.current = Date.now();
    setSegundos(0);
    setGrabando(true);
    r.start();
    reloj.current = setInterval(() => {
      const s = (Date.now() - inicio.current) / 1000;
      setSegundos(s);
      if (s >= AUDIO_MAX_S && r.state === 'recording') r.stop();
    }, 250);
  }

  function detener() {
    if (grabador.current?.state === 'recording') grabador.current.stop();
  }

  return <div className="adjuntos">
    <div className="adjuntos-acciones">
      <input ref={entrada} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} onChange={elegirFoto} aria-hidden="true" />
      {!foto && <button type="button" className="adjunto-boton" onClick={() => entrada.current?.click()}><Camera aria-hidden="true" size={20} />Sacar foto</button>}
      {puedeGrabar && !audio && (grabando
        ? <button type="button" className="adjunto-boton grabando" onClick={detener} aria-live="polite">
          <Square aria-hidden="true" size={18} fill="currentColor" />Detener <span className="adjunto-tiempo">{formatoTiempo(segundos)} / {formatoTiempo(AUDIO_MAX_S)}</span>
        </button>
        : <button type="button" className="adjunto-boton" onClick={grabar}><Mic aria-hidden="true" size={20} />Grabar audio</button>)}
    </div>

    {urlFoto && <div className="adjunto-vista">
      {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local de un blob */}
      <img src={urlFoto} alt="Foto que vas a enviar" className="adjunto-foto" />
      <button type="button" className="adjunto-quitar" onClick={() => onFoto(null)}><Trash2 aria-hidden="true" size={18} />Quitar foto</button>
    </div>}

    {urlAudio && audio && <div className="adjunto-vista adjunto-vista-audio">
      <audio src={urlAudio} controls preload="metadata" aria-label={`Audio de ${formatoTiempo(audio.segundos)} que vas a enviar`} />
      <button type="button" className="adjunto-quitar" onClick={() => onAudio(null)}><Trash2 aria-hidden="true" size={18} />Borrar audio</button>
    </div>}

    {error && <p className="error-campo" role="alert"><CircleAlert aria-hidden="true" size={16} />{error}</p>}
    <p className="muted">La foto es opcional: que se vea la situación o el lugar; evitá mostrar la cara. Foto y audio solo los ven los voluntarios con cuenta.</p>
  </div>;
}
