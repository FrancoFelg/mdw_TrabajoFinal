'use client';

import { useState, type FormEvent } from 'react';

type Certificado = { id: string; codigoVerificacion: string; estado: string; archivo?: string | null;
  motivoRechazo?: string | null; curso?: { titulo: string } | null; usuario?: { nombreUsuario: string } };
type Curso = { id: string; titulo: string };

export function Formacion({ coordinador, iniciales, cursos }: { coordinador: boolean; iniciales: Certificado[]; cursos: Curso[] }) {
  const [certificados, setCertificados] = useState<Certificado[]>(iniciales);
  const [mensaje, setMensaje] = useState('');
  const [ocupado, setOcupado] = useState(false);
  async function cargar() {
    const res = await fetch(coordinador ? '/api/solicitudes-certificados' : '/api/certificados');
    if (!res.ok) throw new Error('No se pudo cargar la formación. Reintentá.');
    setCertificados(await res.json());
  }

  async function subir(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setOcupado(true); setMensaje('');
    try {
      const response = await fetch('/api/certificados', { method: 'POST', body: new FormData(form) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      form.reset();
      await cargar();
      setMensaje('Certificado enviado a revisión.');
    } catch (error) { setMensaje(error instanceof Error ? error.message : 'No se pudo subir el certificado.'); }
    finally { setOcupado(false); }
  }

  async function resolver(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setOcupado(true); setMensaje('');
    try {
      const response = await fetch(`/api/solicitudes-certificados/${id}`, { method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: data.get('estado'), motivo: data.get('motivo') }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      await cargar(); setMensaje('Validación guardada.');
    } catch (error) { setMensaje(error instanceof Error ? error.message : 'No se pudo guardar la validación.'); }
    finally { setOcupado(false); }
  }

  return <div className="stack">
    <form id="cargar" onSubmit={subir} className="card stack">
      <h2>Cargar certificado</h2>
      <label>Código de verificación<input name="codigoVerificacion" required maxLength={191} /></label>
      <label>Curso (opcional)<select name="cursoId"><option value="">Certificado externo</option>
        {cursos.map(c => <option key={c.id} value={c.id}>{c.titulo}</option>)}
      </select></label>
      <label>Archivo del certificado<input name="archivo" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" required /></label>
      <p>PDF o imagen. Máximo 5 MB.</p><button disabled={ocupado} type="submit">Enviar certificado</button>
    </form>
    <p role="status">{mensaje}</p>
    <h2>{coordinador ? 'Solicitudes de validación' : 'Mis certificados'}</h2>
    {!certificados.length && <p>No hay certificados registrados.</p>}
    {certificados.map(c => <article className="card stack" key={c.id} aria-label={`Certificado ${c.codigoVerificacion}`}>
      <h3>{c.codigoVerificacion}</h3><p>{c.curso?.titulo ?? 'Certificado externo'} · {c.estado}</p>
      {coordinador && <p>Usuario: {c.usuario?.nombreUsuario}</p>}
      {c.archivo && <a href={c.archivo}>Descargar comprobante</a>}
      {c.motivoRechazo && <p>Motivo: {c.motivoRechazo}</p>}
      {coordinador && c.estado === 'PENDIENTE' && <form onSubmit={event => resolver(event, c.id)}>
        <label>Resultado<select name="estado"><option value="APROBADO">Aprobar</option><option value="RECHAZADO">Rechazar</option></select></label>
        <label>Motivo del rechazo<textarea name="motivo" maxLength={2000} /></label>
        <button disabled={ocupado} type="submit">Guardar validación</button>
      </form>}
    </article>)}
  </div>;
}
