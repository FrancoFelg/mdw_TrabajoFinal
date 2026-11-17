'use client';

import { Children, cloneElement, isValidElement, Fragment, useRef, useState, type ReactNode, type ReactElement, type FormEvent } from 'react';
import { type ResultadoFormulario, formularioInicial } from '@/lib/formulario';

// Se envía sin reset automático: también se conservan contraseñas y archivos ante un error.
export function Formulario({ children, action, onSuccess, className = 'stack', id }: {
  children: ReactNode; action: (datos: FormData) => Promise<ResultadoFormulario>;
  onSuccess?: () => void; className?: string; id?: string;
}) {
  const [resultado, setResultado] = useState(formularioInicial);
  const [ocupado, setOcupado] = useState(false);
  const bloqueo = useRef(false);
  const formulario = useRef<HTMLFormElement>(null);
  function decorar(nodos: ReactNode, dentroLabel = false): ReactNode {
    return Children.map(nodos, nodo => {
      if (!isValidElement(nodo)) return nodo;
      const elemento = nodo as ReactElement<Record<string, unknown>>;
      const props = elemento.props;
      const nombre = String(props.name ?? '');
      const campo = nombre && props.type !== 'hidden';
      const error = campo ? resultado.campos[nombre] : undefined;
      const errorId = `${id ?? 'form'}-${String(props.id ?? nombre)}-error`;
      const cambio: Record<string, unknown> = {};
      if (props.children) cambio.children = decorar(props.children as ReactNode, elemento.type === 'label' || dentroLabel);
      if (campo) {
        cambio['aria-invalid'] = !!error || !!props['aria-invalid'];
        cambio['aria-describedby'] = [props['aria-describedby'], error ? errorId : ''].filter(Boolean).join(' ') || undefined;
      }
      const tipo = elemento.type;
      if (tipo === 'button' || typeof tipo !== 'string' && (tipo as { name?: string }).name === 'Button') cambio.disabled = ocupado || !!props.disabled;
      const erroresLabel = elemento.type === 'label' ? Children.toArray(props.children as ReactNode).filter(isValidElement).map(hijo => {
        const campoHijo = (hijo as ReactElement<Record<string, unknown>>).props;
        const nombreHijo = String(campoHijo.name ?? '');
        const mensaje = resultado.campos[nombreHijo];
        return mensaje ? <p key={nombreHijo} id={`${id ?? 'form'}-${String(campoHijo.id ?? nombreHijo)}-error`} className="error-campo" role="alert">{mensaje}</p> : null;
      }) : null;
      return <Fragment>{cloneElement(elemento, cambio)}{error && !dentroLabel && <p id={errorId} className="error-campo" role="alert">{error}</p>}{erroresLabel}</Fragment>;
    });
  }
  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (bloqueo.current) return;
    const form = event.currentTarget;
    const campos: Record<string, string> = {};
    for (const elemento of Array.from(form.elements)) {
      if (elemento instanceof HTMLInputElement || elemento instanceof HTMLSelectElement || elemento instanceof HTMLTextAreaElement) {
        if (!elemento.validity.valid && elemento.name) {
          campos[elemento.name] = elemento.validity.valueMissing ? 'Completá este campo.'
            : elemento.validity.typeMismatch ? 'Ingresá un valor válido.'
            : elemento.validity.tooShort ? `Ingresá al menos ${elemento instanceof HTMLSelectElement ? 1 : elemento.minLength} caracteres.`
            : elemento.validationMessage;
        }
      }
    }
    if (Object.keys(campos).length) {
      setResultado({ ok: false, error: '', campos });
      (form.elements.namedItem(Object.keys(campos)[0]) as HTMLElement)?.focus?.();
      return;
    }
    bloqueo.current = true; setOcupado(true); setResultado(formularioInicial);
    try {
      const respuesta = await action(new FormData(form));
      if (!respuesta) return; // Una acción de login puede navegar antes de devolver estado.
      setResultado(respuesta);
      if (respuesta.ok) onSuccess?.();
      else requestAnimationFrame(() => {
        const nombre = Object.keys(respuesta.campos)[0];
        if (nombre) (form.elements.namedItem(nombre) as HTMLElement)?.focus?.();
        else formulario.current?.querySelector<HTMLElement>('.form-error')?.focus();
      });
    } catch { setResultado({ ok: false, campos: {}, error: 'No se pudo confirmar el cambio. Revisá tu conexión y reintentá.' }); }
    finally { bloqueo.current = false; setOcupado(false); }
  }
  return <form ref={formulario} id={id} className={className} onSubmit={enviar} noValidate aria-busy={ocupado}>
    {resultado.error && <div className="alert form-error" role="alert" tabIndex={-1}>{resultado.error}</div>}
    <fieldset className="form-campos stack" disabled={ocupado}>{decorar(children)}</fieldset>
    {ocupado && <p aria-live="polite">Guardando…</p>}
  </form>;
}
