import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const rootDir = process.cwd();
const buildDir = process.env.MAI_TOOLS_BUILD_DIR || path.join(rootDir, 'build');
const referenceBundle =
  process.env.MAI_TOOLS_BUNDLE_FILE ||
  (process.env.MAI_TOOLS_BUILD_DIR
    ? path.join(buildDir, 'scripts', 'all-in-one.js')
    : filePath('extensions/chrome/all-in-one.js'));
const expectedBaseUrl =
  process.env.MAI_TOOLS_HOSTED_BASE_URL || 'https://hvboq.github.io/mai-tools';
const forbiddenBaseUrls = (
  process.env.MAI_TOOLS_FORBIDDEN_BASE_URLS || 'https://myjian.github.io/mai-tools'
)
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const extensionTargets = [
  {
    name: 'chrome',
    dir: 'extensions/chrome',
    zip: 'mai-tools-chrome-extension.zip',
    files: ['all-in-one.js', 'content-script.js', 'manifest.json'],
  },
  {
    name: 'firefox',
    dir: 'extensions/firefox',
    zip: 'mai-tools-firefox-extension.zip',
    files: ['all-in-one.js', 'content-script.js', 'manifest.json'],
  },
  {
    name: 'samsung-internet',
    dir: 'extensions/samsung-internet',
    zip: 'mai-tools-samsung-internet-extension.zip',
    files: ['all-in-one.js', 'content-script.js', 'manifest.json', 'README.md'],
  },
];

const failures = [];

function fail(message) {
  failures.push(message);
}

function check(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function filePath(relativePath) {
  return path.join(rootDir, relativePath);
}

function readText(relativePath) {
  return fs.readFileSync(filePath(relativePath), 'utf8');
}

function sha256(relativePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath(relativePath))).digest('hex');
}

function sha256Buffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function normalizeZipEntry(entry) {
  return entry.replace(/\\/g, '/').replace(/^\.\//, '');
}

function readZipEntries(relativePath) {
  const zipPath = filePath(relativePath);
  const zip = fs.readFileSync(zipPath);
  const minEocdSize = 22;
  const maxCommentSize = 0xffff;
  const searchStart = Math.max(0, zip.length - minEocdSize - maxCommentSize);
  let eocdOffset = -1;

  for (let offset = zip.length - minEocdSize; offset >= searchStart; offset -= 1) {
    if (zip.readUInt32LE(offset) === 0x06054b50) {
      eocdOffset = offset;
      break;
    }
  }

  check(eocdOffset >= 0, `${relativePath} is not a readable zip file`);
  if (eocdOffset < 0) {
    return new Map();
  }

  const entryCount = zip.readUInt16LE(eocdOffset + 10);
  const centralDirectoryOffset = zip.readUInt32LE(eocdOffset + 16);
  const entries = new Map();
  let offset = centralDirectoryOffset;

  for (let index = 0; index < entryCount; index += 1) {
    check(zip.readUInt32LE(offset) === 0x02014b50, `${relativePath} has an invalid zip directory`);
    if (zip.readUInt32LE(offset) !== 0x02014b50) {
      break;
    }

    const method = zip.readUInt16LE(offset + 10);
    const compressedSize = zip.readUInt32LE(offset + 20);
    const fileNameLength = zip.readUInt16LE(offset + 28);
    const extraLength = zip.readUInt16LE(offset + 30);
    const commentLength = zip.readUInt16LE(offset + 32);
    const localHeaderOffset = zip.readUInt32LE(offset + 42);
    const name = normalizeZipEntry(
      zip.subarray(offset + 46, offset + 46 + fileNameLength).toString('utf8'),
    );

    const localNameLength = zip.readUInt16LE(localHeaderOffset + 26);
    const localExtraLength = zip.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
    const compressedData = zip.subarray(dataStart, dataStart + compressedSize);

    if (!name.endsWith('/')) {
      if (method === 0) {
        entries.set(name, compressedData);
      } else if (method === 8) {
        entries.set(name, zlib.inflateRawSync(compressedData));
      } else {
        check(false, `${relativePath} uses unsupported zip method ${method} for ${name}`);
      }
    }

    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function validateVersion(version, source) {
  check(typeof version === 'string' && version.length > 0, `${source} version is missing`);
  if (typeof version !== 'string') {
    return;
  }

  const parts = version.split('.');
  check(parts.length >= 1 && parts.length <= 4, `${source} version must have 1-4 parts`);
  for (const part of parts) {
    check(/^\d+$/.test(part), `${source} version part is not numeric: ${part}`);
    if (/^\d+$/.test(part)) {
      check(part === '0' || !part.startsWith('0'), `${source} version part has a leading zero: ${part}`);
      const value = Number(part);
      check(value >= 0 && value <= 65535, `${source} version part is out of range: ${part}`);
    }
  }
}

check(fs.existsSync(referenceBundle), `Missing reference bundle: ${referenceBundle}`);

let referenceHash = null;
if (fs.existsSync(referenceBundle)) {
  referenceHash = crypto.createHash('sha256').update(fs.readFileSync(referenceBundle)).digest('hex');
}

const versions = new Map();

for (const target of extensionTargets) {
  const manifestPath = `${target.dir}/manifest.json`;
  const manifest = JSON.parse(readText(manifestPath));
  validateVersion(manifest.version, `${target.name} manifest`);
  versions.set(target.name, manifest.version);

  const contentScript = readText(`${target.dir}/content-script.js`);
  check(
    !/https?:\/\//.test(contentScript),
    `${target.name} content script must not load remote executable code`,
  );
  check(
    contentScript.includes('runtime.getURL("all-in-one.js")') ||
      contentScript.includes('chrome.runtime.getURL("all-in-one.js")'),
    `${target.name} content script must load packaged all-in-one.js`,
  );

  const extensionBundlePath = `${target.dir}/all-in-one.js`;
  check(fs.existsSync(filePath(extensionBundlePath)), `${target.name} all-in-one.js is missing`);
  if (referenceHash && fs.existsSync(filePath(extensionBundlePath))) {
    check(
      sha256(extensionBundlePath) === referenceHash,
      `${target.name} bundle differs from reference bundle`,
    );
    const bundleText = readText(extensionBundlePath);
    check(
      bundleText.includes(expectedBaseUrl),
      `${target.name} bundle does not reference ${expectedBaseUrl}`,
    );
    for (const forbiddenBaseUrl of forbiddenBaseUrls) {
      if (forbiddenBaseUrl !== expectedBaseUrl) {
        check(
          !bundleText.includes(forbiddenBaseUrl),
          `${target.name} bundle still references ${forbiddenBaseUrl}`,
        );
      }
    }
  }

  check(fs.existsSync(filePath(target.zip)), `${target.zip} is missing`);
  if (fs.existsSync(filePath(target.zip))) {
    const zipEntries = readZipEntries(target.zip);
    for (const expectedFile of target.files) {
      check(zipEntries.has(expectedFile), `${target.zip} is missing ${expectedFile}`);
      if (zipEntries.has(expectedFile)) {
        check(
          sha256Buffer(zipEntries.get(expectedFile)) === sha256(`${target.dir}/${expectedFile}`),
          `${target.zip} contains stale ${expectedFile}`,
        );
      }
    }
  }
}

const userscriptMeta = readText('install-mai-tools.meta.js');
const userscript = readText('install-mai-tools.user.js');
for (const [source, text] of [
  ['install-mai-tools.meta.js', userscriptMeta],
  ['install-mai-tools.user.js', userscript],
]) {
  const match = text.match(/^\/\/ @version\s+(.+)$/m);
  check(Boolean(match), `${source} @version is missing`);
  if (match) {
    validateVersion(match[1], source);
    versions.set(source, match[1]);
  }
}

const uniqueVersions = new Set(versions.values());
check(uniqueVersions.size === 1, `Distribution versions differ: ${JSON.stringify([...versions])}`);

if (failures.length) {
  console.error('Distribution validation failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Distribution validation ok: version ${[...uniqueVersions][0]}`);
