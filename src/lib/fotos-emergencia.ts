import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { MAX_FOTO } from './reporte';

function firma(id: string, vence: string) {
  const secreto = process.env.JWT_SECRET;
  if (!secreto) throw new Error('FOTOS_NO_CONFIGURADAS');
  return createHmac('sha256', secreto).update(`foto:${id}:${vence}`).digest('hex');
}

export function permisoFoto(id: string) {
  const vence = String(Date.now() + 24 * 60 * 60 * 1000);
  return `${vence}.${firma(id, vence)}`;
}

export function verificarPermisoFoto(id: string, permiso: string) {
  const [vence, recibido] = permiso.split('.');
  if (!/^\d+$/.test(vence ?? '') || Number(vence) < Date.now() || !/^[a-f0-9]{64}$/.test(recibido ?? '')) return false;
  return timingSafeEqual(Buffer.from(recibido, 'hex'), Buffer.from(firma(id, vence), 'hex'));
}

export function tipoFoto(bytes: Uint8Array) {
  const b = Buffer.from(bytes);
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
  if (b.length >= 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

function archivo(id: string) {
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id)) throw new Error('ID_INVALIDO');
  return path.join(process.env.EMERGENCY_UPLOAD_DIR || path.join(process.cwd(), '.data', 'emergencias'), `${id}.foto`);
}

export async function guardarFoto(id: string, bytes: Uint8Array) {
  if (!bytes.length || bytes.length > MAX_FOTO || !tipoFoto(bytes)) throw new Error('FOTO_INVALIDA');
  const destino = archivo(id);
  await mkdir(path.dirname(destino), { recursive: true });
  const temporal = `${destino}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporal, bytes, { flag: 'wx' });
    await rename(temporal, destino);
  } finally {
    await unlink(temporal).catch(() => {});
  }
}

export async function leerFoto(id: string) {
  return readFile(archivo(id));
}
