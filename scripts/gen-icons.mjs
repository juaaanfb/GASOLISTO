// Pure-Node PNG icon generator — no external deps, no font rendering.
// (next/og's bundled @vercel/og font loader is broken on this Windows setup,
// so icons are hand-encoded here instead of via ImageResponse.)
import { deflateSync, crc32 } from "node:zlib";
import { writeFile, mkdir } from "node:fs/promises";

const GREEN = [22, 163, 74]; // #16a34a
const WHITE = [255, 255, 255];

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

function drawIcon(size) {
  return drawCanvas(size, size, size / 2, size / 2, size * 0.33);
}

// Generic canvas: green fill, white ring centered at (cx, cy) with given outer radius.
function drawCanvas(width, height, cx, cy, outerR) {
  const innerR = outerR * 0.7;
  const rgba = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const r = Math.sqrt(dx * dx + dy * dy);

      let color = GREEN;
      if (r <= outerR && r >= innerR) {
        color = WHITE;
      }

      const i = (y * width + x) * 4;
      rgba[i] = color[0];
      rgba[i + 1] = color[1];
      rgba[i + 2] = color[2];
      rgba[i + 3] = 255;
    }
  }
  return rgba;
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
  const ogRgba = drawCanvas(ogW, ogH, ogW / 2, ogH / 2, 140);
  const ogPng = encodePng(ogW, ogH, ogRgba);
  await writeFile("public/icons/og-image.png", ogPng);
  console.log(`wrote public/icons/og-image.png (${ogPng.length} bytes)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
