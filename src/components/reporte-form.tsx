'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { LocateFixed, CheckCircle } from 'lucide-react';
import { MAX_FOTO, TIPOS_FOTO } from '@/lib/reporte';
import { estimarProvincia, NOMBRES_PROVINCIA, PRIORIDADES } from '@/lib/casos';
import type { Prioridad, Provincia } from '@prisma/client';

type GPS = { coordenada_x: number; coordenada_y: number };
type Reportado = { id: string; permisoFoto: string | null; prioridad: Prioridad };

export function ReporteForm({ provincias }: { provincias: string[] }) {
  const [descripcion, setDescripcion] = useState('');
  const [prioridad, setPrioridad] = useState<Prioridad>('VERDE');
  const [direccion, setDireccion] = useState('');
  const [provincia, setProvincia] = useState('');
  const [gps, setGps] = useState<GPS | null>(null);
  const [localizando, setLocalizando] = useState(false);
  const [mensajeGps, setMensajeGps] = useState('');
  const [foto, setFoto] = useState<File | null>(null);
  const [errorFoto, setErrorFoto] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [incierto, setIncierto] = useState(false);
  const [reportado, setReportado] = useState<Reportado | null>(null);
  const [fotoPendiente, setFotoPendiente] = useState(false);
  const clave = useRef('');
  const cuerpo = useRef<string | null>(null);
  const bloqueo = useRef(false);
  const entradaDireccion = useRef<HTMLInputElement>(null);
  const [sugerencias, setSugerencias] = useState<{ placeId: string; texto: string }[]>([]);
  const [direccionElegida, setDireccionElegida] = useState('');
  const [avisoDireccion, setAvisoDireccion] = useState('');

  useEffect(() => {
    if (gps || direccion.trim().length < 3 || direccion === direccionElegida) return;
    const controller = new AbortController();
    const espera = setTimeout(async () => {
      try {
        const respuesta = await fetch(`/api/direcciones/sugerencias?q=${encodeURIComponent(direccion.slice(0, 200))}`, {
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(6500)]),
        });
        if (!respuesta.ok) throw new Error('Sin sugerencias');
        const opciones = await respuesta.json();
        if (!controller.signal.aborted) {
          setSugerencias(opciones.filter((opcion: { texto: string }) => opcion.texto.length <= 250));
          setAvisoDireccion(opciones.length ? '' : 'Sin coincidencias. Incluí localidad y provincia; podés reportar igual.');
        }
      } catch {
        if (!controller.signal.aborted) {
          setSugerencias([]);
          setAvisoDireccion('Google Maps no está disponible. Podés reportar con la dirección escrita.');
        }
      }
    }, 400);
    return () => { clearTimeout(espera); controller.abort(); };
  }, [direccion, direccionElegida, gps]);

  function localizar() {
    if (!navigator.geolocation) {
      setMensajeGps('Este dispositivo no ofrece GPS. Escribí la dirección.');
      entradaDireccion.current?.focus();
      return;
    }
    setLocalizando(true);
    setMensajeGps('Buscando tu ubicación…');
    navigator.geolocation.getCurrentPosition(posicion => {
      setGps({ coordenada_x: posicion.coords.longitude, coordenada_y: posicion.coords.latitude });
      setProvincia(estimarProvincia(posicion.coords.latitude, posicion.coords.longitude));
      setLocalizando(false);
      setMensajeGps('Ubicación obtenida. Revisá la provincia estimada y confirmá que el incidente está en este lugar.');
    }, fallo => {
      setGps(null);
      setLocalizando(false);
      setMensajeGps(fallo.code === 1 ? 'No diste permiso de ubicación. Escribí la dirección o reintentá el GPS.' : 'No pudimos obtener tu ubicación. Escribí la dirección o reintentá el GPS.');
      entradaDireccion.current?.focus();
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
  }

  async function subirFoto(reporte: Reportado) {
    if (!foto) return;
    if (!reporte.permisoFoto) throw new Error('La carga de fotos no está configurada. El reporte está guardado.');
    const respuesta = await fetch(`/api/emergencias/${reporte.id}/foto`, {
      method: 'POST', headers: { 'Content-Type': foto.type, 'x-permiso-foto': reporte.permisoFoto }, body: foto,
      signal: AbortSignal.timeout(30000),
    });
    const datos = await respuesta.json();
    if (!respuesta.ok) throw new Error(datos.error || 'No pudimos adjuntar la foto.');
  }

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (bloqueo.current || localizando) return;
    bloqueo.current = true;
    setEnviando(true);
    setError('');
    try {
      // La clave se conserva al fallar: reintentar recupera el caso sin duplicarlo.
      clave.current ||= crypto.randomUUID();
      cuerpo.current ??= JSON.stringify({ descripcion, prioridad, ...(gps ? { ...gps, provincia } : { direccion }) });
      setIncierto(true);
      const respuesta = await fetch('/api/emergencias', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': clave.current },
        body: cuerpo.current,
        signal: AbortSignal.timeout(20000),
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) {
        if ((respuesta.status >= 400 && respuesta.status < 500) || datos.reporteGuardado === false) {
          setIncierto(false); cuerpo.current = null; clave.current = '';
        }
        throw new Error(datos.error || 'No pudimos guardar el reporte.');
      }
      const reporte = { id: datos.id, permisoFoto: datos.permisoFoto, prioridad: datos.prioridad };
      setReportado(reporte);
      if (foto) {
        setFotoPendiente(true);
        try { await subirFoto(reporte); setFotoPendiente(false); }
        catch { setErrorFoto('No pudimos adjuntar la foto. El reporte ya está guardado; podés reintentar.'); }
      }
    } catch (fallo) {
      setError(fallo instanceof Error && !['TimeoutError', 'TypeError', 'SyntaxError'].includes(fallo.name)
        ? fallo.message : 'No recibimos confirmación. Revisá tu conexión y reintentá. Reenviaremos el mismo reporte para evitar duplicados.');
    } finally { bloqueo.current = false; setEnviando(false); }
  }

  async function reintentarFoto() {
    if (!reportado || bloqueo.current) return;
    bloqueo.current = true;
    setEnviando(true);
    try { await subirFoto(reportado); setFotoPendiente(false); setErrorFoto(''); }
    catch (fallo) { setErrorFoto(fallo instanceof Error && fallo.name === 'Error' ? fallo.message : 'No pudimos adjuntar la foto. Revisá tu conexión y reintentá.'); }
    finally { bloqueo.current = false; setEnviando(false); }
  }

  if (reportado) return <div className="stack" role="status">
    <CheckCircle aria-hidden="true" size={40} /><h2>Emergencia reportada</h2>
    <p>El caso quedó registrado como <strong>Sin gestionar</strong>, con prioridad <strong>{PRIORIDADES[reportado.prioridad].nombre}</strong>.</p>
    <p className="reporte-codigo muted">Código: {reportado.id}</p>
    {foto && !fotoPendiente && !enviando && <p>Foto adjuntada.</p>}
    {fotoPendiente && <div className="stack"><p role="alert">{errorFoto || 'Adjuntando foto…'}</p>
      <div className="field"><label htmlFor="foto-reintento">Cambiar foto pendiente (opcional)</label>
        <input className="input" id="foto-reintento" type="file" accept="image/jpeg,image/png,image/webp" disabled={enviando} onChange={e => {
          const archivo = e.target.files?.[0];
          if (!archivo) return;
          if (archivo.size > MAX_FOTO || !TIPOS_FOTO.includes(archivo.type)) {
            setErrorFoto('Elegí una foto JPG, PNG o WebP de hasta 5 MB.'); e.target.value = ''; return;
          }
          setFoto(archivo); setErrorFoto('Foto lista para adjuntar.');
        }} /></div>
      <button className="button button-secondary" disabled={enviando} onClick={reintentarFoto}>{enviando ? 'Adjuntando…' : 'Reintentar foto'}</button></div>}
    <a className="button" href="/reportar">Reportar otra emergencia</a>
  </div>;

  return <form className="stack" onSubmit={enviar} aria-busy={enviando}>
    <fieldset className="reporte-campos stack" disabled={enviando || incierto}>
      <div className="field"><label htmlFor="prioridad">Prioridad de la emergencia</label>
        <select className="input" id="prioridad" required value={prioridad} onChange={e => setPrioridad(e.target.value as Prioridad)}>
          {(Object.entries(PRIORIDADES) as [Prioridad, { nombre: string; detalle: string }][]).map(([valor, opcion]) =>
            <option key={valor} value={valor}>{opcion.nombre} — {opcion.detalle}</option>)}
        </select></div>
      <div className="field"><label htmlFor="descripcion">¿Qué está pasando?</label>
        <textarea id="descripcion" className="input textarea" required minLength={5} maxLength={191} value={descripcion}
          onChange={e => setDescripcion(e.target.value)} aria-describedby="descripcion-ayuda" />
        <small id="descripcion-ayuda" className="muted">Entre 5 y 191 caracteres. Incluí referencias para encontrar a la persona.</small></div>
      <div className="stack"><h2>¿Dónde hace falta ayuda?</h2>
        <button type="button" className="button button-secondary" onClick={localizar} disabled={localizando}>
          <LocateFixed size={20} aria-hidden="true" />{localizando ? 'Buscando ubicación…' : 'Usar mi ubicación GPS'}</button>
        <p className="muted" role="status">{mensajeGps || 'Usá GPS si estás junto al incidente, o escribí la dirección.'}</p>
        {gps ? <div className="stack">
          <p>Latitud {gps.coordenada_y.toFixed(5)}, longitud {gps.coordenada_x.toFixed(5)}.</p>
          <div className="field"><label htmlFor="provincia">Provincia del incidente</label>
            <select className="input" id="provincia" required value={provincia} onChange={e => setProvincia(e.target.value)}>
              <option value="">Seleccioná una provincia</option>
              {provincias.map(p => <option key={p} value={p}>{NOMBRES_PROVINCIA[p as Provincia]}</option>)}
            </select></div>
          <button type="button" className="button button-secondary" onClick={() => { setGps(null); setMensajeGps('Escribí la dirección del incidente.'); }}>Usar dirección manual</button>
        </div> : <div className="field"><label htmlFor="direccion">Dirección del incidente</label>
          <input ref={entradaDireccion} className="input" id="direccion" value={direccion} required minLength={3} maxLength={250}
            placeholder="Calle, altura, localidad y provincia" autoComplete="off" aria-describedby="direccion-ayuda"
            onKeyDown={e => { if (e.key === 'Escape') setSugerencias([]); }}
            onChange={e => { setDireccion(e.target.value); setSugerencias([]); setAvisoDireccion(''); }} />
          {sugerencias.length > 0 && <div className="stack" aria-label="Direcciones sugeridas">
            {sugerencias.map(s => <button type="button" className="button button-secondary" key={s.placeId}
              onClick={() => { setDireccion(s.texto); setDireccionElegida(s.texto); setSugerencias([]); }}>{s.texto}</button>)}
            <small className="muted">Google Maps</small>
          </div>}
          <small id="direccion-ayuda" role="status">{avisoDireccion}</small>
          <small className="muted">Se guarda aunque no tengas GPS ni acceso a Google Maps. Incluí localidad y provincia para facilitar la atención.</small></div>}
      </div>
      <div className="field"><label htmlFor="foto">Foto (opcional)</label>
        <input className="input" id="foto" type="file" accept="image/jpeg,image/png,image/webp" onChange={e => {
          const archivo = e.target.files?.[0] ?? null;
          if (archivo && (archivo.size > MAX_FOTO || !TIPOS_FOTO.includes(archivo.type))) {
            setErrorFoto('Elegí una foto JPG, PNG o WebP de hasta 5 MB. Podés reportar sin foto.');
            setFoto(null); e.target.value = ''; return;
          }
          setFoto(archivo); setErrorFoto('');
        }} />
        <small className="muted">JPG, PNG o WebP. Hasta 5 MB.</small>
        {foto && <p>Foto seleccionada: {foto.name}</p>}
        {errorFoto && <p role="alert">{errorFoto}</p>}
      </div>
    </fieldset>
    {error && <p className="alert" role="alert">{error}</p>}
    <button className="button" type="submit" disabled={localizando || enviando}>{enviando ? 'Enviando reporte…' : incierto ? 'Reintentar el mismo reporte' : 'Reportar emergencia'}</button>
  </form>;
}
