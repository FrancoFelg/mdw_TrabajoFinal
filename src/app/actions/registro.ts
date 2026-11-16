'use server';

import { UsuarioService } from '../../../services/usuario.service';
import { z } from 'zod';

export async function registroAction(_state: { error: string; success: boolean }, data: FormData) {
  const nombreUsuario = String(data.get('nombreUsuario') ?? '').trim();
  const email = String(data.get('email') ?? '').trim().toLowerCase();
  const nombre = String(data.get('nombre') ?? '').trim();
  const apellido = String(data.get('apellido') ?? '').trim();
  const password = String(data.get('password') ?? '');
  const fechaTexto = String(data.get('fechaNac') ?? '');
  const fechaNac = new Date(`${fechaTexto}T00:00:00.000Z`);
  const fail = (error: string) => ({ error, success: false });
  if (!z.string().email().max(191).safeParse(email).success) return fail('Ingresá un email válido.');

  if (!nombreUsuario || !nombre || !apellido) return fail('Completá nombre, apellido y nombre de usuario.');
  if ([nombreUsuario, nombre, apellido].some(value => value.length > 100)) return fail('Nombre, apellido y usuario admiten hasta 100 caracteres.');
  if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) return fail('La contraseña debe tener al menos 8 caracteres y no superar 72 bytes.');
  if (password !== data.get('confirmarPassword')) return fail('Las contraseñas no coinciden.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaTexto) || !Number.isFinite(fechaNac.getTime()) || fechaNac.toISOString().slice(0, 10) !== fechaTexto || fechaNac > new Date()) {
    return fail('Ingresá una fecha de nacimiento válida que no sea futura.');
  }

  try {
    await new UsuarioService().registrarUsuario({ nombreUsuario, email, password, persona: { nombre, apellido, fechaNac } });
    return { error: '', success: true };
  } catch (error) {
    if (error instanceof Error && (error.message === 'NOMBRE_USUARIO_EXISTENTE' || ('code' in error && error.code === 'P2002'))) {
      return fail('El nombre de usuario o email ya está registrado.');
    }
    return fail('No pudimos crear la cuenta. Intentá nuevamente en unos momentos.');
  }
}
