const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const outputs = [
  // iPhone Notifications
  {size: 20, scale: 2, idiom: 'iphone'},
  {size: 20, scale: 3, idiom: 'iphone'},
  // iPad Notifications
  {size: 20, scale: 1, idiom: 'ipad'},
  {size: 20, scale: 2, idiom: 'ipad'},

  // iPhone Settings
  {size: 29, scale: 2, idiom: 'iphone'},
  {size: 29, scale: 3, idiom: 'iphone'},
  // iPad Settings
  {size: 29, scale: 1, idiom: 'ipad'},
  {size: 29, scale: 2, idiom: 'ipad'},

  // Spotlight
  {size: 40, scale: 2, idiom: 'iphone'},
  {size: 40, scale: 3, idiom: 'iphone'},
  {size: 40, scale: 1, idiom: 'ipad'},
  {size: 40, scale: 2, idiom: 'ipad'},

  // iPhone App
  {size: 60, scale: 2, idiom: 'iphone'},
  {size: 60, scale: 3, idiom: 'iphone'},

  // iPad App
  {size: 76, scale: 1, idiom: 'ipad'},
  {size: 76, scale: 2, idiom: 'ipad'},
  {size: 83.5, scale: 2, idiom: 'ipad'},

  // App Store Marketing
  {size: 1024, scale: 1, idiom: 'ios-marketing'},
];

function fileNameFor({size, scale}) {
  const base = `${size}x${size}`.replace('.5','_5');
  return `Icon-App-${base}@${scale}x.png`;
}

function contentEntry({size, scale, idiom}, fileName) {
  return {
    size: `${size}x${size}`.replace('.5','.5'),
    idiom,
    filename: fileName,
    scale: `${scale}x`
  };
}

async function generate(src, outDir) {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const images = [];

  for (const spec of outputs) {
    const px = Math.round(spec.size * spec.scale);
    const name = fileNameFor(spec);
    const outPath = path.join(outDir, name);

    let pipeline = sharp(src).resize(px, px, { fit: 'cover', position: 'centre' });
    // App Store icon must not contain alpha
    if (spec.idiom === 'ios-marketing') {
      pipeline = pipeline.flatten({ background: { r: 255, g: 255, b: 255 } });
    }
    await pipeline.png({ quality: 90, compressionLevel: 9 }).toFile(outPath);
    images.push(contentEntry(spec, name));
  }

  const contents = {
    images,
    info: { version: 1, author: 'xcode' }
  };
  fs.writeFileSync(path.join(outDir, 'Contents.json'), JSON.stringify(contents, null, 2));
  console.log(`Generated ${images.length} iOS AppIcon images at ${outDir}`);
}

async function main() {
  const src = process.argv[2] || path.join(__dirname, '..', 'assets', 'images', 'icon.png');
  const outDir = path.join(__dirname, '..', 'assets', 'ios', 'AppIcon.appiconset');
  await generate(src, outDir);
}

main().catch((e) => { console.error(e); process.exit(1); });
