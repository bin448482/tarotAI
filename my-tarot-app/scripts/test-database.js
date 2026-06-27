/**
 * 数据库测试脚本
 * Simple test script to validate database setup
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Database Test Script');
console.log('=======================\n');

// 测试预置数据库
const dbPath = path.join(__dirname, '../assets/db/tarot_config.db');
console.log('1. 检查预置数据库文件...');
if (fs.existsSync(dbPath)) {
  const stats = fs.statSync(dbPath);
  console.log('✅ 预置数据库文件存在');
  console.log(`   路径: ${dbPath}`);
  console.log(`   大小: ${stats.size} bytes`);
  console.log(`   修改时间: ${stats.mtime.toISOString()}`);
} else {
  console.log('❌ 预置数据库文件不存在:', dbPath);
}

// 检查服务文件
console.log('\n2. 检查服务文件...');
const serviceFiles = [
  '../lib/database/connection.ts',
  '../lib/database/config-db.ts',
  '../lib/database/user-db.ts',
  '../lib/services/CardService.ts',
  '../lib/services/SpreadService.ts'
];

serviceFiles.forEach(file => {
  const fullPath = path.join(__dirname, file);
  const exists = fs.existsSync(fullPath);
  console.log(`${exists ? '✅' : '❌'} ${file}`);
});

// 检查TypeScript配置
console.log('\n3. 检查TypeScript配置...');
const tsFiles = [
  '../tsconfig.json',
  '../lib/types/database.ts',
  '../lib/types/user.ts',
  '../lib/types/config.ts'
];

tsFiles.forEach(file => {
  const fullPath = path.join(__dirname, file);
  const exists = fs.existsSync(fullPath);
  console.log(`${exists ? '✅' : '❌'} ${file}`);
});

console.log('\n📋 测试完成!');
console.log('\n💡 调试建议:');
console.log('1. 在 VS Code 中打开调试面板 (Ctrl+Shift+D)');
console.log('2. 选择 "Debug Database Services" 配置');
console.log('3. 在数据库相关文件中设置断点');
console.log('4. 使用 "Debug Metro Bundler" 调试应用启动过程');
console.log('5. 检查 explore 页面的数据库管理功能');

module.exports = { dbPath, serviceFiles, tsFiles };