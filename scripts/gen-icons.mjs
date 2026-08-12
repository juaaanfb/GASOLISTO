// Pure-Node PNG icon generator — no external deps, no font rendering.
// (next/og's bundled @vercel/og font loader is broken on this Windows setup,
// so icons are hand-encoded here instead of via ImageResponse.)
import { deflateSync, crc32 } from "node:zlib";
import { writeFile, mkdir } from "node:fs/promises";

const GREEN = [22, 163, 74]; // #16a34a
const WHITE = [255, 255, 255];
const SS = 4; // supersampling factor for basic anti-aliasing

function crc32Of(buf) {
  return crc32(buf) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32Of(crcInput), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdr = chunk("IHDR", ihdrData);

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0; // filter: none
    rgba.copy(raw, rowStart + 1, y * stride, y * stride + stride);
  }
  const idatData = deflateSync(raw, { level: 9 });
  const idat = chunk("IDAT", idatData);

  const iend = chunk("IEND", Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

// Point-in-triangle via sign of cross products (barycentric technique).
function signo(p, a, b) {
  return (p.x - b.x) * (a.y - b.y) - (a.x - b.x) * (p.y - b.y);
}
function enTriangulo(p, v1, v2, v3) {
  const d1 = signo(p, v1, v2);
  const d2 = signo(p, v2, v3);
  const d3 = signo(p, v3, v1);
  const neg = d1 < 0 || d2 < 0 || d3 < 0;
  const pos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(neg && pos);
}

// "Fuel drop" shape: a circle (body) unioned with a triangle (tapered point),
// the classic teardrop/pin silhouette — reads clearly at any size, no fonts needed.
function enGota(x, y, cx, cyTop, r) {
  const dx = x - cx;
  const dy = y - cyTop;
  if (Math.sqrt(dx * dx + dy * dy) <= r) return true;

  const v1 = { x: cx - r * 0.87, y: cyTop + r * 0.5 };
  const v2 = { x: cx + r * 0.87, y: cyTop + r * 0.5 };
  const v3 = { x: cx, y: cyTop + r * 2.05 };
  return enTriangulo({ x, y }, v1, v2, v3);
}

// Renders at SS× resolution then box-downsamples for basic anti-aliasing.
function drawSupersampled(width, height, maskFn) {
  const bigW = width * SS;
  const bigH = height * SS;
  const big = new Uint8Array(bigW * bigH);

  for (let y = 0; y < bigH; y++) {
    for (let x = 0; x < bigW; x++) {
      big[y * bigW + x] = maskFn(x, y) ? 1 : 0;
    }
  }

  const rgba = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          sum += big[(y * SS + sy) * bigW + (x * SS + sx)];
        }
      }
      const t = sum / (SS * SS); // 0 = green background, 1 = white shape
      const i = (y * width + x) * 4;
      rgba[i] = GREEN[0] + (WHITE[0] - GREEN[0]) * t;
      rgba[i + 1] = GREEN[1] + (WHITE[1] - GREEN[1]) * t;
      rgba[i + 2] = GREEN[2] + (WHITE[2] - GREEN[2]) * t;
      rgba[i + 3] = 255;
    }
  }
  return rgba;
}

function drawIcon(size) {
  const cx = size / 2;
  const r = size * 0.235;
  const cyTop = size / 2 - r * 0.78;
  return drawSupersampled(size, size, (x, y) => enGota(x / SS, y / SS, cx, cyTop, r));
}

function drawOgImage(width, height) {
  const cx = width / 2;
  const r = height * 0.22;
  const cyTop = height / 2 - r * 1.0;
  return drawSupersampled(width, height, (x, y) => enGota(x / SS, y / SS, cx, cyTop, r));
}

async function main() {
  await mkdir("public/icons", { recursive: true });

  const targets = [
    { size: 512, file: "public/icons/icon-512.png" },
    { size: 192, file: "public/icons/icon-192.png" },
    { size: 180, file: "public/icons/apple-touch-icon.png" },
    { size: 32, file: "public/icons/favicon-32.png" },
  ];

  for (const t of targets) {
    const rgba = drawIcon(t.size);
    const png = encodePng(t.size, t.size, rgba);
    await writeFile(t.file, png);
    console.log(`wrote ${t.file} (${png.length} bytes)`);
  }

  const ogW = 1200;
  const ogH = 630;
  const ogRgba = drawOgImage(ogW, ogH);
  const ogPng = encodePng(ogW, ogH, ogRgba);
  await writeFile("public/icons/og-image.png", ogPng);
  console.log(`wrote public/icons/og-image.png (${ogPng.length} bytes)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
