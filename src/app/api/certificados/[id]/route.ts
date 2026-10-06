import { NextRequest, NextResponse } from 'next/server';
import { CertificadoController } from '../../../../../controllers/certificado.controller';
import { esCoordinadorOAdmin, getUserFromRequest } from '@/lib/auth';
import { ACCESO_NO_AUTORIZADO, RESPUESTA_NO_AUTORIZADO } from '@/lib/cursoErrores';
import { CertificadoEstado } from '@prisma/client';

const controller = new CertificadoController();

// En Next 15+ `params` es una Promise: hay que hacerle await
type Contexto = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Contexto) {
  try {
    const { id } = await params;
    const certificado = await controller.obtenerPorId(id);
    return NextResponse.json(certificado);
  } catch (error: any) {
    if (error.message === 'CERTIFICADO_NO_ENCONTRADO') {
      return NextResponse.json({ error: 'Certificado no encontrado.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Error al consultar el certificado.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Contexto) {
  try {
    const { id } = await params;
    const body = await req.json();
    const actualizado = await controller.actualizar(id, body);
    return NextResponse.json(actualizado);
  } catch (error: any) {
    if (error.message === 'CERTIFICADO_NO_ENCONTRADO') {
      return NextResponse.json({ error: 'Certificado no encontrado.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Error al actualizar el certificado.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Contexto) {
  // 1. Autenticación y Autorización (Solo Coordinadores o Admins)
  const usuario = getUserFromRequest(req);
  if (!usuario) return RESPUESTA_NO_AUTORIZADO();
  if (!esCoordinadorOAdmin(usuario)) return ACCESO_NO_AUTORIZADO();

  try {
    const { id } = await params;
    const { estado } = await req.json();

    if (!estado) {
      return NextResponse.json(
        { error: 'El campo "estado" es obligatorio.' },
        { status: 400 }
      );
    }

    const actualizado = await controller.cambiarEstado(id, estado as CertificadoEstado);
    return NextResponse.json(actualizado, { status: 200 });

  } catch (error: any) {
    if (error.message === 'CERTIFICADO_NO_ENCONTRADO') {
      return NextResponse.json({ error: 'Certificado no encontrado.' }, { status: 404 });
    }

    if (error.message === 'ESTADO_INVALIDO') {
      return NextResponse.json(
        { error: 'Solo se permite cambiar el estado a APROBADO o RECHAZADO.' },
        { status: 400 }
      );
    }

    if (error.message === 'ESTADO_NO_PENDIENTE') {
      return NextResponse.json(
        { error: 'Solo se pueden aprobar o rechazar certificados en estado PENDIENTE.' },
        { status: 422 } // Unprocessable Entity
      );
    }

    return NextResponse.json(
      { error: 'Error al actualizar el estado del certificado.' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: Contexto) {
  try {
    const { id } = await params;
    const { usuarioEliminacionId } = await req.json();
    await controller.eliminar(id, usuarioEliminacionId);
    return NextResponse.json({ mensaje: 'Certificado eliminado correctamente.' });
  } catch (error: any) {
    if (error.message === 'USUARIO_ELIMINACION_REQUERIDO') {
      return NextResponse.json({ error: 'El ID del usuario que elimina es obligatorio.' }, { status: 400 });
    }
    if (error.message === 'CERTIFICADO_NO_ENCONTRADO') {
      return NextResponse.json({ error: 'Certificado no encontrado.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Error al eliminar el certificado.' }, { status: 500 });
  }

  
}