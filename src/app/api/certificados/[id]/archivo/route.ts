import { NextRequest } from 'next/server';
import { descargarArchivo } from '@/lib/certificados-api';

export const runtime = 'nodejs';

type Contexto = { params: Promise<{ id: string }> };

// Dueño o coordinación.
export async function GET(req: NextRequest, { params }: Contexto) {
  return descargarArchivo(req, (await params).id);
}
