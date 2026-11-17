'use client';

import { useState } from 'react';
import { Formulario } from './formulario';
import { guardarPerfilAction } from '@/app/actions/formularios';
import { Button, Card, Input } from './ui';

type Perfil = { id: string; nombreUsuario: string; email?: string | null; rol: string; persona: { nombre: string; apellido: string; fechaNac: string; telefonos: { tipo: string; numero: string }[] } };

export function UsuarioPerfil({ usuario, propia = false }: { usuario: Perfil; propia?: boolean }) {

  const [editando, setEditando] = useState(false);

  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState(false);
  const [telefonos, setTelefonos] = useState(usuario.persona.telefonos);
  return <Card><h1>Perfil de {usuario.persona.nombre} {usuario.persona.apellido}</h1>
    {mensaje && <p role={error ? 'alert' : 'status'}>{mensaje}</p>}
    {!editando ? <><dl><dt>Usuario</dt><dd>{usuario.nombreUsuario}</dd><dt>Rol</dt><dd>{usuario.rol}</dd><dt>Nacimiento</dt><dd>{usuario.persona.fechaNac}</dd><dt>Teléfonos</dt><dd>{usuario.persona.telefonos.map(t => `${t.tipo}: ${t.numero}`).join(' · ') || 'Sin teléfonos'}</dd></dl>{(propia || usuario.rol !== 'ADMIN') && <Button onClick={() => { setTelefonos(usuario.persona.telefonos); setEditando(true); }}>Editar usuario</Button>}</>
      : <Formulario id="perfil" action={datos => guardarPerfilAction(propia ? null : usuario.id, datos)} onSuccess={() => { setError(false); setMensaje('Usuario actualizado.'); setEditando(false); }}>
        <div className="field"><label htmlFor="email">Email</label><Input id="email" name="email" type="email" required maxLength={191} defaultValue={usuario.email ?? ''} /></div>
        {(['nombreUsuario', 'nombre', 'apellido'] as const).map(campo => <div className="field" key={campo}><label htmlFor={campo}>{campo === 'nombreUsuario' ? 'Usuario' : campo === 'nombre' ? 'Nombre' : 'Apellido'}</label><Input id={campo} name={campo} required maxLength={100} defaultValue={campo === 'nombreUsuario' ? usuario.nombreUsuario : usuario.persona[campo]} /></div>)}
        <div className="field"><label htmlFor="fechaNac">Fecha de nacimiento</label><Input id="fechaNac" name="fechaNac" type="date" required defaultValue={usuario.persona.fechaNac} /></div>
        {!propia && <div className="field"><label htmlFor="rol">Rol</label><select className="input" id="rol" name="rol" defaultValue={usuario.rol}><option value="VOLUNTARIO">Voluntario</option><option value="COORDINADOR">Coordinador</option></select></div>}
        {telefonos.map((telefono, indice) => <div className="stack" key={indice}><label>Tipo de teléfono {indice + 1}<Input id={`telefono-tipo-${indice}`} name={`telefonos.${indice}.tipo`} required maxLength={100} value={telefono.tipo} onChange={e => setTelefonos(telefonos.map((t, i) => i === indice ? { ...t, tipo: e.target.value } : t))} /></label><label>Número {indice + 1}<Input id={`telefono-numero-${indice}`} name={`telefonos.${indice}.numero`} type="tel" required maxLength={50} value={telefono.numero} onChange={e => setTelefonos(telefonos.map((t, i) => i === indice ? { ...t, numero: e.target.value } : t))} /></label><Button type="button" className="button-secondary" onClick={() => setTelefonos(telefonos.filter((_, i) => i !== indice))}>Quitar teléfono {indice + 1}</Button></div>)}
        <Button type="button" className="button-secondary" disabled={telefonos.length >= 10} onClick={() => setTelefonos([...telefonos, { tipo: '', numero: '' }])}>Agregar teléfono</Button>
        <Button type="submit">Guardar cambios</Button><Button type="button" className="button-secondary" onClick={() => setEditando(false)}>Cancelar</Button>
      </Formulario>}
  </Card>;
}
