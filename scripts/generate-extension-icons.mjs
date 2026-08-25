import fs from "fs";
import path from "path";
import zlib from "zlib";

function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }

  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

function createPng(size, r, g, b) {
  const width = size;
  const height = size;

  // Raw image data: for each row, 1 filter byte (0) + width * 4 bytes (RGBA)
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      // Rounded rect / circle badge shape
      const cx = width / 2;
      const cy = height / 2;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      const radius = (width / 2) * 0.88;

      if (dist <= radius) {
        // Gradient from indigo to blue
        const t = (x + y) / (width + height);
        const red = Math.round(r * (1 - t * 0.2) + 30 * t);
        const green = Math.round(g * (1 - t * 0.2) + 120 * t);
        const blue = Math.round(b * (1 - t * 0.1) + 240 * t);

        // Center mortarboard / book silhouette highlight
        const innerDist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        if (innerDist < radius * 0.45) {
          rawData[pxOffset] = 255;     // White accent
          rawData[pxOffset + 1] = 255;
          rawData[pxOffset + 2] = 255;
          rawData[pxOffset + 3] = 255;
        } else {
          rawData[pxOffset] = red;
          rawData[pxOffset + 1] = green;
          rawData[pxOffset + 2] = blue;
          rawData[pxOffset + 3] = 255;
        }
      } else {
        rawData[pxOffset] = 0;
        rawData[pxOffset + 1] = 0;
        rawData[pxOffset + 2] = 0;
        rawData[pxOffset + 3] = 0; // Transparent outside
      }
    }
  }

  const deflated = zlib.deflateSync(rawData);

  // PNG Signature
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const ihdrTypeAndData = Buffer.concat([Buffer.from("IHDR"), ihdrData]);
  const ihdrCrc = Buffer.alloc(4);
  ihdrCrc.writeUInt32BE(crc32(ihdrTypeAndData), 0);

  const ihdrLen = Buffer.alloc(4);
  ihdrLen.writeUInt32BE(13, 0);
  const ihdrChunk = Buffer.concat([ihdrLen, ihdrTypeAndData, ihdrCrc]);

  // IDAT chunk
  const idatTypeAndData = Buffer.concat([Buffer.from("IDAT"), deflated]);
  const idatCrc = Buffer.alloc(4);
  idatCrc.writeUInt32BE(crc32(idatTypeAndData), 0);

  const idatLen = Buffer.alloc(4);
  idatLen.writeUInt32BE(deflated.length, 0);
  const idatChunk = Buffer.concat([idatLen, idatTypeAndData, idatCrc]);

  // IEND chunk
  const iendTypeAndData = Buffer.from("IEND");
  const iendCrc = Buffer.alloc(4);
  iendCrc.writeUInt32BE(crc32(iendTypeAndData), 0);

  const iendLen = Buffer.alloc(4);
  iendLen.writeUInt32BE(0, 0);
  const iendChunk = Buffer.concat([iendLen, iendTypeAndData, iendCrc]);

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const iconsDir = path.resolve("d:/website/extension/icons");
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

[16, 48, 128].forEach((size) => {
  const pngBuf = createPng(size, 37, 99, 235); // Blue primary #2563EB
  fs.writeFileSync(path.join(iconsDir, `icon-${size}.png`), pngBuf);
  console.log(`✓ Created icon-${size}.png (${size}x${size})`);
});
