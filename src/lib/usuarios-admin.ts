import { z } from 'zod';
import { db } from '../../config/database';

const texto = z.string().trim().min(1).max(100);
const camposUsuario = z.object({
  nombreUsuario: texto.optional(),
  rol: z.enum(['VOLUNTARIO', 'COORDINADOR']).optional(),
  persona: z.object({
    nombre: texto.optional(), apellido: texto.optional(),
    fechaNac: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(valor => {
      const fecha = new Date(`${valor}T00:00:00.000Z`);
      return Number.isFinite(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor && fecha <= new Date();
    }, 'Fecha de nacimiento inválida').optional(),
    telefonos: z.array(z.object({ tipo: texto, numero: z.string().trim().min(1).max(50) }).strict()).max(10).optional(),
  }).strict().optional(),
}).strict();
export const editarUsuarioSchema = camposUsuario.refine(datos => Object.keys(datos).length > 0, 'Indicá los cambios');
export const editarCuentaSchema = camposUsuario.omit({ rol: true }).strict().refine(datos => Object.keys(datos).length > 0, 'Indicá los cambios');

export async function puedeGestionarUsuarios(id: string) {
  const usuario = await db.usuario.findUnique({ where: { id }, select: { rol: true } });
  return usuario?.rol === 'COORDINADOR' || usuario?.rol === 'ADMIN';
}

export async function editarUsuario(id: string, entrada: unknown, propia = false) {
  const datos = propia ? editarCuentaSchema.parse(entrada) : editarUsuarioSchema.parse(entrada);
  const destino = await db.usuario.findUnique({ where: { id }, select: { rol: true } });
  if (!destino) throw new Error('USUARIO_NO_ENCONTRADO');
  if (!propia && destino.rol === 'ADMIN') throw new Error('ADMIN_PROTEGIDO');
  const { persona, ...cuenta } = datos;
  const resultado = await db.usuario.update({ where: { id }, data: {
    ...cuenta,
    ...(persona && { persona: { update: {
      nombre: persona.nombre, apellido: persona.apellido,
      fechaNac: persona.fechaNac ? new Date(`${persona.fechaNac}T00:00:00.000Z`) : undefined,
      ...(persona.telefonos && { telefonos: { deleteMany: {}, create: persona.telefonos } }),
    } } }),
  }, include: { persona: { include: { telefonos: true } } } });
  const { password: _password, ...publico } = resultado;
  return publico;
}
