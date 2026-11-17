import { NextRequest, NextResponse } from 'next/server';
import { CertificadoEstado } from '@prisma/client';
import { ArchivoEntrada, CertificadoEntrada, CertificadoService } from '../../services/certificado.service';
import { CertificadoAtributoService } from '../../services/certificadoAtributo.service';
import { esCoordinadorOAdmin, getUserFromRequest } from './auth';
import { leerArchivo, tipoArchivo } from './archivos-certificado';
import { responderErrorCertificado } from './certificadoErrores';

// Capa HTTP de certificados (historia 5): sesión, multipart y traducción de errores.
// Las rutas de src/app/api/certificados* solo delegan acá.

const MAX_BODY = 6 * 1024 * 1024;
const NO_AUTORIZADO = () => NextResponse.json({ error: 'No autorizado o token inválido.' }, { status: 401 });
const PROHIBIDO = () => NextResponse.json({ error: 'Solo coordinación puede hacer esta acción.' }, { status: 403 });

function solicitante(req: NextRequest) {
  const usuario = getUserFromRequest(req);
  return usuario?.id ? { id: usuario.id, rol: usuario.rol } : null;
}

// El tamaño se controla antes de leer el body para no cargar en memoria un envío enorme.
async function leerFormulario(req: NextRequest): Promise<{ entrada: CertificadoEntrada; archivo: ArchivoEntrada | null }> {
  if (Number(req.headers.get('content-length') ?? 0) > MAX_BODY) throw new Error('ARCHIVO_DEMASIADO_GRANDE');
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw new Error('BODY_INVALIDO');
  }
  const campo = (nombre: string) => {
    const valor = form.get(nombre);
    return typeof valor === 'string' ? valor : undefined;
  };
  let atributos: unknown;
  const crudo = campo('atributos');
  if (crudo !== undefined) {
    try {
      atributos = JSON.parse(crudo);
    } catch {
      throw new Error('ATRIBUTO_VALOR_INVALIDO');
    }
  }
  const subido = form.get('archivo');
  const archivo = subido && typeof subido !== 'string' && subido.size > 0
    ? { bytes: new Uint8Array(await subido.arrayBuffer()), nombre: subido.name }
    : null;
  return {
    entrada: {
      nombre: campo('nombre'),
      entidadEmisora: campo('entidadEmisora'),
      fechaEmision: campo('fechaEmision'),
      codigoVerificacion: campo('codigoVerificacion'),
      cursoId: campo('cursoId'),
      atributos,
    },
    archivo,
  };
}

export async function listarCertificados(req: NextRequest) {
  const quien = solicitante(req);
  if (!quien) return NO_AUTORIZADO();
  try {
    const estado = req.nextUrl.searchParams.get('estado') || undefined;
    if (estado && !Object.values(CertificadoEstado).includes(estado as CertificadoEstado)) throw new Error('ESTADO_INVALIDO');
    const usuarioId = req.nextUrl.searchParams.get('usuarioId') || undefined;
    return NextResponse.json(await new CertificadoService().listar({ estado: estado as CertificadoEstado | undefined, usuarioId }, quien));
  } catch (error) {
    return responderErrorCertificado(error, 'Error al obtener los certificados.');
  }
}

export async function crearCertificado(req: NextRequest) {
  const quien = solicitante(req);
  if (!quien) return NO_AUTORIZADO();
  try {
    const { entrada, archivo } = await leerFormulario(req);
    return NextResponse.json(await new CertificadoService().crear(entrada, archivo, quien), { status: 201 });
  } catch (error) {
    return responderErrorCertificado(error, 'No pudimos guardar el certificado. Intentá de nuevo.');
  }
}

export async function obtenerCertificado(req: NextRequest, id: string) {
  const quien = solicitante(req);
  if (!quien) return NO_AUTORIZADO();
  try {
    return NextResponse.json(await new CertificadoService().obtener(id, quien));
  } catch (error) {
    return responderErrorCertificado(error, 'Error al consultar el certificado.');
  }
}

export async function actualizarCertificado(req: NextRequest, id: string) {
  const quien = solicitante(req);
  if (!quien) return NO_AUTORIZADO();
  try {
    const { entrada, archivo } = await leerFormulario(req);
    return NextResponse.json(await new CertificadoService().actualizar(id, entrada, archivo, quien));
  } catch (error) {
    return responderErrorCertificado(error, 'No pudimos guardar los cambios. Intentá de nuevo.');
  }
}

export async function eliminarCertificado(req: NextRequest, id: string) {
  const quien = solicitante(req);
  if (!quien) return NO_AUTORIZADO();
  try {
    await new CertificadoService().eliminar(id, quien);
    return NextResponse.json({ mensaje: 'Certificado dado de baja.' });
  } catch (error) {
    return responderErrorCertificado(error, 'Error al dar de baja el certificado.');
  }
}

// Aprobación mínima existente; la revisión completa (motivo, avisos) llega en la parte 3.
export async function cambiarEstadoCertificado(req: NextRequest, id: string) {
  const quien = solicitante(req);
  if (!quien) return NO_AUTORIZADO();
  if (!esCoordinadorOAdmin(quien)) return PROHIBIDO();
  try {
    let body: { estado?: unknown };
    try {
      body = await req.json();
    } catch {
      throw new Error('BODY_INVALIDO');
    }
    return NextResponse.json(await new CertificadoService().cambiarEstado(id, body?.estado as CertificadoEstado));
  } catch (error) {
    return responderErrorCertificado(error, 'Error al actualizar el estado del certificado.');
  }
}

export async function descargarArchivo(req: NextRequest, id: string) {
  const quien = solicitante(req);
  if (!quien) return NO_AUTORIZADO();
  let certificado;
  try {
    certificado = await new CertificadoService().obtener(id, quien);
  } catch (error) {
    return responderErrorCertificado(error, 'Error al consultar el certificado.');
  }
  let bytes: Buffer;
  try {
    bytes = await leerArchivo(id);
  } catch {
    return NextResponse.json({ error: 'El archivo del certificado no está disponible.', codigo: 'ARCHIVO_NO_DISPONIBLE' }, { status: 404 });
  }
  const nombre = certificado.archivoNombre;
  const ascii = nombre.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      // El tipo sale del contenido real: si un reemplazo quedó a medias, nunca se sirve con el tipo equivocado.
      'Content-Type': tipoArchivo(bytes) ?? 'application/octet-stream',
      'Content-Disposition': `inline; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(nombre)}`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    },
  });
}

// ---------- Catálogo de datos adicionales (EAV) ----------

export async function listarAtributos(req: NextRequest) {
  if (!solicitante(req)) return NO_AUTORIZADO();
  try {
    return NextResponse.json(await new CertificadoAtributoService().obtenerTodos());
  } catch (error) {
    return responderErrorCertificado(error, 'Error al listar los atributos.');
  }
}

export async function crearAtributo(req: NextRequest) {
  const quien = solicitante(req);
  if (!quien) return NO_AUTORIZADO();
  if (!esCoordinadorOAdmin(quien)) return PROHIBIDO();
  try {
    let body: { nombre?: unknown; tipo?: unknown };
    try {
      body = await req.json();
    } catch {
      throw new Error('BODY_INVALIDO');
    }
    const atributo = await new CertificadoAtributoService().crear({
      nombre: typeof body?.nombre === 'string' ? body.nombre : '',
      tipo: body?.tipo as string | undefined,
      usuarioCreacionId: quien.id,
    });
    return NextResponse.json(atributo, { status: 201 });
  } catch (error) {
    return responderErrorCertificado(error, 'Error al crear el atributo.');
  }
}
