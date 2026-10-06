
const TIMEOUT_MS = 5000;

export async function postGoogleMaps<T>(url: string, body: unknown, fieldMask: string): Promise<T> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_MAPS_NO_CONFIGURADO');
  }

  let respuesta: Response;
  try {
    respuesta = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': fieldMask,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    });
  } catch (error) {
    console.error(`Google Maps: sin respuesta de ${url}:`, error);
    throw new Error('GOOGLE_MAPS_NO_DISPONIBLE');
  }

  if (!respuesta.ok) {
    // 403 (key inválida / API no habilitada), 429 (cuota), 5xx: problema de
    // configuración o de Google, no del usuario. Se loguea y no se expone.
    const detalle = await respuesta.text().catch(() => '');
    console.error(`Google Maps: HTTP ${respuesta.status} en ${url}:`, detalle.slice(0, 300));
    throw new Error('GOOGLE_MAPS_NO_DISPONIBLE');
  }

  return (await respuesta.json()) as T;
}
