import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

// ---------------------------------------------------------------------------
// Errores de negocio: los services lanzan `new Error('CODIGO')` y acá se
// traduce cada código a un status HTTP + mensaje para el cliente.
// ---------------------------------------------------------------------------
const ERRORES_NEGOCIO: Record<string, { status: number; mensaje: string }> = {
  // 400 Bad Request: el cliente mandó datos inválidos
  BODY_INVALIDO: { status: 400, mensaje: 'El cuerpo de la petición debe ser un JSON válido.' },
  CAMPOS_OBLIGATORIOS_FALTANTES: {
    status: 400,
    mensaje: 'Faltan campos obligatorios: titulo, descripcion, fechaDesde o fechaHasta.',
  },
  TITULO_VACIO: { status: 400, mensaje: 'El título no puede estar vacío.' },
  DESCRIPCION_VACIA: { status: 400, mensaje: 'La descripción no puede estar vacía.' },
  FECHA_INVALIDA: { status: 400, mensaje: 'fechaDesde o fechaHasta no tienen un formato de fecha válido.' },
  FECHA_ATRIBUTO_INVALIDA: { status: 400, mensaje: 'La fechaHasta de un atributo no es válida.' },
  RANGO_FECHAS_INVALIDO: { status: 400, mensaje: 'fechaHasta no puede ser anterior a fechaDesde.' },
  ATRIBUTOS_DEBE_SER_LISTA: { status: 400, mensaje: 'El campo atributos debe ser una lista.' },
  ATRIBUTO_INCOMPLETO_CAMPO_Y_DATO_REQUERIDOS: {
    status: 400,
    mensaje: 'Cada atributo debe incluir su campoId y dato.',
  },
  ATRIBUTO_DUPLICADO: { status: 400, mensaje: 'No se puede repetir el mismo atributo en un curso.' },
  EL_NOMBRE_ES_REQUERIDO: { status: 400, mensaje: 'El nombre del atributo es obligatorio.' },
  TIPO_INVALIDO: { status: 400, mensaje: 'El tipo debe ser TEXTO, NUMERO, FECHA o BOOLEANO.' },
  SIN_CAMBIOS: { status: 400, mensaje: 'No se enviaron campos para actualizar.' },
  ID_INVALIDO: { status: 400, mensaje: 'El id indicado no es válido.' },

  // 401 Unauthorized: sin token o token inválido
  USUARIO_CREACION_REQUERIDO: { status: 401, mensaje: 'No autorizado o token inválido.' },
  USUARIO_ELIMINACION_REQUERIDO: { status: 401, mensaje: 'No autorizado o token inválido.' },

  // 404 Not Found: el recurso pedido no existe (o está dado de baja)
  CURSO_NO_ENCONTRADO: { status: 404, mensaje: 'Curso no encontrado.' },
  ATRIBUTO_NO_ENCONTRADO: { status: 404, mensaje: 'Alguno de los atributos indicados no existe.' },

  // 409 Conflict: choca con el estado actual de los datos
  ATRIBUTO_EXISTENTE: { status: 409, mensaje: 'Ya existe un atributo con ese nombre.' },
  ATRIBUTO_EN_USO: {
    status: 409,
    mensaje: 'El atributo está en uso por al menos un curso y no puede eliminarse.',
  },
};

// ---------------------------------------------------------------------------
// Errores de Prisma: se traducen por código para no filtrar detalles internos.
// https://www.prisma.io/docs/orm/reference/error-reference
// ---------------------------------------------------------------------------
function responderErrorPrisma(error: Prisma.PrismaClientKnownRequestError) {
  switch (error.code) {
    case 'P2002': // violación de unique
      return NextResponse.json(
        { error: 'Ya existe un registro con esos datos (violación de unicidad).' },
        { status: 409 }
      );
    case 'P2003': // violación de clave foránea
      return NextResponse.json(
        { error: 'Alguna referencia (campoId, cursoId o usuario) apunta a un registro inexistente.' },
        { status: 400 }
      );
    case 'P2025': // registro requerido no encontrado (update/delete)
      return NextResponse.json({ error: 'El registro solicitado no existe.' }, { status: 404 });
    case 'P2000': // valor demasiado largo para la columna
      return NextResponse.json({ error: 'Alguno de los valores excede el largo permitido.' }, { status: 400 });
    default:
      return null;
  }
}

export function responderErrorCurso(error: unknown, mensajeDefault: string) {
  // 1) Errores de negocio conocidos
  const codigo = error instanceof Error ? error.message : '';
  const negocio = ERRORES_NEGOCIO[codigo];
  if (negocio) {
    return NextResponse.json({ error: negocio.mensaje, codigo }, { status: negocio.status });
  }

  // 2) Errores de Prisma
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const respuesta = responderErrorPrisma(error);
    if (respuesta) return respuesta;
  }
  if (error instanceof Prisma.PrismaClientValidationError) {
    return NextResponse.json({ error: 'Los datos enviados no respetan el formato esperado.' }, { status: 400 });
  }
  if (error instanceof Prisma.PrismaClientInitializationError) {
    console.error('No se pudo conectar a la base de datos:', error.message);
    return NextResponse.json({ error: 'Servicio no disponible: error de base de datos.' }, { status: 503 });
  }

  // 3) JSON malformado (req.json() lanza SyntaxError)
  if (error instanceof SyntaxError) {
    return NextResponse.json({ error: ERRORES_NEGOCIO.BODY_INVALIDO.mensaje }, { status: 400 });
  }

  // 4) Cualquier otra cosa: 500 sin exponer detalles
  console.error(mensajeDefault, error);
  return NextResponse.json({ error: mensajeDefault }, { status: 500 });
}

// Lee el body como JSON y lanza BODY_INVALIDO si no es un objeto JSON válido.
export async function leerBody(req: NextRequest): Promise<Record<string, unknown>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new Error('BODY_INVALIDO');
  }
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('BODY_INVALIDO');
  }
  return body as Record<string, unknown>;
}

export const RESPUESTA_NO_AUTORIZADO = () =>
  NextResponse.json({ error: 'No autorizado o token inválido.' }, { status: 401 });

export const RESPUESTA_PROHIBIDO = () =>
  NextResponse.json(
    { error: 'Sólo un COORDINADOR o ADMIN puede gestionar el catálogo de cursos.' },
    { status: 403 }
  );
