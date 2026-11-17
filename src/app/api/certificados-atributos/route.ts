import { jsonPublico } from '@/lib/respuesta-publica';
import { NextRequest } from 'next/server';
import { CertificadoAtributoController } from '../../../../controllers/certificadoAtributo.controller';
import { getUserIdFromRequest } from '@/lib/auth';

const controller = new CertificadoAtributoController();

export async function GET() {
  try {
    const data = await controller.listar();
    return jsonPublico(data);
  } catch {
    return jsonPublico({ error: 'Error al listar atributos.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const usuarioCreacionId = getUserIdFromRequest(req);

    if (!usuarioCreacionId) {
      return jsonPublico({ error: 'Token inválido o no proporcionado.' }, { status: 401 });
    }

    const body = await req.json();

    const nuevoCertificado = await controller.crear({
      ...body,
      usuarioCreacionId,
    });

    return jsonPublico(nuevoCertificado, { status: 201 });
  } catch (error: any) {
    return jsonPublico({ error: 'Error al crear certificado.' }, { status: 500 });
  }
}