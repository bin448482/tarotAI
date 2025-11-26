/**
 * 数据库调试脚本
 * Database debugging script for testing database operations outside of React Native
 */

const path = require('path');
const fs = require('fs');

// 模拟基本的 SQLite 和 FileSystem 功能用于测试
console.log('🚀 Starting Database Debug Script');
console.log('📁 Project Root:', __dirname);

// 检查关键文件
const keyFiles = [
  '../lib/database/connection.ts',
  '../lib/database/config-db.ts',
  '../lib/database/user-db.ts',
  '../lib/services/CardService.ts',
  '../lib/services/SpreadService.ts',
  '../assets/db/tarot_config.db'
];

console.log('\n📋 Checking key files:');
keyFiles.forEach(file => {
  const fullPath = path.join(__dirname, file);
  const exists = fs.existsSync(fullPath);
  console.log(`${exists ? '✅' : '❌'} ${file}`);

  if (exists) {
    const stats = fs.statSync(fullPath);
    console.log(`   Size: ${stats.size} bytes, Modified: ${stats.mtime.toISOString()}`);
  }
});

// 检查预置数据库内容
const dbPath = path.join(__dirname, '../assets/db/tarot_config.db');
if (fs.existsSync(dbPath)) {
  console.log('\n🔍 Database file found, size:', fs.statSync(dbPath).size, 'bytes');

  // 这里可以添加更多数据库检查逻辑
  // 注意：在 Node.js 环境中需要使用 sqlite3 包而不是 expo-sqlite
  console.log('💡 To inspect database contents, use: sqlite3 assets/db/tarot_config.db ".tables"');
} else {
  console.log('❌ Database file not found at:', dbPath);
}

console.log('\n📝 Debug completed. Check the output above for any issues.');

module.exports = {
  checkDatabaseFiles: () => {
    return keyFiles.map(file => ({
      path: file,
      exists: fs.existsSync(path.join(__dirname, file))
    }));
  }
};