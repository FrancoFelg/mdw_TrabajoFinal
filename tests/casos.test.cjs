const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function cargar(archivo) {
  const fuente = ts.transpileModule(fs.readFileSync(path.resolve(archivo), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  const modulo = { exports: {} };
  new Function('require', 'module', 'exports', fuente)(require, modulo, modulo.exports);
  return modulo.exports;
}

const { distanciaMetros, filtrarPorRadio, RADIOS_CERCANIA } = cargar('src/lib/casos.ts');

// Punto de partida: Monumento a la Bandera, Rosario.
const yo = { lat: -32.9477, lng: -60.6304 };
// Casos a distancias conocidas: 0,01° de latitud son unos 1112 m.
const casos = [
  { id: 'cerca', lat: -32.9437, lng: -60.6304 },  // ~445 m
  { id: 'medio', lat: -32.9177, lng: -60.6304 },  // ~3,3 km
  { id: 'lejos', lat: -32.8777, lng: -60.6304 },  // ~7,8 km
  { id: 'otra-ciudad', lat: -34.6037, lng: -58.3816 }, // Buenos Aires, ~280 km
  { id: 'sin-coordenadas', lat: null, lng: null },
];
const ids = lista => lista.map(c => c.id);

test('distanciaMetros: 0,01° de latitud son unos 1112 m', () => {
  const d = distanciaMetros(yo, { lat: yo.lat + 0.01, lng: yo.lng });
  assert.ok(Math.abs(d - 1112) < 5, `distancia inesperada: ${d}`);
});

test('filtrarPorRadio: cada radio deja solo los casos que entran', () => {
  assert.deepEqual(ids(filtrarPorRadio(casos, yo, 1000)), ['cerca']);
  assert.deepEqual(ids(filtrarPorRadio(casos, yo, 5000)), ['cerca', 'medio']);
  assert.deepEqual(ids(filtrarPorRadio(casos, yo, 10000)), ['cerca', 'medio', 'lejos']);
});

test('filtrarPorRadio: sin radio elegido o sin ubicación propia no filtra nada', () => {
  assert.deepEqual(filtrarPorRadio(casos, yo, null), casos);
  assert.deepEqual(filtrarPorRadio(casos, null, 1000), casos);
});

test('filtrarPorRadio: un caso sin coordenadas queda afuera cuando hay radio', () => {
  for (const radio of RADIOS_CERCANIA) assert.ok(!ids(filtrarPorRadio(casos, yo, radio)).includes('sin-coordenadas'));
});

test('filtrarPorRadio: el límite es inclusivo y no modifica la lista original', () => {
  const borde = [{ id: 'borde', lat: yo.lat + 0.01, lng: yo.lng }];
  const exacta = distanciaMetros(yo, borde[0]);
  assert.deepEqual(ids(filtrarPorRadio(borde, yo, exacta)), ['borde']);
  const copia = [...casos];
  filtrarPorRadio(casos, yo, 1000);
  assert.deepEqual(casos, copia);
});