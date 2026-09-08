import { NextRequest, NextResponse } from 'next/server';
import { CertificadoController } from '../../../../controllers/certificado.controller';
import { getUserIdFromRequest } from '@/lib/auth';

const controller = new CertificadoController();

export async function GET() {
    try {
        const certificados = await controller.listar();
        return NextResponse.json(certificados);
    } catch {
        return NextResponse.json({ error: 'Error al obtener los certificados.' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const usuarioCreacionId = getUserIdFromRequest(req);

        if (!usuarioCreacionId) {
            return NextResponse.json({ error: 'No autorizado o token inválido.' }, { status: 401 });
        }

        const body = await req.json();
        const nuevoCertificado = await controller.crear(body, usuarioCreacionId);

        return NextResponse.json(nuevoCertificado, { status: 201 });
    } catch (error: any) {
        if (error.message === 'CAMPOS_OBLIGATORIOS_FALTANTES') {
            return NextResponse.json(
                { error: 'Faltan campos obligatorios: estadoId, usuarioId o codigoVerificacion.' },
                { status: 400 }
            );
        }
        if (error.message === 'ATRIBUTO_INCOMPLETO_CAMPO_Y_VALOR_REQUERIDOS') {
            return NextResponse.json(
                { error: 'Cada atributo debe incluir su campoId y valor.' },
                { status: 400 }
            );
        }
        return NextResponse.json({ error: 'Error al crear el certificado.' }, { status: 500 });
    }
}