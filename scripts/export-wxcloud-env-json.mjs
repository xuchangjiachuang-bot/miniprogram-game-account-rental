import fs from 'node:fs';
import path from 'node:path';

function parseEnvFile(contents) {
  const entries = {};

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();

    if (!key) {
      continue;
    }

    entries[key] = value;
  }

  return entries;
}

const argPath = process.argv[2] || '.env.production';
const resolvedPath = path.resolve(process.cwd(), argPath);

if (!fs.existsSync(resolvedPath)) {
  console.error(`Env file not found: ${resolvedPath}`);
  process.exit(1);
}

const contents = fs.readFileSync(resolvedPath, 'utf8');
const envMap = parseEnvFile(contents);

if (Object.keys(envMap).length === 0) {
  console.error(`No env vars found in: ${resolvedPath}`);
  process.exit(1);
}

console.error(`Loaded ${Object.keys(envMap).length} env vars from ${resolvedPath}`);
console.error('Use the full JSON output below as --envParamsJson to avoid partial overwrites.');
process.stdout.write(`${JSON.stringify(envMap, null, 2)}\n`);
