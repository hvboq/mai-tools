#!/usr/bin/env node
// Deterministic, dependency-free zip packer for the extension folders.
//
// Replaces the previous reliance on a system `zip` binary (which is not present
// on every dev machine, e.g. Windows) so the distribution pipeline is portable
// and reproducible. Entries are sorted and stamped with a fixed timestamp so the
// archive is byte-stable across runs and platforms.
//
// Usage: node scripts/pack-extension.mjs <source-dir> <output.zip>

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const [, , sourceDir, outputZip] = process.argv;

if (!sourceDir || !outputZip) {
  console.error('Usage: node scripts/pack-extension.mjs <source-dir> <output.zip>');
  process.exit(1);
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function listFiles(dir, prefix = '') {
  const out = [];
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      out.push(...listFiles(path.join(dir, entry.name), rel));
    } else if (entry.isFile()) {
      out.push(rel);
    }
  }
  return out;
}

// Fixed DOS timestamp: 2000-01-01 00:00:00 (matches the prior `touch -t 200001010000`).
const DOS_TIME = 0;
const DOS_DATE = ((2000 - 1980) << 9) | (1 << 5) | 1;

const files = listFiles(sourceDir).sort();
const localParts = [];
const centralParts = [];
let offset = 0;

for (const name of files) {
  const nameBuf = Buffer.from(name, 'utf8');
  const content = fs.readFileSync(path.join(sourceDir, name));
  const compressed = zlib.deflateRawSync(content, {level: 9});
  const crc = crc32(content);

  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4); // version needed
  local.writeUInt16LE(0, 6); // flags
  local.writeUInt16LE(8, 8); // method: deflate
  local.writeUInt16LE(DOS_TIME, 10);
  local.writeUInt16LE(DOS_DATE, 12);
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(compressed.length, 18);
  local.writeUInt32LE(content.length, 22);
  local.writeUInt16LE(nameBuf.length, 26);
  local.writeUInt16LE(0, 28); // extra length
  localParts.push(local, nameBuf, compressed);

  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4); // version made by
  central.writeUInt16LE(20, 6); // version needed
  central.writeUInt16LE(0, 8); // flags
  central.writeUInt16LE(8, 10); // method
  central.writeUInt16LE(DOS_TIME, 12);
  central.writeUInt16LE(DOS_DATE, 14);
  central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(compressed.length, 20);
  central.writeUInt32LE(content.length, 24);
  central.writeUInt16LE(nameBuf.length, 28);
  central.writeUInt16LE(0, 30); // extra length
  central.writeUInt16LE(0, 32); // comment length
  central.writeUInt16LE(0, 34); // disk number start
  central.writeUInt16LE(0, 36); // internal attributes
  central.writeUInt32LE(0, 38); // external attributes
  central.writeUInt32LE(offset, 42); // local header offset
  centralParts.push(central, nameBuf);

  offset += local.length + nameBuf.length + compressed.length;
}

const centralDirectory = Buffer.concat(centralParts);
const localData = Buffer.concat(localParts);

const eocd = Buffer.alloc(22);
eocd.writeUInt32LE(0x06054b50, 0);
eocd.writeUInt16LE(0, 4); // disk number
eocd.writeUInt16LE(0, 6); // disk with central directory
eocd.writeUInt16LE(files.length, 8); // entries on this disk
eocd.writeUInt16LE(files.length, 10); // total entries
eocd.writeUInt32LE(centralDirectory.length, 12);
eocd.writeUInt32LE(localData.length, 16); // central directory offset
eocd.writeUInt16LE(0, 20); // comment length

fs.writeFileSync(outputZip, Buffer.concat([localData, centralDirectory, eocd]));
console.log(`Packed ${files.length} files into ${outputZip}`);
