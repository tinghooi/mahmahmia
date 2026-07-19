import sharp from 'sharp';

// Primary source: the SVG tile. If the 發 glyph renders wrong (CJK font issue
// in librsvg), switch SRC to the fallback raster and re-run.
const SRC = '../favicon.svg';
// const SRC = '../icon-512.png'; // fallback

// App Store / home-screen icon: Apple and Google both require this file to be a
// fully opaque, edge-to-edge square with NO transparency and no self-rounded
// corners — the OS applies its own mask on top. favicon.svg has a transparent
// margin and its own rounded corners (fine for a favicon, not for a store icon),
// so build a dedicated full-bleed variant here instead of reusing that file directly.
const ICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#fff8ee"/>
  <rect x="28" y="28" width="456" height="456" rx="37" fill="none" stroke="#e8d5b8" stroke-width="7"/>
  <text x="256" y="347" text-anchor="middle" font-size="348" font-family="serif" font-weight="bold" fill="#2d7d46">發</text>
</svg>`;

// 1024 app icon (full-bleed, opaque)
await sharp(Buffer.from(ICON_SVG), { density: 512 })
  .resize(1024, 1024)
  .flatten({ background: '#fff8ee' })
  .png()
  .toFile('assets/icon.png');

// Android adaptive foreground: tile at 66% inside safe zone, transparent around
const tile = await sharp(SRC, { density: 512 }).resize(676, 676).png().toBuffer();
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: tile, gravity: 'centre' }])
  .png().toFile('assets/adaptive-icon.png');

// Splash icon: tile at 512 on transparent (app.json sets bg #f5f0e8)
await sharp(SRC, { density: 512 }).resize(512, 512).png().toFile('assets/splash-icon.png');

console.log('wrote icon.png, adaptive-icon.png, splash-icon.png');
