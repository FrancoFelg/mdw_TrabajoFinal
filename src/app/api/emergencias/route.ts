import { jsonPublico } from '@/lib/respuesta-publica';
import { NextRequest } from 'next/server';
import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { db } from '../../../../config/database';
import { permisoFoto } from '@/lib/fotos-emergencia';
import { getUserFromRequest } from '@/lib/auth';
import { casosVisibles } from '@/lib/acceso-casos';
import { avisarEmergenciaNueva } from '@/lib/avisos';
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
        const actor = await db.usuario.findUnique({ where: { id: usuario.id }, select: { id: true, rol: true } });
        if (!actor) return RESPUESTA_NO_AUTORIZADO();
        const emergencias = await service.listarEmergencias(casosVisibles(actor));
        return jsonPublico(emergencias, { status: 200 });
    } catch (error: any) {
        console.error('Error en GET /api/emergencias:', error);
        return jsonPublico(
            { error: 'Error interno al consultar las emergencias.' },
            { status: 500 }
        );
    }
}

// POST /api/emergencias — reportar una emergencia (sin cuenta).
// Body: { descripcion, imagen?, prioridad?, direccion }
//    ó { descripcion, imagen?, prioridad?, coordenada_x, coordenada_y, provincia }
// coordenada_x = longitud, coordenada_y = latitud. Sin prioridad, nace VERDE.
export async function POST(req: NextRequest) {
    // Reintentar la misma clave recupera el caso si su respuesta se perdió.
    const clave = req.headers.get('Idempotency-Key');
    if (clave && !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(clave)) {
        return jsonPublico({ error: 'La clave de envío no es válida.' }, { status: 400 });
    }
    const id = clave ? createHash('sha256').update(clave).digest('hex') : undefined;
    const respuesta = (emergencia: { id: string; descripcion: string; prioridad: string; estado: string }, status: number) => {
        let permiso: string | null = null;
        try { permiso = permisoFoto(emergencia.id); } catch { /* El reporte sigue disponible sin foto. */ }
        return jsonPublico({ ...emergencia, permisoFoto: permiso }, { status });
    };
    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return jsonPublico({ error: 'El body debe ser un JSON válido.' }, { status: 400 });
    }

    const validacion = CrearEmergenciaSchema.safeParse(body);
    if (!validacion.success) {
        return jsonPublico(
            { error: validacion.error.issues.map((i) => i.message).join(' ') },
            { status: 400 },
        );
    }

    try {
        // Se pasa directamente el objeto validado sin comprobación de autenticación
        if (id) {
            const existente = await db.emergencia.findUnique({ where: { id }, select: { id: true, descripcion: true, prioridad: true, estado: true } });
            if (existente) return respuesta(existente, 200);
        }
        const emergencia = await controller.crear(validacion.data, id);
        avisarEmergenciaNueva(emergencia);
        return respuesta(emergencia, 201);
    } catch (error) {
        if (id && error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            const existente = await db.emergencia.findUnique({ where: { id }, select: { id: true, descripcion: true, prioridad: true, estado: true } }).catch(() => null);
            if (existente) return respuesta(existente, 200);
        }
        const mensaje = error instanceof Error ? error.message : '';

        switch (mensaje) {
            case 'DIRECCION_NO_ENCONTRADA':
                return jsonPublico(
                    { error: 'No se encontró la dirección indicada. Revisá calle, altura y localidad.' },
                    { status: 422 },
                );
            case 'PROVINCIA_NO_RECONOCIDA':
                return jsonPublico(
                    { error: 'No se pudo determinar la provincia de la dirección indicada.' },
                    { status: 422 },
                );
            case 'GOOGLE_MAPS_NO_CONFIGURADO':
            case 'GOOGLE_MAPS_NO_DISPONIBLE':
                return jsonPublico(
                    { error: 'No se pudo ubicar la dirección en este momento. Intentá enviando tu ubicación GPS.', reporteGuardado: false },
                    { status: 503 },
                );
            default:
                console.error('Error en POST /api/emergencias:', error);
                return jsonPublico({ error: 'Error al registrar la emergencia.' }, { status: 500 });
        }
    }
}
