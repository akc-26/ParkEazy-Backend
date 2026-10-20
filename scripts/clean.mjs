#!/usr/bin/env node
/** Cross-platform cleanup for generated build artifacts. Never removes source or .env files. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const targets = ['dist', 'services/api/dist', 'apps/website/dist', 'apps/host/dist', 'apps/admin/dist', 'server.js'];
for (const relative of targets) {
  const target = path.join(root, relative);
  fs.rmSync(target, { recursive: true, force: true });
  console.log(`Removed generated output: ${relative}`);
}
