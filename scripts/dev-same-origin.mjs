import { spawn } from 'node:child_process';
import process from 'node:process';

// One command starts three isolated front-end Vite servers:
// customer portal on :3001, host portal on :3002, admin portal on :3003.
// The root Vite config proxies /host and /admin back to this same origin.
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const children = [];
let shuttingDown = false;

function start(label, args) {
  const child = spawn(npm, args, {
    cwd: process.cwd(),
    env: { ...process.env },
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  children.push({ label, child });
  child.on('error', (error) => {
    console.error(`[${label}] failed to start: ${error.message}`);
    shutdown(1);
  });
  child.on('exit', (code, signal) => {
    if (!shuttingDown && code !== 0) {
      console.error(`[${label}] exited (${signal || code}); stopping the other portal servers.`);
      shutdown(typeof code === 'number' ? code : 1);
    }
  });
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const { child } of children) {
    if (!child.killed) child.kill();
  }
  process.exitCode = code;
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

start('customer', ['run', 'dev:root']);
start('host', ['run', 'dev:host']);
start('admin', ['run', 'dev:admin']);

console.log('\nParkEazy same-origin development routes:');
console.log('  Customer: http://localhost:3001/');
console.log('  Host:     http://localhost:3001/host/');
console.log('  Admin:    http://localhost:3001/admin/');
console.log('  API:      http://localhost:3001/api/v1/');
console.log('  Health:   http://localhost:3001/health');
console.log('Stop all three portal servers with Ctrl+C. Start the API separately with npm run dev:api.\n');
