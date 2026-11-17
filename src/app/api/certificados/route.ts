import { jsonPublico } from '@/lib/respuesta-publica';
import { NextRequest } from 'next/server';
import { CertificadoController } from '../../../../controllers/certificado.controller';
import { esCoordinadorOAdmin } from '@/lib/auth';
import { actorActual } from '@/lib/actor-actual';
import { RESPUESTA_NO_AUTORIZADO } from '@/lib/cursoErrores';
import { db } from '../../../../config/database';
import { randomUUID } from 'node:crypto';
import { MAX_CERTIFICADO, tipoCertificado, guardarCertificado, borrarArchivoCertificado } from '@/lib/archivos-certificados';
import { avisarCertificadoNuevo } from '@/lib/avisos';
import { Prisma } from '@prisma/client';

const controller = new CertificadoController();

export async function GET(req: NextRequest) {
    const usuario = await actorActual(req);
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
        const usuarioCreacionId = (await actorActual(req))?.id;

        if (!usuarioCreacionId) {
            return jsonPublico({ error: 'No autorizado o token inválido.' }, { status: 401 });
        }

        // Solo se acepta carga multipart para que todo certificado tenga comprobante.
        if (!req.headers.get('content-type')?.includes('multipart/form-data')) {
            return jsonPublico({ error: 'Adjuntá un PDF o imagen y su código de verificación.' }, { status: 400 });
        }
        const reader = req.body?.getReader();
        if (!reader) return jsonPublico({ error: 'Archivo requerido.' }, { status: 400 });
        const chunks: Uint8Array[] = [];
        let length = 0;
        let excedido = false;
        for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            length += value.length;
            if (length > MAX_CERTIFICADO + 65536) {
                excedido = true;
                chunks.length = 0;
            }
            // Drenar sin reservar memoria permite responder 413 sin cortar la conexión HTTP.
            if (!excedido) chunks.push(value);
        }
        if (excedido) return jsonPublico({ error: 'El archivo admite hasta 5 MB.' }, { status: 413 });
        const form = await new Response(Buffer.concat(chunks), { headers: { 'Content-Type': req.headers.get('content-type')! } }).formData();
        const file = form.get('archivo');
        const codigo = String(form.get('codigoVerificacion') ?? '').trim();
        const cursoId = String(form.get('cursoId') ?? '').trim();
        if (file instanceof File && file.size > MAX_CERTIFICADO) return jsonPublico({ error: 'El archivo admite hasta 5 MB.' }, { status: 413 });
        if (!(file instanceof File) || !file.size || !codigo || codigo.length > 191) {
            return jsonPublico({ error: 'Archivo y código válidos requeridos (máximo 5 MB).' }, { status: 400 });
        }
        const bytes = new Uint8Array(await file.arrayBuffer());
        if (!tipoCertificado(bytes)) return jsonPublico({ error: 'Solo PDF, JPG, PNG o WebP.' }, { status: 400 });
        if (cursoId && !await db.cursos.findFirst({ where: { id: cursoId, fechaEliminacion: null } })) {
            return jsonPublico({ error: 'Curso inexistente.' }, { status: 400 });
        }
        const id = randomUUID();
        await guardarCertificado(id, bytes);
        try {
            const nuevo = await db.certificado.create({ data: {
                id, usuarioId: usuarioCreacionId, usuarioCreacionId, codigoVerificacion: codigo,
                cursoId: cursoId || null, estado: 'PENDIENTE', archivo: `/api/certificados/${id}/archivo`,
            } });
            avisarCertificadoNuevo(id, usuarioCreacionId);
            return jsonPublico(nuevo, { status: 201 });
        } catch (error) {
            await borrarArchivoCertificado(id).catch(() => {});
            throw error;
        }
    } catch (error: any) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return jsonPublico({ error: 'Ese código ya fue registrado.' }, { status: 409 });
        }
        if (error instanceof TypeError || error instanceof SyntaxError) {
            return jsonPublico({ error: 'Formulario inválido.' }, { status: 400 });
        }
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
