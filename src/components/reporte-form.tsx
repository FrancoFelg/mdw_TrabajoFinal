'use client';

import { useEffect, useRef, useState } from 'react';
import { reportarAction, fotoReporteAction } from '@/app/actions/formularios';
import { Formulario } from './formulario';
import { LocateFixed, CheckCircle } from 'lucide-react';
import { MAX_FOTO, TIPOS_FOTO, OPCIONES_RESPUESTA, PREGUNTAS_ESTADO, derivarPrioridad, type RespuestasEstado } from '@/lib/reporte';
import { MarcaPrioridad } from './marcas';
import { LlamarEmergencias } from './llamar-emergencias';
import { estimarProvincia, NOMBRES_PROVINCIA, PRIORIDADES } from '@/lib/casos';
import type { Prioridad, Provincia } from '@prisma/client';

type GPS = { coordenada_x: number; coordenada_y: number };
type Reportado = { id: string; permisoFoto: string | null; prioridad: Prioridad };

export function ReporteForm({ provincias }: { provincias: string[] }) {
  const [descripcion, setDescripcion] = useState('');
  const [respuestas, setRespuestas] = useState<RespuestasEstado>({ responde: null, respira: null });
  const prioridad = derivarPrioridad(respuestas);
  const [direccion, setDireccion] = useState('');
  const [provincia, setProvincia] = useState('');
  const [gps, setGps] = useState<GPS | null>(null);
  const [localizando, setLocalizando] = useState(false);
  const [mensajeGps, setMensajeGps] = useState('');
  const [foto, setFoto] = useState<File | null>(null);
  const [errorFoto, setErrorFoto] = useState('');
  const [errorFotoReintento, setErrorFotoReintento] = useState('');
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
    const datos = new FormData(); datos.set('foto', foto);
    const resultado = await fotoReporteAction(reporte.id, reporte.permisoFoto, datos);
    if (!resultado.ok) throw new Error(resultado.campos.foto || resultado.error);
  }

  async function enviar() {
    if (bloqueo.current || localizando) return { ok: false, error: 'Esperá a que termine la ubicación.', campos: {} };
    bloqueo.current = true;
    setEnviando(true);

    try {
      // La clave se conserva al fallar: reintentar recupera el caso sin duplicarlo.
      clave.current ||= crypto.randomUUID();
      cuerpo.current ??= JSON.stringify({ descripcion, prioridad, ...(gps ? { ...gps, provincia } : { direccion }) });
      setIncierto(true);
      const datos = await reportarAction(clave.current, JSON.parse(cuerpo.current));
      if (!datos.ok || !datos.reporte) {
        if (Object.keys(datos.campos).length) { setIncierto(false); cuerpo.current = null; clave.current = ''; }
        return { ok: false, error: datos.error, campos: datos.campos };
      }
      const reporte = { ...datos.reporte };
      setReportado(reporte);
      if (foto) {
        setFotoPendiente(true);
        try { await subirFoto(reporte); setFotoPendiente(false); }
        catch { setErrorFoto('No pudimos adjuntar la foto. El reporte ya está guardado; podés reintentar.'); }
      }
      return { ok: true, error: '', campos: {} };
    } catch {
      return { ok: false, error: 'No se pudo confirmar el reporte. Reintentá el mismo envío.', campos: {} };
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
        <input className="input" id="foto-reintento" type="file" accept="image/jpeg,image/png,image/webp" disabled={enviando} aria-invalid={!!errorFotoReintento} aria-describedby={errorFotoReintento ? 'foto-reintento-error' : undefined} onChange={e => {
          const archivo = e.target.files?.[0];
          if (!archivo) return;
          if (archivo.size > MAX_FOTO || !TIPOS_FOTO.includes(archivo.type)) {
            setErrorFotoReintento('Elegí una foto JPG, PNG o WebP de hasta 5 MB.'); e.target.value = ''; return;
          }
          setFoto(archivo); setErrorFotoReintento('');
        }} />{errorFotoReintento && <p id="foto-reintento-error" className="error-campo" role="alert">{errorFotoReintento}</p>}</div>
      <button className="button button-secondary" disabled={enviando || !!errorFotoReintento} onClick={reintentarFoto}>{enviando ? 'Adjuntando…' : 'Reintentar foto'}</button></div>}
    <a className="button" href="/reportar">Reportar otra emergencia</a>
  </div>;

  return <Formulario id="reporte" action={enviar}>
    <fieldset className="reporte-campos stack" disabled={enviando || incierto}>
      <div className="field"><label htmlFor="descripcion">¿Qué está pasando?</label>
        <textarea id="descripcion" name="descripcion" className="input textarea" required minLength={5} maxLength={191} value={descripcion}
          onChange={e => setDescripcion(e.target.value)} aria-describedby="descripcion-ayuda" />
        <small id="descripcion-ayuda" className="muted">Entre 5 y 191 caracteres. Incluí referencias para encontrar a la persona.</small></div>
      {PREGUNTAS_ESTADO.map(pregunta => <fieldset key={pregunta.clave} className="pregunta">
        <legend className="pregunta-texto">{pregunta.texto}</legend>
        <div className="pregunta-opciones">
          {OPCIONES_RESPUESTA.map(opcion => {
            const elegida = respuestas[pregunta.clave] === opcion.valor;
            return <label key={opcion.valor} className={`pregunta-op${elegida ? ' elegida' : ''}`}>
              <input type="radio" name={pregunta.clave} value={opcion.valor} checked={elegida}
                onChange={() => setRespuestas(actuales => ({ ...actuales, [pregunta.clave]: opcion.valor }))} />
              {opcion.texto}</label>;
          })}
        </div>
      </fieldset>)}
      <p className="prioridad-derivada" role="status">Prioridad: <MarcaPrioridad prioridad={prioridad} detalle /></p>
      {prioridad === 'ROJO' && <LlamarEmergencias />}
      <div className="stack"><h2>¿Dónde hace falta ayuda?</h2>
        <button type="button" className="button button-secondary" onClick={localizar} disabled={localizando}>
          <LocateFixed size={20} aria-hidden="true" />{localizando ? 'Buscando ubicación…' : 'Usar mi ubicación GPS'}</button>
        <p className="muted" role="status">{mensajeGps || 'Usá GPS si estás junto al incidente, o escribí la dirección.'}</p>
        {gps ? <div className="stack">
          <p>Latitud {gps.coordenada_y.toFixed(5)}, longitud {gps.coordenada_x.toFixed(5)}.</p>
          <div className="field"><label htmlFor="provincia">Provincia del incidente</label>
            <select className="input" id="provincia" name="provincia" required value={provincia} onChange={e => setProvincia(e.target.value)}>
              <option value="">Seleccioná una provincia</option>
              {provincias.map(p => <option key={p} value={p}>{NOMBRES_PROVINCIA[p as Provincia]}</option>)}
            </select></div>
          <button type="button" className="button button-secondary" onClick={() => { setGps(null); setMensajeGps('Escribí la dirección del incidente.'); }}>Usar dirección manual</button>
        </div> : <div className="field"><label htmlFor="direccion">Dirección del incidente</label>
          <input ref={entradaDireccion} className="input" id="direccion" name="direccion" value={direccion} required minLength={3} maxLength={250}
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
        <input className="input" id="foto" name="foto" type="file" accept="image/jpeg,image/png,image/webp" aria-invalid={!!errorFoto} aria-describedby={errorFoto ? 'foto-ayuda foto-error' : 'foto-ayuda'} onChange={e => {
          const archivo = e.target.files?.[0] ?? null;
          if (archivo && (archivo.size > MAX_FOTO || !TIPOS_FOTO.includes(archivo.type))) {
            setErrorFoto('Elegí una foto JPG, PNG o WebP de hasta 5 MB. Podés reportar sin foto.');
            setFoto(null); e.target.value = ''; return;
          }
          setFoto(archivo); setErrorFoto('');
        }} />
        <small id="foto-ayuda" className="muted">JPG, PNG o WebP. Hasta 5 MB.</small>
        {foto && <p>Foto seleccionada: {foto.name}</p>}
        {errorFoto && <p id="foto-error" className="error-campo" role="alert">{errorFoto}</p>}
      </div>
    </fieldset>

    <button className="button" type="submit" disabled={localizando || enviando}>{enviando ? 'Enviando reporte…' : incierto ? 'Reintentar el mismo reporte' : 'Reportar emergencia'}</button>
  </Formulario>;
}
