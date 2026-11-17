'use client';

import { useRouter } from 'next/navigation';
import { Button, Input } from './ui';
import { Formulario } from './formulario';
import { DatosAdicionales, useDatosAdicionales, type AtributoCatalogo } from './datos-adicionales';
import { guardarCertificadoAction } from '@/app/actions/formacion';
import { fechaLegible, type CertificadoVista } from '@/lib/certificados-vista';

// Certificado de un curso: estos datos salen del curso y no se cargan a mano.
export type DatosDelCurso = { id: string; titulo: string; nombre: string; entidadEmisora: string; fechaEmision: string };

const MAX_ARCHIVO = 5 * 1024 * 1024;
const TIPOS = 'application/pdf,image/jpeg,image/png,image/webp';
const hoyAR = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());

export function CertificadoForm({ modo, catalogo, inicial, curso }: { modo: 'crear' | 'editar'; catalogo: AtributoCatalogo[]; inicial?: CertificadoVista; curso?: DatosDelCurso }) {
  const router = useRouter();
  const datos = useDatosAdicionales(catalogo, inicial?.atributos);
  const delCurso = curso ?? (inicial?.curso
    ? { titulo: inicial.curso, nombre: inicial.nombre, entidadEmisora: inicial.entidadEmisora, fechaEmision: inicial.fechaEmision }
    : null);

  // Un archivo de más de 5 MB se marca antes de enviarlo: Formulario lo muestra como error del campo.
  const revisarTamano = (input: HTMLInputElement) =>
    input.setCustomValidity((input.files?.[0]?.size ?? 0) > MAX_ARCHIVO ? 'El archivo debe pesar hasta 5 MB.' : '');

  return <Formulario id="certificado" action={formulario => guardarCertificadoAction(inicial?.id ?? null, formulario)}
    onSuccess={() => { router.push('/certificados'); router.refresh(); }}>
    {delCurso
      ? <dl className="datos" aria-label="Datos que salen del curso">
        <div><dt>Curso</dt><dd>{delCurso.titulo}</dd></div>
        <div><dt>Certificado</dt><dd>{delCurso.nombre}</dd></div>
        <div><dt>Entidad emisora</dt><dd>{delCurso.entidadEmisora}</dd></div>
        <div><dt>Fecha de emisión</dt><dd>{fechaLegible(delCurso.fechaEmision)}</dd></div>
      </dl>
      : <div className="stack">
        <div className="field">
          <label htmlFor="cert-nombre">Nombre del certificado</label>
          <Input id="cert-nombre" name="nombre" required maxLength={191} defaultValue={inicial?.nombre} placeholder="Ej.: Primeros auxilios" />
        </div>
        <div className="field">
          <label htmlFor="cert-emisor">Entidad emisora</label>
          <Input id="cert-emisor" name="entidadEmisora" required maxLength={191} defaultValue={inicial?.entidadEmisora} placeholder="Ej.: Cruz Roja Argentina" />
        </div>
        <div className="field">
          <label htmlFor="cert-fecha">Fecha de emisión</label>
          <Input id="cert-fecha" name="fechaEmision" type="date" required max={hoyAR()} defaultValue={inicial?.fechaEmision.slice(0, 10)} />
        </div>
      </div>}
    {curso && <input type="hidden" name="cursoId" value={curso.id} />}
    <div className="field">
      <label htmlFor="cert-numero">Número de certificado <span className="muted">(opcional)</span></label>
      <Input id="cert-numero" name="codigoVerificacion" maxLength={191} defaultValue={inicial?.codigoVerificacion ?? ''} />
    </div>
    <div className="field">
      <label htmlFor="cert-archivo">{modo === 'crear' ? 'Archivo' : <>Reemplazar archivo <span className="muted">(opcional)</span></>}</label>
      <input id="cert-archivo" name="archivo" type="file" accept={TIPOS} required={modo === 'crear'} className="input" aria-describedby="ayuda-archivo"
        onChange={e => revisarTamano(e.currentTarget)} />
      <p id="ayuda-archivo" className="muted">PDF, JPG, PNG o WebP de hasta 5 MB.{inicial && ` Archivo actual: ${inicial.archivoNombre}.`}</p>
    </div>

    {catalogo.length > 0 && <fieldset name="datosAdicionales" tabIndex={-1} className="reporte-paso">
      <legend>Datos adicionales <span className="opcional">Opcional</span></legend>
      <DatosAdicionales catalogo={catalogo} estado={datos} />
      <input type="hidden" name="atributos" value={JSON.stringify(datos.valores())} />
    </fieldset>}

    <div className="actions">
      <Button type="submit">{modo === 'crear' ? 'Cargar certificado' : 'Guardar cambios'}</Button>
      <Button type="button" className="button-secondary" onClick={() => router.push(curso ? '/cursos' : '/certificados')}>Cancelar</Button>
    </div>
  </Formulario>;
}
