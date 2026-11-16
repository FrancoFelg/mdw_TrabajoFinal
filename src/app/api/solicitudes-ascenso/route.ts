import { listarAscensos, operarAscenso } from '@/lib/ascensos-api';
import { NextRequest } from 'next/server';

export const GET = listarAscensos;
export function POST(req: NextRequest) { return operarAscenso(req, 'crear'); }
