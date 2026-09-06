import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "..", "public", "icons");
mkdirSync(OUT, { recursive: true });

const BG_TOP = [239, 68, 68]; // #ef4444
const BG_BOTTOM = [220, 38, 38]; // #dc2626
const BONE = [255, 255, 255];

const CAPSULE_R = 0.085;
const SPINE = { ax: 0.5, ay: 0.34, bx: 0.5, by: 0.6 };
const RIB = { ax: 0.34, ay: 0.62, bx: 0.64, by: 0.62 };
const KNUCKLE = { cx: 0.72, cy: 0.62, r: 0.1 };

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function distSegment(px, py, ax, ay, bx, by) {
  const vx = bx - ax;
  const vy = by - ay;
  const wx = px - ax;
  const wy = py - ay;
  const t = clamp01((wx * vx + wy * vy) / (vx * vx + vy * vy || 1));
  const dx = px - (ax + t * vx);
  const dy = py - (ay + t * vy);
  return Math.sqrt(dx * dx + dy * dy);
}

function distCapsule(px, py, a, b, r) {
  return distSegment(px, py, a.ax, a.ay, b.bx, b.by) - r;
}

function distCircle(px, py, c) {
  return Math.sqrt((px - c.cx) ** 2 + (py - c.cy) ** 2) - c.r;
}

function boneDist(px, py) {
  const dSpine = distCapsule(px, py, SPINE, SPINE, CAPSULE_R);
  const dRib = distCapsule(px, py, RIB, RIB, CAPSULE_R);
  const dKnuckle = distCircle(px, py, KNUCKLE);
  return Math.min(dSpine, dRib, dKnuckle);
}

function coverage(px, py, size) {
  let sum = 0;
  const SS = 3;
  for (let sy = 0; sy < SS; sy++) {
    for (let sx = 0; sx < SS; sx++) {
      const ox = (sx + 0.5) / SS - 0.5;
      const oy = (sy + 0.5) / SS - 0.5;
      const d = boneDist(px + ox / size, py + oy / size);
      const edge = 1 / size;
      sum += clamp01(0.5 - d / edge);
    }
  }
  return sum / (SS * SS);
}

function bgColor(nx, ny) {
  const t = clamp01(ny * 1.1 - 0.05);
  return [
    Math.round(BG_TOP[0] + (BG_BOTTOM[0] - BG_TOP[0]) * t),
    Math.round(BG_TOP[1] + (BG_BOTTOM[1] - BG_TOP[1]) * t),
    Math.round(BG_TOP[2] + (BG_BOTTOM[2] - BG_TOP[2]) * t),
  ];
}

function drawIcon(size, scale) {
  const px = Buffer.alloc(size * (size * 4 + 1));
  let o = 0;
  for (let y = 0; y < size; y++) {
    px[o++] = 0;
    const ny = (y + 0.5) / size;
    for (let x = 0; x < size; x++) {
      const nx = (x + 0.5) / size;
      const u = 0.5 + (nx - 0.5) / scale;
      const v = 0.5 + (ny - 0.5) / scale;
      const a = coverage(u, v, size);
      const [r, g, b] = a > 0 ? BONE : bgColor(nx, ny);
      px[o++] = r;
      px[o++] = g;
      px[o++] = b;
      px[o++] = 255;
    }
  }
  return px;
}

const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function encodePng(size, raw) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const idat = deflateSync(raw);
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

const files = [
  ["icon-192.png", 192, 0.86],
  ["icon-512.png", 512, 0.86],
  ["icon-maskable-512.png", 512, 0.72],
  ["apple-touch-icon.png", 180, 0.86],
];

for (const [name, size, scale] of files) {
  const png = encodePng(size, drawIcon(size, scale));
  writeFileSync(resolve(OUT, name), png);
  console.log(`Generado ${name} (${size}x${size})`);
}