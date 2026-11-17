import { NextRequest } from 'next/server';
import { crearAtributo, listarAtributos } from '@/lib/certificados-api';

// Catálogo de datos adicionales de certificados (EAV). Listar: con sesión. Crear: coordinación.
export const GET = (req: NextRequest) => listarAtributos(req);
export const POST = (req: NextRequest) => crearAtributo(req);
