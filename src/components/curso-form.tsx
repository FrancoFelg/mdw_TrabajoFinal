'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input } from './ui';
import { Formulario } from './formulario';
import { DatosAdicionales, useDatosAdicionales, type AtributoCatalogo } from './datos-adicionales';
import { guardarCursoAction } from '@/app/actions/formacion';
import type { CursoVista } from '@/lib/cursos-vista';

export function CursoForm({ catalogo, inicial }: { catalogo: AtributoCatalogo[]; inicial?: CursoVista }) {
  const router = useRouter();
  const datos = useDatosAdicionales(catalogo, inicial?.atributos);
  const [otorga, setOtorga] = useState(Boolean(inicial?.certificadoNombre));

  return <Formulario id="curso" action={formulario => guardarCursoAction(inicial?.id ?? null, formulario)}
    onSuccess={() => { router.push('/cursos'); router.refresh(); }}>
    <div className="field">
      <label htmlFor="curso-titulo">Título</label>
      <Input id="curso-titulo" name="titulo" required maxLength={191} defaultValue={inicial?.titulo} placeholder="Ej.: Primeros auxilios" />
    </div>
    <div className="field">
      <label htmlFor="curso-descripcion">Descripción</label>
      <textarea id="curso-descripcion" name="descripcion" className="input textarea" required maxLength={191} defaultValue={inicial?.descripcion} />
    </div>
    <div className="field">
      <label htmlFor="curso-desde">Fecha de inicio</label>
      <Input id="curso-desde" name="fechaDesde" type="date" required defaultValue={inicial?.fechaDesde.slice(0, 10)} />
    </div>
    <div className="field">
      <label htmlFor="curso-hasta">Fecha de fin</label>
      <Input id="curso-hasta" name="fechaHasta" type="date" required defaultValue={inicial?.fechaHasta.slice(0, 10)} />
    </div>
    <div className="field">
      <label htmlFor="curso-horas">Horas <span className="muted">(opcional)</span></label>
      <Input id="curso-horas" name="horas" type="number" min={1} max={10000} step={1} inputMode="numeric" defaultValue={inicial?.horas ?? ''} />
    </div>

    <fieldset className="reporte-paso">
      <legend>Certificado que otorga</legend>
      <input type="hidden" name="otorgaCertificado" value={otorga ? 'si' : 'no'} />
      <label className="casilla">
        <input type="checkbox" checked={otorga} onChange={e => setOtorga(e.target.checked)} />
        Al terminar, el curso otorga un certificado
      </label>
      {otorga && <div className="stack">
        <p className="muted">Quien lo haya hecho solo sube el archivo: el nombre y la entidad se copian de acá, y la fecha de emisión es el fin del curso.</p>
        <div className="field">
          <label htmlFor="curso-cert-nombre">Nombre del certificado</label>
          <Input id="curso-cert-nombre" name="certificadoNombre" maxLength={191} defaultValue={inicial?.certificadoNombre ?? ''} placeholder="Ej.: Certificado de Primeros Auxilios" />
        </div>
        <div className="field">
          <label htmlFor="curso-cert-emisor">Entidad emisora del certificado</label>
          <Input id="curso-cert-emisor" name="certificadoEmisor" maxLength={191} defaultValue={inicial?.certificadoEmisor ?? ''} placeholder="Ej.: Cruz Roja Argentina" />
        </div>
        {inicial && <p className="muted">Cambiar estos datos no modifica los certificados que ya se cargaron.</p>}
      </div>}
    </fieldset>

    {catalogo.length > 0 && <fieldset name="datosAdicionales" tabIndex={-1} className="reporte-paso">
      <legend>Datos adicionales <span className="opcional">Opcional</span></legend>
      <DatosAdicionales catalogo={catalogo} estado={datos} />
      <input type="hidden" name="atributos" value={JSON.stringify(datos.valores())} />
    </fieldset>}

    <div className="actions">
      <Button type="submit">{inicial ? 'Guardar cambios' : 'Crear curso'}</Button>
      <Button type="button" className="button-secondary" onClick={() => router.push('/cursos')}>Cancelar</Button>
    </div>
  </Formulario>;
}
