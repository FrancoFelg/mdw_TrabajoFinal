import { NextRequest } from 'next/server';
import { crearCertificado, listarCertificados } from '@/lib/certificados-api';

export const runtime = 'nodejs';

// GET: los propios (coordinación: todos, con ?estado= y ?usuarioId=). POST: multipart con el archivo.
export const GET = (req: NextRequest) => listarCertificados(req);
export const POST = (req: NextRequest) => crearCertificado(req);
