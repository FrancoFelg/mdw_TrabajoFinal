import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { RESPUESTA_NO_AUTORIZADO } from '@/lib/cursoErrores';
import { EmergenciaService } from '../../../../../../services/emergencia.service';

const service = new EmergenciaService();

type ContextoRoute = {
    params: Promise<{ id: string }>;
};

// PUT /api/emergencias/[id]/finalizar — Finalizar emergencia
export async function PUT(req: NextRequest, { params }: ContextoRoute) {
    const usuario = getUserFromRequest(req);
    if (!usuario) return RESPUESTA_NO_AUTORIZADO();

    try {
        const { id } = await params;
        const finalizada = await service.finalizarEmergencia(id, usuario.id);

        return NextResponse.json(
            { mensaje: 'Emergencia finalizada con éxito.' },
            { status: 200 }
        );
    } catch (error: any) {
        if (error.message === 'EMERGENCIA_NO_ESTA_EN_PROCESO') {
            return NextResponse.json(
                { error: 'La emergencia debe estar en estado EN_CAMINO para ser finalizada.' },
                { status: 400 }
            );
        }

        if (error.message === 'NO_ES_EL_VOLUNTARIO_ASIGNADO') {
            return NextResponse.json(
                { error: 'No tienes permiso para finalizar esta emergencia porque no eres el voluntario asignado.' },
                { status: 403 }
            );
        }

        console.error('Error en PUT /api/emergencias/[id]/finalizar:', error);
        return NextResponse.json(
            { error: 'Error interno al finalizar la emergencia.' },
            { status: 500 }
        );
    }
}