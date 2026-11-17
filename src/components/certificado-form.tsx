'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';
import { Button, Input } from './ui';
import type { CertificadoVista } from '@/lib/certificados-vista';

type AtributoCatalogo = { id: string; nombre: string; tipo: string };
type Fila = { clave: number; campoId: string; dato: string };
type Campo = 'nombre' | 'entidadEmisora' | 'fechaEmision' | 'archivo' | 'atributos' | 'general';

const MAX_ARCHIVO = 5 * 1024 * 1024;
const TIPOS = 'application/pdf,image/jpeg,image/png,image/webp';
const hoyAR = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());

export function CertificadoForm({ modo, catalogo, inicial }: { modo: 'crear' | 'editar'; catalogo: AtributoCatalogo[]; inicial?: CertificadoVista }) {
  const router = useRouter();
  const [filas, setFilas] = useState<Fila[]>(() => (inicial?.atributos ?? []).map((a, i) => ({ clave: i, campoId: a.campoId, dato: a.dato })));
  // Claves estables para las filas nuevas; arranca después de las precargadas.
  const siguiente = useRef(inicial?.atributos.length ?? 0);
  const nuevaFila = (): Fila => ({ clave: siguiente.current++, campoId: '', dato: '' });
  const [errores, setErrores] = useState<Partial<Record<Campo, string>>>({});
  const [enviando, setEnviando] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Después de un intento fallido, el foco va al primer campo con error para que el lector de pantalla lo lea.
  useEffect(() => {
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [errores]);

  const tipoDe = (campoId: string) => catalogo.find(a => a.id === campoId)?.tipo ?? 'TEXTO';
  const cambiarFila = (clave: number, cambio: Partial<Fila>) => setFilas(fs => fs.map(f => f.clave === clave ? { ...f, ...cambio } : f));
  const errorDe = (campo: Campo) => errores[campo] ? { 'aria-invalid': true, 'aria-describedby': `error-${campo}` } : {};
  const mensaje = (campo: Campo) => errores[campo] && <p id={`error-${campo}`} className="error-linea" role="alert">{errores[campo]}</p>;

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;
    const form = new FormData(evento.currentTarget);
    const archivo = form.get('archivo');
    const hayArchivo = archivo instanceof File && archivo.size > 0;
    const nuevos: Partial<Record<Campo, string>> = {};
    if (modo === 'crear' && !hayArchivo) nuevos.archivo = 'Adjuntá el archivo del certificado.';
    if (hayArchivo && archivo.size > MAX_ARCHIVO) nuevos.archivo = 'El archivo debe pesar hasta 5 MB.';
    if (filas.some(f => !f.campoId || (tipoDe(f.campoId) !== 'BOOLEANO' && !f.dato.trim()))) nuevos.atributos = 'Completá o quitá los datos adicionales vacíos.';
    setErrores(nuevos);
    if (Object.keys(nuevos).length) return;

    if (!hayArchivo) form.delete('archivo');
    form.set('atributos', JSON.stringify(filas.map(f => ({ campoId: f.campoId, dato: tipoDe(f.campoId) === 'BOOLEANO' ? (f.dato === 'true' ? 'true' : 'false') : f.dato }))));
    setEnviando(true);
    try {
      const respuesta = await fetch(modo === 'crear' ? '/api/certificados' : `/api/certificados/${inicial!.id}`, {
        method: modo === 'crear' ? 'POST' : 'PUT',
        body: form,
        signal: AbortSignal.timeout(30000),
      });
      if (!respuesta.ok) {
        const datos = await respuesta.json().catch(() => null);
        setErrores({ [(datos?.campo as Campo) ?? 'general']: datos?.error || 'No pudimos guardar el certificado. Intentá de nuevo.' });
        return;
      }
      router.push('/certificados');
      router.refresh();
    } catch (e) {
      setErrores({ general: e instanceof Error && e.name === 'TimeoutError' ? 'La carga tardó demasiado. Revisá tu conexión y volvé a intentar; tus datos siguen acá.' : 'No pudimos conectarnos. Revisá tu conexión y volvé a intentar; tus datos siguen acá.' });
    } finally {
      setEnviando(false);
    }
  }

  return <form ref={formRef} className="stack" onSubmit={enviar} aria-busy={enviando}>
    {errores.general && <p className="alert" role="alert">{errores.general}</p>}
    <div className="field">
      <label htmlFor="cert-nombre">Nombre del certificado</label>
      <Input id="cert-nombre" name="nombre" required maxLength={191} defaultValue={inicial?.nombre} placeholder="Ej.: Primeros auxilios" {...errorDe('nombre')} />
      {mensaje('nombre')}
    </div>
    <div className="field">
      <label htmlFor="cert-emisor">Entidad emisora</label>
      <Input id="cert-emisor" name="entidadEmisora" required maxLength={191} defaultValue={inicial?.entidadEmisora} placeholder="Ej.: Cruz Roja Argentina" {...errorDe('entidadEmisora')} />
      {mensaje('entidadEmisora')}
    </div>
    <div className="field">
      <label htmlFor="cert-fecha">Fecha de emisión</label>
      <Input id="cert-fecha" name="fechaEmision" type="date" required max={hoyAR()} defaultValue={inicial?.fechaEmision.slice(0, 10)} {...errorDe('fechaEmision')} />
      {mensaje('fechaEmision')}
    </div>
    <div className="field">
      <label htmlFor="cert-numero">Número de certificado <span className="muted">(opcional)</span></label>
      <Input id="cert-numero" name="codigoVerificacion" maxLength={191} defaultValue={inicial?.codigoVerificacion ?? ''} />
    </div>
    <div className="field">
      <label htmlFor="cert-archivo">{modo === 'crear' ? 'Archivo' : <>Reemplazar archivo <span className="muted">(opcional)</span></>}</label>
      <input id="cert-archivo" name="archivo" type="file" accept={TIPOS} required={modo === 'crear'} className="input" aria-describedby={`ayuda-archivo${errores.archivo ? ' error-archivo' : ''}`} aria-invalid={errores.archivo ? true : undefined} />
      <p id="ayuda-archivo" className="muted">PDF, JPG, PNG o WebP de hasta 5 MB.{inicial && ` Archivo actual: ${inicial.archivoNombre}.`}</p>
      {mensaje('archivo')}
    </div>

    {catalogo.length > 0 && <fieldset className="reporte-paso" aria-describedby={errores.atributos ? 'error-atributos' : undefined}>
      <legend>Datos adicionales <span className="opcional">Opcional</span></legend>
      {filas.map((f, i) => {
        const tipo = tipoDe(f.campoId);
        const usados = new Set(filas.filter(o => o.clave !== f.clave).map(o => o.campoId));
        return <div key={f.clave} className="atributo-fila">
          <div className="field">
            <label htmlFor={`attr-campo-${f.clave}`}>Dato {i + 1}</label>
            <select id={`attr-campo-${f.clave}`} className="input" value={f.campoId} onChange={e => cambiarFila(f.clave, { campoId: e.target.value, dato: '' })}>
              <option value="">Elegí un dato</option>
              {catalogo.filter(a => !usados.has(a.id)).map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor={`attr-valor-${f.clave}`}>Valor</label>
            {tipo === 'BOOLEANO'
              ? <input id={`attr-valor-${f.clave}`} type="checkbox" checked={f.dato === 'true'} disabled={!f.campoId} onChange={e => cambiarFila(f.clave, { dato: e.target.checked ? 'true' : 'false' })} />
              : <Input id={`attr-valor-${f.clave}`} type={tipo === 'NUMERO' ? 'number' : tipo === 'FECHA' ? 'date' : 'text'} step={tipo === 'NUMERO' ? 'any' : undefined} value={f.dato} disabled={!f.campoId} onChange={e => cambiarFila(f.clave, { dato: e.target.value })} />}
          </div>
          <Button type="button" className="button-chico button-secondary" onClick={() => setFilas(fs => fs.filter(o => o.clave !== f.clave))}>
            <X aria-hidden="true" size={18} />Quitar<span className="sr-only"> dato {i + 1}</span>
          </Button>
        </div>;
      })}
      {filas.length < catalogo.length && <div><Button type="button" className="button-chico button-secondary" onClick={() => setFilas(fs => [...fs, nuevaFila()])}><Plus aria-hidden="true" size={18} />Agregar dato</Button></div>}
      {mensaje('atributos')}
    </fieldset>}

    <div className="actions">
      <Button type="submit" disabled={enviando}>{enviando ? 'Guardando…' : modo === 'crear' ? 'Cargar certificado' : 'Guardar cambios'}</Button>
      <Button type="button" className="button-secondary" disabled={enviando} onClick={() => router.push('/certificados')}>Cancelar</Button>
    </div>
  </form>;
}
