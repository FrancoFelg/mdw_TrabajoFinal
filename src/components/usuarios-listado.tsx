'use client';

import { useState } from 'react';
import { Badge, Button, Card, Input } from './ui';
import { SinDatos } from './sin-datos';

type Usuario = { id: string; nombreUsuario: string; rol: string; nombre: string; apellido: string };
const roles: Record<string, string> = { ADMIN: 'Administrador', COORDINADOR: 'Coordinador', VOLUNTARIO: 'Voluntario' };

export function UsuariosListado({ usuarios }: { usuarios: Usuario[] }) {
  const [busqueda, setBusqueda] = useState('');
  const normalizar = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
  const resultados = usuarios.filter(u => normalizar(`${u.nombre} ${u.apellido} ${u.nombreUsuario} ${roles[u.rol]}`).includes(normalizar(busqueda.trim())));
  return <><Card><div className="field"><label htmlFor="buscar">Buscar por nombre, usuario o rol</label><Input id="buscar" type="search" placeholder="Buscar en la comunidad…" value={busqueda} onChange={e => setBusqueda(e.target.value)} /></div><p className="muted" role="status">{resultados.length} de {usuarios.length} usuarios</p></Card>
    {resultados.length ? <Card className="table-card"><div className="table-scroll" role="region" aria-label="Directorio de usuarios" tabIndex={0}><table><caption className="sr-only">Usuarios de la red de apoyo</caption><thead><tr><th scope="col">Persona</th><th scope="col">Usuario</th><th scope="col">Rol</th></tr></thead><tbody>{resultados.map(u => <tr key={u.id}><td><span className="avatar" aria-hidden="true">{u.nombre.charAt(0)}{u.apellido.charAt(0)}</span><strong>{u.nombre} {u.apellido}</strong></td><td>@{u.nombreUsuario}</td><td><Badge>{roles[u.rol] ?? u.rol}</Badge></td></tr>)}</tbody></table></div></Card> : <SinDatos titulo="Sin resultados"><p>No encontramos usuarios con “{busqueda}”. Probá con otro nombre.</p><Button className="button-secondary" onClick={() => setBusqueda('')}>Limpiar búsqueda</Button></SinDatos>}</>;
}
