const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const { NextRequest } = require('next/server');
function cargar(ruta, mocks) {
  const codigo = ts.transpileModule(fs.readFileSync(ruta, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const modulo = { exports: {} };
  new Function('require', 'module', 'exports', codigo)(nombre => mocks[nombre] ?? require(nombre), modulo, modulo.exports);
  return modulo.exports;
}
let rol = 'VOLUNTARIO', destino = 'VOLUNTARIO', cambios;
const db = { usuario: {
  findUnique: async ({ where }) => where.id === 'inexistente' ? null : { rol: where.id === 'actor' ? rol : destino },
  update: async datos => { cambios = datos; return { id: 'destino', password: 'secreto', rol: destino }; },
} };
const admin = cargar('src/lib/usuarios-admin.ts', { '../../config/database': { db } });
let autenticado = true;
const ruta = cargar('src/app/api/usuarios/[id]/route.ts', {
  '@/lib/auth': { getUserFromRequest: () => autenticado ? { id: 'actor', rol: 'ADMIN' } : null },
  '@/lib/usuarios-admin': admin,
  '../../../../../services/usuario.service': { UsuarioService: class { async obtenerPerfil() { return { id: 'destino' }; } } },
});
const contexto = { params: Promise.resolve({ id: 'destino' }) };
function request(body) { return new NextRequest('http://localhost/api/usuarios/destino', { method: 'PATCH', body: JSON.stringify(body) }); }
test('permisos, validación y edición administrativa', async () => {
  assert.equal((await ruta.GET(request({}), contexto)).status, 403);
  assert.equal((await ruta.PATCH(request({ rol: 'COORDINADOR' }), contexto)).status, 403);
  autenticado = false;
  assert.equal((await ruta.GET(request({}), contexto)).status, 401);
  autenticado = true; rol = 'COORDINADOR';
  assert.equal((await ruta.GET(request({}), contexto)).status, 200);
  for (const body of [{ rol: 'ADMIN' }, { password: 'injected' }, { persona: { fechaNac: '2025-02-31' } }, { persona: { nombre: ' ' } }]) {
    assert.equal((await ruta.PATCH(request(body), contexto)).status, 400);
  }
  const respuesta = await ruta.PATCH(request({ rol: 'COORDINADOR', nombreUsuario: 'nuevo', persona: { nombre: 'Ana', telefonos: [] } }), contexto);
  assert.equal(respuesta.status, 200);
  assert.equal((await respuesta.json()).password, undefined);
  assert.equal(cambios.data.rol, 'COORDINADOR');
  assert.deepEqual(cambios.data.persona.update.telefonos, { deleteMany: {}, create: [] });
  destino = 'ADMIN';
  assert.equal((await ruta.PATCH(request({ rol: 'VOLUNTARIO' }), contexto)).status, 403);
  assert.equal((await ruta.PATCH(request({ rol: 'VOLUNTARIO' }), { params: Promise.resolve({ id: 'inexistente' }) })).status, 404);
});

test('cuenta propia permite datos personales y rechaza rol e identidad ajena', async () => {
  const cuenta = cargar('src/app/api/usuarios/me/route.ts', {
    '@/lib/auth': { getUserFromRequest: () => autenticado ? { id: 'actor', rol: 'VOLUNTARIO' } : null },
    '@/lib/cursoErrores': { leerBody: req => req.json(), RESPUESTA_NO_AUTORIZADO: () => new Response(null, { status: 401 }) },
    '@/lib/usuarios-admin': admin,
    '../../../../../services/usuario.service': { UsuarioService: class {} },
  });
  autenticado = true; rol = 'VOLUNTARIO';
  assert.equal((await cuenta.PATCH(request({ persona: { nombre: 'Ana', telefonos: [] } }))).status, 200);
  assert.equal(cambios.where.id, 'actor');
  assert.equal(cambios.data.rol, undefined);
  for (const body of [{ rol: 'COORDINADOR' }, { id: 'destino', nombreUsuario: 'otro' }, { password: 'secreto' }]) {
    assert.equal((await cuenta.PATCH(request(body))).status, 400);
  }
  rol = 'ADMIN';
  assert.equal((await cuenta.PATCH(request({ nombreUsuario: 'admin' }))).status, 200);
  autenticado = false;
  assert.equal((await cuenta.PATCH(request({ nombreUsuario: 'intruso' }))).status, 401);
});

test('historial filtra por usuario y excluye certificados eliminados', async () => {
  let emergencias, certificados;
  const { UsuarioHistorial } = cargar('src/components/usuario-historial.tsx', {
    '../../config/database': { db: {
      usuarioEmergencia: { findMany: async consulta => { emergencias = consulta; return []; } },
      certificado: { findMany: async consulta => { certificados = consulta; return []; } },
    } },
    './ui': { Card: () => null },
  });
  await UsuarioHistorial({ usuarioId: 'perfil-autorizado' });
  assert.deepEqual(emergencias.where, { usuarioId: 'perfil-autorizado' });
  assert.deepEqual(certificados.where, { usuarioId: 'perfil-autorizado', fechaEliminacion: null });
  assert.equal(certificados.select.curso.select.titulo, true);
  assert.equal(emergencias.select.emergencia.select.estado, true);
});
