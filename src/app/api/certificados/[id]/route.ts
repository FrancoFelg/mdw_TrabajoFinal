import { NextRequest } from 'next/server';
import {
  actualizarCertificado,
  cambiarEstadoCertificado,
  eliminarCertificado,
  obtenerCertificado,
} from '@/lib/certificados-api';

export const runtime = 'nodejs';

// En Next 15+ `params` es una Promise
type Contexto = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Contexto) {
  return obtenerCertificado(req, (await params).id);
}

// Solo el dueño; multipart.
export async function PUT(req: NextRequest, { params }: Contexto) {
  return actualizarCertificado(req, (await params).id);
}

// Coordinación: { estado: 'APROBADO' | 'RECHAZADO' }.
export async function PATCH(req: NextRequest, { params }: Contexto) {
  return cambiarEstadoCertificado(req, (await params).id);
}

export async function DELETE(req: NextRequest, { params }: Contexto) {
  return eliminarCertificado(req, (await params).id);
}
