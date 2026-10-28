'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState, useTransition } from 'react';
import type { Prioridad } from '@prisma/client';
import { CircleAlert, CircleCheck, LoaderCircle, LocateFixed, MapPin, PencilLine, Phone, Send } from 'lucide-react';
import { reportarAction } from '@/app/actions/emergencias';
import { PRIORIDADES, formatoDistancia } from '@/lib/casos';
import { IconoPrioridad } from './marcas';
import { AdjuntosReporte, type Audio } from './adjuntos-reporte';

const MapaCasos = dynamic(() => import('./mapa-casos'), { ssr: false, loading: () => <div className="mapa mapa-chico mapa-cargando" role="status">Cargando mapa…</div> });

type Gps = { estado: 'inicial' | 'buscando' | 'error'; error?: string } | { estado: 'listo'; lat: number; lng: number; precision: number };
type Respuesta = 'si' | 'no' | 'nose';
type Campo = 'ubicacion' | 'direccion' | 'descripcion';

const MENSAJES_GPS: Record<number, string> = {
  1: 'No diste permiso para usar tu ubicación. Escribí la dirección.',
  2: 'Tu teléfono no pudo ubicarte. Escribí la dirección.',
  3: 'La ubicación tardó demasiado. Escribí la dirección o probá de nuevo.',
};

// Más de esto, la ubicación es aproximada y conviene una referencia.
const PRECISION_BUENA_M = 100;
// Si el permiso queda sin responder, el navegador no avisa: cortamos nosotros.
const ESPERA_GPS_MS = 12000;

const PREGUNTAS = [
  { id: 'responde', texto: '¿Responde si le hablás?' },
  { id: 'respira', texto: '¿Respira con normalidad?' },
] as const;

const OPCIONES: { valor: Respuesta; texto: string }[] = [
  { valor: 'si', texto: 'Sí' },
  { valor: 'no', texto: 'No' },
  { valor: 'nose', texto: 'No sé' },
];

// Regla de docs/spec.md, historia 7: un "No" es ROJO, un "No sé" es AMARILLO, dos "Sí" es VERDE.
function derivarPrioridad(r: Partial<Record<'responde' | 'respira', Respuesta>>): Prioridad | null {
  const valores = Object.values(r);
  if (!valores.length) return null;
  if (valores.includes('no')) return 'ROJO';
  if (valores.includes('nose')) return 'AMARILLO';
  return valores.length === 2 ? 'VERDE' : null;
}


export function LlamarAhora({ compacto = false }: { compacto?: boolean }) {
  return <p className={compacto ? 'llamar llamar-compacto' : 'llamar'}>
    <Phone aria-hidden="true" size={18} />
    <span>¿Corre peligro ahora? Llamá al <a href="tel:107">107</a> o al <a href="tel:911">911</a>.</span>
  </p>;
}

export function ReporteForm() {
  const [gps, setGps] = useState<Gps>({ estado: 'inicial' });
  const [manual, setManual] = useState(false);
  const [direccion, setDireccion] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [respuestas, setRespuestas] = useState<Partial<Record<'responde' | 'respira', Respuesta>>>({});
  const [errores, setErrores] = useState<Partial<Record<Campo, string>>>({});
  const [errorEnvio, setErrorEnvio] = useState('');
  const [foto, setFoto] = useState<Blob | null>(null);
  const [audio, setAudio] = useState<Audio | null>(null);
  const [enviado, setEnviado] = useState<{ avisos: string[] } | null>(null);
  const [enviando, startTransition] = useTransition();

  const refUbicar = useRef<HTMLButtonElement>(null);
  const refDireccion = useRef<HTMLInputElement>(null);
  const refDescripcion = useRef<HTMLTextAreaElement>(null);
  const refEnviado = useRef<HTMLHeadingElement>(null);
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enfocarDireccion = useRef(false);

  const prioridad = derivarPrioridad(respuestas);

  useEffect(() => () => { if (espera.current) clearTimeout(espera.current); }, []);
  useEffect(() => { if (enviado) refEnviado.current?.focus(); }, [enviado]);
  useEffect(() => {
    if (manual && enfocarDireccion.current) refDireccion.current?.focus();
    enfocarDireccion.current = false;
  }, [manual]);

  function pasarAManual(mensaje?: string) {
    if (mensaje) setGps({ estado: 'error', error: mensaje });
    enfocarDireccion.current = true;
    setManual(true);
  }

  function ubicar() {
    if (gps.estado === 'buscando') return;
    if (!('geolocation' in navigator)) return pasarAManual('Este navegador no comparte ubicación. Escribí la dirección.');
    setGps({ estado: 'buscando' });
    setErrores(e => ({ ...e, ubicacion: undefined }));
    espera.current = setTimeout(() => pasarAManual(MENSAJES_GPS[3]), ESPERA_GPS_MS);
    navigator.geolocation.getCurrentPosition(
      pos => {
        if (espera.current) clearTimeout(espera.current);
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        setGps({ estado: 'listo', lat, lng, precision: Math.round(accuracy) });
        setManual(false);
      },
      err => {
        if (espera.current) clearTimeout(espera.current);
        pasarAManual(MENSAJES_GPS[err.code] ?? MENSAJES_GPS[2]);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  function alternarModo() {
    if (manual) { setManual(false); return; }
    enfocarDireccion.current = true;
    setManual(true);
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    const nuevos: Partial<Record<Campo, string>> = {};
    if (manual && direccion.trim().length < 3) nuevos.direccion = 'Escribí la dirección: calle y altura, o una esquina, y la localidad.';
    if (!manual && gps.estado !== 'listo') nuevos.ubicacion = 'Falta la ubicación. Tocá “Usar mi ubicación” o escribí la dirección.';
    // Alcanza con una de las dos: el texto o el audio.
    if (descripcion.trim().length < 5 && !audio) nuevos.descripcion = 'Contá qué está pasando: escribilo (al menos 5 caracteres) o grabá un audio.';
    setErrores(nuevos);
    setErrorEnvio('');
    // El foco va al primer campo con problema, así el error nunca queda fuera de la vista.
    if (nuevos.ubicacion) return refUbicar.current?.focus();
    if (nuevos.direccion) return refDireccion.current?.focus();
    if (nuevos.descripcion) return refDescripcion.current?.focus();

    const base = { descripcion: descripcion.trim(), ...(prioridad ? { prioridad } : {}) };
    const datos = !manual && gps.estado === 'listo'
      ? { ...base, coordenada_x: gps.lng, coordenada_y: gps.lat }
      : { ...base, direccion: direccion.trim() };
    const archivos = new FormData();
    if (foto) archivos.append('imagen', foto, 'foto.jpg');
    if (audio) {
      archivos.append('audio', audio.blob, 'audio');
      archivos.append('audioDuracion', String(audio.segundos));
    }
    startTransition(async () => {
      try {
        const r = await reportarAction(datos, foto || audio ? archivos : undefined);
        if (r.ok) setEnviado({ avisos: r.avisos });
        else setErrorEnvio(r.error);
      } catch {
        setErrorEnvio('No pudimos enviar el reporte. Revisá la conexión e intentá de nuevo; lo que cargaste sigue acá.');
      }
    });
  }

  function reiniciar() {
    setEnviado(null); setFoto(null); setAudio(null); setDescripcion(''); setRespuestas({}); setDireccion(''); setGps({ estado: 'inicial' }); setManual(false); setErrores({});
  }

  if (enviado) {
    return <div className="reporte-enviado">
      <CircleCheck aria-hidden="true" size={44} strokeWidth={2} className="reporte-enviado-icono" />
      <h2 ref={refEnviado} tabIndex={-1}>Reporte enviado</h2>
      <p>Ya está en la lista de casos libres. Un voluntario lo toma y va al lugar.</p>
      {enviado.avisos.map(a => <p key={a} className="aviso"><CircleAlert aria-hidden="true" size={18} />{a} El reporte igual quedó registrado.</p>)}
      <p className="muted">No vas a recibir avisos: la app no manda notificaciones.</p>
      <button type="button" className="button button-secondary" onClick={reiniciar}>Reportar otra emergencia</button>
    </div>;
  }

  const aproximada = gps.estado === 'listo' && gps.precision > PRECISION_BUENA_M;
  const tituloUbicar = gps.estado === 'buscando' ? 'Buscando tu ubicación…' : gps.estado === 'listo' ? (aproximada ? 'Ubicación aproximada' : 'Ubicación lista') : 'Usar mi ubicación';
  const detalleUbicar = gps.estado === 'listo'
    ? (aproximada ? `Con un margen de ${formatoDistancia(gps.precision)}. Sumá una referencia en la descripción.` : `Con un margen de ${formatoDistancia(gps.precision)}`)
    : gps.estado === 'buscando' ? 'Si tu teléfono pregunta, tocá “Permitir”' : 'Para que el voluntario llegue directo';

  return <form className="reporte" onSubmit={enviar} noValidate aria-busy={enviando}>
    <fieldset className="reporte-paso">
      <legend>¿Dónde está la persona?</legend>
      {manual
        ? <div className="field">
          <label htmlFor="direccion" className="sr-only">Dirección</label>
          <div className="input-icono"><MapPin aria-hidden="true" size={20} /><input ref={refDireccion} id="direccion" className="input" value={direccion} onChange={e => { setDireccion(e.target.value); if (errores.direccion) setErrores(x => ({ ...x, direccion: undefined })); }} placeholder="Calle y altura, o una esquina" autoComplete="street-address" aria-invalid={!!errores.direccion} aria-describedby={errores.direccion ? 'direccion-error direccion-ayuda' : 'direccion-ayuda'} /></div>
          {errores.direccion && <p id="direccion-error" className="error-campo"><CircleAlert aria-hidden="true" size={16} />{errores.direccion}</p>}
          <p id="direccion-ayuda" className="muted">Sumá la localidad. Ej.: Av. Corrientes 1200, CABA</p>
        </div>
        : <button ref={refUbicar} type="button" className={`opcion-fila ubicar-${gps.estado}${aproximada ? ' ubicar-aproximada' : ''}`} onClick={ubicar} aria-disabled={gps.estado === 'buscando'} aria-describedby={errores.ubicacion ? 'ubicacion-error' : undefined}>
          <span className="opcion-icono">{gps.estado === 'buscando' ? <LoaderCircle aria-hidden="true" className="girar" size={20} /> : gps.estado === 'listo' ? (aproximada ? <CircleAlert aria-hidden="true" size={20} /> : <CircleCheck aria-hidden="true" size={20} />) : <LocateFixed aria-hidden="true" size={20} />}</span>
          <span className="opcion-texto" aria-live="polite">
            <strong>{tituloUbicar}</strong>
            <span>{detalleUbicar}</span>
          </span>
        </button>}
      {!manual && errores.ubicacion && <p id="ubicacion-error" className="error-campo"><CircleAlert aria-hidden="true" size={16} />{errores.ubicacion}</p>}
      {!manual && gps.estado === 'listo' && <MapaCasos solo etiqueta="Acá" casos={[{ id: 'ubicacion', lat: gps.lat, lng: gps.lng, prioridad: prioridad ?? 'VERDE', estado: 'SIN_GESTIONAR', descripcion: '', hace: '', fecha: '', provincia: '', asignado: null, propio: false }]} />}
      {gps.estado === 'error' && <p className="aviso" role="alert"><MapPin aria-hidden="true" size={18} />{gps.error}</p>}
      <button type="button" className="opcion-fila opcion-secundaria" onClick={alternarModo}>
        <span className="opcion-icono">{manual ? <LocateFixed aria-hidden="true" size={20} /> : <PencilLine aria-hidden="true" size={20} />}</span>
        <span className="opcion-texto"><strong>{manual ? 'Usar mi ubicación' : 'Escribir la dirección'}</strong></span>
      </button>
    </fieldset>

    <fieldset className="reporte-paso">
      <legend>¿Qué está pasando?</legend>
      <label htmlFor="descripcion" className="sr-only">Descripción</label>
      <textarea ref={refDescripcion} id="descripcion" className="input textarea" rows={4} value={descripcion} onChange={e => { setDescripcion(e.target.value); if (errores.descripcion) setErrores(x => ({ ...x, descripcion: undefined })); }} placeholder="Ej.: Hombre mayor durmiendo en la vereda, hace mucho frío. Está frente a la farmacia." maxLength={1000} aria-invalid={!!errores.descripcion} aria-describedby={errores.descripcion ? 'descripcion-error descripcion-ayuda' : 'descripcion-ayuda'} />
      {errores.descripcion && <p id="descripcion-error" className="error-campo"><CircleAlert aria-hidden="true" size={16} />{errores.descripcion}</p>}
      <p id="descripcion-ayuda" className="muted">Escribilo o grabá un audio: con uno alcanza. Cómo está, si está acompañada y alguna referencia del lugar.</p>
      <AdjuntosReporte foto={foto} onFoto={setFoto} audio={audio} onAudio={a => { setAudio(a); if (a && errores.descripcion) setErrores(x => ({ ...x, descripcion: undefined })); }} />
    </fieldset>

    <fieldset className="reporte-paso">
      <legend>¿Cómo está? <span className="opcional">Opcional</span></legend>
      {PREGUNTAS.map(p => <div key={p.id} className="pregunta" role="radiogroup" aria-labelledby={`pregunta-${p.id}`}>
        <span id={`pregunta-${p.id}`} className="pregunta-texto">{p.texto}</span>
        <div className="pregunta-opciones">
          {OPCIONES.map(o => <label key={o.valor} className={respuestas[p.id] === o.valor ? 'pregunta-op elegida' : 'pregunta-op'}>
            <input type="radio" name={p.id} value={o.valor} checked={respuestas[p.id] === o.valor} onChange={() => setRespuestas(r => ({ ...r, [p.id]: o.valor }))} />
            {o.texto}
          </label>)}
        </div>
      </div>)}
      <p className="prioridad-derivada" aria-live="polite">
        {prioridad
          ? <><IconoPrioridad prioridad={prioridad} /><span>Prioridad <strong>{PRIORIDADES[prioridad].nombre}</strong> · {prioridad === 'ROJO' ? 'la toman voluntarios con capacitación aprobada' : PRIORIDADES[prioridad].detalle.toLowerCase()}</span></>
          : <span className="muted">Con tus respuestas calculamos la prioridad. Si no sabés, queda en Verde.</span>}
      </p>
      {prioridad === 'ROJO' && <LlamarAhora compacto />}
    </fieldset>

    <div className="reporte-enviar">
      {errorEnvio && <p className="error-envio" role="alert"><CircleAlert aria-hidden="true" size={18} />{errorEnvio}</p>}
      <button className="button button-grande" disabled={enviando}>
        {enviando ? <LoaderCircle aria-hidden="true" className="girar" size={22} /> : <Send aria-hidden="true" size={22} />}
        {enviando ? 'Enviando…' : 'Enviar reporte'}
      </button>
      <p className="muted">No hace falta tener cuenta.</p>
    </div>
  </form>;
}
