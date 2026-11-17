'use client';

import { useState } from 'react';
import { Formulario } from './formulario';
import { subirCertificadoAction, resolverCertificadoAction } from '@/app/actions/formularios';

type Certificado = { id: string; codigoVerificacion: string; estado: string; archivo?: string | null;
  motivoRechazo?: string | null; curso?: { titulo: string } | null; usuario?: { nombreUsuario: string } };
type Curso = { id: string; titulo: string };

export function Formacion({ coordinador, iniciales, cursos }: { coordinador: boolean; iniciales: Certificado[]; cursos: Curso[] }) {
  const certificados = iniciales;
  const [mensaje, setMensaje] = useState('');
  return <div className="stack">
    <Formulario id="cargar" action={subirCertificadoAction} className="card stack" onSuccess={() => setMensaje('Certificado enviado a revisión.')}>
      <h2>Cargar certificado</h2>
      <label>Código de verificación<input name="codigoVerificacion" required maxLength={191} /></label>
      <label>Curso (opcional)<select name="cursoId"><option value="">Certificado externo</option>
        {cursos.map(c => <option key={c.id} value={c.id}>{c.titulo}</option>)}
      </select></label>
      <label>Archivo del certificado<input name="archivo" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" required /></label>
      <p>PDF o imagen. Máximo 5 MB.</p><button type="submit">Enviar certificado</button>
    </Formulario>
    <p role="status">{mensaje}</p>
    <h2>{coordinador ? 'Solicitudes de validación' : 'Mis certificados'}</h2>
    {!certificados.length && <p>No hay certificados registrados.</p>}
    {certificados.map(c => <article className="card stack" key={c.id} aria-label={`Certificado ${c.codigoVerificacion}`}>
      <h3>{c.codigoVerificacion}</h3><p>{c.curso?.titulo ?? 'Certificado externo'} · {c.estado}</p>
      {coordinador && <p>Usuario: {c.usuario?.nombreUsuario}</p>}
      {c.archivo && <a href={c.archivo}>Descargar comprobante</a>}
      {c.motivoRechazo && <p>Motivo: {c.motivoRechazo}</p>}
      {coordinador && c.estado === 'PENDIENTE' && <Formulario id={`validar-${c.id}`} action={datos => resolverCertificadoAction(c.id, datos)} onSuccess={() => setMensaje('Validación guardada.')}>
        <label>Resultado<select name="estado"><option value="APROBADO">Aprobar</option><option value="RECHAZADO">Rechazar</option></select></label>
        <label>Motivo del rechazo<textarea name="motivo" maxLength={2000} /></label>
        <button type="submit">Guardar validación</button>
      </Formulario>}
    </article>)}
  </div>;
}
