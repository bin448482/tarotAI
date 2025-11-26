/**
 * 手动初始化数据库脚本
 */

import { DatabaseInitializer } from '../lib/database/initializer';

async function initDatabase() {
  console.log('🚀 手动初始化数据库...');
  
  try {
    const initializer = new DatabaseInitializer();
    
    // 重置数据库
    console.log('🔄 重置数据库...');
    const resetResult = await initializer.reset();
    
    if (!resetResult) {
      console.error('❌ 数据库重置失败');
      return;
    }
    
    console.log('✅ 数据库重置成功');
    
    // 重新初始化
    console.log('🔄 重新初始化数据库...');
    const initResult = await initializer.initialize();
    
    if (initResult) {
      console.log('✅ 数据库初始化成功');
      
      // 检查状态
      const status = await initializer.getStatus();
      console.log('📊 数据库状态:', JSON.stringify(status, null, 2));
    } else {
      console.error('❌ 数据库初始化失败');
    }
    
  } catch (error) {
    console.error('❌ 初始化过程中出错:', error);
  }
}

// 运行初始化
initDatabase().then(() => {
  console.log('🎉 初始化完成');
}).catch(error => {
  console.error('❌ 初始化失败:', error);
});