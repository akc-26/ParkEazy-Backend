import fs from 'node:fs';
import path from 'node:path';

const csvPath = path.resolve('DESIGN-SCREEN-TRACEABILITY.csv');
const pagesRoot = path.resolve('apps/website/src/pages');
if (!fs.existsSync(csvPath)) {
  console.error('Missing DESIGN-SCREEN-TRACEABILITY.csv');
  process.exit(1);
}
const lines = fs.readFileSync(csvPath, 'utf8').replace(/^\uFEFF/, '').trim().split(/\r?\n/);
const header = lines.shift();
if (!header?.includes('Approved screen directory / ID') || !header.includes('React component')) {
  console.error('Unexpected design traceability header');
  process.exit(1);
}
const rows = lines.filter(Boolean).map((line) => {
  // The first two CSV columns are stable and do not contain commas.
  const first = line.indexOf(',');
  const second = line.indexOf(',', first + 1);
  return { screen: line.slice(0, first), component: line.slice(first + 1, second) };
});
const missing = rows.filter((row) => !row.screen || !row.component || !fs.existsSync(path.join(pagesRoot, row.component)));
const ids = rows.map((row) => row.screen);
const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
console.log(`Approved User Website screen rows: ${rows.length}`);
console.log(`Mapped page components present: ${rows.length - missing.length}/${rows.length}`);
if (duplicates.length) console.error(`Duplicate screen IDs: ${[...new Set(duplicates)].join(', ')}`);
if (missing.length) console.error(`Missing mapping/component: ${missing.map((row) => `${row.screen} -> ${row.component}`).join('; ')}`);
if (rows.length !== 54 || missing.length || duplicates.length) process.exit(1);
console.log('PASS: all 54 screen IDs map to existing page components. This verifies inventory only, not visual match or browser behaviour.');
