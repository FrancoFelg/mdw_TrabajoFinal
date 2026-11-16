import { jsonPublico } from '@/lib/respuesta-publica';
import { NextRequest } from 'next/server';
import { CertificadoController } from '../../../../controllers/certificado.controller';
import { esCoordinadorOAdmin, getUserFromRequest, getUserIdFromRequest } from '@/lib/auth';
import { RESPUESTA_NO_AUTORIZADO } from '@/lib/cursoErrores';

const controller = new CertificadoController();

export async function GET(req: NextRequest) {
    const usuario = getUserFromRequest(req);
    if (!usuario) return RESPUESTA_NO_AUTORIZADO();

    try {
        // Coordinadores y admins ven todos; un voluntario solo los suyos
        const certificados = await controller.listar(esCoordinadorOAdmin(usuario) ? undefined : usuario.id);
        return jsonPublico(certificados);
    } catch {
        return jsonPublico({ error: 'Error al obtener los certificados.' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const usuarioCreacionId = getUserIdFromRequest(req);

        if (!usuarioCreacionId) {
            return jsonPublico({ error: 'No autorizado o token inválido.' }, { status: 401 });
        }

        const body = await req.json();
        const nuevoCertificado = await controller.crear(body, usuarioCreacionId);

        return jsonPublico(nuevoCertificado, { status: 201 });
    } catch (error: any) {
        if (error.message === 'CAMPOS_OBLIGATORIOS_FALTANTES') {
            return jsonPublico(
                { error: 'Faltan campos obligatorios: estadoId, usuarioId o codigoVerificacion.' },
                { status: 400 }
            );
        }
        if (error.message === 'ATRIBUTO_INCOMPLETO_CAMPO_Y_VALOR_REQUERIDOS') {
            return jsonPublico(
                { error: 'Cada atributo debe incluir su campoId y valor.' },
                { status: 400 }
            );
        }
        return jsonPublico({ error: 'Error al crear el certificado.' }, { status: 500 });
    }
}