'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Input } from './ui';

type Perfil = { id: string; nombreUsuario: string; rol: string; persona: { nombre: string; apellido: string; fechaNac: string; telefonos: { tipo: string; numero: string }[] } };

export function UsuarioPerfil({ usuario }: { usuario: Perfil }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState(false);
  const [telefonos, setTelefonos] = useState(usuario.persona.telefonos);
  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (ocupado) return;
    const datos = new FormData(event.currentTarget);
    setOcupado(true); setMensaje('');
    try {
      const respuesta = await fetch(`/api/usuarios/${usuario.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        nombreUsuario: datos.get('nombreUsuario'), rol: datos.get('rol'),
        persona: { nombre: datos.get('nombre'), apellido: datos.get('apellido'), fechaNac: datos.get('fechaNac'), telefonos },
      }) });
      const resultado = await respuesta.json();
      if (!respuesta.ok) throw new Error(resultado.error);
      setError(false); setMensaje('Usuario actualizado.'); setEditando(false); router.refresh();
    } catch (fallo) { setError(true); setMensaje(fallo instanceof TypeError ? 'No se pudo confirmar el cambio. Recargá el perfil antes de reintentar.' : fallo instanceof Error ? fallo.message : 'No se pudo guardar.'); }
    finally { setOcupado(false); }
  }
  return <Card><h1>Perfil de {usuario.persona.nombre} {usuario.persona.apellido}</h1>
    {mensaje && <p role={error ? 'alert' : 'status'}>{mensaje}</p>}
    {!editando ? <><dl><dt>Usuario</dt><dd>{usuario.nombreUsuario}</dd><dt>Rol</dt><dd>{usuario.rol}</dd><dt>Nacimiento</dt><dd>{usuario.persona.fechaNac}</dd><dt>Teléfonos</dt><dd>{usuario.persona.telefonos.map(t => `${t.tipo}: ${t.numero}`).join(' · ') || 'Sin teléfonos'}</dd></dl>{usuario.rol !== 'ADMIN' && <Button onClick={() => { setTelefonos(usuario.persona.telefonos); setEditando(true); }}>Editar usuario</Button>}</>
      : <form onSubmit={guardar} className="stack"><fieldset disabled={ocupado} className="stack">
        {(['nombreUsuario', 'nombre', 'apellido'] as const).map(campo => <div className="field" key={campo}><label htmlFor={campo}>{campo === 'nombreUsuario' ? 'Usuario' : campo === 'nombre' ? 'Nombre' : 'Apellido'}</label><Input id={campo} name={campo} required maxLength={100} defaultValue={campo === 'nombreUsuario' ? usuario.nombreUsuario : usuario.persona[campo]} /></div>)}
        <div className="field"><label htmlFor="fechaNac">Fecha de nacimiento</label><Input id="fechaNac" name="fechaNac" type="date" required defaultValue={usuario.persona.fechaNac} /></div>
        <div className="field"><label htmlFor="rol">Rol</label><select className="input" id="rol" name="rol" defaultValue={usuario.rol}><option value="VOLUNTARIO">Voluntario</option><option value="COORDINADOR">Coordinador</option></select></div>
        {telefonos.map((telefono, indice) => <div className="stack" key={indice}><label>Tipo de teléfono {indice + 1}<Input required maxLength={100} value={telefono.tipo} onChange={e => setTelefonos(telefonos.map((t, i) => i === indice ? { ...t, tipo: e.target.value } : t))} /></label><label>Número {indice + 1}<Input type="tel" required maxLength={50} value={telefono.numero} onChange={e => setTelefonos(telefonos.map((t, i) => i === indice ? { ...t, numero: e.target.value } : t))} /></label><Button type="button" className="button-secondary" onClick={() => setTelefonos(telefonos.filter((_, i) => i !== indice))}>Quitar teléfono {indice + 1}</Button></div>)}
        <Button type="button" className="button-secondary" disabled={telefonos.length >= 10} onClick={() => setTelefonos([...telefonos, { tipo: '', numero: '' }])}>Agregar teléfono</Button>
        <Button type="submit">{ocupado ? 'Guardando…' : 'Guardar cambios'}</Button><Button type="button" className="button-secondary" onClick={() => setEditando(false)}>Cancelar</Button>
      </fieldset></form>}
  </Card>;
}
