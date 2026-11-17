'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input } from './ui';
import { DatosAdicionales, useDatosAdicionales, type AtributoCatalogo } from './datos-adicionales';
import { fechaLegible, type CertificadoVista } from '@/lib/certificados-vista';

type Campo = 'nombre' | 'entidadEmisora' | 'fechaEmision' | 'archivo' | 'atributos' | 'general';
// Certificado de un curso: estos datos salen del curso y no se cargan a mano.
export type DatosDelCurso = { id: string; titulo: string; nombre: string; entidadEmisora: string; fechaEmision: string };

const MAX_ARCHIVO = 5 * 1024 * 1024;
const TIPOS = 'application/pdf,image/jpeg,image/png,image/webp';
const hoyAR = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());

export function CertificadoForm({ modo, catalogo, inicial, curso }: { modo: 'crear' | 'editar'; catalogo: AtributoCatalogo[]; inicial?: CertificadoVista; curso?: DatosDelCurso }) {
  const router = useRouter();
  const datos = useDatosAdicionales(catalogo, inicial?.atributos);
  const [errores, setErrores] = useState<Partial<Record<Campo, string>>>({});
  const [enviando, setEnviando] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const delCurso = curso ?? (inicial?.curso
    ? { titulo: inicial.curso, nombre: inicial.nombre, entidadEmisora: inicial.entidadEmisora, fechaEmision: inicial.fechaEmision }
    : null);
  const volver = curso ? '/cursos' : '/certificados';

  // Después de un intento fallido, el foco va al primer campo con error para que el lector de pantalla lo lea.
  useEffect(() => {
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [errores]);

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
    if (datos.incompletas()) nuevos.atributos = 'Completá o quitá los datos adicionales vacíos.';
    setErrores(nuevos);
    if (Object.keys(nuevos).length) return;

    if (!hayArchivo) form.delete('archivo');
    form.set('atributos', JSON.stringify(datos.valores()));
    setEnviando(true);
    try {
      const respuesta = await fetch(modo === 'crear' ? '/api/certificados' : `/api/certificados/${inicial!.id}`, {
        method: modo === 'crear' ? 'POST' : 'PUT',
        body: form,
        signal: AbortSignal.timeout(30000),
      });
      if (!respuesta.ok) {
        const cuerpo = await respuesta.json().catch(() => null);
        setErrores({ [(cuerpo?.campo as Campo) ?? 'general']: cuerpo?.error || 'No pudimos guardar el certificado. Intentá de nuevo.' });
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
    {delCurso
      ? <>
        {curso && <input type="hidden" name="cursoId" value={curso.id} />}
        <dl className="datos" aria-label="Datos que salen del curso">
          <div><dt>Curso</dt><dd>{delCurso.titulo}</dd></div>
          <div><dt>Certificado</dt><dd>{delCurso.nombre}</dd></div>
          <div><dt>Entidad emisora</dt><dd>{delCurso.entidadEmisora}</dd></div>
          <div><dt>Fecha de emisión</dt><dd>{fechaLegible(delCurso.fechaEmision)}</dd></div>
        </dl>
      </>
      : <>
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
      </>}
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

    <DatosAdicionales catalogo={catalogo} estado={datos} error={mensaje('atributos')} />

    <div className="actions">
      <Button type="submit" disabled={enviando}>{enviando ? 'Guardando…' : modo === 'crear' ? 'Cargar certificado' : 'Guardar cambios'}</Button>
      <Button type="button" className="button-secondary" disabled={enviando} onClick={() => router.push(volver)}>Cancelar</Button>
    </div>
  </form>;
}
