import { build } from 'esbuild';
import { mkdir, cp, copyFile, writeFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';
await mkdir('dist/icons', { recursive: true });
await build({
  entryPoints: {
    background: 'src/background/service-worker.ts',
    content: 'src/content/fill.ts',
    popup: 'src/popup/popup.ts',
    options: 'src/options/options.ts',
  },
  bundle: true,
  outdir: 'dist',
  format: 'iife',
  target: 'chrome120',
  minify: false,
  legalComments: 'none',
});
await Promise.all([
  copyFile('manifest.json', 'dist/manifest.json'),
  cp('src/_locales', 'dist/_locales', { recursive: true }),
  copyFile('src/shared/style.css', 'dist/style.css'),
  ...['popup', 'options'].flatMap((name) =>
    ['html', 'css'].map((ext) =>
      copyFile(`src/${name}/${name}.${ext}`, `dist/${name}.${ext}`),
    ),
  ),
]);
// Icône native PNG : une feuille avec trois lignes et une coche, sans outil externe.
function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const name = Buffer.from(type),
    length = Buffer.alloc(4),
    crc = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, crc]);
}
for (const size of [16, 32, 48, 128]) {
  const data = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const nx = x / size,
        ny = y / size;
      const paper = nx > 0.24 && nx < 0.76 && ny > 0.16 && ny < 0.84;
      const line =
        nx > 0.34 &&
        nx < 0.66 &&
        [0.32, 0.46, 0.6].some((v) => Math.abs(ny - v) < 0.025);
      const color = paper && !line ? [241, 247, 235] : [22, 102, 80];
      const offset = y * (1 + size * 4) + 1 + x * 4;
      data.set([...color, 255], offset);
    }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  await writeFile(
    `dist/icons/${size}.png`,
    Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk('IHDR', header),
      chunk('IDAT', deflateSync(data)),
      chunk('IEND', Buffer.alloc(0)),
    ]),
  );
}
console.log('Built unpacked extension in dist/');
