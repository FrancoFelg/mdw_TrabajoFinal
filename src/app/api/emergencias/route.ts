import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { RESPUESTA_NO_AUTORIZADO, leerBody } from '@/lib/cursoErrores';
import { EmergenciaService } from '../../../../services/emergencia.service';
import { CrearEmergenciaDTO } from '../../../../repositories/emergencia.repository';

const service = new EmergenciaService();

// GET /api/emergencias — Listar emergencias
export async function GET(req: NextRequest) {
    const usuario = getUserFromRequest(req);
    if (!usuario) return RESPUESTA_NO_AUTORIZADO();

    try {
        const emergencias = await service.listarEmergencias();
        return NextResponse.json(emergencias, { status: 200 });
    } catch (error: any) {
        console.error('Error en GET /api/emergencias:', error);
        return NextResponse.json(
            { error: 'Error interno al consultar las emergencias.' },
            { status: 500 }
        );
    }
}

// POST /api/emergencias — Crear emergencia
export async function POST(req: NextRequest) {
    const usuario = getUserFromRequest(req);

    try {
        const rawBody = await leerBody(req);
        const body = rawBody as unknown as CrearEmergenciaDTO;

        const nuevaEmergencia = await service.crearEmergencia({
            ...body,
            creadorId: usuario?.id, // Si no hay usuario, devuelve undefined
        });

        return NextResponse.json(nuevaEmergencia, { status: 201 });
    } catch (error: any) {
        if (error.message === 'DATOS_INCOMPLETOS') {
            return NextResponse.json(
                { error: 'La descripción, fecha, prioridad y provincia son obligatorias.' },
                { status: 400 }
            );
        }
        return NextResponse.json(
            { error: 'Error interno al crear la emergencia.' },
            { status: 500 }
        );
    }
}