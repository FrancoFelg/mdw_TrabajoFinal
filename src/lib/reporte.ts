// Límites compartidos entre el formulario y la recepción de fotos.
export const MAX_FOTO = 5 * 1024 * 1024;
export const TIPOS_FOTO = ['image/jpeg', 'image/png', 'image/webp'];

// Preguntas de estado del reporte (DESIGN.md, pantalla 01). Quien reporta no sabe triage:
// responde dos preguntas simples y la prioridad sale de acá.
export type Respuesta = 'SI' | 'NO' | 'NO_SE';
export type RespuestasEstado = { responde: Respuesta | null; respira: Respuesta | null };

export const PREGUNTAS_ESTADO: { clave: keyof RespuestasEstado; texto: string }[] = [
  { clave: 'responde', texto: '¿Responde si le hablás?' },
  { clave: 'respira', texto: '¿Respira con normalidad?' },
];

export const OPCIONES_RESPUESTA: { valor: Respuesta; texto: string }[] = [
  { valor: 'SI', texto: 'Sí' },
  { valor: 'NO', texto: 'No' },
  { valor: 'NO_SE', texto: 'No sé' },
];

// Cualquier No es grave (no responde o no respira bien): Rojo. Sin ningún No, una duda
// alcanza para Amarillo. Dos Sí, o sin responder, Verde: la prioridad por defecto de la spec.
export function derivarPrioridad({ responde, respira }: RespuestasEstado): 'ROJO' | 'AMARILLO' | 'VERDE' {
  const respuestas = [responde, respira];
  if (respuestas.includes('NO')) return 'ROJO';
  if (respuestas.includes('NO_SE')) return 'AMARILLO';
  return 'VERDE';
}
