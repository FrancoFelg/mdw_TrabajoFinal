import type { MetadataRoute } from 'next';

// Manifiesto PWA: permite agregar la app a la pantalla de inicio (requisito de iPhone para recibir push).
// Sin íconos propios: el producto todavía no tiene logo (PRODUCT.md).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Red de Apoyo',
    short_name: 'Red de Apoyo',
    description: 'Reportá una emergencia de una persona en situación de calle y coordiná a quién la atiende.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#000000',
    lang: 'es-AR',
  };
}
