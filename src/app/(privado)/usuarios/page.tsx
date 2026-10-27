import { UsuarioService } from '../../../../services/usuario.service';
import { requireSession } from '@/lib/session';
import { SinDatos } from '@/components/sin-datos';
import { UsuariosListado } from '@/components/usuarios-listado';

export const metadata = { title: 'Usuarios | Red de Apoyo' };

export default async function Usuarios() {
  const usuario = await requireSession();
  if (usuario.rol !== 'ADMIN' && usuario.rol !== 'COORDINADOR') return <SinDatos titulo="Acceso restringido"><p>El directorio está disponible para coordinadores y administradores.</p></SinDatos>;
  const usuarios = await new UsuarioService().listarUsuarios();
  return <section className="stack"><header><p className="eyebrow">Nuestra comunidad</p><h1>Usuarios</h1><p className="lead">Personas que forman parte de la red de apoyo.</p></header>{usuarios.length ? <UsuariosListado usuarios={usuarios.map(({ id, nombreUsuario, rol, persona }) => ({ id, nombreUsuario, rol, nombre: persona.nombre, apellido: persona.apellido }))} /> : <SinDatos titulo="Todavía no hay usuarios"><p>Las cuentas registradas aparecerán en este directorio.</p></SinDatos>}</section>;
}
