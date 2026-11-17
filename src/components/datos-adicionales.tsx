'use client';

import { useRef, useState, type ReactNode } from 'react';
import { Plus, X } from 'lucide-react';
import { Button, Input } from './ui';

// Datos adicionales (EAV) de cursos y certificados: filas «dato del catálogo + valor» con un control según el tipo.

export type AtributoCatalogo = { id: string; nombre: string; tipo: string };
type Fila = { clave: number; campoId: string; dato: string };

export function useDatosAdicionales(catalogo: AtributoCatalogo[], iniciales: { campoId: string; dato: string }[] = []) {
  const [filas, setFilas] = useState<Fila[]>(() => iniciales.map((a, i) => ({ clave: i, campoId: a.campoId, dato: a.dato })));
  // Claves estables para las filas nuevas; arranca después de las precargadas.
  const siguiente = useRef(iniciales.length);
  const tipoDe = (campoId: string) => catalogo.find(a => a.id === campoId)?.tipo ?? 'TEXTO';
  return {
    filas,
    setFilas,
    agregar: () => setFilas(fs => [...fs, { clave: siguiente.current++, campoId: '', dato: '' }]),
    tipoDe,
    incompletas: () => filas.some(f => !f.campoId || (tipoDe(f.campoId) !== 'BOOLEANO' && !f.dato.trim())),
    valores: () => filas.map(f => ({ campoId: f.campoId, dato: tipoDe(f.campoId) === 'BOOLEANO' ? (f.dato === 'true' ? 'true' : 'false') : f.dato })),
  };
}

export function DatosAdicionales({ catalogo, estado, error }: { catalogo: AtributoCatalogo[]; estado: ReturnType<typeof useDatosAdicionales>; error?: ReactNode }) {
  const { filas, setFilas, agregar, tipoDe } = estado;
  if (!catalogo.length) return null;
  const cambiar = (clave: number, cambio: Partial<Fila>) => setFilas(fs => fs.map(f => f.clave === clave ? { ...f, ...cambio } : f));

  return <fieldset className="reporte-paso" aria-describedby={error ? 'error-atributos' : undefined}>
    <legend>Datos adicionales <span className="opcional">Opcional</span></legend>
    {filas.map((f, i) => {
      const tipo = tipoDe(f.campoId);
      const usados = new Set(filas.filter(o => o.clave !== f.clave).map(o => o.campoId));
      return <div key={f.clave} className="atributo-fila">
        <div className="field">
          <label htmlFor={`attr-campo-${f.clave}`}>Dato {i + 1}</label>
          <select id={`attr-campo-${f.clave}`} className="input" value={f.campoId} onChange={e => cambiar(f.clave, { campoId: e.target.value, dato: '' })}>
            <option value="">Elegí un dato</option>
            {catalogo.filter(a => !usados.has(a.id)).map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`attr-valor-${f.clave}`}>Valor</label>
          {tipo === 'BOOLEANO'
            ? <input id={`attr-valor-${f.clave}`} type="checkbox" checked={f.dato === 'true'} disabled={!f.campoId} onChange={e => cambiar(f.clave, { dato: e.target.checked ? 'true' : 'false' })} />
            : <Input id={`attr-valor-${f.clave}`} type={tipo === 'NUMERO' ? 'number' : tipo === 'FECHA' ? 'date' : 'text'} step={tipo === 'NUMERO' ? 'any' : undefined} value={f.dato} disabled={!f.campoId} onChange={e => cambiar(f.clave, { dato: e.target.value })} />}
        </div>
        <Button type="button" className="button-chico button-secondary" onClick={() => setFilas(fs => fs.filter(o => o.clave !== f.clave))}>
          <X aria-hidden="true" size={18} />Quitar<span className="sr-only"> dato {i + 1}</span>
        </Button>
      </div>;
    })}
    {filas.length < catalogo.length && <div><Button type="button" className="button-chico button-secondary" onClick={agregar}><Plus aria-hidden="true" size={18} />Agregar dato</Button></div>}
    {error}
  </fieldset>;
}
