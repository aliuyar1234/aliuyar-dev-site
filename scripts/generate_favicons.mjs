// Generate PNG + ICO favicons from public/favicon.svg using sharp.
// Run: node scripts/generate_favicons.mjs
import sharp from "sharp";
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");
const svgPath = join(publicDir, "favicon.svg");
const svg = readFileSync(svgPath);

const renderPng = (size) =>
  sharp(svg, { density: 384 })
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer();

const writeIco = async (sizes, outPath) => {
  const pngs = await Promise.all(sizes.map(renderPng));

  // ICONDIR (6 bytes): Reserved(2) Type(2) Count(2)
  const dir = Buffer.alloc(6);
  dir.writeUInt16LE(0, 0);          // Reserved = 0
  dir.writeUInt16LE(1, 2);          // Type = 1 (ICO)
  dir.writeUInt16LE(sizes.length, 4); // Count

  // ICONDIRENTRY array (16 bytes each)
  const entries = Buffer.alloc(16 * sizes.length);
  let offset = 6 + 16 * sizes.length;
  sizes.forEach((size, i) => {
    const o = i * 16;
    entries.writeUInt8(size >= 256 ? 0 : size, o + 0); // width
    entries.writeUInt8(size >= 256 ? 0 : size, o + 1); // height
    entries.writeUInt8(0, o + 2);                      // color palette
    entries.writeUInt8(0, o + 3);                      // reserved
    entries.writeUInt16LE(1, o + 4);                   // planes
    entries.writeUInt16LE(32, o + 6);                  // bits per pixel
    entries.writeUInt32LE(pngs[i].length, o + 8);      // image size
    entries.writeUInt32LE(offset, o + 12);             // image offset
    offset += pngs[i].length;
  });

  const ico = Buffer.concat([dir, entries, ...pngs]);
  writeFileSync(outPath, ico);
  console.log(`✔ wrote ${outPath}  (${(ico.length / 1024).toFixed(1)} kB, sizes: ${sizes.join(", ")})`);
};

const writePng = async (size, outPath) => {
  const buf = await renderPng(size);
  writeFileSync(outPath, buf);
  console.log(`✔ wrote ${outPath}  (${(buf.length / 1024).toFixed(1)} kB, ${size}×${size})`);
};

await writePng(32, join(publicDir, "favicon-32x32.png"));
await writePng(180, join(publicDir, "apple-touch-icon.png"));
await writeIco([16, 32, 48], join(publicDir, "favicon.ico"));
console.log("Done.");
