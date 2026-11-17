const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const { NextRequest } = require('next/server');
function cargar(ruta, mocks) {
  const codigo = ts.transpileModule(fs.readFileSync(ruta, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const modulo = { exports: {} };
  new Function('require', 'module', 'exports', codigo)(nombre => mocks[nombre] ?? (nombre === '@/lib/respuesta-publica' ? cargar('src/lib/respuesta-publica.ts', {}) : require(nombre)), modulo, modulo.exports);
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

test('serialización pública elimina contraseñas anidadas sin perder fechas ni cookies', async () => {
  const { jsonPublico } = cargar('src/lib/respuesta-publica.ts', {});
  const respuesta = jsonPublico({ usuario: { password: 'hash', id: 'u' }, lista: [{ passwordHash: 'hash' }], fecha: new Date('2026-01-01') }, { status: 201 });
  respuesta.cookies.set('token', 'sesion');
  assert.equal(respuesta.status, 201);
  assert.equal(respuesta.cookies.get('token').value, 'sesion');
  assert.deepEqual(await respuesta.json(), { usuario: { id: 'u' }, lista: [{}], fecha: '2026-01-01T00:00:00.000Z' });
});

test('login resuelve nombre o email y nunca devuelve la contraseña', async () => {
  let consulta;
  const { UsuarioRepository } = cargar('repositories/usuario.repository.ts', { '../config/database': { db: { usuario: {
    findUnique: async args => { consulta = args.where; return args.where.nombreUsuario === 'ana' || args.where.email === 'ana@example.com' ? { id: 'u', nombreUsuario: 'ana', rol: 'VOLUNTARIO', password: 'hash' } : null; },
  } } } });
  const { AuthService } = cargar('services/auth.service.ts', {
    '../repositories/usuario.repository': { UsuarioRepository },
    bcrypt: { compare: async (plano, hash) => plano === 'correcta' && hash === 'hash' },
    jsonwebtoken: { sign: () => 'token' },
  });
  process.env.JWT_SECRET = 'test';
  const auth = new AuthService();
  assert.equal((await auth.login('ana', 'correcta')).usuario.nombreUsuario, 'ana');
  const resultado = await auth.login(' ANA@EXAMPLE.COM ', 'correcta');
  assert.equal(consulta.email, 'ana@example.com');
  assert.equal(JSON.stringify(resultado).includes('hash'), false);
  await assert.rejects(auth.login('ana', 'incorrecta'), /CREDANCIALES_INVALIDAS/);
});

test('solo voluntarios con rol vigente pueden pedir ascenso', async () => {
  let actual = 'COORDINADOR', creada = false;
  const { SolicitudAscensoService } = cargar('services/solicitudAscenso.service.ts', {
    '../config/database': { db: { usuario: { findUnique: async () => actual ? { rol: actual } : null } } },
    '../repositories/solicitudAscenso.repository': { SolicitudAscensoRepository: class {
      async findPendienteByUsuarioId() { return null; }
      async crear() { creada = true; return { estado: 'PENDIENTE' }; }
    } },
  });
  const servicio = new SolicitudAscensoService();
  for (actual of ['COORDINADOR', 'ADMIN', null]) await assert.rejects(servicio.crear('u'), /SOLO_VOLUNTARIOS/);
  assert.equal(creada, false);
  actual = 'VOLUNTARIO';
  assert.equal((await servicio.crear('u')).estado, 'PENDIENTE');
});

test('todas las respuestas JSON de API usan el filtro público', () => {
  for (const ruta of fs.readdirSync('src/app/api', { recursive: true }).filter(p => p.endsWith('route.ts'))) {
    const codigo = fs.readFileSync(`src/app/api/${ruta}`, 'utf8');
    assert.doesNotMatch(codigo, /\b(?:NextResponse|Response)\.json\(/, ruta);
  }
});

test('destinos de login conservan cuenta y ascensos sin permitir redirecciones externas', () => {
  const { safeDestination } = cargar('src/lib/session.ts', {
    './db': { db: {} },
    'next/headers': {}, 'next/navigation': {},
  });
  assert.equal(safeDestination('/cuenta'), '/cuenta');
  assert.equal(safeDestination('/ascensos'), '/ascensos');
  const casoPublico = '/casos/cm123456789abcdefghijklmno';
  assert.equal(safeDestination(casoPublico), casoPublico);
  assert.equal(safeDestination('https://example.com'), '/casos');
  assert.equal(safeDestination('//example.com'), '/casos');
});


test('coordinación no puede cambiar el email de otra persona; cada uno sí el propio', () => {
  const { editarUsuarioSchema, editarCuentaSchema } = cargar('src/lib/usuarios-admin.ts', { '../../config/database': { db: {} } });
  assert.equal(editarUsuarioSchema.safeParse({ email: 'otro@example.com' }).success, false);
  assert.equal(editarUsuarioSchema.safeParse({ nombreUsuario: 'ana', email: 'otro@example.com' }).success, false);
  assert.equal(editarUsuarioSchema.safeParse({ nombreUsuario: 'ana', rol: 'COORDINADOR' }).success, true);
  assert.equal(editarCuentaSchema.safeParse({ email: 'Ana@Example.com' }).data.email, 'ana@example.com');
});

test('registro por API exige la misma política de contraseña que el formulario', async () => {
  let registrado;
  const registro = cargar('src/lib/registro.ts', {});
  const api = cargar('src/app/api/usuarios/route.ts', {
    '@/lib/auth': { getUserFromRequest: () => null },
    '@/lib/cursoErrores': { RESPUESTA_NO_AUTORIZADO: () => new Response(null, { status: 401 }) },
    '@/lib/usuarios-admin': { puedeGestionarUsuarios: async () => false },
    '@/lib/registro': registro,
    '../../../../services/usuario.service': { UsuarioService: class { async registrarUsuario(dto) { registrado = dto; return { id: 'nuevo' }; } } },
  });
  const alta = body => api.POST(new NextRequest('http://localhost/api/usuarios', { method: 'POST', body: JSON.stringify(body) }));
  const valido = { nombreUsuario: ' ana ', email: ' ANA@Example.com ', password: 'contraseña-segura', persona: { nombre: 'Ana', apellido: 'Pérez', fechaNac: '1990-05-10' } };
  for (const body of [
    { ...valido, password: 'a' }, { ...valido, password: '1234567' }, { ...valido, password: 'ñ'.repeat(37) },
    { ...valido, password: 12345678 }, { ...valido, nombreUsuario: { $ne: '' } }, { ...valido, email: 'no-es-email' },
    { ...valido, persona: { ...valido.persona, fechaNac: 'ayer' } }, { ...valido, persona: { ...valido.persona, fechaNac: '2999-01-01' } },
    { ...valido, persona: undefined }, { ...valido, nombreUsuario: undefined },
  ]) {
    registrado = undefined;
    assert.equal((await alta(body)).status, 400);
    assert.equal(registrado, undefined);
  }
  assert.equal((await alta(valido)).status, 201);
  assert.equal(registrado.nombreUsuario, 'ana');
  assert.equal(registrado.email, 'ana@example.com');
  assert.equal(registrado.password, 'contraseña-segura');
  assert.deepEqual(registrado.persona, { nombre: 'Ana', apellido: 'Pérez', fechaNac: new Date('1990-05-10') });
  const telefonos = [{ tipo: 'celular', numero: '1122334455' }];
  assert.equal((await alta({ ...valido, persona: { ...valido.persona, telefonos } })).status, 201);
  assert.deepEqual(registrado.persona.telefonos, telefonos);
  const { email: _sinEmail, ...sinEmail } = valido;
  assert.equal((await alta(sinEmail)).status, 201);
  assert.equal(registrado.email, undefined);
});

test('login bloquea la cuenta tras diez fallos seguidos y la API responde 429', async () => {
  const servicio = cargar('services/auth.service.ts', {
    '../repositories/usuario.repository': { UsuarioRepository: class {
      async findParaLogin(nombre) { return ['ana', 'ana@example.com', 'ána'].includes(nombre.toLowerCase()) ? { id: 'u', nombreUsuario: 'ana', rol: 'VOLUNTARIO', password: 'hash' } : null; }
    } },
    bcrypt: { compare: async plano => plano === 'correcta' },
    jsonwebtoken: { sign: () => 'token' },
  });
  process.env.JWT_SECRET = 'test';
  const auth = new servicio.AuthService();
  for (let i = 0; i < 9; i++) await assert.rejects(auth.login('ana', 'incorrecta'), /CREDANCIALES_INVALIDAS/);
  assert.equal((await auth.login('ana', 'correcta')).token, 'token'); // Un ingreso correcto reinicia el contador.
  // Los fallos se cuentan por cuenta: usuario, email y variantes que la base resuelve igual comparten contador.
  for (const alias of [' ANA ', 'ana@example.com', 'ána', 'ana', 'ANA@example.com']) {
    for (let i = 0; i < 2; i++) await assert.rejects(auth.login(alias, 'incorrecta'), /CREDANCIALES_INVALIDAS/);
  }
  for (const alias of ['ana', 'ana@example.com', 'ána']) await assert.rejects(auth.login(alias, 'correcta'), /DEMASIADOS_INTENTOS/);
  for (let i = 0; i < 10; i++) await assert.rejects(auth.login('inexistente', 'x'), /CREDANCIALES_INVALIDAS/);
  await assert.rejects(auth.login('inexistente', 'x'), /DEMASIADOS_INTENTOS/);
  assert.equal((await auth.login('otra', 'x').catch(e => e.message)), 'CREDANCIALES_INVALIDAS'); // Otra cuenta no queda afectada.

  const ruta = cargar('src/app/api/auth/login/route.ts', {
    '../../../../../services/auth.service': servicio,
    '@/lib/session': { sessionCookie: {} },
  });
  const log = console.error;
  console.error = () => {};
  try {
    const respuesta = await ruta.POST(new NextRequest('http://localhost/api/auth/login', { method: 'POST', body: JSON.stringify({ nombreUsuario: 'ana', password: 'correcta' }) }));
    assert.equal(respuesta.status, 429);
  } finally { console.error = log; }
});

test('llenar el registro de fallos con usuarios inexistentes no desbloquea una cuenta real', async () => {
  const servicio = cargar('services/auth.service.ts', {
    '../repositories/usuario.repository': { UsuarioRepository: class {
      async findParaLogin(nombre) { return nombre === 'ana' ? { id: 'u', nombreUsuario: 'ana', rol: 'VOLUNTARIO', password: 'hash' } : null; }
    } },
    bcrypt: { compare: async plano => plano === 'correcta' },
    jsonwebtoken: { sign: () => 'token' },
  });
  process.env.JWT_SECRET = 'test';
  const auth = new servicio.AuthService();
  for (let i = 0; i < 10; i++) await assert.rejects(auth.login('ana', 'incorrecta'), /CREDANCIALES_INVALIDAS/);
  await assert.rejects(auth.login('ana', 'correcta'), /DEMASIADOS_INTENTOS/);
  // Diez mil identificadores distintos llenan el registro en memoria.
  for (let i = 0; i < 10_000; i++) await assert.rejects(auth.login(`falso-${i}`, 'x'), /CREDANCIALES_INVALIDAS/);
  await assert.rejects(auth.login('ana', 'correcta'), /DEMASIADOS_INTENTOS/);
  // Un identificador nuevo se sigue contando: se descartan primero los inexistentes más viejos.
  for (let i = 0; i < 10; i++) await assert.rejects(auth.login('otro-falso', 'x'), /CREDANCIALES_INVALIDAS/);
  await assert.rejects(auth.login('otro-falso', 'x'), /DEMASIADOS_INTENTOS/);
});
