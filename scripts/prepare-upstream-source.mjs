import fs from 'node:fs';
import path from 'node:path';

const sourceRoot = process.argv[2];

if (!sourceRoot) {
  console.error('Usage: node scripts/prepare-upstream-source.mjs <source-root>');
  process.exit(1);
}

const allowedOrigin = process.env.MAI_TOOLS_ALLOWED_ORIGIN || 'https://hvboq.github.io';
const hostedBaseUrl = process.env.MAI_TOOLS_HOSTED_BASE_URL || 'https://hvboq.github.io/mai-tools';

function readText(relativePath) {
  return fs.readFileSync(path.join(sourceRoot, relativePath), 'utf8');
}

function writeText(relativePath, text) {
  fs.writeFileSync(path.join(sourceRoot, relativePath), text);
}

const utilPath = 'src/common/util.ts';
let utilText = readText(utilPath);
if (!utilText.includes(`'${allowedOrigin}'`)) {
  utilText = utilText.replace(
    "export const ALLOWED_ORIGINS = [\n",
    `export const ALLOWED_ORIGINS = [\n  '${allowedOrigin}',\n`,
  );
  writeText(utilPath, utilText);
}

const scriptHostPath = 'src/common/script-host.ts';
let scriptHostText = readText(scriptHostPath);
scriptHostText = scriptHostText.replace(
  /export const FALLBACK_MAI_TOOLS_BASE_URL = '[^']+';/,
  `export const FALLBACK_MAI_TOOLS_BASE_URL = '${hostedBaseUrl}';`,
);
writeText(scriptHostPath, scriptHostText);
