import sharp from 'sharp';

// Primary source: the SVG tile. If the 發 glyph renders wrong (CJK font issue
// in librsvg), switch SRC to the fallback raster and re-run.
const SRC = '../favicon.svg';
// const SRC = '../icon-512.png'; // fallback

// 1024 app icon (full-bleed tile)
await sharp(SRC, { density: 512 }).resize(1024, 1024).png().toFile('assets/icon.png');

// Android adaptive foreground: tile at 66% inside safe zone, transparent around
const tile = await sharp(SRC, { density: 512 }).resize(676, 676).png().toBuffer();
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: tile, gravity: 'centre' }])
  .png().toFile('assets/adaptive-icon.png');

// Splash icon: tile at 512 on transparent (app.json sets bg #f5f0e8)
await sharp(SRC, { density: 512 }).resize(512, 512).png().toFile('assets/splash-icon.png');

console.log('wrote icon.png, adaptive-icon.png, splash-icon.png');
