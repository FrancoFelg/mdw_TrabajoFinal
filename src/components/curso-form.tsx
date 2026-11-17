'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input } from './ui';
import { DatosAdicionales, useDatosAdicionales, type AtributoCatalogo } from './datos-adicionales';
import type { CursoVista } from '@/lib/cursos-vista';

type Campo = 'titulo' | 'descripcion' | 'fechaHasta' | 'horas' | 'certificado' | 'atributos' | 'general';

// Errores de la API de cursos que corresponden a un campo del formulario.
const CAMPO_DE: Record<string, Campo> = {
  TITULO_VACIO: 'titulo', DESCRIPCION_VACIA: 'descripcion', RANGO_FECHAS_INVALIDO: 'fechaHasta',
  HORAS_INVALIDAS: 'horas', CERTIFICADO_INCOMPLETO: 'certificado',
  ATRIBUTO_DUPLICADO: 'atributos', ATRIBUTO_NO_ENCONTRADO: 'atributos', ATRIBUTO_INCOMPLETO_CAMPO_Y_DATO_REQUERIDOS: 'atributos',
};

export function CursoForm({ catalogo, inicial }: { catalogo: AtributoCatalogo[]; inicial?: CursoVista }) {
  const router = useRouter();
  const datos = useDatosAdicionales(catalogo, inicial?.atributos);
  const [otorga, setOtorga] = useState(Boolean(inicial?.certificadoNombre));
  const [errores, setErrores] = useState<Partial<Record<Campo, string>>>({});
  const [enviando, setEnviando] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [errores]);

  const errorDe = (campo: Campo) => errores[campo] ? { 'aria-invalid': true, 'aria-describedby': `error-${campo}` } : {};
  const mensaje = (campo: Campo) => errores[campo] && <p id={`error-${campo}`} className="error-linea" role="alert">{errores[campo]}</p>;

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;
    const form = new FormData(evento.currentTarget);
    const texto = (nombre: string) => String(form.get(nombre) ?? '').trim();
    const cuerpo = {
      titulo: texto('titulo'),
      descripcion: texto('descripcion'),
      fechaDesde: texto('fechaDesde'),
      fechaHasta: texto('fechaHasta'),
      horas: texto('horas') || null,
      certificadoNombre: otorga ? texto('certificadoNombre') : null,
      certificadoEmisor: otorga ? texto('certificadoEmisor') : null,
      atributos: datos.valores(),
    };
    const nuevos: Partial<Record<Campo, string>> = {};
    if (cuerpo.fechaHasta && cuerpo.fechaDesde && cuerpo.fechaHasta < cuerpo.fechaDesde) nuevos.fechaHasta = 'La fecha de fin no puede ser anterior a la de inicio.';
    if (otorga && (!cuerpo.certificadoNombre || !cuerpo.certificadoEmisor)) nuevos.certificado = 'Completá el nombre del certificado y la entidad emisora, o desmarcá la opción.';
    if (datos.incompletas()) nuevos.atributos = 'Completá o quitá los datos adicionales vacíos.';
    setErrores(nuevos);
    if (Object.keys(nuevos).length) return;

    setEnviando(true);
    try {
      const respuesta = await fetch(inicial ? `/api/cursos/${inicial.id}` : '/api/cursos', {
        method: inicial ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo),
        signal: AbortSignal.timeout(20000),
      });
      if (!respuesta.ok) {
        const r = await respuesta.json().catch(() => null);
        setErrores({ [CAMPO_DE[r?.codigo] ?? 'general']: r?.error || 'No pudimos guardar el curso. Intentá de nuevo.' });
        return;
      }
      router.push('/cursos');
      router.refresh();
    } catch (e) {
      setErrores({ general: e instanceof Error && e.name === 'TimeoutError' ? 'Guardar tardó demasiado. Revisá tu conexión y volvé a intentar; tus datos siguen acá.' : 'No pudimos conectarnos. Revisá tu conexión y volvé a intentar; tus datos siguen acá.' });
    } finally {
      setEnviando(false);
    }
  }

  return <form ref={formRef} className="stack" onSubmit={enviar} aria-busy={enviando}>
    {errores.general && <p className="alert" role="alert">{errores.general}</p>}
    <div className="field">
      <label htmlFor="curso-titulo">Título</label>
      <Input id="curso-titulo" name="titulo" required maxLength={191} defaultValue={inicial?.titulo} placeholder="Ej.: Primeros auxilios" {...errorDe('titulo')} />
      {mensaje('titulo')}
    </div>
    <div className="field">
      <label htmlFor="curso-descripcion">Descripción</label>
      <textarea id="curso-descripcion" name="descripcion" className="input textarea" required maxLength={191} defaultValue={inicial?.descripcion} {...errorDe('descripcion')} />
      {mensaje('descripcion')}
    </div>
    <div className="field">
      <label htmlFor="curso-desde">Fecha de inicio</label>
      <Input id="curso-desde" name="fechaDesde" type="date" required defaultValue={inicial?.fechaDesde.slice(0, 10)} />
    </div>
    <div className="field">
      <label htmlFor="curso-hasta">Fecha de fin</label>
      <Input id="curso-hasta" name="fechaHasta" type="date" required defaultValue={inicial?.fechaHasta.slice(0, 10)} {...errorDe('fechaHasta')} />
      {mensaje('fechaHasta')}
    </div>
    <div className="field">
      <label htmlFor="curso-horas">Horas <span className="muted">(opcional)</span></label>
      <Input id="curso-horas" name="horas" type="number" min={1} max={10000} step={1} inputMode="numeric" defaultValue={inicial?.horas ?? ''} {...errorDe('horas')} />
      {mensaje('horas')}
    </div>

    <fieldset className="reporte-paso" aria-describedby={errores.certificado ? 'error-certificado' : undefined}>
      <legend>Certificado que otorga</legend>
      <label className="casilla">
        <input type="checkbox" checked={otorga} onChange={e => setOtorga(e.target.checked)} />
        Al terminar, el curso otorga un certificado
      </label>
      {otorga && <>
        <p className="muted">Quien lo haya hecho solo sube el archivo: el nombre y la entidad se copian de acá, y la fecha de emisión es el fin del curso.</p>
        <div className="field">
          <label htmlFor="curso-cert-nombre">Nombre del certificado</label>
          <Input id="curso-cert-nombre" name="certificadoNombre" maxLength={191} defaultValue={inicial?.certificadoNombre ?? ''} placeholder="Ej.: Certificado de Primeros Auxilios" {...errorDe('certificado')} />
        </div>
        <div className="field">
          <label htmlFor="curso-cert-emisor">Entidad emisora del certificado</label>
          <Input id="curso-cert-emisor" name="certificadoEmisor" maxLength={191} defaultValue={inicial?.certificadoEmisor ?? ''} placeholder="Ej.: Cruz Roja Argentina" {...errorDe('certificado')} />
        </div>
        {inicial && <p className="muted">Cambiar estos datos no modifica los certificados que ya se cargaron.</p>}
      </>}
      {mensaje('certificado')}
    </fieldset>

    <DatosAdicionales catalogo={catalogo} estado={datos} error={mensaje('atributos')} />

    <div className="actions">
      <Button type="submit" disabled={enviando}>{enviando ? 'Guardando…' : inicial ? 'Guardar cambios' : 'Crear curso'}</Button>
      <Button type="button" className="button-secondary" disabled={enviando} onClick={() => router.push('/cursos')}>Cancelar</Button>
    </div>
  </form>;
}
