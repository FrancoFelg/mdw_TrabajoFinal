import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { tipoFoto } from './fotos-emergencia';

export const MAX_CERTIFICADO = 5 * 1024 * 1024;
export function tipoCertificado(bytes: Uint8Array) {
  return Buffer.from(bytes).subarray(0, 5).toString() === '%PDF-' ? 'application/pdf' : tipoFoto(bytes);
}
function destino(id: string) {
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id)) throw new Error('ID_INVALIDO');
  return path.join(process.env.CERTIFICATE_UPLOAD_DIR || path.join(process.cwd(), '.data', 'certificados'), `${id}.documento`);
}
export async function guardarCertificado(id: string, bytes: Uint8Array) {
  await mkdir(path.dirname(destino(id)), { recursive: true });
  await writeFile(destino(id), bytes, { flag: 'wx' });
}
export const leerCertificado = (id: string) => readFile(destino(id));
export const borrarArchivoCertificado = (id: string) => unlink(destino(id));
