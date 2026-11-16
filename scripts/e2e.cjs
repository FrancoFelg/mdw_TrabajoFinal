const { spawnSync, spawn } = require('node:child_process');
const { mkdirSync, openSync, closeSync } = require('node:fs');
const { randomBytes } = require('node:crypto');
try { process.loadEnvFile('.env'); } catch {}
const source = process.env.E2E_DATABASE_URL || process.env.DATABASE_URL;
if (!source) throw new Error('Definí E2E_DATABASE_URL para MySQL local.');
const url = new URL(source);
if (url.protocol !== 'mysql:' || !['localhost', '127.0.0.1'].includes(url.hostname)) {
  throw new Error('E2E solo admite MySQL local.');
}
if (!process.env.E2E_DATABASE_URL) url.pathname = '/mdw_e2e';
if (!/^\/mdw_e2e(?:_[a-z0-9_]+)?$/.test(url.pathname)) throw new Error('La base debe llamarse mdw_e2e o mdw_e2e_*.');
process.env.DATABASE_URL = url.href;
process.env.JWT_SECRET = randomBytes(48).toString('hex');
process.env.GOOGLE_MAPS_API_KEY = '';
process.env.VAPID_PRIVATE_KEY = '';
process.env.VAPID_PUBLIC_KEY = '';
process.env.EMERGENCY_UPLOAD_DIR = require('node:path').resolve('.data/e2e/emergencias');
process.env.CERTIFICATE_UPLOAD_DIR = require('node:path').resolve('.data/e2e/certificados');
const mysql = process.platform === 'win32' ? 'C:/Program Files/MySQL/MySQL Server 8.0/bin/mysql.exe' : 'mysql';
const created = spawnSync(mysql, ['--host', url.hostname, '--port', url.port || '3306', '--user', decodeURIComponent(url.username), '--execute', `CREATE DATABASE IF NOT EXISTS \`${url.pathname.slice(1)}\``], {
  env: { ...process.env, MYSQL_PWD: decodeURIComponent(url.password) }, stdio: 'inherit',
});
if (created.error) throw created.error;
if (created.status) process.exit(created.status);
function run(file, args) {
  const result = spawnSync(process.execPath, [file, ...args], { env: process.env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status) process.exit(result.status);
}
run('node_modules/prisma/build/index.js', ['migrate', 'deploy']);
async function main() {
  try {
    await fetch('http://127.0.0.1:3100', { signal: AbortSignal.timeout(1000) });
    throw new Error('El puerto 3100 está ocupado. No se reutiliza otro servidor.');
  } catch (error) { if (error.message.includes('ocupado')) throw error; }
  mkdirSync('test-results', { recursive: true });
  const log = openSync('e2e-server.log', 'w');
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', '3100'], {
    env: process.env, stdio: ['ignore', log, log], detached: process.platform !== 'win32',
  });
  try {
    let ready = false;
    for (let attempt = 0; attempt < 120; attempt++) {
      if (server.exitCode !== null) throw new Error('El servidor E2E terminó antes de iniciar.');
      try { ready = (await fetch('http://127.0.0.1:3100', { signal: AbortSignal.timeout(1000) })).ok; } catch {}
      if (ready) break;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    if (!ready) throw new Error('El servidor E2E no inició. Ver e2e-server.log.');
    const child = spawn(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', ...process.argv.slice(2)], { env: process.env, stdio: 'inherit' });
    process.exitCode = await new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', code => resolve(code ?? 1)); });
  } finally {
    if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(server.pid), '/T', '/F'], { stdio: 'ignore' });
    else { try { process.kill(-server.pid, 'SIGTERM'); } catch {} }
    closeSync(log);
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
