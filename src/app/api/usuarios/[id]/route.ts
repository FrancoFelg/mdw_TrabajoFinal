import { jsonPublico } from '@/lib/respuesta-publica';
import { NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { getUserFromRequest } from '@/lib/auth';
import { editarUsuario, puedeGestionarUsuarios } from '@/lib/usuarios-admin';
import { UsuarioService } from '../../../../../services/usuario.service';

async function operar(req: NextRequest, params: Promise<{ id: string }>, editar: boolean) {
  const actor = getUserFromRequest(req);
  if (!actor?.id) return jsonPublico({ error: 'Iniciá sesión.' }, { status: 401 });
  try {
    if (!await puedeGestionarUsuarios(actor.id)) return jsonPublico({ error: 'Solo coordinación puede gestionar usuarios.' }, { status: 403 });
    const { id } = await params;
    const usuario = editar ? await editarUsuario(id, await req.json()) : await new UsuarioService().obtenerPerfil(id);
    return jsonPublico(usuario, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) return jsonPublico({ error: 'Datos inválidos. Revisá los campos y la fecha.' }, { status: 400 });
    if (error instanceof Error && error.message === 'ADMIN_PROTEGIDO') return jsonPublico({ error: 'No se permite modificar administradores.' }, { status: 403 });
    if (error instanceof Error && error.message === 'USUARIO_NO_ENCONTRADO' || (error as { code?: string })?.code === 'P2025') return jsonPublico({ error: 'Usuario no encontrado.' }, { status: 404 });
    if ((error as { code?: string })?.code === 'P2002') return jsonPublico({ error: 'El nombre de usuario o email ya está registrado.' }, { status: 409 });
    console.error('Error gestionando usuario:', error);
    return jsonPublico({ error: 'No se pudo completar la operación.' }, { status: 500 });
  }
}
type Contexto = { params: Promise<{ id: string }> };
export async function GET(req: NextRequest, { params }: Contexto) { return operar(req, params, false); }
export async function PATCH(req: NextRequest, { params }: Contexto) { return operar(req, params, true); }
