'use server';

import { randomUUID, createHash } from 'node:crypto';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/session';
import { db } from '@/lib/db';
import { falloFormulario, type ResultadoFormulario } from '@/lib/formulario';
import { editarUsuario } from '@/lib/usuarios-admin';
import { guardarFoto, tipoFoto, permisoFoto, verificarPermisoFoto } from '@/lib/fotos-emergencia';
import { MAX_FOTO } from '@/lib/reporte';
import { avisarEmergenciaNueva } from '@/lib/avisos';
import { SolicitudAscensoService } from '../../../services/solicitudAscenso.service';
import { CrearEmergenciaSchema, EmergenciaService } from '../../../services/emergencia.service';

const bien: ResultadoFormulario = { ok: true, error: '', campos: {} };
async function actor(coordinacion = false) {
  const usuario = await getSession();
  if (!usuario) throw new Error('SIN_SESION');
  if (!usuario.rol || !['VOLUNTARIO', 'COORDINADOR', 'ADMIN'].includes(usuario.rol) || coordinacion && usuario.rol === 'VOLUNTARIO') throw new Error('SIN_PERMISO');
  return usuario;
}

export async function guardarPerfilAction(id: string | null, datos: FormData): Promise<ResultadoFormulario> {
  try {
    const usuario = await actor(id !== null);
    const entrada = {
      nombreUsuario: datos.get('nombreUsuario'),
      ...(id === null ? { email: datos.get('email') } : { rol: datos.get('rol') }),
      persona: { nombre: datos.get('nombre'), apellido: datos.get('apellido'), fechaNac: datos.get('fechaNac'),
        telefonos: Array.from(datos.keys()).filter(nombre => /^telefonos\.\d+\.tipo$/.test(nombre)).map(nombre => ({ tipo: datos.get(nombre), numero: datos.get(nombre.replace(/\.tipo$/, '.numero')) })) },
    };
    await editarUsuario(id ?? usuario.id, entrada, id === null);
    revalidatePath('/', 'layout');
    return bien;
  } catch (error) { return falloFormulario(error); }
}

export async function ascensoAction(operacion: 'crear' | 'aprobar' | 'rechazar', id?: string): Promise<ResultadoFormulario> {
  const sesion = await getSession();
  try {
    const usuario = await actor(operacion !== 'crear');
    const servicio = new SolicitudAscensoService();
    if (operacion === 'crear') {
      if (usuario.rol !== 'VOLUNTARIO') throw new Error('SIN_PERMISO');
      await servicio.crear(usuario.id);
    } else {
      if (!id || !['aprobar', 'rechazar'].includes(operacion)) throw new Error('SIN_PERMISO');
      await servicio[operacion](id, usuario.id);
    }
    revalidatePath('/', 'layout');
    return bien;
  } catch (error) {
    const resultado = falloFormulario(error);
    // Igual que en la API, el intento fallido se avisa sin modificar el historial.
    if (sesion) {
      try {
        await db.notificacion.create({ data: { usuarioId: sesion.id, tipo: 'VALIDACION_PENDIENTE', clave: `ascenso:error:${randomUUID()}`, titulo: 'Operación de ascenso no completada', cuerpo: resultado.error, enlace: '/ascensos' } });
        revalidatePath('/notificaciones');
      } catch (avisoError) { console.error('No se pudo guardar el aviso de ascenso:', avisoError); }
    }
    return resultado;
  }
}

// H7 es pública: una persona sin cuenta también puede reportar y adjuntar su foto.
export async function reportarAction(clave: string, entrada: unknown) {
  await getSession(); // La sesión no limita este permiso público.
  const validacion = CrearEmergenciaSchema.safeParse(entrada);
  if (!validacion.success) return { ...falloFormulario(validacion.error), reporte: null };
  if (!z.string().uuid().safeParse(clave).success) return { ...falloFormulario(new Error()), reporte: null };
  const id = createHash('sha256').update(clave).digest('hex');
  try {
    let emergencia: { id: string; descripcion: string; prioridad: import('@prisma/client').Prioridad } | null = await db.emergencia.findUnique({ where: { id } });
    if (!emergencia) {
      try { emergencia = await new EmergenciaService().crear(validacion.data, id); avisarEmergenciaNueva(emergencia); }
      catch (error) { emergencia = await db.emergencia.findUnique({ where: { id } }); if (!emergencia) throw error; }
    }
    if (!emergencia) throw new Error('SIN_PERMISO');
    let permiso: string | null = null;
    try { permiso = permisoFoto(id); } catch { /* El reporte sigue disponible sin foto. */ }
    revalidatePath('/casos');
    return { ...bien, reporte: { id, prioridad: emergencia.prioridad, permisoFoto: permiso } };
  } catch (error) { return { ...falloFormulario(error), reporte: null }; }
}

export async function fotoReporteAction(id: string, permiso: string, datos: FormData): Promise<ResultadoFormulario> {
  await getSession(); // Permiso público limitado al comprobante firmado del reporte.
  try {
    if (!verificarPermisoFoto(id, permiso)) throw new Error('SIN_PERMISO');
    if (!await db.emergencia.findUnique({ where: { id } })) throw new Error('SIN_PERMISO');
    const foto = datos.get('foto');
    if (!(foto instanceof File) || !foto.size || foto.size > MAX_FOTO) return { ...bien, ok: false, campos: { foto: 'Elegí una foto de hasta 5 MB.' } };
    const bytes = new Uint8Array(await foto.arrayBuffer());
    if (!tipoFoto(bytes)) return { ...bien, ok: false, campos: { foto: 'Elegí una foto JPG, PNG o WebP válida.' } };
    await guardarFoto(id, bytes);
    await db.emergencia.update({ where: { id }, data: { imagen: `/api/emergencias/${id}/foto` } });
    revalidatePath(`/casos/${id}`);
    return bien;
  } catch (error) { return falloFormulario(error); }
}
