const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateIcons(srcPath) {
  const outDir = path.join(__dirname, 'assets', 'images');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const outIcon = path.join(outDir, 'icon.png');
  const outAndroidFg = path.join(outDir, 'android-icon-foreground.png');
  const outAndroidMono = path.join(outDir, 'android-icon-monochrome.png');

  // Create 1024x1024 app icon (square, cover, with transparent padding if needed)
  await sharp(srcPath)
    .resize(1024, 1024, { fit: 'cover', position: 'centre' })
    .png({ quality: 85, compressionLevel: 9 })
    .toFile(outIcon);

  // Create Android adaptive foreground 432x432 with transparent background
  await sharp(srcPath)
    .resize(432, 432, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ quality: 90, compressionLevel: 9 })
    .toFile(outAndroidFg);

  // Create monochrome: threshold to white on transparent background
  await sharp(srcPath)
    .resize(432, 432, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .greyscale()
    .threshold(200)
    .linear(1, 0) // keep as white
    .png({ quality: 90, compressionLevel: 9 })
    .toFile(outAndroidMono);

  console.log('Generated icons:', { outIcon, outAndroidFg, outAndroidMono });
}

async function main() {
  const src = process.argv[2];
  if (!src) {
    console.error('Usage: node scripts/generate-icons.js <source-image>');
    process.exit(1);
  }
  await generateIcons(src);
}

main().catch((e) => { console.error(e); process.exit(1); });
