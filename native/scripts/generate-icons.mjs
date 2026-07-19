import sharp from 'sharp';

// New brand mark: a cream mahjong tile bearing the 中 (zhōng) character, on a
// jade gradient. See docs/superpowers/plans/2026-07-19-native-app-redesign.md
// and the TileIcon.dc.html source design for the origin of these proportions.

// App Store / home-screen icon: Apple and Google both require this file to be a
// fully opaque, edge-to-edge square with NO transparency and no self-rounded
// corners — the OS applies its own mask on top. So this variant fills the full
// canvas with the gradient (no squircle rounding of its own).
const ICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="g" x1="15%" y1="0%" x2="85%" y2="100%">
      <stop offset="0%" stop-color="#41946A"/>
      <stop offset="100%" stop-color="#1C6440"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#g)"/>
  <rect x="256" y="176" width="512" height="676" rx="102" fill="#FCF8EF"/>
  <text x="512" y="614" text-anchor="middle" font-size="390" font-family="serif" font-weight="900" fill="#C0392B">中</text>
</svg>`;

// Android adaptive foreground: just the tile card + character, transparent
// around it — the system composites this over a solid background color
// (set in app.json) and masks the combined result to the launcher's shape.
const FOREGROUND_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <rect x="286" y="196" width="452" height="596" rx="90" fill="#FCF8EF"/>
  <text x="512" y="590" text-anchor="middle" font-size="344" font-family="serif" font-weight="900" fill="#C0392B">中</text>
</svg>`;

// Splash icon: the full rounded squircle mark (matches the in-app TileIcon
// component), sitting on the splash background color set in app.json.
const SPLASH_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="15%" y1="0%" x2="85%" y2="100%">
      <stop offset="0%" stop-color="#41946A"/>
      <stop offset="100%" stop-color="#1C6440"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="115" fill="url(#g)"/>
  <rect x="128" y="88" width="256" height="338" rx="51" fill="#FCF8EF"/>
  <text x="256" y="307" text-anchor="middle" font-size="195" font-family="serif" font-weight="900" fill="#C0392B">中</text>
</svg>`;

await sharp(Buffer.from(ICON_SVG), { density: 384 })
  .resize(1024, 1024)
  .flatten({ background: '#1C6440' })
  .png()
  .toFile('assets/icon.png');

await sharp(Buffer.from(FOREGROUND_SVG), { density: 384 })
  .resize(1024, 1024)
  .png()
  .toFile('assets/adaptive-icon.png');

await sharp(Buffer.from(SPLASH_SVG), { density: 384 })
  .resize(512, 512)
  .png()
  .toFile('assets/splash-icon.png');

console.log('wrote icon.png, adaptive-icon.png, splash-icon.png');
