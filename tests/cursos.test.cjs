const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function cargar(archivo, dobles) {
  const fuente = ts.transpileModule(fs.readFileSync(path.resolve(archivo), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  const modulo = { exports: {} };
  new Function('require', 'module', 'exports', fuente)(nombre => nombre in dobles ? dobles[nombre] : require(nombre), modulo, modulo.exports);
  return modulo.exports;
}

// Doble mínimo de Prisma para cursos: alcanza para crear, leer y editar.
function escenario() {
  const cursos = [];
  const cursosModelo = {
    async create({ data }) { const { cursosRelAtributos, ...resto } = data; const fila = { ...resto, id: `k${cursos.length + 1}`, fechaEliminacion: null, cursosRelAtributos: [] }; cursos.push(fila); return fila; },
    async findFirst({ where }) { return cursos.find(c => c.id === where.id && c.fechaEliminacion === null) ?? null; },
    async update({ where, data }) { const c = cursos.find(x => x.id === where.id); for (const [k, v] of Object.entries(data)) if (v !== undefined) c[k] = v; return c; },
    async findUniqueOrThrow({ where }) { return cursos.find(x => x.id === where.id); },
  };
  const db = { cursos: cursosModelo, cursosAtributos: { async count() { return 0; } }, cursosRelAtributos: { async updateMany() { return { count: 0 }; } } };
  db.$transaction = async fn => fn(db);
  const { CursoRepository } = cargar('repositories/curso.repository.ts', { '../config/database': { db } });
  const { CursoAtributoRepository } = cargar('repositories/cursoAtributo.repository.ts', { '../config/database': { db } });
  const { CursoService } = cargar('services/curso.service.ts', {
    '../repositories/curso.repository': { CursoRepository },
    '../repositories/cursoAtributo.repository': { CursoAtributoRepository },
  });
  return { servicio: new CursoService(), cursos };
}

const base = (extra = {}) => ({ titulo: 'RCP', descripcion: 'Reanimación', fechaDesde: '2026-01-01', fechaHasta: '2026-02-01', ...extra });

test('crear guarda horas y el certificado que otorga', async () => {
  const { servicio } = escenario();
  const c = await servicio.crear(base({ horas: '20', certificadoNombre: ' RCP básico ', certificadoEmisor: 'Cruz Roja' }), 'coord');
  assert.equal(c.horas, 20);
  assert.equal(c.certificadoNombre, 'RCP básico');
  assert.equal(c.certificadoEmisor, 'Cruz Roja');
  const sin = await servicio.crear(base(), 'coord');
  assert.equal(sin.horas, null);
  assert.equal(sin.certificadoNombre, null);
  assert.equal(sin.certificadoEmisor, null);
});

test('las horas son un entero entre 1 y 10000', async () => {
  const { servicio } = escenario();
  for (const horas of ['0', '-3', '1.5', 'veinte', 10001, true]) {
    await assert.rejects(servicio.crear(base({ horas }), 'coord'), /HORAS_INVALIDAS/, String(horas));
  }
  assert.equal((await servicio.crear(base({ horas: 10000 }), 'coord')).horas, 10000);
});

test('el certificado que otorga exige nombre y emisor juntos', async () => {
  const { servicio } = escenario();
  await assert.rejects(servicio.crear(base({ certificadoNombre: 'RCP' }), 'coord'), /CERTIFICADO_INCOMPLETO/);
  await assert.rejects(servicio.crear(base({ certificadoNombre: 'RCP', certificadoEmisor: '   ' }), 'coord'), /CERTIFICADO_INCOMPLETO/);
  await assert.rejects(servicio.crear(base({ certificadoNombre: 3, certificadoEmisor: 'X' }), 'coord'), /CAMPO_DEBE_SER_TEXTO/);
});

test('editar combina con lo guardado: se puede quitar el certificado, no dejarlo a medias', async () => {
  const { servicio } = escenario();
  const c = await servicio.crear(base({ horas: 8, certificadoNombre: 'RCP', certificadoEmisor: 'Cruz Roja' }), 'coord');
  await assert.rejects(servicio.actualizar(c.id, { certificadoEmisor: '' }, 'coord'), /CERTIFICADO_INCOMPLETO/);
  assert.equal((await servicio.actualizar(c.id, { certificadoNombre: 'RCP avanzado' }, 'coord')).certificadoNombre, 'RCP avanzado');
  const sin = await servicio.actualizar(c.id, { certificadoNombre: null, certificadoEmisor: null, horas: '' }, 'coord');
  assert.equal(sin.certificadoNombre, null);
  assert.equal(sin.certificadoEmisor, null);
  assert.equal(sin.horas, null);
  await assert.rejects(servicio.actualizar(c.id, {}, 'coord'), /SIN_CAMBIOS/);
});

test('las rutas de cursos leen el rol vigente de la base, no el del token', () => {
  for (const archivo of ['src/app/api/cursos/route.ts', 'src/app/api/cursos/[id]/route.ts', 'src/app/api/cursos-atributos/route.ts', 'src/app/api/cursos-atributos/[id]/route.ts']) {
    const fuente = fs.readFileSync(archivo, 'utf8');
    assert.match(fuente, /actorActual\(req\)/, archivo);
    assert.doesNotMatch(fuente, /getUserFromRequest/, archivo);
  }
});
