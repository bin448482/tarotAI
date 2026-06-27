const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

(async () => {
  const target = path.join(__dirname, "..", "assets", "images", "android-icon-foreground.png");
  if (!fs.existsSync(target)) {
    console.error("Foreground icon not found:", target);
    process.exit(1);
  }
  const backup = target.replace(/\.png$/, ".original.png");
  if (!fs.existsSync(backup)) {
    fs.copyFileSync(target, backup);
    console.log("Backed up original to", backup);
  }

  const SIZE = 432; // Expo recommended adaptive foreground size
  const SAFE = Math.round(SIZE * 0.66); // 66% safe zone per Android guidelines

  const input = sharp(target);
  const meta = await input.metadata();
  console.log("Input meta:", { width: meta.width, height: meta.height, hasAlpha: meta.hasAlpha, format: meta.format });

  // Resize content to SAFE area, maintaining aspect ratio
  const content = await input
    .resize({ width: SAFE, height: SAFE, fit: "inside", withoutEnlargement: false })
    .toBuffer();

  // Create transparent canvas and composite centered
  const canvas = sharp({
    create: {
      width: SIZE,
      height: SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  });

  const out = await canvas
    .composite([{ input: content, gravity: "center" }])
    .png()
    .toBuffer();

  fs.writeFileSync(target, out);
  console.log("Wrote padded foreground icon:", target, `(safe=${SAFE})`);
})();