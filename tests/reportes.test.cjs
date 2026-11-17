const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createRequire } = require('node:module');
const ts = require('typescript');
const { NextRequest } = require('next/server');

// Carga TypeScript con dobles solo en los límites de DB y servicios externos.
function cargar(archivo, dobles = {}) {
  const absoluto = path.resolve(archivo);
  const modulo = { exports: {} };
  const requerir = createRequire(absoluto);
  const codigo = ts.transpileModule(fs.readFileSync(absoluto, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const resolver = nombre => {
    if (Object.hasOwn(dobles, nombre)) return dobles[nombre];
    if (nombre === '@/lib/respuesta-publica') return cargar('src/lib/respuesta-publica.ts', dobles);
    if (nombre.startsWith('./')) return cargar(path.resolve(path.dirname(absoluto), `${nombre}.ts`), dobles);
    return requerir(nombre);
  };
  new Function('require', 'module', 'exports', codigo)(resolver, modulo, modulo.exports);
  return modulo.exports;
}

let creado;
let errorGeocoding;
const servicio = cargar('services/emergencia.service.ts', {
  '../config/database': { db: {} },
  '../repositories/emergencia.repository': { EmergenciaRepository: class {
    async crear(datos) { creado = datos; return { ...datos, id: datos.id || 'caso-test', fecha: new Date(), estado: 'SIN_GESTIONAR' }; }
  } },
  './geocoding.service': { GeocodingService: class {
    async geocodificar() {
      if (errorGeocoding) throw new Error(errorGeocoding);
      return { lat: -34.6, lng: -58.4, provincia: 'CABA', direccionFormateada: 'Dirección encontrada' };
    }
  } },
  './rutas.service': { RutasService: class {} },
});
const gps = { descripcion: 'Persona necesita ayuda', coordenada_x: -58.4, coordenada_y: -34.6, provincia: 'CABA' };

test('valida descripción, GPS completo, rangos, provincia y foto URL', () => {
  for (const datos of [
    { ...gps, descripcion: '    ' }, { ...gps, descripcion: 'x'.repeat(192) },
    { ...gps, coordenada_x: 181 }, { ...gps, coordenada_y: -91 },
    { ...gps, provincia: undefined }, { ...gps, provincia: 'OTRA' },
    { ...gps, prioridad: 'AZUL' }, { ...gps, prioridad: '' },
    { ...gps, imagen: 'archivo-no-url' }, { descripcion: 'Sin ubicación' },
  ]) assert.equal(servicio.CrearEmergenciaSchema.safeParse(datos).success, false);
  assert.equal(servicio.CrearEmergenciaSchema.safeParse(gps).success, true);
  assert.equal(servicio.CrearEmergenciaSchema.safeParse({ descripcion: 'Persona necesita ayuda', direccion: 'Callao 100, CABA' }).success, true);
});

test('GPS crea sin geocodificar, conserva ejes y usa VERDE por defecto', async () => {
  errorGeocoding = 'GOOGLE_MAPS_NO_CONFIGURADO';
  const resultado = await new servicio.EmergenciaService().crear(gps, 'id-reintento');
  assert.equal(creado.coordenada_x, -58.4);
  assert.equal(creado.coordenada_y, -34.6);
  assert.equal(creado.id, 'id-reintento');
  assert.equal(resultado.prioridad, 'VERDE');
  assert.equal(resultado.estado, 'SIN_GESTIONAR');
  errorGeocoding = undefined;
});

test('dirección manual guarda sin GPS aunque Google falle, sin inventar coordenadas', async () => {
  for (const fallo of ['GOOGLE_MAPS_NO_CONFIGURADO', 'GOOGLE_MAPS_NO_DISPONIBLE', 'DIRECCION_NO_ENCONTRADA', 'PROVINCIA_NO_RECONOCIDA']) {
    errorGeocoding = fallo;
    await new servicio.EmergenciaService().crear({ descripcion: 'se está prendiendo fuego un auto', direccion: 'Mariano Moreno 1810' });
    assert.equal(creado.direccion, 'Mariano Moreno 1810');
    assert.equal(creado.provincia, null);
    assert.equal(creado.coordenada_x, null);
    assert.equal(creado.coordenada_y, null);
  }
  errorGeocoding = undefined;
});

test('dirección manual resuelta guarda coordenadas para el mapa y conserva el texto original', async () => {
  const resultado = await new servicio.EmergenciaService().crear({ descripcion: 'Persona necesita ayuda', direccion: 'Callao 100, CABA' });
  assert.equal(creado.coordenada_x, -58.4);
  assert.equal(creado.coordenada_y, -34.6);
  assert.equal(creado.provincia, 'CABA');
  assert.equal(creado.direccion, 'Callao 100, CABA');
  assert.equal(resultado.direccionFormateada, 'Dirección encontrada');
});

test('listado recupera coordenadas de casos anteriores y conserva casos que Google no resuelve', async () => {
  const casos = ['conocido', 'desconocido'].map(id => ({ id, estado: 'SIN_GESTIONAR', ubicacion: {
    id, direccion: id, coordenada_x: null, coordenada_y: null,
  } }));
  const modulo = cargar('services/emergencia.service.ts', {
    '../config/database': { db: { ubicacion: { updateMany: async ({ where, data }) => {
      Object.assign(casos.find(c => c.ubicacion.id === where.id).ubicacion, data);
    } } } },
    '../repositories/emergencia.repository': { EmergenciaRepository: class { async findAll() { return casos; } } },
    './geocoding.service': { GeocodingService: class { async geocodificar(direccion) {
      if (direccion === 'desconocido') throw new Error('GOOGLE_MAPS_NO_DISPONIBLE');
      return { lat: -34.6, lng: -58.4, provincia: 'CABA' };
    } } },
    './rutas.service': { RutasService: class {} },
  });
  const resultado = await new modulo.EmergenciaService().listarEmergencias();
  assert.equal(resultado[0].ubicacion.coordenada_y, -34.6);
  assert.equal(resultado[0].ubicacion.coordenada_x, -58.4);
  assert.equal(resultado[1].ubicacion.coordenada_x, null);
  assert.equal(resultado[1].ubicacion.direccion, 'desconocido');
});

test('sugerencias disponibles sin cuenta y fallo de Google devuelve 503', async () => {
  let fallo = false;
  const api = cargar('src/app/api/direcciones/sugerencias/route.ts', {
    '../../../../../controllers/direccion.controller': { DireccionController: class { async sugerir() {
      if (fallo) throw new Error('GOOGLE_MAPS_NO_DISPONIBLE');
      return [{ placeId: 'lugar', texto: 'Callao 100, CABA' }];
    } } },
  });
  const req = () => new NextRequest('http://localhost/api/direcciones/sugerencias?q=Callao');
  assert.equal((await api.GET(req())).status, 200);
  fallo = true;
  assert.equal((await api.GET(req())).status, 503);
});

let existente = null;
let errorCrear;
let altas = 0;
const api = cargar('src/app/api/emergencias/route.ts', {
  '@/lib/auth': { getUserFromRequest: () => null },
  '@/lib/avisos': { avisarEmergenciaNueva() {} },
  '@/lib/cursoErrores': { RESPUESTA_NO_AUTORIZADO: () => new Response(null, { status: 401 }) },
  '@/lib/fotos-emergencia': { permisoFoto: () => 'permiso-test' },
  '../../../../config/database': { db: { emergencia: { findUnique: async () => existente } } },
  '../../../../services/emergencia.service': servicio,
  '../../../../controllers/emergencia.controller': { EmergenciaController: class {
    async crear(datos, id) {
      if (errorCrear) throw new Error(errorCrear);
      altas++;
      existente = { id: id || 'caso-test', descripcion: datos.descripcion, prioridad: 'VERDE', estado: 'SIN_GESTIONAR' };
      return existente;
    }
  } },
});
function peticion(body = gps, clave) {
  return new NextRequest('http://localhost/api/emergencias', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(clave ? { 'Idempotency-Key': clave } : {}) },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

test('POST público crea sin sesión y reintenta sin duplicar', async () => {
  const clave = '12345678-1234-4234-8234-123456789abc';
  const primero = await api.POST(peticion(gps, clave));
  assert.equal(primero.status, 201);
  const datos = await primero.json();
  assert.equal(datos.estado, 'SIN_GESTIONAR');
  assert.equal(datos.permisoFoto, 'permiso-test');
  const segundo = await api.POST(peticion(gps, clave));
  assert.equal(segundo.status, 200);
  assert.equal((await segundo.json()).id, datos.id);
  assert.equal(altas, 1);
  existente = null;
});

test('JSON inválido y campos inválidos devuelven 400', async () => {
  assert.equal((await api.POST(peticion('{'))).status, 400);
  assert.equal((await api.POST(peticion({ descripcion: 'x' }))).status, 400);
  assert.equal((await api.POST(peticion(gps, 'clave-invalida'))).status, 400);
});

test('GET listado sigue requiriendo sesión', async () => {
  assert.equal((await api.GET(new NextRequest('http://localhost/api/emergencias'))).status, 401);
});

test('POST sin cuenta conserva cada prioridad con dirección manual o GPS y permite adjuntar foto', async () => {
  const apiReal = cargar('src/app/api/emergencias/route.ts', {
    '@/lib/auth': { getUserFromRequest: () => null },
    '@/lib/avisos': { avisarEmergenciaNueva() {} },
    '@/lib/cursoErrores': { RESPUESTA_NO_AUTORIZADO: () => new Response(null, { status: 401 }) },
    '@/lib/fotos-emergencia': { permisoFoto: () => 'permiso-test' },
    '../../../../config/database': { db: { emergencia: { findUnique: async () => null } } },
    '../../../../services/emergencia.service': servicio,
    '../../../../controllers/emergencia.controller': { EmergenciaController: servicio.EmergenciaService },
  });
  errorGeocoding = 'GOOGLE_MAPS_NO_DISPONIBLE';
  try {
    for (const prioridad of ['ROJO', 'AMARILLO', 'VERDE']) {
      for (const ubicacion of [{ descripcion: 'se está prendiendo fuego un auto', direccion: 'Mariano Moreno 1810' }, gps]) {
    const respuesta = await apiReal.POST(peticion({ ...ubicacion, prioridad }));
    assert.equal(respuesta.status, 201);
    const datos = await respuesta.json();
    assert.equal(datos.estado, 'SIN_GESTIONAR');
    assert.equal(datos.permisoFoto, 'permiso-test');
    assert.equal(datos.prioridad, prioridad);
    assert.equal(creado.prioridad, prioridad);
    if (ubicacion.direccion) assert.equal(creado.direccion, 'Mariano Moreno 1810');
      }
    }
  } finally { errorGeocoding = undefined; }
});

const fotos = cargar('src/lib/fotos-emergencia.ts');
test('fallo de almacenamiento conserva el caso y permite reintentar la foto sin crear otro', async () => {
  let falloDisco = true;
  let actualizaciones = 0;
  const fotoApi = cargar('src/app/api/emergencias/[id]/foto/route.ts', {
    '../../../../../../config/database': { db: { emergencia: {
      findUnique: async () => ({ id: 'caso-guardado' }),
      update: async () => { actualizaciones++; },
    } } },
    '@/lib/auth': { getUserFromRequest: () => null },
    '@/lib/reporte': { MAX_FOTO: 5 * 1024 * 1024 },
    '@/lib/fotos-emergencia': {
      verificarPermisoFoto: (_id, permiso) => permiso === 'permiso-test',
      tipoFoto: () => 'image/png', leerFoto: async () => Buffer.from('foto'),
      guardarFoto: async () => { if (falloDisco) throw new Error('Disco no disponible'); },
    },
  });
  const contexto = { params: Promise.resolve({ id: 'caso-guardado' }) };
  const solicitud = permiso => new NextRequest('http://localhost/api/emergencias/caso-guardado/foto', {
    method: 'POST', headers: { 'x-permiso-foto': permiso }, body: 'foto',
  });
  assert.equal((await fotoApi.POST(solicitud('no-valido'), contexto)).status, 403);
  const log = console.error;
  console.error = () => {};
  try { assert.equal((await fotoApi.POST(solicitud('permiso-test'), contexto)).status, 503); }
  finally { console.error = log; }
  assert.equal(actualizaciones, 0);
  falloDisco = false;
  assert.equal((await fotoApi.POST(solicitud('permiso-test'), contexto)).status, 200);
  assert.equal(actualizaciones, 1);
  assert.equal((await fotoApi.GET(new NextRequest('http://localhost/foto'), contexto)).status, 401);
});

test('permiso de foto no sirve para otro caso; rechaza alteraciones y vencimiento', () => {
  const anterior = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'secreto-exclusivo-de-pruebas';
  try {
    const permiso = fotos.permisoFoto('caso-a');
    assert.equal(fotos.verificarPermisoFoto('caso-a', permiso), true);
    assert.equal(fotos.verificarPermisoFoto('caso-b', permiso), false);
    assert.equal(fotos.verificarPermisoFoto('caso-a', `${permiso}a`), false);
    assert.equal(fotos.verificarPermisoFoto('caso-a', `1.${'a'.repeat(64)}`), false);
    assert.equal(fotos.verificarPermisoFoto('caso-a', ''), false);
  } finally { if (anterior === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = anterior; }
});

test('foto persistente acepta PNG y rechaza SVG, exceso de tamaño y rutas ajenas', async () => {
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'mdw-fotos-test-'));
  const anterior = process.env.EMERGENCY_UPLOAD_DIR;
  process.env.EMERGENCY_UPLOAD_DIR = carpeta;
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX2kAAAAASUVORK5CYII=', 'base64');
  try {
    await fotos.guardarFoto('caso-a', png);
    assert.deepEqual(await fotos.leerFoto('caso-a'), png);
    assert.equal(fotos.tipoFoto(png), 'image/png');
    await assert.rejects(fotos.guardarFoto('caso-a', Buffer.from('<svg></svg>')), /FOTO_INVALIDA/);
    await assert.rejects(fotos.guardarFoto('caso-a', Buffer.alloc(5 * 1024 * 1024 + 1)), /FOTO_INVALIDA/);
    await assert.rejects(fotos.guardarFoto('../ajeno', png), /ID_INVALIDO/);
  } finally {
    if (anterior === undefined) delete process.env.EMERGENCY_UPLOAD_DIR; else process.env.EMERGENCY_UPLOAD_DIR = anterior;
    fs.rmSync(carpeta, { recursive: true });
  }
});
