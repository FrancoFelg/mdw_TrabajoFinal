'use server';

import { UsuarioService } from '../../../services/usuario.service';
import { z } from 'zod';
import { getSession } from '@/lib/session';
import { falloFormulario, type ResultadoFormulario } from '@/lib/formulario';
import { revalidatePath } from 'next/cache';
import { PasswordSchema } from '@/lib/registro';

export async function registroAction(_state: unknown, data: FormData): Promise<ResultadoFormulario> {
  // Registro público: todos los visitantes pueden crear una cuenta de voluntario; el rol no llega del formulario.
  await getSession();
  const nombreUsuario = String(data.get('nombreUsuario') ?? '').trim();
  const email = String(data.get('email') ?? '').trim().toLowerCase();
  const nombre = String(data.get('nombre') ?? '').trim();
  const apellido = String(data.get('apellido') ?? '').trim();
  const password = String(data.get('password') ?? '');
  const fechaTexto = String(data.get('fechaNac') ?? '');
  const fechaNac = new Date(`${fechaTexto}T00:00:00.000Z`);
  const validacion = z.object({
    email: z.string().email('Ingresá un email válido.').max(191),
    nombreUsuario: z.string().min(1, 'Ingresá un usuario.').max(100),
    nombre: z.string().min(1, 'Ingresá tu nombre.').max(100),
    apellido: z.string().min(1, 'Ingresá tu apellido.').max(100),
    password: PasswordSchema,
    confirmarPassword: z.string(),
    fechaNac: z.string().refine(v => /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(fechaNac.getTime()) && fechaNac.toISOString().slice(0,10) === v && fechaNac <= new Date(), 'Ingresá una fecha válida, no futura.'),
  }).refine(v => v.password === v.confirmarPassword, { path: ['confirmarPassword'], message: 'Las contraseñas no coinciden.' }).safeParse({ email, nombreUsuario, nombre, apellido, password, confirmarPassword: data.get('confirmarPassword'), fechaNac: fechaTexto });
  if (!validacion.success) return falloFormulario(validacion.error);

  try {
    await new UsuarioService().registrarUsuario({ nombreUsuario, email, password, persona: { nombre, apellido, fechaNac } });
    revalidatePath('/usuarios');
    return { ok: true, error: '', campos: {} };
  } catch (error) {
    if (error instanceof Error && (error.message === 'NOMBRE_USUARIO_EXISTENTE' || ('code' in error && error.code === 'P2002'))) {
      return { ok: false, error: 'El nombre de usuario o email ya está registrado.', campos: {} };
    }
    return falloFormulario(error);
  }
}
