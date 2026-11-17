import { jsonPublico } from '@/lib/respuesta-publica';
import { NextRequest } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { RESPUESTA_NO_AUTORIZADO } from '@/lib/cursoErrores';
import { EmergenciaService } from '../../../../../../services/emergencia.service';

const service = new EmergenciaService();

type ContextoRoute = {
    params: Promise<{ id: string }>;
};

// POST /api/emergencias/[id]/tomar — Tomar/Asignar emergencia
export async function POST(req: NextRequest, { params }: ContextoRoute) {
    const usuario = getUserFromRequest(req);
    if (!usuario) return RESPUESTA_NO_AUTORIZADO();

    try {
        const { id } = await params;
        const asignada = await service.tomarEmergencia(id, usuario.id);

        return jsonPublico(
            { mensaje: 'Emergencia tomada con éxito.', datos: asignada },
            { status: 200 }
        );
    } catch (error: any) {
        if (error.message === 'ROL_VOLUNTARIO_REQUERIDO') {
            return jsonPublico({ error: 'Solo un voluntario puede tomar emergencias.' }, { status: 403 });
        }
        if (error.message === 'EMERGENCIA_YA_ASIGNADA' || error.message === 'CONCURRENCIA_EMERGENCIA_TOMADA') {
            return jsonPublico(
                { error: 'La emergencia ya fue asignada a otro voluntario o ya se encuentra en proceso.' },
                { status: 409 } // 409 Conflict
            );
        }

        if (error.message === 'VOLUNTARIO_CON_EMERGENCIA_ACTIVA') {
            return jsonPublico(
                { error: 'Ya tienes una emergencia activa asignada. Debes finalizarla antes de tomar otra.' },
                { status: 409 }
            );
        }

        if (error.message === 'REQUIERE_CERTIFICADO_APROBADO') {
            return jsonPublico({ error: 'Requiere un certificado aprobado.' }, { status: 403 });
        }
        if (error.message === 'EMERGENCIA_NO_ENCONTRADA') {
            return jsonPublico({ error: 'La emergencia no existe.' }, { status: 404 });
        }
        console.error('Error en POST /api/emergencias/[id]/tomar:', error);
        return jsonPublico(
            { error: 'Error interno al tomar la emergencia.' },
            { status: 500 }
        );
    }
}
