import { NextRequest } from 'next/server';
import { operarAscenso } from '@/lib/ascensos-api';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return operarAscenso(req, 'aprobar', (await params).id);
}
