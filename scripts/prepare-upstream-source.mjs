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

function requireCondition(condition, message) {
  if (!condition) {
    console.error(message);
    process.exit(1);
  }
}

function replaceRequired(text, pattern, replacement, label) {
  const nextText = text.replace(pattern, replacement);
  requireCondition(nextText !== text, `Failed to patch ${label}`);
  return nextText;
}

requireCondition(fs.existsSync(sourceRoot), `Source root does not exist: ${sourceRoot}`);

const utilPath = 'src/common/util.ts';
let utilText = readText(utilPath);
if (!utilText.includes(`'${allowedOrigin}'`)) {
  utilText = replaceRequired(
    utilText,
    /export const ALLOWED_ORIGINS = \[\r?\n/,
    `export const ALLOWED_ORIGINS = [\n  '${allowedOrigin}',\n`,
    `${utilPath} ALLOWED_ORIGINS`,
  );
  writeText(utilPath, utilText);
}
requireCondition(
  readText(utilPath).includes(`'${allowedOrigin}'`),
  `${utilPath} does not include ${allowedOrigin}`,
);

const scriptHostPath = 'src/common/script-host.ts';
let scriptHostText = readText(scriptHostPath);
if (!scriptHostText.includes(`'${hostedBaseUrl}'`)) {
  scriptHostText = replaceRequired(
    scriptHostText,
    /export const FALLBACK_MAI_TOOLS_BASE_URL = '[^']+';/,
    `export const FALLBACK_MAI_TOOLS_BASE_URL = '${hostedBaseUrl}';`,
    `${scriptHostPath} FALLBACK_MAI_TOOLS_BASE_URL`,
  );
  writeText(scriptHostPath, scriptHostText);
}
scriptHostText = readText(scriptHostPath);
requireCondition(
  scriptHostText.includes(`'${hostedBaseUrl}'`),
  `${scriptHostPath} does not include ${hostedBaseUrl}`,
);

console.log(`Prepared upstream source for ${hostedBaseUrl}`);
