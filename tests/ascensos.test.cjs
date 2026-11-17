const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { NextRequest } = require('next/server');

function cargar(archivo, dobles) {
  const fuente = ts.transpileModule(fs.readFileSync(path.resolve(archivo), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  const modulo = { exports: {} };
  new Function('require', 'module', 'exports', fuente)(nombre => {
    if (nombre in dobles) return dobles[nombre];
    if (nombre.startsWith('.')) return cargar(path.resolve(path.dirname(archivo), `${nombre}.ts`), dobles);
    return require(nombre);
  }, modulo, modulo.exports);
  return modulo.exports;
}

function escenario() {
  let datos = { usuarios: [{ id: 'v', rol: 'VOLUNTARIO', nombreUsuario: 'ana' }, { id: 'c', rol: 'COORDINADOR' }, { id: 'a', rol: 'ADMIN' }], solicitudes: [], avisos: [] };
  let fallarAviso = false;
  const usuario = {
    async updateMany({ where, data }) {
      const filas = datos.usuarios.filter(u => u.id === where.id && u.rol === where.rol);
      filas.forEach(u => Object.assign(u, data));
      return { count: filas.length };
    },
    async findUnique({ where }) { return datos.usuarios.find(u => u.id === where.id) || null; },
    async findUniqueOrThrow(args) { const u = await usuario.findUnique(args); if (!u) throw Error('Ausente'); return u; },
    async findMany() { return datos.usuarios.filter(u => ['COORDINADOR', 'ADMIN'].includes(u.rol)); },
  };
  const solicitudAscenso = {
    async findFirst({ where }) { return datos.solicitudes.find(s => s.usuarioId === where.usuarioId && s.estado === where.estado) || null; },
    async create({ data }) { const s = { ...data, id: `s${datos.solicitudes.length}`, creadoEn: new Date() }; datos.solicitudes.push(s); return { ...s }; },
    async findUnique({ where }) { const s = datos.solicitudes.find(s => s.id === where.id); return s ? { ...s, usuario: await usuario.findUnique({ where: { id: s.usuarioId } }) } : null; },
    async updateMany({ where, data }) { const filas = datos.solicitudes.filter(s => s.id === where.id && s.estado === where.estado); filas.forEach(s => Object.assign(s, data)); return { count: filas.length }; },
    async findMany({ where }) { return datos.solicitudes.filter(s => !where.usuarioId || s.usuarioId === where.usuarioId); },
  };
  const db = { usuario, solicitudAscenso, notificacion: { async create({ data }) { if (fallarAviso) throw Error('Sin DB'); datos.avisos.push(data); return data; } } };
  db.$transaction = async fn => { const copia = structuredClone(datos); try { return await fn(db); } catch (e) { datos = copia; throw e; } };
  const { SolicitudAscensoRepository } = cargar('repositories/solicitudAscenso.repository.ts', { '../config/database': { db }, './emergencia.repository': { asegurarSinCasoEnCamino: async () => {} } });
  const { SolicitudAscensoService } = cargar('services/solicitudAscenso.service.ts', { '../config/database': { db }, '../repositories/solicitudAscenso.repository': { SolicitudAscensoRepository } });
  let token = { id: 'v', rol: 'VOLUNTARIO' };
  const api = cargar('src/lib/ascensos-api.ts', { '../../config/database': { db }, '../../services/solicitudAscenso.service': { SolicitudAscensoService }, './auth': { getUserFromRequest: () => token } });
  return { repo: new SolicitudAscensoRepository(), servicio: new SolicitudAscensoService(), api, datos: () => datos, token: t => { token = t; }, fallarAviso: () => { fallarAviso = true; } };
}
const peticion = (query = '') => new NextRequest(`http://localhost/api/solicitudes-ascenso${query}`);

test('crear avisa al voluntario y a toda coordinación; no duplica pendientes', async () => {
  const e = escenario();
  await e.servicio.crear('v');
  assert.equal(e.datos().solicitudes[0].estado, 'PENDIENTE');
  assert.deepEqual(e.datos().avisos.map(a => a.usuarioId).sort(), ['a', 'c', 'v']);
  await assert.rejects(e.servicio.crear('v'), /SOLICITUD_PENDIENTE_EXISTENTE/);
  assert.equal(e.datos().solicitudes.length, 1);
});
test('coordinadores y administradores no pueden pedir ascenso', async () => {
  const e = escenario();
  for (const id of ['c', 'a']) await assert.rejects(e.servicio.crear(id), /SOLO_VOLUNTARIOS/);
});

test('API conserva el rechazo a no voluntarios y notifica el fallo', async () => {
  const e = escenario();
  for (const rol of ['COORDINADOR', 'ADMIN']) {
    const id = rol === 'ADMIN' ? 'a' : 'c';
    e.token({ id, rol });
    const respuesta = await e.api.operarAscenso(peticion(), 'crear');
    assert.equal(respuesta.status, 403);
    assert.match((await respuesta.json()).error, /Solo los voluntarios/);
    assert.equal(e.datos().avisos.at(-1).usuarioId, id);
  }
  assert.equal(e.datos().solicitudes.length, 0);
});

test('historial de ascensos filtra credenciales incluso en relaciones anidadas', async () => {
  const e = escenario();
  e.token({ id: 'c', rol: 'COORDINADOR' });
  e.datos().solicitudes.push({ id: 's0', usuarioId: 'v', estado: 'PENDIENTE', usuario: { password: 'hash', nombreUsuario: 'ana' } });
  const respuesta = await e.api.listarAscensos(peticion());
  assert.equal(respuesta.status, 200);
  const datos = await respuesta.json();
  assert.equal(datos[0].usuario.password, undefined);
  assert.equal(datos[0].usuario.nombreUsuario, 'ana');
});
test('aprobar cambia rol y notifica a solicitante y revisor', async () => {
  const e = escenario(); const s = await e.servicio.crear('v');
  await e.servicio.aprobar(s.id, 'c');
  assert.equal(e.datos().usuarios[0].rol, 'COORDINADOR');
  assert.equal(e.datos().solicitudes[0].estado, 'APROBADO');
  assert.deepEqual(e.datos().avisos.slice(-2).map(a => a.usuarioId), ['v', 'c']);
  await assert.rejects(e.servicio.rechazar(s.id, 'c'), /SOLICITUD_NO_PENDIENTE/);
  assert.equal(e.datos().solicitudes[0].estado, 'APROBADO');
});
test('rechazar conserva rol, avisa a ambos y permite otra solicitud sin borrar historial', async () => {
  const e = escenario(); const s = await e.servicio.crear('v');
  await e.servicio.rechazar(s.id, 'c'); await e.servicio.crear('v');
  assert.equal(e.datos().usuarios[0].rol, 'VOLUNTARIO');
  assert.deepEqual((await e.repo.findAll('v')).map(s => s.estado), ['RECHAZADO', 'PENDIENTE']);
  assert.match(e.datos().avisos.find(a => a.clave === `ascenso:resultado:${s.id}`).titulo, /rechazada/);
});
test('un aviso fallido revierte el ascenso y la decisión', async () => {
  const e = escenario(); const s = await e.servicio.crear('v'); e.fallarAviso();
  await assert.rejects(e.servicio.aprobar(s.id, 'c'), /Sin DB/);
  assert.equal(e.datos().solicitudes[0].estado, 'PENDIENTE');
  assert.equal(e.datos().usuarios[0].rol, 'VOLUNTARIO');
});
test('API avisa errores de duplicación y de permisos sin resolver solicitudes', async () => {
  const e = escenario(); await e.servicio.crear('v');
  const duplicada = await e.api.operarAscenso(peticion(), 'crear');
  assert.equal(duplicada.status, 409);
  assert.match(e.datos().avisos.at(-1).cuerpo, /pendiente/);
  const prohibida = await e.api.operarAscenso(peticion(), 'aprobar', 's0');
  assert.equal(prohibida.status, 403);
  assert.equal(e.datos().solicitudes[0].estado, 'PENDIENTE');
  assert.equal(e.datos().avisos.at(-1).titulo, 'Operación de ascenso no completada');
});
test('API usa rol vigente y no el rol antiguo del JWT', async () => {
  const e = escenario(); const s = await e.servicio.crear('v');
  e.token({ id: 'c', rol: 'VOLUNTARIO' });
  assert.equal((await e.api.operarAscenso(peticion(), 'aprobar', s.id)).status, 200);
});
test('historial propio no acepta filtro ajeno; coordinación puede filtrar', async () => {
  const e = escenario(); await e.servicio.crear('v');
  assert.equal((await (await e.api.listarAscensos(peticion('?usuarioId=c'))).json()).length, 1);
  e.token({ id: 'c' });
  assert.equal((await (await e.api.listarAscensos(peticion('?usuarioId=c'))).json()).length, 0);
  e.token(null);
  assert.equal((await e.api.listarAscensos(peticion())).status, 401);
  assert.equal((await e.api.operarAscenso(peticion(), 'crear')).status, 401);
});
test('no permite resolver solicitud propia ni inexistente', async () => {
  const e = escenario(); const s = await e.servicio.crear('v');
  await assert.rejects(e.repo.resolver(s.id, 'APROBADO', 'v'), /SOLICITUD_PROPIA/);
  await assert.rejects(e.servicio.aprobar('ausente', 'c'), /SOLICITUD_NO_ENCONTRADA/);
});
test('la escritura condicional impide reemplazar una decisión aun sin validación previa del servicio', async () => {
  const e = escenario(); const s = await e.servicio.crear('v');
  await e.repo.resolver(s.id, 'RECHAZADO', 'c');
  await assert.rejects(e.repo.resolver(s.id, 'APROBADO', 'a'), /SOLICITUD_NO_PENDIENTE/);
  assert.equal(e.datos().solicitudes[0].estado, 'RECHAZADO');
  assert.equal(e.datos().usuarios[0].rol, 'VOLUNTARIO');
});
test('un fallo de avisos también revierte la creación del pedido', async () => {
  const e = escenario(); e.fallarAviso();
  await assert.rejects(e.servicio.crear('v'), /Sin DB/);
  assert.equal(e.datos().solicitudes.length, 0);
});
