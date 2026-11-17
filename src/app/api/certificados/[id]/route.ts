import { jsonPublico } from '@/lib/respuesta-publica';
import { NextRequest } from 'next/server';
import { CertificadoController } from '../../../../../controllers/certificado.controller';
import { esCoordinadorOAdmin } from '@/lib/auth';
import { actorActual } from '@/lib/actor-actual';
import { ACCESO_NO_AUTORIZADO, RESPUESTA_NO_AUTORIZADO } from '@/lib/cursoErrores';
import { CertificadoEstado } from '@prisma/client';
import { resolverCertificado, errorCertificado } from '@/lib/certificados';

const controller = new CertificadoController();

// En Next 15+ `params` es una Promise: hay que hacerle await
type Contexto = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Contexto) {
  const usuario = await actorActual(req);
  if (!usuario) return RESPUESTA_NO_AUTORIZADO();

  try {
    const { id } = await params;
    const certificado = await controller.obtenerPorId(id);
    // Un voluntario solo ve los suyos; respondemos 404 para no revelar que el certificado existe
    if (!esCoordinadorOAdmin(usuario) && certificado.usuarioId !== usuario.id) {
      return jsonPublico({ error: 'Certificado no encontrado.' }, { status: 404 });
    }
    return jsonPublico(certificado);
  } catch (error: any) {
    if (error.message === 'ESTADO_INVALIDO') return jsonPublico({ error: 'Usá la solicitud de validación para cambiar el estado.' }, { status: 400 });
    if (error.message === 'CERTIFICADO_NO_ENCONTRADO') {
      return jsonPublico({ error: 'Certificado no encontrado.' }, { status: 404 });
    }
    return jsonPublico({ error: 'Error al consultar el certificado.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Contexto) {
  const usuario = await actorActual(req);
  if (!usuario) return RESPUESTA_NO_AUTORIZADO();
  if (!esCoordinadorOAdmin(usuario)) return ACCESO_NO_AUTORIZADO();

  try {
    const { id } = await params;
    const body = await req.json();
    const actualizado = await controller.actualizar(id, body);
    return jsonPublico(actualizado);
  } catch (error: any) {
    if (error.message === 'ESTADO_INVALIDO') return jsonPublico({ error: 'Usá la solicitud de validación para cambiar el estado.' }, { status: 400 });
    if (error.message === 'CERTIFICADO_NO_ENCONTRADO') {
      return jsonPublico({ error: 'Certificado no encontrado.' }, { status: 404 });
    }
    return jsonPublico({ error: 'Error al actualizar el certificado.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Contexto) {
  // 1. Autenticación y Autorización (Solo Coordinadores o Admins)
  const usuario = await actorActual(req);
  if (!usuario) return RESPUESTA_NO_AUTORIZADO();
  if (!esCoordinadorOAdmin(usuario)) return ACCESO_NO_AUTORIZADO();

  try {
    const { id } = await params;
    const { estado, motivo } = await req.json();

    if (!estado) {
      return jsonPublico(
        { error: 'El campo "estado" es obligatorio.' },
        { status: 400 }
      );
    }

    const actualizado = await resolverCertificado(id, estado as CertificadoEstado, motivo);
    return jsonPublico(actualizado, { status: 200 });

  } catch (error: any) {
    if (error.message === 'MOTIVO_REQUERIDO' || error.message === 'ESTADO_NO_PENDIENTE') return errorCertificado(error);
    if (error.message === 'CERTIFICADO_NO_ENCONTRADO') {
      return jsonPublico({ error: 'Certificado no encontrado.' }, { status: 404 });
    }

    if (error.message === 'ESTADO_INVALIDO') {
      return jsonPublico(
        { error: 'Solo se permite cambiar el estado a APROBADO o RECHAZADO.' },
        { status: 400 }
      );
    }

    if (error.message === 'ESTADO_NO_PENDIENTE') {
      return jsonPublico(
        { error: 'Solo se pueden aprobar o rechazar certificados en estado PENDIENTE.' },
        { status: 422 } // Unprocessable Entity
      );
    }

    return jsonPublico(
      { error: 'Error al actualizar el estado del certificado.' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: Contexto) {
  const usuario = await actorActual(req);
  if (!usuario) return RESPUESTA_NO_AUTORIZADO();
  if (!esCoordinadorOAdmin(usuario)) return ACCESO_NO_AUTORIZADO();

  try {
    const { id } = await params;
    // Quién elimina sale del token, nunca del body
    await controller.eliminar(id, usuario.id);
    return jsonPublico({ mensaje: 'Certificado eliminado correctamente.' });
  } catch (error: any) {
    if (error.message === 'CERTIFICADO_NO_ENCONTRADO') {
      return jsonPublico({ error: 'Certificado no encontrado.' }, { status: 404 });
    }
    return jsonPublico({ error: 'Error al eliminar el certificado.' }, { status: 500 });
  }
}
