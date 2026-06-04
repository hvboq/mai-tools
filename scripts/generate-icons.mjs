#!/usr/bin/env node
// Generates the mai-tools icon set from a single geometric definition.
//
// The icon is an ORIGINAL design (a circular 8-button touch-panel motif that
// evokes maimai-style gameplay) and intentionally does NOT use the official
// maimai logo, which is a SEGA trademark and would be rejected by extension
// stores.
//
// One geometry spec is the single source of truth; this script emits both the
// SVG source and the rasterized PNGs (16/32/48/128). PNG rasterization is done
// with supersampled anti-aliasing using only Node's built-in zlib, so no native
// image dependency is required in local or CI builds.

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// --- Geometry, defined in a 128x128 design space -------------------------------
const VIEW = 128;
const CENTER = VIEW / 2;
const CORNER_RADIUS = 28; // rounded-square silhouette
const RING_CENTERLINE = 38; // radius of the button ring
const RING_STROKE = 6; // ring thickness
const BUTTON_RADIUS = 9;
const BUTTON_COUNT = 8;

const COLORS = {
  bgTop: [22, 51, 79], // #16334f
  bgBottom: [11, 24, 40], // #0b1828
  ring: [238, 243, 248], // #eef3f8
  buttonA: [41, 211, 227], // #29d3e3 (cyan)
  buttonB: [255, 92, 147], // #ff5c93 (pink)
};

const buttons = Array.from({length: BUTTON_COUNT}, (_, i) => {
  const angle = (-90 + i * (360 / BUTTON_COUNT)) * (Math.PI / 180);
  return {
    x: CENTER + RING_CENTERLINE * Math.cos(angle),
    y: CENTER + RING_CENTERLINE * Math.sin(angle),
    color: i % 2 === 0 ? COLORS.buttonA : COLORS.buttonB,
  };
});

// --- Shared shape tests --------------------------------------------------------
function insideRoundRect(x, y, w, h, r) {
  const qx = Math.max(r - x, x - (w - r), 0);
  const qy = Math.max(r - y, y - (h - r), 0);
  return qx * qx + qy * qy <= r * r;
}

function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

// --- SVG emitter ---------------------------------------------------------------
function toHex([r, g, b]) {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

function buildSvg() {
  const buttonCircles = buttons
    .map(
      (b) =>
        `    <circle cx="${b.x.toFixed(2)}" cy="${b.y.toFixed(2)}" r="${BUTTON_RADIUS}" fill="${toHex(
          b.color,
        )}"/>`,
    )
    .join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW} ${VIEW}" width="${VIEW}" height="${VIEW}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${toHex(COLORS.bgTop)}"/>
      <stop offset="1" stop-color="${toHex(COLORS.bgBottom)}"/>
    </linearGradient>
    <clipPath id="clip">
      <rect x="0" y="0" width="${VIEW}" height="${VIEW}" rx="${CORNER_RADIUS}" ry="${CORNER_RADIUS}"/>
    </clipPath>
  </defs>
  <g clip-path="url(#clip)">
    <rect x="0" y="0" width="${VIEW}" height="${VIEW}" fill="url(#bg)"/>
    <circle cx="${CENTER}" cy="${CENTER}" r="${RING_CENTERLINE}" fill="none" stroke="${toHex(
      COLORS.ring,
    )}" stroke-width="${RING_STROKE}"/>
${buttonCircles}
  </g>
</svg>
`;
}

// --- PNG rasterizer ------------------------------------------------------------
const SUPERSAMPLE = 4;
const ringInner = RING_CENTERLINE - RING_STROKE / 2;
const ringOuter = RING_CENTERLINE + RING_STROKE / 2;

function sampleColor(x, y) {
  // Returns [r,g,b] for an inside sample, or null if outside the silhouette.
  if (!insideRoundRect(x, y, VIEW, VIEW, CORNER_RADIUS)) {
    return null;
  }
  // Background vertical gradient.
  const t = y / VIEW;
  let color = COLORS.bgTop.map((c, i) => c * (1 - t) + COLORS.bgBottom[i] * t);
  // Ring.
  const dCenter = distance(x, y, CENTER, CENTER);
  if (dCenter >= ringInner && dCenter <= ringOuter) {
    color = COLORS.ring.slice();
  }
  // Buttons sit on top of the ring.
  for (const b of buttons) {
    if (distance(x, y, b.x, b.y) <= BUTTON_RADIUS) {
      color = b.color.slice();
      break;
    }
  }
  return color;
}

function rasterize(size) {
  const scale = size / VIEW;
  const data = Buffer.alloc(size * size * 4);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let rs = 0;
      let gs = 0;
      let bs = 0;
      let inside = 0;
      for (let sy = 0; sy < SUPERSAMPLE; sy++) {
        for (let sx = 0; sx < SUPERSAMPLE; sx++) {
          const dx = (px + (sx + 0.5) / SUPERSAMPLE) / scale;
          const dy = (py + (sy + 0.5) / SUPERSAMPLE) / scale;
          const c = sampleColor(dx, dy);
          if (c) {
            rs += c[0];
            gs += c[1];
            bs += c[2];
            inside++;
          }
        }
      }
      const total = SUPERSAMPLE * SUPERSAMPLE;
      const offset = (py * size + px) * 4;
      if (inside === 0) {
        data.writeUInt32BE(0, offset); // fully transparent
      } else {
        data[offset] = Math.round(rs / inside);
        data[offset + 1] = Math.round(gs / inside);
        data[offset + 2] = Math.round(bs / inside);
        data[offset + 3] = Math.round((inside / total) * 255);
      }
    }
  }
  return data;
}

// --- Minimal PNG encoder -------------------------------------------------------
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

function chunk(type, body) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(body.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, body])), 0);
  return Buffer.concat([lenBuf, typeBuf, body, crcBuf]);
}

function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // compression/filter/interlace default to 0

  // Add the per-scanline filter byte (0 = none).
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const idat = zlib.deflateSync(raw, {level: 9});

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- Outputs -------------------------------------------------------------------
const SIZES = [16, 32, 48, 128];
const ICON_TARGET_DIRS = [
  'assets',
  'extensions/chrome',
  'extensions/firefox',
  'extensions/samsung-internet',
];

const svg = buildSvg();
const pngs = new Map(SIZES.map((size) => [size, encodePng(size, rasterize(size))]));

for (const dir of ICON_TARGET_DIRS) {
  const iconsDir = path.join(rootDir, dir, 'icons');
  fs.mkdirSync(iconsDir, {recursive: true});
  fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svg);
  for (const [size, buf] of pngs) {
    fs.writeFileSync(path.join(iconsDir, `icon-${size}.png`), buf);
  }
}

console.log(
  `Generated icon set (svg + ${SIZES.join('/')}px png) into: ${ICON_TARGET_DIRS.map(
    (d) => `${d}/icons`,
  ).join(', ')}`,
);
