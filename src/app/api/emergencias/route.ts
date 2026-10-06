import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { RESPUESTA_NO_AUTORIZADO } from '@/lib/cursoErrores';
import { EmergenciaController } from '../../../../controllers/emergencia.controller';
import { CrearEmergenciaSchema, EmergenciaService } from '../../../../services/emergencia.service';

const service = new EmergenciaService();
const controller = new EmergenciaController();

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

// POST /api/emergencias — reportar una emergencia (autenticado).
// Body: { descripcion, imagen?, prioridad?, direccion }
//    ó { descripcion, imagen?, prioridad?, coordenada_x, coordenada_y, provincia }
// coordenada_x = longitud, coordenada_y = latitud. Sin prioridad, nace VERDE.
export async function POST(req: NextRequest) {
    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'El body debe ser un JSON válido.' }, { status: 400 });
    }

    const validacion = CrearEmergenciaSchema.safeParse(body);
    if (!validacion.success) {
        return NextResponse.json(
            { error: validacion.error.issues.map((i) => i.message).join(' ') },
            { status: 400 },
        );
    }

    try {
        // Se pasa directamente el objeto validado sin comprobación de autenticación
        const emergencia = await controller.crear(validacion.data);
        return NextResponse.json(emergencia, { status: 201 });
    } catch (error) {
        const mensaje = error instanceof Error ? error.message : '';

        switch (mensaje) {
            case 'DIRECCION_NO_ENCONTRADA':
                return NextResponse.json(
                    { error: 'No se encontró la dirección indicada. Revisá calle, altura y localidad.' },
                    { status: 422 },
                );
            case 'PROVINCIA_NO_RECONOCIDA':
                return NextResponse.json(
                    { error: 'No se pudo determinar la provincia de la dirección indicada.' },
                    { status: 422 },
                );
            case 'GOOGLE_MAPS_NO_CONFIGURADO':
            case 'GOOGLE_MAPS_NO_DISPONIBLE':
                return NextResponse.json(
                    { error: 'No se pudo ubicar la dirección en este momento. Intentá enviando tu ubicación GPS.' },
                    { status: 503 },
                );
            default:
                console.error('Error en POST /api/emergencias:', error);
                return NextResponse.json({ error: 'Error al registrar la emergencia.' }, { status: 500 });
        }
    }
}
