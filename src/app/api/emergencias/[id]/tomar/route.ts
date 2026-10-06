import { NextRequest, NextResponse } from 'next/server';
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

        return NextResponse.json(
            { mensaje: 'Emergencia tomada con éxito.', datos: asignada },
            { status: 200 }
        );
    } catch (error: any) {
        if (error.message === 'EMERGENCIA_YA_ASIGNADA') {
            return NextResponse.json(
                { error: 'La emergencia ya fue asignada a otro voluntario o ya se encuentra en proceso.' },
                { status: 409 } // 409 Conflict
            );
        }

        if (error.message === 'VOLUNTARIO_CON_EMERGENCIA_ACTIVA') {
            return NextResponse.json(
                { error: 'Ya tienes una emergencia activa asignada. Debes finalizarla antes de tomar otra.' },
                { status: 400 }
            );
        }

        console.error('Error en POST /api/emergencias/[id]/tomar:', error);
        return NextResponse.json(
            { error: 'Error interno al tomar la emergencia.' },
            { status: 500 }
        );
    }
}