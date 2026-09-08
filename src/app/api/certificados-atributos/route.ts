import { NextRequest, NextResponse } from 'next/server';
import { CertificadoAtributoController } from '../../../../controllers/certificadoAtributo.controller';
import { getUserIdFromRequest } from '@/lib/auth';

const controller = new CertificadoAtributoController();

export async function GET() {
  try {
    const data = await controller.listar();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Error al listar atributos.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const usuarioCreacionId = getUserIdFromRequest(req);

    if (!usuarioCreacionId) {
      return NextResponse.json({ error: 'Token inválido o no proporcionado.' }, { status: 401 });
    }

    const body = await req.json();

    const nuevoCertificado = await controller.crear({
      ...body,
      usuarioCreacionId,
    });

    return NextResponse.json(nuevoCertificado, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al crear certificado.' }, { status: 500 });
  }
}