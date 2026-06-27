/**
 * 塔罗牌图片映射验证测试
 * Tarot Card Image Mapping Validation Test
 */

const { getCardImage, hasCardImage, getAvailableImagePaths } = require('../lib/utils/cardImages');

console.log('🖼️ Testing Tarot Card Image Mapping...\n');

// 测试图片映射统计
const availablePaths = getAvailableImagePaths();
console.log(`📊 Total mapped images: ${availablePaths.length}`);

// 分类统计
const majorCount = availablePaths.filter(path => path.startsWith('major/')).length;
const cupsCount = availablePaths.filter(path => path.includes('/cups/')).length;
const pentaclesCount = availablePaths.filter(path => path.includes('/pentacles/')).length;
const swordsCount = availablePaths.filter(path => path.includes('/swords/')).length;
const wandsCount = availablePaths.filter(path => path.includes('/wands/')).length;

console.log(`📈 Image breakdown:`);
console.log(`  🔮 Major Arcana: ${majorCount}/22`);
console.log(`  🏆 Cups: ${cupsCount}/14`);
console.log(`  💰 Pentacles: ${pentaclesCount}/14`);
console.log(`  ⚔️ Swords: ${swordsCount}/14`);
console.log(`  🪄 Wands: ${wandsCount}/14`);

const totalExpected = 22 + 14 + 14 + 14 + 14; // 78 total cards
console.log(`\n📋 Coverage: ${availablePaths.length}/${totalExpected} (${((availablePaths.length / totalExpected) * 100).toFixed(1)}%)`);

// 测试一些样例图片
console.log('\n🧪 Testing sample image access:');

const sampleImages = [
  'major/00-fool.jpg',
  'major/21-world.jpg',
  'minor/cups/01-ace-of-cups.jpg',
  'minor/pentacles/14-king-of-pentacles.jpg',
  'minor/swords/01-ace-of-swords.jpg',
  'minor/wands/14-king-of-wands.jpg',
];

sampleImages.forEach(imagePath => {
  const exists = hasCardImage(imagePath);
  const icon = exists ? '✅' : '❌';
  console.log(`  ${icon} ${imagePath}: ${exists ? 'Available' : 'Missing'}`);
});

// 测试默认图片回退
console.log('\n🔄 Testing fallback behavior:');
const nonExistentImage = 'fake/non-existent.jpg';
const fallbackResult = getCardImage(nonExistentImage);
console.log(`  📷 Non-existent image fallback: ${fallbackResult ? 'Working' : 'Failed'}`);

console.log('\n🎉 Image mapping validation completed!');

module.exports = {
  majorCount,
  cupsCount,
  pentaclesCount,
  swordsCount,
  wandsCount,
  totalMapped: availablePaths.length,
  totalExpected,
  coveragePercent: (availablePaths.length / totalExpected) * 100
};