// Service worker de Red de Apoyo: solo muestra avisos push y abre el enlace al tocarlos.
// No cachea nada (no hay modo sin conexión).
self.addEventListener('push', event => {
  let datos = {};
  try { datos = event.data ? event.data.json() : {}; } catch { datos = { cuerpo: event.data ? event.data.text() : '' }; }
  const titulo = datos.titulo || 'Red de Apoyo';
  event.waitUntil(self.registration.showNotification(titulo, {
    body: datos.cuerpo || '',
    tag: datos.etiqueta,
    renotify: !!datos.etiqueta,
    data: { enlace: datos.enlace || '/' },
    // Lo urgente (casos rojos) vibra en el teléfono y queda en pantalla hasta que se lo toca.
    vibrate: datos.urgente ? [200, 100, 200, 100, 400] : [120],
    requireInteraction: !!datos.urgente,
    lang: 'es-AR',
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const destino = new URL(event.notification.data?.enlace || '/', self.location.origin).href;
  event.waitUntil((async () => {
    const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const abierta = ventanas.find(v => v.url.startsWith(self.location.origin));
    if (abierta) { await abierta.navigate(destino); return abierta.focus(); }
    return self.clients.openWindow(destino);
  })());
});
