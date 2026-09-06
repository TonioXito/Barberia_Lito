import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "..", "public", "icons");
mkdirSync(OUT, { recursive: true });

const BG_TOP = [185, 28, 28]; // #b91c1c
const BG_BOTTOM = [140, 30, 30]; // granate oscuro
const MEAT_TOP = [251, 131, 139]; // #fb838b rosa carne
const MEAT_BOTTOM = [220, 38, 38]; // #dc2626
const BONE = [255, 244, 230];
const FAT = [255, 250, 240];

const clamp01 = (x) => Math.max(0, Math.min(1, x));

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

function distCapsule(px, py, ax, ay, bx, by, r) {
  return distSegment(px, py, ax, ay, bx, by) - r;
}

function distCircle(px, py, cx, cy, r) {
  return Math.sqrt((px - cx) ** 2 + (py - cy) ** 2) - r;
}

function distRoundRect(px, py, cx, cy, hw, hh, r) {
  const qx = Math.abs(px - cx) - (hw - r);
  const qy = Math.abs(py - cy) - (hh - r);
  const ox = Math.max(qx, 0);
  const oy = Math.max(qy, 0);
  return Math.sqrt(ox * ox + oy * oy) + Math.min(Math.max(qx, qy), 0) - r;
}

/* --- formas del dibujo --- */
const MEAT = { cx: 0.48, cy: 0.54, hw: 0.27, hh: 0.2, r: 0.14 };

const BONE_SEGS = [
  { ax: 0.58, ay: 0.3, bx: 0.78, by: 0.42, r: 0.045 },
  { ax: 0.52, ay: 0.24, bx: 0.66, by: 0.34, r: 0.04 },
];
const BONE_BALLS = [
  { cx: 0.54, cy: 0.26, r: 0.068 },
  { cx: 0.82, cy: 0.45, r: 0.052 },
];

const FAT_SEGS = [
  { ax: 0.34, ay: 0.6, bx: 0.46, by: 0.44, r: 0.02 },
  { ax: 0.42, ay: 0.66, bx: 0.55, by: 0.5, r: 0.016 },
  { ax: 0.52, ay: 0.65, bx: 0.67, by: 0.46, r: 0.018 },
];
const FAT_BALLS = [
  { cx: 0.39, cy: 0.54, r: 0.022 },
  { cx: 0.6, cy: 0.58, r: 0.02 },
];

let sdfMeat, sdfBone, sdfFat;
(function build() {
  const cP = (a) => a;
  const mSegs = BONE_SEGS.map((s) => (px, py) => distCapsule(px, py, s.ax, s.ay, s.bx, s.by, s.r));
  const mBalls = BONE_BALLS.map((b) => (px, py) => distCircle(px, py, b.cx, b.cy, b.r));
  const fSegs = FAT_SEGS.map((s) => (px, py) => distCapsule(px, py, s.ax, s.ay, s.bx, s.by, s.r));
  const fBalls = FAT_BALLS.map((b) => (px, py) => distCircle(px, py, b.cx, b.cy, b.r));
  sdfMeat = (px, py) => distRoundRect(px, py, MEAT.cx, MEAT.cy, MEAT.hw, MEAT.hh, MEAT.r);
  sdfBone = (px, py) =>
    Math.min(...mSegs.map((f) => f(px, py)), ...mBalls.map((f) => f(px, py)));
  sdfFat = (px, py) =>
    Math.min(...fSegs.map((f) => f(px, py)), ...fBalls.map((f) => f(px, py)));
  cP(0);
})();

function coverage(px, py, size, sdf) {
  let sum = 0;
  const SS = 3;
  for (let sy = 0; sy < SS; sy++) {
    for (let sx = 0; sx < SS; sx++) {
      const ox = (sx + 0.5) / SS - 0.5;
      const oy = (sy + 0.5) / SS - 0.5;
      const d = sdf(px + ox / size, py + oy / size);
      const edge = 1 / size;
      sum += clamp01(0.5 - d / edge);
    }
  }
  return sum / (SS * SS);
}

function bgColor(nx, ny) {
  const t = clamp01(ny * 0.9);
  return [
    Math.round(BG_TOP[0] + (BG_BOTTOM[0] - BG_TOP[0]) * t),
    Math.round(BG_TOP[1] + (BG_BOTTOM[1] - BG_TOP[1]) * t),
    Math.round(BG_TOP[2] + (BG_BOTTOM[2] - BG_TOP[2]) * t),
  ];
}

function meatColor(nx, ny) {
  const t = clamp01((nx + ny) / 2 - 0.1);
  return [
    Math.round(MEAT_TOP[0] + (MEAT_BOTTOM[0] - MEAT_TOP[0]) * t),
    Math.round(MEAT_TOP[1] + (MEAT_BOTTOM[1] - MEAT_TOP[1]) * t),
    Math.round(MEAT_TOP[2] + (MEAT_BOTTOM[2] - MEAT_TOP[2]) * t),
  ];
}

function blend(a, b, k) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * k),
    Math.round(a[1] + (b[1] - a[1]) * k),
    Math.round(a[2] + (b[2] - a[2]) * k),
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

      let color = bgColor(nx, ny);
      const m = coverage(u, v, size, sdfMeat);
      const b = coverage(u, v, size, sdfBone);
      const f = coverage(u, v, size, sdfFat);

      if (m > 0) color = meatColor(nx, ny);
      if (b > 0) color = blend(color, BONE, b);
      if (f > 0) color = blend(color, FAT, f);
      if (m > 0 && b > 0 && f > 0) color = blend(FAT, color, 1);

      px[o++] = color[0];
      px[o++] = color[1];
      px[o++] = color[2];
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
  ihdr[8] = 8;
  ihdr[9] = 6;
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