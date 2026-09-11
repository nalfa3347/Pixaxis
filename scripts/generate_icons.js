const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const publicDir = path.resolve(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Crisp modern geometric PX logo SVG
// P: White #FFFFFF
// X: Cyan #00E5FF
const svg = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="110" fill="#000000"/>
  <!-- Glowing ambient cyan halo -->
  <circle cx="256" cy="256" r="180" fill="#00E5FF" opacity="0.08"/>
  <rect x="10" y="10" width="492" height="492" rx="100" fill="none" stroke="#00E5FF" stroke-width="5" opacity="0.35"/>
  
  <g transform="translate(18, 0)">
    <!-- Letter P in White #FFFFFF -->
    <path d="M 70,120 L 180,120 C 236,120 262,145 262,192 C 262,239 236,264 180,264 L 135,264 L 135,392 L 70,392 Z M 135,176 L 135,208 L 175,208 C 196,208 204,202 204,192 C 204,182 196,176 175,176 Z" fill="#FFFFFF"/>
    
    <!-- Letter X in Cyan #00E5FF -->
    <path d="M 265,120 L 322,120 L 372,228 L 422,120 L 478,120 L 402,256 L 480,392 L 424,392 L 372,284 L 320,392 L 264,392 L 342,256 Z" fill="#00E5FF"/>
  </g>
</svg>
`;

async function main() {
  const svgBuffer = Buffer.from(svg.trim());
  
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgBuffer);
  fs.writeFileSync(path.join(publicDir, 'logo-px.svg'), svgBuffer);
  
  await sharp(svgBuffer).resize(512, 512).png().toFile(path.join(publicDir, 'icon-512.png'));
  await sharp(svgBuffer).resize(192, 192).png().toFile(path.join(publicDir, 'icon-192.png'));
  await sharp(svgBuffer).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
  await sharp(svgBuffer).resize(48, 48).png().toFile(path.join(publicDir, 'favicon.png'));
  
  console.log('All icons generated in public directory successfully!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
