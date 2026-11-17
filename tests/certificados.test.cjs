const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ts = require('typescript');

function cargar(archivo, dobles) {
  const fuente = ts.transpileModule(fs.readFileSync(path.resolve(archivo), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  const modulo = { exports: {} };
  new Function('require', 'module', 'exports', fuente)(nombre => nombre in dobles ? dobles[nombre] : require(nombre), modulo, modulo.exports);
  return modulo.exports;
}

const PDF = Buffer.from('%PDF-1.7\n%prueba\n');
const PNG = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.from('resto')]);

function cargarArchivos() {
  const fotos = cargar('src/lib/fotos-emergencia.ts', { './reporte': { MAX_FOTO: 5 * 1024 * 1024 } });
  return cargar('src/lib/archivos-certificado.ts', { './fotos-emergencia': fotos });
}

// ---------- Archivos ----------

test('tipoArchivo reconoce pdf, jpeg, png y webp por contenido', () => {
  const a = cargarArchivos();
  assert.equal(a.tipoArchivo(PDF), 'application/pdf');
  assert.equal(a.tipoArchivo(PNG), 'image/png');
  assert.equal(a.tipoArchivo(Buffer.from([0xff, 0xd8, 0xff, 0xe0])), 'image/jpeg');
  assert.equal(a.tipoArchivo(Buffer.from('RIFF0000WEBPVP8 ')), 'image/webp');
  assert.equal(a.tipoArchivo(Buffer.from('hola.pdf')), null);
});

test('guardar y leer devuelve los mismos bytes; borrar es idempotente', async () => {
  process.env.CERTIFICATE_UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'cert-'));
  const a = cargarArchivos();
  await a.guardarArchivo('c1', PDF);
  assert.deepEqual(await a.leerArchivo('c1'), PDF);
  await a.borrarArchivo('c1');
  await a.borrarArchivo('c1');
  await assert.rejects(a.leerArchivo('c1'));
});

test('guardarArchivo rechaza más de 5 MB y tipos inválidos', async () => {
  process.env.CERTIFICATE_UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'cert-'));
  const a = cargarArchivos();
  const grande = Buffer.concat([PDF, Buffer.alloc(5 * 1024 * 1024)]);
  await assert.rejects(a.guardarArchivo('c2', grande), /ARCHIVO_INVALIDO/);
  await assert.rejects(a.guardarArchivo('c2', Buffer.from('texto')), /ARCHIVO_INVALIDO/);
  await assert.rejects(a.guardarArchivo('../x', PDF), /ID_INVALIDO/);
});

test('nombreSeguro quita comillas y separadores pero conserva la ñ', () => {
  const a = cargarArchivos();
  assert.equal(a.nombreSeguro('certificado "final" ñ.pdf'), 'certificado final ñ.pdf');
  assert.ok(!a.nombreSeguro('../../x').includes('/'));
  assert.equal(a.nombreSeguro('"""'), 'certificado');
  assert.ok(a.nombreSeguro('a'.repeat(300)).length <= 120);
});

// ---------- Servicio ----------

const hoyAR = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());
const mananaAR = () => { const d = new Date(`${hoyAR()}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); };
const coincide = (fila, where = {}) => Object.entries(where).every(([k, v]) => v === undefined
  || (v && Array.isArray(v.in) ? v.in.includes(fila[k]) : v && typeof v === 'object' && 'not' in v ? fila[k] !== v.not : fila[k] === v));
// Curso como lo guarda la API: días a medianoche UTC.
const curso = (extra = {}) => ({ id: 'rcp', titulo: 'RCP', certificadoNombre: 'RCP básico', certificadoEmisor: 'Cruz Roja', fechaDesde: new Date('2026-01-01T00:00:00Z'), fechaHasta: new Date('2026-02-01T00:00:00Z'), fechaEliminacion: null, ...extra });

function escenarioCertificados({ catalogo = [{ id: 'horas', nombre: 'Horas', tipo: 'NUMERO', fechaEliminacion: null }, { id: 'nivel', nombre: 'Nivel', tipo: 'TEXTO', fechaEliminacion: null }], cursos = [] } = {}) {
  let datos = { certificados: [], rels: [], escritos: [], borrados: [], avisos: [], bloqueos: [] };
  let n = 0;
  let fallarEscritura = false;
  const hidratar = c => c && ({ ...c, curso: c.cursoId ? { id: c.cursoId, titulo: cursos.find(x => x.id === c.cursoId)?.titulo } : null, certificadosRelAtributos: datos.rels.filter(r => r.certificadoId === c.id && r.fechaEliminacion === null).map(r => ({ ...r, campos: catalogo.find(a => a.id === r.campoId) })) });
  const certificado = {
    async create({ data }) {
      const { certificadosRelAtributos, ...resto } = data;
      const fila = { motivoRechazo: null, fechaRevision: null, usuarioRevisionId: null, cursoId: null, fechaEliminacion: null, usuarioEliminacionId: null, ...resto, id: `c${++n}`, orden: n, fechaCreacion: new Date(), fechaActualizacion: new Date() };
      datos.certificados.push(fila);
      for (const r of certificadosRelAtributos?.create ?? []) datos.rels.push({ ...r, id: `r${datos.rels.length}`, certificadoId: fila.id, fechaEliminacion: null });
      return hidratar(fila);
    },
    async findMany({ where }) { return datos.certificados.filter(c => coincide(c, where)).sort((a, b) => b.orden - a.orden).map(hidratar); },
    async findFirst({ where }) { return hidratar(datos.certificados.find(c => coincide(c, where))) ?? null; },
    async update({ where, data }) { const c = datos.certificados.find(x => x.id === where.id); Object.assign(c, data, { fechaActualizacion: new Date() }); return hidratar(c); },
    async updateMany({ where, data }) { const filas = datos.certificados.filter(c => coincide(c, where)); filas.forEach(c => Object.assign(c, data, { fechaActualizacion: new Date() })); return { count: filas.length }; },
    async findUniqueOrThrow({ where }) { return hidratar(datos.certificados.find(x => x.id === where.id)); },
    async count({ where }) { return datos.certificados.filter(c => coincide(c, where)).length; },
  };
  const certificadosRelAtributos = {
    async updateMany({ where, data }) { const filas = datos.rels.filter(r => coincide(r, where)); filas.forEach(r => Object.assign(r, data)); return { count: filas.length }; },
    async upsert({ where, create, update }) {
      const { certificadoId, campoId } = where.certificadoId_campoId;
      const fila = datos.rels.find(r => r.certificadoId === certificadoId && r.campoId === campoId);
      if (fila) Object.assign(fila, update); else datos.rels.push({ ...create, id: `r${datos.rels.length}`, fechaEliminacion: null });
    },
  };
  const db = { certificado, certificadosRelAtributos, cursos: { async findFirst({ where }) { return cursos.find(c => coincide(c, where)) ?? null; } }, notificacion: { async create({ data }) {
    // Como en la base: un aviso por persona y clave (@@unique([usuarioId, clave])).
    if (datos.avisos.some(a => a.usuarioId === data.usuarioId && a.clave === data.clave)) throw Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
    datos.avisos.push(data); return data;
  } }, certificadoAtributo: { async findMany({ where }) { return catalogo.filter(a => coincide(a, where)); }, async findFirst({ where }) { return catalogo.find(a => coincide(a, where)) ?? null; } } };
  // Solo lo usa el bloqueo `SELECT … FROM Cursos WHERE id = ? FOR UPDATE`.
  db.$queryRaw = async (partes, id) => {
    assert.match(partes.join('?'), /FOR UPDATE/);
    datos.bloqueos.push(id);
    return cursos.filter(c => c.id === id).map(c => ({ id: c.id, fechaEliminacion: c.fechaEliminacion }));
  };
  db.$transaction = async fn => { const copia = structuredClone(datos); try { return await fn(db); } catch (e) { datos = copia; throw e; } };
  const archivos = {
    ...cargarArchivos(),
    async guardarArchivo(id) { if (fallarEscritura) throw new Error('DISCO_LLENO'); datos.escritos.push(id); },
    async borrarArchivo(id) { datos.borrados.push(id); },
  };
  const { CertificadoRepository } = cargar('repositories/certificado.repository.ts', { '../config/database': { db } });
  const { CertificadoAtributoRepository } = cargar('repositories/certificadoAtributo.repository.ts', { '../config/database': { db } });
  const { CursoRepository } = cargar('repositories/curso.repository.ts', { '../config/database': { db } });
  const servicio = cargar('services/certificado.service.ts', {
    '../repositories/curso.repository': { CursoRepository },
    '../repositories/certificado.repository': { CertificadoRepository },
    '../repositories/certificadoAtributo.repository': { CertificadoAtributoRepository },
    '../src/lib/archivos-certificado': archivos,
  });
  // Simula a otra persona cambiando el certificado justo después de que el servicio lo leyó.
  const despuesDeLeer = cambio => {
    const original = certificado.findFirst;
    certificado.findFirst = async args => { const r = await original(args); certificado.findFirst = original; if (r) Object.assign(datos.certificados.find(c => c.id === r.id), cambio); return r; };
  };
  return { servicio: new servicio.CertificadoService(), modulo: servicio, db, cursos, datos: () => datos, fallarEscritura: () => { fallarEscritura = true; }, despuesDeLeer };
}

const VOL = { id: 'v', rol: 'VOLUNTARIO' };
const OTRO = { id: 'w', rol: 'VOLUNTARIO' };
const COORD = { id: 'c', rol: 'COORDINADOR' };
const pdf = (nombre = 'mi certificado.pdf') => ({ bytes: PDF, nombre });
const entrada = (extra = {}) => ({ nombre: 'Primeros Auxilios', entidadEmisora: 'Cruz Roja', fechaEmision: '2026-03-10', ...extra });

test('crear deja PENDIENTE, dueño de la sesión y atributos guardados', async () => {
  const e = escenarioCertificados();
  const c = await e.servicio.crear({ ...entrada({ atributos: [{ campoId: 'horas', dato: '20' }] }), estado: 'APROBADO', usuarioId: 'otro' }, pdf('mi "cert".pdf'), VOL);
  assert.equal(c.estado, 'PENDIENTE');
  assert.equal(c.usuarioId, 'v');
  assert.equal(c.usuarioCreacionId, 'v');
  assert.equal(c.archivoTipo, 'application/pdf');
  assert.equal(c.archivoNombre, 'mi cert.pdf');
  assert.equal(c.codigoVerificacion, null);
  assert.deepEqual(c.certificadosRelAtributos.map(r => [r.campoId, r.dato]), [['horas', '20']]);
  assert.deepEqual(e.datos().escritos, [c.id]);
});

test('crear exige nombre, emisor, fecha y archivo', async () => {
  const e = escenarioCertificados();
  await assert.rejects(e.servicio.crear(entrada({ nombre: '  ' }), pdf(), VOL), /CAMPOS_OBLIGATORIOS_FALTANTES/);
  await assert.rejects(e.servicio.crear(entrada({ entidadEmisora: undefined }), pdf(), VOL), /CAMPOS_OBLIGATORIOS_FALTANTES/);
  await assert.rejects(e.servicio.crear(entrada({ fechaEmision: '' }), pdf(), VOL), /CAMPOS_OBLIGATORIOS_FALTANTES/);
  await assert.rejects(e.servicio.crear(entrada({ fechaEmision: 'ayer' }), pdf(), VOL), /FECHA_INVALIDA/);
  await assert.rejects(e.servicio.crear(entrada(), null, VOL), /ARCHIVO_REQUERIDO/);
  await assert.rejects(e.servicio.crear(entrada(), { bytes: Buffer.alloc(0), nombre: 'x.pdf' }, VOL), /ARCHIVO_REQUERIDO/);
  await assert.rejects(e.servicio.crear(entrada(), { bytes: Buffer.concat([PDF, Buffer.alloc(5 * 1024 * 1024)]), nombre: 'x.pdf' }, VOL), /ARCHIVO_DEMASIADO_GRANDE/);
  await assert.rejects(e.servicio.crear(entrada(), { bytes: Buffer.from('no soy pdf'), nombre: 'x.pdf' }, VOL), /ARCHIVO_INVALIDO/);
  assert.equal(e.datos().certificados.length, 0);
});

test('con curso copia nombre, emisor y fin del curso e ignora lo que mande el cliente', async () => {
  const e = escenarioCertificados({ cursos: [curso()] });
  const c = await e.servicio.crear({ cursoId: 'rcp', nombre: 'Otro', entidadEmisora: 'Otra', fechaEmision: '2020-01-01', codigoVerificacion: ' A-1 ' }, pdf(), VOL);
  assert.equal(c.cursoId, 'rcp');
  assert.equal(c.nombre, 'RCP básico');
  assert.equal(c.entidadEmisora, 'Cruz Roja');
  assert.equal(c.fechaEmision.toISOString(), '2026-02-01T12:00:00.000Z');
  assert.equal(c.codigoVerificacion, 'A-1');
  assert.equal(c.estado, 'PENDIENTE');
  assert.equal(c.curso.titulo, 'RCP');
  assert.deepEqual(e.datos().bloqueos, ['rcp']);
  // Editar el curso después no cambia el certificado ya cargado.
  e.cursos[0].certificadoNombre = 'RCP avanzado';
  assert.equal((await e.servicio.obtener(c.id, VOL)).nombre, 'RCP básico');
});

test('con curso exige que exista, otorgue certificado y haya terminado', async () => {
  const e = escenarioCertificados({ cursos: [
    curso({ id: 'baja', fechaEliminacion: new Date() }),
    curso({ id: 'sin', certificadoNombre: null, certificadoEmisor: null }),
    curso({ id: 'hoy', fechaHasta: new Date(`${hoyAR()}T00:00:00Z`) }),
    curso({ id: 'futuro', fechaHasta: new Date(`${mananaAR()}T00:00:00Z`) }),
  ] });
  await assert.rejects(e.servicio.crear({ cursoId: 'nada' }, pdf(), VOL), /CURSO_NO_ENCONTRADO/);
  await assert.rejects(e.servicio.crear({ cursoId: 'baja' }, pdf(), VOL), /CURSO_NO_ENCONTRADO/);
  await assert.rejects(e.servicio.crear({ cursoId: 'sin' }, pdf(), VOL), /CURSO_SIN_CERTIFICADO/);
  await assert.rejects(e.servicio.crear({ cursoId: 'futuro' }, pdf(), VOL), /CURSO_NO_FINALIZADO/);
  await assert.rejects(e.servicio.crear({ cursoId: 'hoy' }, null, VOL), /ARCHIVO_REQUERIDO/);
  assert.equal((await e.servicio.crear({ cursoId: 'hoy' }, pdf(), VOL)).fechaEmision.toISOString(), `${hoyAR()}T12:00:00.000Z`);
  assert.equal(e.datos().certificados.length, 1);
});

test('con curso: uno activo por persona; tras un rechazo o una baja se puede volver a cargar', async () => {
  const e = escenarioCertificados({ cursos: [curso()] });
  const primero = await e.servicio.crear({ cursoId: 'rcp' }, pdf(), VOL);
  await assert.rejects(e.servicio.crear({ cursoId: 'rcp' }, pdf(), VOL), /CERTIFICADO_DUPLICADO/);
  assert.ok(await e.servicio.crear({ cursoId: 'rcp' }, pdf(), OTRO), 'otra persona sí puede');
  e.datos().certificados.find(c => c.id === primero.id).estado = 'APROBADO';
  await assert.rejects(e.servicio.crear({ cursoId: 'rcp' }, pdf(), VOL), /CERTIFICADO_DUPLICADO/);
  e.datos().certificados.find(c => c.id === primero.id).estado = 'RECHAZADO';
  const segundo = await e.servicio.crear({ cursoId: 'rcp' }, pdf(), VOL);
  await e.servicio.eliminar(segundo.id, VOL);
  assert.ok(await e.servicio.crear({ cursoId: 'rcp' }, pdf(), VOL));
  assert.equal(e.datos().escritos.length, 4, 'el duplicado no escribe archivo');
});

test('si el curso se da de baja mientras se carga, no queda el certificado', async () => {
  const e = escenarioCertificados({ cursos: [curso()] });
  // El servicio vio el curso vigente; la baja llega antes del bloqueo.
  const original = e.db.cursos.findFirst;
  e.db.cursos.findFirst = async args => { const r = await original(args); e.cursos[0].fechaEliminacion = new Date(); return r; };
  await assert.rejects(e.servicio.crear({ cursoId: 'rcp' }, pdf(), VOL), /CURSO_NO_ENCONTRADO/);
  assert.equal(e.datos().certificados.length, 0);
});

test('editar un certificado de curso: no cambia curso ni datos copiados; reenviar respeta el único activo', async () => {
  const e = escenarioCertificados({ cursos: [curso()] });
  const rechazado = await e.servicio.crear({ cursoId: 'rcp' }, pdf(), VOL);
  e.datos().certificados.find(c => c.id === rechazado.id).estado = 'RECHAZADO';
  await assert.rejects(e.servicio.actualizar(rechazado.id, { nombre: 'Otro' }, null, VOL), /DATOS_DEL_CURSO/);
  await assert.rejects(e.servicio.actualizar(rechazado.id, { fechaEmision: '2026-01-01' }, null, VOL), /DATOS_DEL_CURSO/);
  await assert.rejects(e.servicio.actualizar(rechazado.id, { cursoId: '' }, null, VOL), /CURSO_NO_EDITABLE/);
  const nuevo = await e.servicio.crear({ cursoId: 'rcp' }, pdf(), VOL);
  await assert.rejects(e.servicio.actualizar(rechazado.id, { codigoVerificacion: 'B-2' }, null, VOL), /CERTIFICADO_DUPLICADO/);
  assert.equal(e.datos().certificados.find(c => c.id === rechazado.id).estado, 'RECHAZADO');
  await e.servicio.eliminar(nuevo.id, VOL);
  const reenviado = await e.servicio.actualizar(rechazado.id, { codigoVerificacion: 'B-2' }, null, VOL);
  assert.equal(reenviado.estado, 'PENDIENTE');
  assert.equal(reenviado.nombre, 'RCP básico');
});

test('fecha de hoy en Argentina se acepta; mañana no', async () => {
  const e = escenarioCertificados();
  const c = await e.servicio.crear(entrada({ fechaEmision: hoyAR() }), pdf(), VOL);
  assert.equal(c.fechaEmision.toISOString(), `${hoyAR()}T12:00:00.000Z`);
  await assert.rejects(e.servicio.crear(entrada({ fechaEmision: mananaAR() }), pdf(), VOL), /FECHA_INVALIDA/);
});

test('validarDatoAtributo por tipo', () => {
  const { modulo } = escenarioCertificados();
  const v = modulo.validarDatoAtributo;
  assert.throws(() => v('NUMERO', 'abc'), /ATRIBUTO_VALOR_INVALIDO/);
  assert.equal(v('NUMERO', '12.5'), '12.5');
  assert.throws(() => v('BOOLEANO', 'si'), /ATRIBUTO_VALOR_INVALIDO/);
  assert.equal(v('BOOLEANO', 'true'), 'true');
  assert.throws(() => v('FECHA', '2026-13-40'), /ATRIBUTO_VALOR_INVALIDO/);
  assert.throws(() => v('FECHA', '2026-02-30'), /ATRIBUTO_VALOR_INVALIDO/);
  assert.equal(v('FECHA', '2026-02-28'), '2026-02-28');
  assert.throws(() => v('TEXTO', '  '), /ATRIBUTO_VALOR_INVALIDO/);
  assert.equal(v('TEXTO', ' Avanzado '), 'Avanzado');
});

test('atributo inexistente o repetido', async () => {
  const e = escenarioCertificados();
  await assert.rejects(e.servicio.crear(entrada({ atributos: [{ campoId: 'nada', dato: '1' }] }), pdf(), VOL), /ATRIBUTO_NO_ENCONTRADO/);
  await assert.rejects(e.servicio.crear(entrada({ atributos: [{ campoId: 'horas', dato: '1' }, { campoId: 'horas', dato: '2' }] }), pdf(), VOL), /ATRIBUTO_DUPLICADO/);
  await assert.rejects(e.servicio.crear(entrada({ atributos: [{ campoId: 'horas', dato: 'veinte' }] }), pdf(), VOL), /ATRIBUTO_VALOR_INVALIDO/);
  await assert.rejects(e.servicio.crear(entrada({ atributos: 'horas=1' }), pdf(), VOL), /ATRIBUTO_VALOR_INVALIDO/);
});

test('si falla la escritura del archivo no queda la fila', async () => {
  const e = escenarioCertificados();
  e.fallarEscritura();
  await assert.rejects(e.servicio.crear(entrada(), pdf(), VOL), /DISCO_LLENO/);
  assert.equal(e.datos().certificados.length, 0);
});

test('voluntario no ve ajenos; coordinación sí y filtra por estado', async () => {
  const e = escenarioCertificados();
  const mio = await e.servicio.crear(entrada(), pdf(), VOL);
  const ajeno = await e.servicio.crear(entrada(), pdf(), OTRO);
  e.datos().certificados.find(x => x.id === ajeno.id).estado = 'APROBADO';
  assert.deepEqual((await e.servicio.listar({ usuarioId: 'w' }, VOL)).map(c => c.id), [mio.id]);
  await assert.rejects(e.servicio.obtener(ajeno.id, VOL), /CERTIFICADO_NO_ENCONTRADO/);
  assert.equal((await e.servicio.obtener(mio.id, VOL)).id, mio.id);
  assert.deepEqual((await e.servicio.listar({}, COORD)).map(c => c.id), [ajeno.id, mio.id]);
  assert.deepEqual((await e.servicio.listar({ estado: 'APROBADO' }, COORD)).map(c => c.id), [ajeno.id]);
  assert.deepEqual((await e.servicio.listar({ usuarioId: 'v' }, COORD)).map(c => c.id), [mio.id]);
});

// ---------- Edición y baja ----------

test('editar APROBADO falla con NO_EDITABLE', async () => {
  const e = escenarioCertificados();
  const c = await e.servicio.crear(entrada(), pdf(), VOL);
  e.datos().certificados[0].estado = 'APROBADO';
  await assert.rejects(e.servicio.actualizar(c.id, { nombre: 'Otro' }, null, VOL), /NO_EDITABLE/);
});

test('editar ajeno responde no encontrado, aun siendo coordinador', async () => {
  const e = escenarioCertificados();
  const c = await e.servicio.crear(entrada(), pdf(), VOL);
  await assert.rejects(e.servicio.actualizar(c.id, { nombre: 'Otro' }, null, OTRO), /CERTIFICADO_NO_ENCONTRADO/);
  await assert.rejects(e.servicio.actualizar(c.id, { nombre: 'Otro' }, null, COORD), /CERTIFICADO_NO_ENCONTRADO/);
  await assert.rejects(e.servicio.actualizar('nada', { nombre: 'Otro' }, null, VOL), /CERTIFICADO_NO_ENCONTRADO/);
});

test('editar solo el archivo de un RECHAZADO lo vuelve a PENDIENTE y limpia la revisión', async () => {
  const e = escenarioCertificados();
  const c = await e.servicio.crear(entrada(), pdf(), VOL);
  Object.assign(e.datos().certificados[0], { estado: 'RECHAZADO', motivoRechazo: 'Ilegible', fechaRevision: new Date(), usuarioRevisionId: 'c' });
  const png = { bytes: PNG, nombre: 'foto.png' };
  const editado = await e.servicio.actualizar(c.id, {}, png, VOL);
  assert.equal(editado.estado, 'PENDIENTE');
  assert.equal(editado.motivoRechazo, null);
  assert.equal(editado.fechaRevision, null);
  assert.equal(editado.usuarioRevisionId, null);
  assert.equal(editado.archivoTipo, 'image/png');
  assert.equal(editado.archivoNombre, 'foto.png');
  assert.equal(editado.nombre, 'Primeros Auxilios');
  assert.deepEqual(e.datos().escritos, [c.id, c.id]);
});

test('editar valida igual que crear', async () => {
  const e = escenarioCertificados();
  const c = await e.servicio.crear(entrada(), pdf(), VOL);
  await assert.rejects(e.servicio.actualizar(c.id, { nombre: ' ' }, null, VOL), /CAMPOS_OBLIGATORIOS_FALTANTES/);
  await assert.rejects(e.servicio.actualizar(c.id, { fechaEmision: mananaAR() }, null, VOL), /FECHA_INVALIDA/);
  await assert.rejects(e.servicio.actualizar(c.id, { cursoId: 'x' }, null, VOL), /CURSO_NO_EDITABLE/);
  await assert.rejects(e.servicio.actualizar(c.id, {}, { bytes: Buffer.from('txt'), nombre: 'a.pdf' }, VOL), /ARCHIVO_INVALIDO/);
  const editado = await e.servicio.actualizar(c.id, { nombre: 'RCP', codigoVerificacion: '' }, null, VOL);
  assert.equal(editado.nombre, 'RCP');
  assert.equal(editado.codigoVerificacion, null);
});

test('editar sin nada lanza SIN_CAMBIOS', async () => {
  const e = escenarioCertificados();
  const c = await e.servicio.crear(entrada(), pdf(), VOL);
  await assert.rejects(e.servicio.actualizar(c.id, {}, null, VOL), /SIN_CAMBIOS/);
});

test('atributos reemplaza el set y [] los quita', async () => {
  const e = escenarioCertificados();
  const c = await e.servicio.crear(entrada({ atributos: [{ campoId: 'horas', dato: '10' }] }), pdf(), VOL);
  let editado = await e.servicio.actualizar(c.id, { atributos: [{ campoId: 'nivel', dato: 'Básico' }] }, null, VOL);
  assert.deepEqual(editado.certificadosRelAtributos.map(r => [r.campoId, r.dato]), [['nivel', 'Básico']]);
  editado = await e.servicio.actualizar(c.id, { atributos: [{ campoId: 'horas', dato: '30' }] }, null, VOL);
  assert.deepEqual(editado.certificadosRelAtributos.map(r => [r.campoId, r.dato]), [['horas', '30']]);
  assert.equal(e.datos().rels.filter(r => r.campoId === 'horas').length, 1);
  editado = await e.servicio.actualizar(c.id, { atributos: [] }, null, VOL);
  assert.deepEqual(editado.certificadosRelAtributos, []);
});

test('baja: dueño y coordinación sí, otro voluntario no; luego no aparece en listar', async () => {
  const e = escenarioCertificados();
  const a = await e.servicio.crear(entrada({ atributos: [{ campoId: 'horas', dato: '10' }] }), pdf(), VOL);
  const b = await e.servicio.crear(entrada(), pdf(), VOL);
  await assert.rejects(e.servicio.eliminar(a.id, OTRO), /CERTIFICADO_NO_ENCONTRADO/);
  await e.servicio.eliminar(a.id, VOL);
  await e.servicio.eliminar(b.id, COORD);
  assert.deepEqual(await e.servicio.listar({}, VOL), []);
  const fila = e.datos().certificados.find(c => c.id === a.id);
  assert.ok(fila.fechaEliminacion instanceof Date);
  assert.equal(fila.usuarioEliminacionId, 'v');
  assert.ok(e.datos().rels.every(r => r.fechaEliminacion instanceof Date));
  assert.deepEqual(e.datos().borrados, []);
  await assert.rejects(e.servicio.eliminar(a.id, VOL), /CERTIFICADO_NO_ENCONTRADO/);
});

test('una aprobación entre la lectura y la escritura impide la edición', async () => {
  const e = escenarioCertificados();
  const c = await e.servicio.crear(entrada(), pdf(), VOL);
  e.despuesDeLeer({ estado: 'APROBADO' });
  await assert.rejects(e.servicio.actualizar(c.id, { nombre: 'Cambiado' }, { bytes: PNG, nombre: 'otro.png' }, VOL), /NO_EDITABLE/);
  const fila = e.datos().certificados[0];
  assert.equal(fila.nombre, 'Primeros Auxilios');
  assert.equal(fila.estado, 'APROBADO');
  assert.deepEqual(e.datos().escritos, [c.id]);
});

// ---------- Revisión (resolverCertificado) ----------

const cargarRevision = e => cargar('src/lib/certificados.ts', {
  '../../config/database': { db: e.db },
  './respuesta-publica': cargar('src/lib/respuesta-publica.ts', {}),
});

test('revisar guarda quién y cuándo, exige motivo al rechazar y avisa al dueño', async () => {
  const e = escenarioCertificados();
  const { resolverCertificado } = cargarRevision(e);
  const c = await e.servicio.crear(entrada(), pdf(), VOL);
  await assert.rejects(resolverCertificado(c.id, 'RECHAZADO', '  ', 'c'), /MOTIVO_REQUERIDO/);
  await resolverCertificado(c.id, 'RECHAZADO', 'Ilegible', 'c');
  const fila = e.datos().certificados[0];
  assert.equal(fila.estado, 'RECHAZADO');
  assert.equal(fila.motivoRechazo, 'Ilegible');
  assert.equal(fila.usuarioRevisionId, 'c');
  assert.ok(fila.fechaRevision instanceof Date);
  assert.deepEqual(e.datos().avisos.map(a => [a.usuarioId, a.enlace]), [['v', '/certificados']]);
});

test('un certificado corregido y reenviado se puede revisar otra vez y avisa a las dos partes', async () => {
  const e = escenarioCertificados();
  const { resolverCertificado } = cargarRevision(e);
  const c = await e.servicio.crear(entrada(), pdf(), VOL);
  await resolverCertificado(c.id, 'RECHAZADO', 'Ilegible', 'c');
  const reenvios = [];
  // Editar uno pendiente no es un reenvío; editar uno rechazado sí.
  const reenviado = await e.servicio.actualizar(c.id, { codigoVerificacion: 'A-2' }, null, VOL, cert => reenvios.push(cert.id));
  assert.equal(reenviado.estado, 'PENDIENTE');
  await e.servicio.actualizar(c.id, { codigoVerificacion: 'A-3' }, null, VOL, cert => reenvios.push(cert.id));
  assert.deepEqual(reenvios, [c.id]);
  await new Promise(r => setTimeout(r, 2)); // fechas de revisión distintas
  await resolverCertificado(c.id, 'APROBADO', null, 'c');
  assert.equal(e.datos().certificados[0].estado, 'APROBADO');
  const avisos = e.datos().avisos.filter(a => a.usuarioId === 'v');
  assert.equal(avisos.length, 2);
  assert.notEqual(avisos[0].clave, avisos[1].clave);
  assert.ok(avisos.every(a => a.clave.startsWith(`certificado_resuelto:${c.id}:`)));
});

test('coordinación no revisa su propio certificado; otra persona de coordinación sí', async () => {
  const e = escenarioCertificados();
  const { resolverCertificado } = cargarRevision(e);
  const c = await e.servicio.crear(entrada(), pdf(), COORD);
  await assert.rejects(resolverCertificado(c.id, 'APROBADO', null, 'c'), /CERTIFICADO_PROPIO/);
  assert.equal(e.datos().certificados[0].estado, 'PENDIENTE');
  await resolverCertificado(c.id, 'APROBADO', null, 'otra-coord');
  assert.equal(e.datos().certificados[0].usuarioRevisionId, 'otra-coord');
  const errores = cargar('src/lib/certificadoErrores.ts', { './cursoErrores': cargar('src/lib/cursoErrores.ts', {}) });
  assert.equal(errores.errorCertificado('CERTIFICADO_PROPIO').status, 403);
});

test('dos revisiones simultáneas: la segunda no pisa a la primera', async () => {
  const e = escenarioCertificados();
  const { resolverCertificado } = cargarRevision(e);
  const c = await e.servicio.crear(entrada(), pdf(), VOL);
  e.despuesDeLeer({ estado: 'APROBADO' });
  await assert.rejects(resolverCertificado(c.id, 'RECHAZADO', 'No', 'c'), /ESTADO_NO_PENDIENTE/);
  // El doble revierte toda la transacción (también el cambio simulado); lo que importa: el rechazo no se escribió.
  assert.notEqual(e.datos().certificados[0].estado, 'RECHAZADO');
  assert.equal(e.datos().certificados[0].motivoRechazo, null);
  assert.equal(e.datos().avisos.length, 0);
});

// ---------- Regla del caso rojo ----------

test('caso rojo: solo cuenta APROBADO no dado de baja', async () => {
  const filas = [];
  const db = { certificado: { async findFirst({ where }) { return filas.find(c => coincide(c, where)) ?? null; } } };
  const { EmergenciaRepository } = cargar('repositories/emergencia.repository.ts', { '../config/database': { db } });
  const repo = new EmergenciaRepository();
  filas.push({ usuarioId: 'p', estado: 'PENDIENTE', fechaEliminacion: null });
  filas.push({ usuarioId: 'r', estado: 'RECHAZADO', fechaEliminacion: null });
  filas.push({ usuarioId: 'b', estado: 'APROBADO', fechaEliminacion: new Date() });
  filas.push({ usuarioId: 'a', estado: 'APROBADO', fechaEliminacion: null });
  assert.equal(await repo.tieneCertificadoAprobado('p'), false);
  assert.equal(await repo.tieneCertificadoAprobado('r'), false);
  assert.equal(await repo.tieneCertificadoAprobado('b'), false);
  assert.equal(await repo.tieneCertificadoAprobado('a'), true);
});

// ---------- API HTTP ----------

const { NextRequest } = require('next/server');

function escenarioApi() {
  const e = escenarioCertificados();
  let token = VOL;
  const enDisco = new Map();
  const archivos = { ...cargarArchivos(), async leerArchivo(id) { if (!enDisco.has(id)) throw new Error('ENOENT'); return enDisco.get(id); } };
  const auth = { esCoordinadorOAdmin: u => u?.rol === 'COORDINADOR' || u?.rol === 'ADMIN' };
  const avisados = [];
  const atributos = [];
  const { CertificadoAtributoService } = cargar('services/certificadoAtributo.service.ts', {
    '../repositories/certificadoAtributo.repository': { CertificadoAtributoRepository: class { async crear(d) { atributos.push(d); return { id: 'a1', ...d }; } async findAll() { return atributos; } } },
  });
  const cursoErrores = cargar('src/lib/cursoErrores.ts', {});
  const errores = cargar('src/lib/certificadoErrores.ts', { './cursoErrores': cursoErrores });
  const api = cargar('src/lib/certificados-api.ts', {
    '../../services/certificado.service': { CertificadoService: e.modulo.CertificadoService },
    '../../services/certificadoAtributo.service': { CertificadoAtributoService },
    './auth': auth,
    './actor-actual': { actorActual: async () => token },
    './avisos': {
      avisarCertificadoNuevo: (id, usuarioId) => avisados.push([id, usuarioId]),
      avisarCertificadoReenviado: (id, usuarioId, cuando) => avisados.push(['reenvio', id, usuarioId, cuando instanceof Date]),
    },
    './certificados': cargarRevision(e),
    './respuesta-publica': cargar('src/lib/respuesta-publica.ts', {}),
    './archivos-certificado': archivos,
    './certificadoErrores': errores,
  });
  return { ...e, api, enDisco, atributos, avisados, token: t => { token = t; } };
}

function formulario(campos = {}, archivo = new File([PDF], 'mi certificado.pdf', { type: 'application/pdf' })) {
  const form = new FormData();
  for (const [k, v] of Object.entries({ nombre: 'Primeros Auxilios', entidadEmisora: 'Cruz Roja', fechaEmision: '2026-03-10', ...campos })) form.set(k, v);
  if (archivo) form.set('archivo', archivo);
  return form;
}
const pedido = (ruta, init = {}) => new NextRequest(`http://localhost/api/certificados${ruta}`, init);

test('sin sesión 401; alta multipart 201 con estado PENDIENTE', async () => {
  const e = escenarioApi();
  e.token(null);
  assert.equal((await e.api.crearCertificado(pedido('', { method: 'POST', body: formulario() }))).status, 401);
  assert.equal((await e.api.listarCertificados(pedido(''))).status, 401);
  e.token(VOL);
  const r = await e.api.crearCertificado(pedido('', { method: 'POST', body: formulario({ estado: 'APROBADO', atributos: JSON.stringify([{ campoId: 'horas', dato: '8' }]) }) }));
  assert.equal(r.status, 201);
  const c = await r.json();
  assert.equal(c.estado, 'PENDIENTE');
  assert.equal(c.usuarioId, 'v');
  assert.equal(c.certificadosRelAtributos.length, 1);
  assert.equal((await (await e.api.listarCertificados(pedido(''))).json()).length, 1);
  assert.deepEqual(e.avisados, [[c.id, 'v']]);
});

test('errores de negocio indican código y campo', async () => {
  const e = escenarioApi();
  const sinArchivo = await e.api.crearCertificado(pedido('', { method: 'POST', body: formulario({}, null) }));
  assert.equal(sinArchivo.status, 400);
  assert.deepEqual(Object.keys(await sinArchivo.json()).sort(), ['campo', 'codigo', 'error']);
  const txt = await e.api.crearCertificado(pedido('', { method: 'POST', body: formulario({}, new File(['hola'], 'x.pdf')) }));
  assert.equal((await txt.json()).campo, 'archivo');
  const futura = await e.api.crearCertificado(pedido('', { method: 'POST', body: formulario({ fechaEmision: mananaAR() }) }));
  assert.equal((await futura.json()).campo, 'fechaEmision');
});

test('atributos con JSON roto responde 400 ATRIBUTO_VALOR_INVALIDO', async () => {
  const e = escenarioApi();
  const r = await e.api.crearCertificado(pedido('', { method: 'POST', body: formulario({ atributos: '[{campoId:' }) }));
  assert.equal(r.status, 400);
  assert.equal((await r.json()).codigo, 'ATRIBUTO_VALOR_INVALIDO');
});

test('Content-Length mayor a 6 MB responde 413 sin leer el body', async () => {
  const e = escenarioApi();
  const req = pedido('', { method: 'POST', headers: { 'content-length': String(6 * 1024 * 1024 + 1) } });
  let leido = false;
  req.formData = async () => { leido = true; return new FormData(); };
  const r = await e.api.crearCertificado(req);
  assert.equal(r.status, 413);
  assert.equal(leido, false);
});

test('voluntario no descarga archivo ajeno (404); el dueño recibe nosniff y filename* codificado', async () => {
  const e = escenarioApi();
  e.token(OTRO);
  const c = await (await e.api.crearCertificado(pedido('', { method: 'POST', body: formulario({}, new File([PDF], 'certificado "final" ñ.pdf')) }))).json();
  e.enDisco.set(c.id, PDF);
  e.token(VOL);
  assert.equal((await e.api.descargarArchivo(pedido(`/${c.id}/archivo`), c.id)).status, 404);
  assert.equal((await e.api.obtenerCertificado(pedido(`/${c.id}`), c.id)).status, 404);
  e.token(OTRO);
  const r = await e.api.descargarArchivo(pedido(`/${c.id}/archivo`), c.id);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('content-type'), 'application/pdf');
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(r.headers.get('cache-control'), 'private, no-store');
  assert.match(r.headers.get('content-disposition'), /filename\*=UTF-8''certificado%20final%20%C3%B1\.pdf/);
  assert.match(r.headers.get('content-disposition'), /^inline; filename="certificado final _\.pdf"/);
  assert.deepEqual(Buffer.from(await r.arrayBuffer()), PDF);
  e.enDisco.delete(c.id);
  assert.equal((await e.api.descargarArchivo(pedido(`/${c.id}/archivo`), c.id)).status, 404);
});

test('editar y dar de baja por API', async () => {
  const e = escenarioApi();
  const c = await (await e.api.crearCertificado(pedido('', { method: 'POST', body: formulario() }))).json();
  const form = new FormData(); form.set('nombre', 'RCP');
  const r = await e.api.actualizarCertificado(pedido(`/${c.id}`, { method: 'PUT', body: form }), c.id);
  assert.equal(r.status, 200);
  assert.equal((await r.json()).nombre, 'RCP');
  e.token(OTRO);
  assert.equal((await e.api.eliminarCertificado(pedido(`/${c.id}`, { method: 'DELETE' }), c.id)).status, 404);
  e.token(VOL);
  assert.equal((await e.api.eliminarCertificado(pedido(`/${c.id}`, { method: 'DELETE' }), c.id)).status, 200);
});

test('PATCH de voluntario responde 403', async () => {
  const e = escenarioApi();
  const c = await (await e.api.crearCertificado(pedido('', { method: 'POST', body: formulario() }))).json();
  const patch = () => pedido(`/${c.id}`, { method: 'PATCH', body: JSON.stringify({ estado: 'APROBADO' }) });
  assert.equal((await e.api.cambiarEstadoCertificado(patch(), c.id)).status, 403);
  e.token(COORD);
  const sinMotivo = await e.api.cambiarEstadoCertificado(pedido(`/${c.id}`, { method: 'PATCH', body: JSON.stringify({ estado: 'RECHAZADO' }) }), c.id);
  assert.equal(sinMotivo.status, 400);
  assert.equal((await sinMotivo.json()).codigo, 'MOTIVO_REQUERIDO');
  assert.equal((await e.api.cambiarEstadoCertificado(patch(), c.id)).status, 200);
  assert.equal(e.datos().certificados[0].usuarioRevisionId, 'c');
  assert.equal((await e.api.cambiarEstadoCertificado(patch(), c.id)).status, 409);
});

test('?estado=VENCIDO responde 400', async () => {
  const e = escenarioApi();
  e.token(COORD);
  assert.equal((await e.api.listarCertificados(pedido('?estado=VENCIDO'))).status, 400);
  assert.equal((await e.api.listarCertificados(pedido('?estado=PENDIENTE'))).status, 200);
});

test('catálogo de atributos: GET exige sesión, POST solo coordinación y valida tipo', async () => {
  const e = escenarioApi();
  const post = body => pedido('-atributos', { method: 'POST', body: JSON.stringify(body) });
  e.token(null);
  assert.equal((await e.api.listarAtributos(pedido('-atributos'))).status, 401);
  e.token(VOL);
  assert.equal((await e.api.listarAtributos(pedido('-atributos'))).status, 200);
  assert.equal((await e.api.crearAtributo(post({ nombre: 'Horas', tipo: 'NUMERO' }))).status, 403);
  e.token(COORD);
  assert.equal((await e.api.crearAtributo(post({ nombre: 'Horas', tipo: 'COLOR' }))).status, 400);
  assert.equal((await e.api.crearAtributo(post({ nombre: 'Horas', tipo: 'NUMERO' }))).status, 201);
  assert.equal(e.atributos[0].tipo, 'NUMERO');
  assert.equal(e.atributos[0].usuarioCreacionId, 'c');
});

test('API: corregir un rechazado avisa a coordinación; nadie revisa su propio certificado (403)', async () => {
  const e = escenarioApi();
  const patch = (id, cuerpo) => e.api.cambiarEstadoCertificado(pedido(`/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(cuerpo) }), id);
  e.token(VOL);
  const c = await (await e.api.crearCertificado(pedido('', { method: 'POST', body: formulario() }))).json();
  e.token(COORD);
  assert.equal((await patch(c.id, { estado: 'RECHAZADO', motivo: 'Ilegible' })).status, 200);
  e.token(VOL);
  const form = new FormData();
  form.append('codigoVerificacion', 'B-7');
  assert.equal((await e.api.actualizarCertificado(pedido(`/${c.id}`, { method: 'PUT', body: form }), c.id)).status, 200);
  assert.deepEqual(e.avisados.at(-1), ['reenvio', c.id, 'v', true]);
  e.token(COORD);
  assert.equal((await patch(c.id, { estado: 'APROBADO' })).status, 200, 'el reenviado se puede revisar otra vez');
  const propio = await (await e.api.crearCertificado(pedido('', { method: 'POST', body: formulario() }))).json();
  const r = await patch(propio.id, { estado: 'APROBADO' });
  assert.equal(r.status, 403);
  assert.equal((await r.json()).codigo, 'CERTIFICADO_PROPIO');
});
