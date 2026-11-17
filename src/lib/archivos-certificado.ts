import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tipoFoto } from './fotos-emergencia';

// Archivos de certificados (PDF o imagen). Mismo esquema que las fotos de emergencias:
// disco local, validación por contenido y escritura atómica con temporal + rename.

export const MAX_ARCHIVO = 5 * 1024 * 1024;

export type TipoArchivo = 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp';

export function tipoArchivo(bytes: Uint8Array): TipoArchivo | null {
  const b = Buffer.from(bytes);
  if (b.length >= 5 && b.toString('ascii', 0, 5) === '%PDF-') return 'application/pdf';
  return tipoFoto(b);
}

// Nombre original apto para mostrar y para el header de descarga: sin separadores ni comillas.
export function nombreSeguro(nombre: string): string {
  const limpio = nombre.replace(/[^\p{L}\p{N} ._-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 120).trim();
  return limpio.replace(/^\.+/, '') || 'certificado';
}

function ruta(id: string) {
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id)) throw new Error('ID_INVALIDO');
  const carpeta = process.env.CERTIFICADO_UPLOAD_DIR || path.join(process.cwd(), '.data', 'certificados');
  return path.join(carpeta, `${id}.archivo`);
}

export async function guardarArchivo(id: string, bytes: Uint8Array): Promise<void> {
  const destino = ruta(id);
  if (!bytes.length || bytes.length > MAX_ARCHIVO || !tipoArchivo(bytes)) throw new Error('ARCHIVO_INVALIDO');
  await mkdir(path.dirname(destino), { recursive: true });
  const temporal = `${destino}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporal, bytes, { flag: 'wx' });
    await rename(temporal, destino);
  } finally {
    await unlink(temporal).catch(() => {});
  }
}

export async function leerArchivo(id: string): Promise<Buffer> {
  return readFile(ruta(id));
}

export async function borrarArchivo(id: string): Promise<void> {
  await unlink(ruta(id)).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== 'ENOENT') throw error;
  });
}
