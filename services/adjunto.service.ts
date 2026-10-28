import { randomUUID } from 'node:crypto';
import { AdjuntoTipo } from '@prisma/client';
import { EmergenciaAdjuntoRepository } from '../repositories/emergenciaAdjunto.repository';
import { almacenamiento } from './almacenamiento';

// Límites pensados para una emergencia con mala señal: una foto (el teléfono ya la
// comprime a ~300 KB) y un audio de hasta 60 s. Los topes de bytes son el margen
// para cuando la compresión del navegador no está disponible.
export const LIMITES = {
  IMAGEN: { bytes: 3 * 1024 * 1024 },
  AUDIO: { bytes: 2 * 1024 * 1024, segundos: 60 },
} as const;

// Tipo real por los primeros bytes del archivo, no por lo que declara el navegador.
type TipoArchivo = AdjuntoTipo | 'DOCUMENTO';
const FIRMAS: { tipo: TipoArchivo; mime: string; ext: string; coincide: (b: Buffer) => boolean }[] = [
  { tipo: 'DOCUMENTO', mime: 'application/pdf', ext: 'pdf', coincide: b => b.subarray(0, 5).toString() === '%PDF-' },
  { tipo: 'IMAGEN', mime: 'image/jpeg', ext: 'jpg', coincide: b => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { tipo: 'IMAGEN', mime: 'image/png', ext: 'png', coincide: b => b.subarray(0, 4).toString('hex') === '89504e47' },
  { tipo: 'IMAGEN', mime: 'image/webp', ext: 'webp', coincide: b => b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP' },
  { tipo: 'AUDIO', mime: 'audio/webm', ext: 'webm', coincide: b => b.subarray(0, 4).toString('hex') === '1a45dfa3' },
  { tipo: 'AUDIO', mime: 'audio/ogg', ext: 'ogg', coincide: b => b.subarray(0, 4).toString() === 'OggS' },
  { tipo: 'AUDIO', mime: 'audio/mp4', ext: 'm4a', coincide: b => b.subarray(4, 8).toString() === 'ftyp' },
  { tipo: 'AUDIO', mime: 'audio/mpeg', ext: 'mp3', coincide: b => b.subarray(0, 3).toString() === 'ID3' || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0) },
];

// Detecta el tipo real del archivo entre los permitidos. La usan también los certificados (PDF o imagen).
export function detectarArchivo(datos: Buffer, permitidos: TipoArchivo[]) {
  return FIRMAS.find(f => permitidos.includes(f.tipo) && f.coincide(datos)) ?? null;
}

export class AdjuntoService {
  private repo = new EmergenciaAdjuntoRepository();

  // Valida tamaño, duración y tipo real sin guardar nada. El reporte lo usa antes de crear
  // la emergencia: si el audio reemplaza al texto, tiene que ser válido de antemano.
  async validar(tipoEsperado: AdjuntoTipo, archivo: File, duracionSegundos?: number) {
    const limite = LIMITES[tipoEsperado];
    if (archivo.size === 0) throw new Error('ADJUNTO_VACIO');
    if (archivo.size > limite.bytes) throw new Error('ADJUNTO_DEMASIADO_GRANDE');
    if (tipoEsperado === 'AUDIO' && duracionSegundos !== undefined && duracionSegundos > LIMITES.AUDIO.segundos + 2) throw new Error('AUDIO_DEMASIADO_LARGO');

    const datos = Buffer.from(await archivo.arrayBuffer());
    const firma = detectarArchivo(datos, [tipoEsperado]);
    if (!firma) throw new Error('ADJUNTO_TIPO_NO_PERMITIDO');
    return { datos, firma, duracionSegundos };
  }

  async adjuntar(emergenciaId: string, tipoEsperado: AdjuntoTipo, archivo: File, duracionSegundos?: number) {
    return this.guardar(emergenciaId, await this.validar(tipoEsperado, archivo, duracionSegundos));
  }

  async guardar(emergenciaId: string, { datos, firma, duracionSegundos }: Awaited<ReturnType<AdjuntoService['validar']>>) {
    const clave = `emergencias/${emergenciaId}/${randomUUID()}.${firma.ext}`;
    await almacenamiento().guardar(clave, datos, firma.mime);
    try {
      return await this.repo.crear({ emergenciaId, tipo: firma.tipo as AdjuntoTipo, mime: firma.mime, tamano: datos.length, clave, duracionSegundos });
    } catch (error) {
      await almacenamiento().borrar(clave);
      throw error;
    }
  }

  async obtener(id: string) {
    const adjunto = await this.repo.findById(id);
    if (!adjunto) throw new Error('ADJUNTO_NO_ENCONTRADO');
    return { adjunto, datos: await almacenamiento().leer(adjunto.clave) };
  }

  async listarDeEmergencia(emergenciaId: string) {
    return await this.repo.findByEmergencia(emergenciaId);
  }
}
