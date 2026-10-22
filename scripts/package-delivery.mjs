#!/usr/bin/env node
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pyScript = path.join(__dirname, 'package-delivery.py');

const result = spawnSync('python3', [pyScript], { stdio: 'inherit' });
if (result.status !== 0) {
  process.exit(result.status || 1);
}
