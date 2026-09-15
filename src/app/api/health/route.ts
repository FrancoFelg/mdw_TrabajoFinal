import { NextResponse } from 'next/server';
import { db } from '../../../../config/database';

// Nunca cachear: cada request tiene que reflejar el estado real
export const dynamic = 'force-dynamic';

// GET /api/health — lo consumen el healthcheck de Docker y el monitoreo externo.
// 200 solo si el proceso vive Y la DB responde. Si la DB cae, 503 para que
// el orquestador y Uptime Kuma lo vean, aunque el proceso siga en pie.
export async function GET() {
  const inicio = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json(
      {
        status: 'ok',
        db: 'ok',
        dbLatencyMs: Date.now() - inicio,
        uptimeSeconds: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    // No se filtra el error de la DB: este endpoint es público
    return NextResponse.json(
      {
        status: 'degraded',
        db: 'unreachable',
        uptimeSeconds: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
