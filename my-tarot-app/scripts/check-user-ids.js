/**
 * 快速检查数据库中的用户ID
 */

const fs = require('fs');
const path = require('path');

// 检查预置数据库文件
const dbPath = path.join(__dirname, '..', 'assets', 'db', 'tarot_config.db');
const userDbPath = path.join(__dirname, '..', 'tarot_user_data.db');

console.log('🔍 检查数据库文件:');
console.log('配置数据库:', fs.existsSync(dbPath) ? '✅ 存在' : '❌ 不存在');
console.log('用户数据库:', fs.existsSync(userDbPath) ? '✅ 存在' : '❌ 不存在');

// 如果用户数据库存在，使用sqlite3命令查看数据
if (fs.existsSync(userDbPath)) {
  console.log('\n📋 用户数据库内容预览:');
  console.log('请在应用的探索页面中点击"查看全局数据统计"查看详细信息');
} else {
  console.log('\n❌ 用户数据库不存在，请先运行应用创建历史记录');
}