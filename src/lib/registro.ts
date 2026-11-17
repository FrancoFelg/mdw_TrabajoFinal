import { z } from 'zod';

// Reglas de registro compartidas por el formulario (Server Action) y POST /api/usuarios,
// para que ninguna de las dos entradas públicas quede con una validación más débil.
const FALTAN_CAMPOS = 'Faltan campos obligatorios para el registro.';

// bcrypt ignora todo lo que supera los 72 bytes.
export const PasswordSchema = z.string({ error: FALTAN_CAMPOS })
  .min(8, 'Usá al menos 8 caracteres.')
  .refine(v => Buffer.byteLength(v, 'utf8') <= 72, 'Máximo 72 bytes.');

const texto = (vacio: string) => z.string({ error: FALTAN_CAMPOS }).trim().min(1, vacio).max(100);

export const RegistroApiSchema = z.object({
  nombreUsuario: texto('Ingresá un usuario.'),
  email: z.string().trim().toLowerCase().email('Email inválido.').max(191).optional(),
  password: PasswordSchema,
  persona: z.object({
    nombre: texto('Ingresá el nombre.'),
    apellido: texto('Ingresá el apellido.'),
    fechaNac: z.string({ error: FALTAN_CAMPOS })
      .refine(v => Number.isFinite(Date.parse(v)) && Date.parse(v) <= Date.now(), 'Ingresá una fecha de nacimiento válida, no futura.')
      .transform(v => new Date(v)),
    telefonos: z.array(z.object({ tipo: texto('Ingresá el tipo de teléfono.'), numero: z.string().trim().min(1).max(50) })).max(10).optional(),
  }, { error: FALTAN_CAMPOS }),
});
