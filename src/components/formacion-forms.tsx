'use client';

import { startTransition, useActionState, useEffect, useRef } from 'react';
import { Check, CircleAlert, FileUp, LoaderCircle, Plus } from 'lucide-react';
import { cargarCertificadoAction, crearCursoAction, type Resultado } from '@/app/actions/formacion';
import { Alert } from './ui';

const inicial: Resultado = { ok: false, error: '' };

// Tras guardar, limpia el formulario; tras un error con campo, marca ese control y lo enfoca.
function useRespuesta(estado: Resultado) {
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (estado.ok) form.current?.reset();
    if (!estado.ok && estado.campo) form.current?.querySelector<HTMLElement>(`[name="${estado.campo}"]`)?.focus();
  }, [estado]);
  return form;
}

function ErrorCampo({ estado, campo, id }: { estado: Resultado; campo: string; id: string }) {
  if (estado.ok || estado.campo !== campo) return null;
  return <p id={id} className="error-campo"><CircleAlert aria-hidden="true" size={16} />{estado.error}</p>;
}

const invalido = (estado: Resultado, campo: string) => !estado.ok && estado.campo === campo;

// Se envía a mano para que React no vacíe el formulario cuando hay un error: lo escrito se conserva.
const enviarCon = (accion: (datos: FormData) => void) => (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const datos = new FormData(e.currentTarget);
  startTransition(() => accion(datos));
};

export function CargarCertificado({ cursos, abierto }: { cursos: { id: string; titulo: string }[]; abierto: boolean }) {
  const [estado, accion, pendiente] = useActionState(cargarCertificadoAction, inicial);
  const form = useRespuesta(estado);
  return <details className="desplegable" id="cargar" open={abierto || undefined}>
    <summary><Plus aria-hidden="true" size={18} />Cargar un certificado</summary>
    <form ref={form} onSubmit={enviarCon(accion)} className="stack" aria-busy={pendiente} noValidate>
      <div className="field">
        <label htmlFor="archivo">Certificado (foto o PDF)</label>
        <div className="archivo-campo">
          <FileUp aria-hidden="true" size={20} />
          <input id="archivo" name="archivo" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="input input-archivo" aria-invalid={invalido(estado, 'archivo')} aria-describedby={invalido(estado, 'archivo') ? 'archivo-error archivo-ayuda' : 'archivo-ayuda'} />
        </div>
        <ErrorCampo estado={estado} campo="archivo" id="archivo-error" />
        <p id="archivo-ayuda" className="muted">Hasta 5 MB. Coordinación lo mira para validarlo; lo ven solo vos y coordinación.</p>
      </div>
      <div className="field">
        <label htmlFor="cursoId">Curso</label>
        <select id="cursoId" name="cursoId" className="input" defaultValue="externo">
          {cursos.map(c => <option key={c.id} value={c.id}>{c.titulo}</option>)}
          <option value="externo">Ninguno de la lista (capacitación externa)</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="codigo">Código de verificación</label>
        <input id="codigo" name="codigo" className="input" required minLength={3} maxLength={100} autoComplete="off" aria-invalid={invalido(estado, 'codigo')} aria-describedby={invalido(estado, 'codigo') ? 'codigo-error codigo-ayuda' : 'codigo-ayuda'} />
        <ErrorCampo estado={estado} campo="codigo" id="codigo-error" />
        <p id="codigo-ayuda" className="muted">Figura en el certificado.</p>
      </div>
      {!estado.ok && estado.error && !estado.campo && <Alert>{estado.error}</Alert>}
      {estado.ok && <p className="exito" role="status"><Check aria-hidden="true" size={18} />{estado.mensaje}</p>}
      <button className="button" disabled={pendiente}>{pendiente ? <><LoaderCircle aria-hidden="true" className="girar" size={18} />Cargando…</> : 'Cargar certificado'}</button>
    </form>
  </details>;
}

export function CrearCurso() {
  const [estado, accion, pendiente] = useActionState(crearCursoAction, inicial);
  const form = useRespuesta(estado);
  const props = (campo: string) => ({ name: campo, 'aria-invalid': invalido(estado, campo), 'aria-describedby': invalido(estado, campo) ? `${campo}-error` : undefined });
  return <details className="desplegable">
    <summary><Plus aria-hidden="true" size={18} />Crear un curso</summary>
    <form ref={form} onSubmit={enviarCon(accion)} className="stack" aria-busy={pendiente} noValidate>
      <div className="field"><label htmlFor="titulo">Título</label><input id="titulo" className="input" maxLength={200} {...props('titulo')} /><ErrorCampo estado={estado} campo="titulo" id="titulo-error" /></div>
      <div className="field"><label htmlFor="descripcion-curso">Descripción</label><textarea id="descripcion-curso" className="input textarea" rows={3} maxLength={2000} {...props('descripcion')} /><ErrorCampo estado={estado} campo="descripcion" id="descripcion-error" /></div>
      <div className="fila-campos">
        <div className="field"><label htmlFor="fechaDesde">Empieza</label><input id="fechaDesde" type="date" className="input" {...props('fechaDesde')} /><ErrorCampo estado={estado} campo="fechaDesde" id="fechaDesde-error" /></div>
        <div className="field"><label htmlFor="fechaHasta">Termina</label><input id="fechaHasta" type="date" className="input" {...props('fechaHasta')} /><ErrorCampo estado={estado} campo="fechaHasta" id="fechaHasta-error" /></div>
      </div>
      {!estado.ok && estado.error && !estado.campo && <Alert>{estado.error}</Alert>}
      {estado.ok && <p className="exito" role="status"><Check aria-hidden="true" size={18} />{estado.mensaje}</p>}
      <button className="button" disabled={pendiente}>{pendiente ? 'Creando…' : 'Crear curso'}</button>
    </form>
  </details>;
}
