import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const required = [
  'dist/website/index.html',
  'dist/host/index.html',
  'dist/admin/index.html',
];
const missing = required.filter((file) => !existsSync(join(root, file)));
if (missing.length) {
  console.error('ParkEazy full application build is incomplete.');
  console.error(`Missing: ${missing.join(', ')}`);
  console.error('Run "npm run build:all" and start again.');
  process.exit(1);
}

process.chdir(root);
process.env.NODE_ENV ||= 'development';
process.env.INFRASTRUCTURE_MODE ||= 'memory';
process.env.FRONTEND_DIST_ROOT ||= join(root, 'dist');
// The full app uses one public port for all portals and the API.
process.env.API_PORT ||= process.env.PARKEAZY_LOCAL_PORT || '3001';
console.log(`Starting complete ParkEazy application on http://localhost:${process.env.API_PORT}`);
console.log('  Customer: /');
console.log('  Host:     /host/');
console.log('  Admin:    /admin/');
console.log('  API:      /api/v1/');
console.log('  Health:   /health');
await import(pathToFileURL(join(root, 'services/api/src/main.ts')).href);
