// Rompe temporalmente la escritura condicional; la prueba debe detectar la regresión.
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const file = 'repositories/emergencia.repository.ts';
const original = fs.readFileSync(file, 'utf8');
const rule = 'where: { id: emergenciaId, estado: EmergenciaEstado.SIN_GESTIONAR }';
if (!original.includes(rule)) throw new Error('No se encontró la regla; no se modifica el código.');
try {
  fs.writeFileSync(file, original.replace(rule, 'where: { id: emergenciaId }'));
  const result = spawnSync(process.execPath, ['scripts/e2e.cjs', 'tests/e2e/concurrencia.spec.ts', '--grep', 'diez voluntarios'], { stdio: 'inherit', env: process.env });
  if (result.error) throw result.error;
  const report = JSON.parse(fs.readFileSync('test-results/results.json', 'utf8'));
  if (result.status === 0 || report.stats.unexpected !== 1 || report.stats.expected !== 0) {
    throw new Error('No se demostró el fallo esperado de la regla. Revisá el reporte.');
  }
  const spec = report.suites.flatMap(suite => suite.specs || [])[0];
  if (!spec?.tests?.[0]?.results?.some(result => result.errors?.some(error => /toHaveLength/.test(error.message)))) {
    throw new Error('La prueba falló por infraestructura, no por romper la regla.');
  }
  console.log('Mutación detectada: la prueba falla al quitar la condición de estado.');
} finally { fs.writeFileSync(file, original); }
