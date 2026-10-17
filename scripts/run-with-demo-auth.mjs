import { spawn } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const tsxCli = fileURLToPath(import.meta.resolve('tsx/cli'));
const inputArgs = process.argv.slice(2);

async function expandPattern(pattern) {
  if (!pattern.includes('*')) return [pattern];
  const normalized = pattern.replaceAll('\\', '/');
  const parts = normalized.split('/');
  async function walk(directory, index) {
    if (index >= parts.length) return [directory];
    const part = parts[index];
    if (part === '**') {
      const direct = await walk(directory, index + 1);
      let nested = [];
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist') {
          nested = nested.concat(await walk(join(directory, entry.name), index));
        }
      }
      return direct.concat(nested);
    }
    if (part.includes('*')) {
      const regex = new RegExp('^' + part.replace(/[.+^${}()|[\]\\]/g, '\\$&').replaceAll('*', '.*') + '$');
      let matches = [];
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        if (regex.test(entry.name)) matches = matches.concat(await walk(join(directory, entry.name), index + 1));
      }
      return matches;
    }
    return walk(join(directory, part), index + 1);
  }
  const expanded = await walk(root, 0);
  return expanded.filter(path => !path.endsWith('/tests') && !path.endsWith('\\tests')).map(path => path.startsWith(root) ? path.slice(root.length + 1) : path);
}

let args = [];
for (const arg of inputArgs) args.push(...await expandPattern(arg));
const child = spawn(process.execPath, [tsxCli, ...args], {
  cwd: root,
  env: { ...process.env, ENABLE_DEMO_AUTH: 'true' },
  stdio: 'inherit',
  shell: false,
});
child.on('error', error => {
  console.error('Failed to start the TypeScript runner:', error);
  process.exitCode = 1;
});
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exitCode = code ?? 1;
});
