/**
 * 简单的图片映射验证
 * Simple Image Mapping Validation
 */

const fs = require('fs');
const path = require('path');

console.log('🖼️ Validating Tarot Card Image Files...\n');

// 检查图片文件的实际存在性
const assetsPath = path.join(__dirname, '..', 'assets', 'images');

// 统计实际文件
const majorPath = path.join(assetsPath, 'major');
const minorPath = path.join(assetsPath, 'minor');

let totalFiles = 0;
let majorFiles = 0;
let cupsFiles = 0;
let pentaclesFiles = 0;
let swordsFiles = 0;
let wandsFiles = 0;

// 检查大阿卡纳
if (fs.existsSync(majorPath)) {
  const majorImages = fs.readdirSync(majorPath).filter(file => file.endsWith('.jpg'));
  majorFiles = majorImages.length;
  totalFiles += majorFiles;
  console.log(`🔮 Major Arcana: ${majorFiles} files found`);

  // 显示一些示例
  if (majorImages.length > 0) {
    console.log(`   Examples: ${majorImages.slice(0, 3).join(', ')}...`);
  }
}

// 检查小阿卡纳各套牌
const suits = ['cups', 'pentacles', 'swords', 'wands'];
suits.forEach(suit => {
  const suitPath = path.join(minorPath, suit);
  if (fs.existsSync(suitPath)) {
    const suitImages = fs.readdirSync(suitPath).filter(file => file.endsWith('.jpg'));
    const count = suitImages.length;
    totalFiles += count;

    const suitIcon = {
      cups: '🏆',
      pentacles: '💰',
      swords: '⚔️',
      wands: '🪄'
    }[suit] || '🎴';

    console.log(`${suitIcon} ${suit.charAt(0).toUpperCase() + suit.slice(1)}: ${count} files found`);

    if (suitImages.length > 0) {
      console.log(`   Examples: ${suitImages.slice(0, 2).join(', ')}...`);
    }

    // 更新计数
    if (suit === 'cups') cupsFiles = count;
    else if (suit === 'pentacles') pentaclesFiles = count;
    else if (suit === 'swords') swordsFiles = count;
    else if (suit === 'wands') wandsFiles = count;
  }
});

console.log(`\n📊 Summary:`);
console.log(`  Total image files found: ${totalFiles}`);
console.log(`  Expected for complete deck: 78 (22 major + 56 minor)`);
console.log(`  Coverage: ${totalFiles}/78 (${((totalFiles / 78) * 100).toFixed(1)}%)`);

// 验证我们的映射是否匹配实际文件
console.log(`\n✅ Verification:`);
console.log(`  Major Arcana: ${majorFiles === 22 ? 'Complete' : `Incomplete (${majorFiles}/22)`}`);
console.log(`  Cups: ${cupsFiles === 14 ? 'Complete' : `Incomplete (${cupsFiles}/14)`}`);
console.log(`  Pentacles: ${pentaclesFiles === 14 ? 'Complete' : `Incomplete (${pentaclesFiles}/14)`}`);
console.log(`  Swords: ${swordsFiles === 14 ? 'Complete' : `Incomplete (${swordsFiles}/14)`}`);
console.log(`  Wands: ${wandsFiles === 14 ? 'Complete' : `Incomplete (${wandsFiles}/14)`}`);

const isComplete = (majorFiles === 22 && cupsFiles === 14 && pentaclesFiles === 14 && swordsFiles === 14 && wandsFiles === 14);
console.log(`\n🎯 Overall Status: ${isComplete ? '✅ Complete deck available' : '⚠️ Incomplete deck'}`);

if (isComplete) {
  console.log(`\n🎉 All 78 tarot card images are available for the app!`);
} else {
  console.log(`\n📝 Note: Missing images will fallback to default image (00-fool.jpg)`);
}

module.exports = {
  totalFiles,
  majorFiles,
  cupsFiles,
  pentaclesFiles,
  swordsFiles,
  wandsFiles,
  isComplete
};