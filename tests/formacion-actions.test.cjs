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

// Server Actions de formación con servicios dobles: se prueba el permiso y la traducción de errores a campos.
function escenario({ sesion = { id: 'v', rol: 'VOLUNTARIO', nombreUsuario: 'vol' }, certificado = {}, curso = {} } = {}) {
  const llamadas = { avisos: [], revalidados: 0, crearCurso: [], crearCertificado: [], resolver: [] };
  const cursoErrores = cargar('src/lib/cursoErrores.ts', {});
  const acciones = cargar('src/app/actions/formacion.ts', {
    'next/cache': { revalidatePath: () => { llamadas.revalidados++; } },
    '@/lib/session': { getSession: async () => sesion },
    '@/lib/formulario': cargar('src/lib/formulario.ts', {}),
    '@/lib/certificadoErrores': cargar('src/lib/certificadoErrores.ts', { './cursoErrores': cursoErrores }),
    '@/lib/cursoErrores': cursoErrores,
    '@/lib/certificados': { resolverCertificado: async (...args) => { llamadas.resolver.push(args); if (certificado.resolver) throw new Error(certificado.resolver); } },
    '@/lib/avisos': { avisarCertificadoNuevo: (...args) => llamadas.avisos.push(args) },
    '../../../services/certificado.service': { CertificadoService: class {
      async crear(entrada, archivo, quien) { llamadas.crearCertificado.push({ entrada, archivo, quien }); if (certificado.error) throw new Error(certificado.error); return { id: 'c1' }; }
      async actualizar() { if (certificado.error) throw new Error(certificado.error); }
      async eliminar() {}
    } },
    '../../../services/curso.service': { CursoService: class {
      async crear(entrada, usuarioId) { llamadas.crearCurso.push({ entrada, usuarioId }); if (curso.error) throw new Error(curso.error); }
      async actualizar() {}
      async eliminar() {}
    } },
  });
  return { acciones, llamadas };
}

const form = (campos) => { const f = new FormData(); for (const [k, v] of Object.entries(campos)) f.append(k, v); return f; };

test('sin sesión, ninguna acción guarda', async () => {
  const { acciones, llamadas } = escenario({ sesion: null });
  const r = await acciones.guardarCertificadoAction(null, form({ nombre: 'X' }));
  assert.equal(r.ok, false);
  assert.equal(r.error, 'Tu sesión venció. Volvé a ingresar.');
  assert.equal(llamadas.crearCertificado.length, 0);
});

test('cursos y revisión son solo de coordinación (rol vigente)', async () => {
  const { acciones, llamadas } = escenario();
  assert.equal((await acciones.guardarCursoAction(null, form({ titulo: 'RCP' }))).error, 'No tenés permiso para realizar esta operación.');
  assert.equal((await acciones.revisarCertificadoAction('c1', form({ estado: 'APROBADO' }))).ok, false);
  assert.equal((await acciones.darDeBajaCursoAction('k1')).ok, false);
  assert.equal(llamadas.crearCurso.length + llamadas.resolver.length, 0);
});

test('cargar certificado: el archivo llega como bytes, el dueño es la sesión y se avisa a coordinación', async () => {
  const { acciones, llamadas } = escenario();
  const datos = form({ cursoId: 'rcp', codigoVerificacion: 'A-1', atributos: '[{"campoId":"horas","dato":"20"}]' });
  datos.append('archivo', new File([Buffer.from('%PDF-1.7')], 'mi.pdf', { type: 'application/pdf' }));
  const r = await acciones.guardarCertificadoAction(null, datos);
  assert.deepEqual(r, { ok: true, error: '', campos: {} });
  const [{ entrada, archivo, quien }] = llamadas.crearCertificado;
  assert.equal(quien.id, 'v');
  assert.equal(entrada.cursoId, 'rcp');
  assert.deepEqual(entrada.atributos, [{ campoId: 'horas', dato: '20' }]);
  assert.equal(archivo.nombre, 'mi.pdf');
  assert.equal(Buffer.from(archivo.bytes).toString(), '%PDF-1.7');
  assert.deepEqual(llamadas.avisos, [['c1', 'v']]);
  assert.ok(llamadas.revalidados > 0);
});

test('errores de certificado: con campo van debajo del campo; sin campo, arriba', async () => {
  let { acciones } = escenario({ certificado: { error: 'ARCHIVO_INVALIDO' } });
  assert.deepEqual((await acciones.guardarCertificadoAction(null, form({}))).campos, { archivo: 'Elegí un PDF o una imagen JPG, PNG o WebP de hasta 5 MB.' });
  ({ acciones } = escenario({ certificado: { error: 'ATRIBUTO_VALOR_INVALIDO' } }));
  assert.ok((await acciones.guardarCertificadoAction(null, form({}))).campos.datosAdicionales);
  ({ acciones } = escenario({ certificado: { error: 'CERTIFICADO_DUPLICADO' } }));
  const duplicado = await acciones.guardarCertificadoAction(null, form({}));
  assert.equal(duplicado.error, 'Ya tenés un certificado de este curso pendiente o aprobado.');
  assert.deepEqual(duplicado.campos, {});
  ({ acciones } = escenario({ sesion: { id: 'c', rol: 'COORDINADOR' }, certificado: { resolver: 'MOTIVO_REQUERIDO' } }));
  assert.deepEqual((await acciones.revisarCertificadoAction('c1', form({ estado: 'RECHAZADO' }))).campos, { motivo: 'Para rechazar, escribí el motivo (hasta 2000 caracteres).' });
});

test('curso: la casilla marcada exige nombre y emisor; desmarcada quita el certificado', async () => {
  const coord = { id: 'c', rol: 'COORDINADOR' };
  let { acciones, llamadas } = escenario({ sesion: coord });
  const incompleto = await acciones.guardarCursoAction(null, form({ titulo: 'RCP', otorgaCertificado: 'si', certificadoNombre: 'RCP', certificadoEmisor: ' ' }));
  assert.deepEqual(incompleto.campos, { certificadoNombre: 'Para que el curso otorgue un certificado, completá su nombre y la entidad emisora.' });
  assert.equal(llamadas.crearCurso.length, 0);
  await acciones.guardarCursoAction(null, form({ titulo: 'RCP', otorgaCertificado: 'no', certificadoNombre: 'quedó escrito', horas: '' }));
  assert.equal(llamadas.crearCurso[0].entrada.certificadoNombre, null);
  assert.equal(llamadas.crearCurso[0].entrada.certificadoEmisor, null);
  assert.equal(llamadas.crearCurso[0].usuarioId, 'c');
  ({ acciones } = escenario({ sesion: coord, curso: { error: 'RANGO_FECHAS_INVALIDO' } }));
  assert.deepEqual((await acciones.guardarCursoAction(null, form({}))).campos, { fechaHasta: 'La fecha de fin no puede ser anterior a la de inicio.' });
});
