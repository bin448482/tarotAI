const path = require('path');

// 设置模块解析路径
process.chdir(path.join(__dirname, '..'));

console.log('🧪 测试历史记录功能');
console.log('========================');

async function testHistory() {
  try {
    // 动态导入 ES 模块
    const { UserDatabaseService } = await import('../lib/database/user-db.ts');

    console.log('1. 初始化用户数据库服务...');
    const userDbService = UserDatabaseService.getInstance();

    const initResult = await userDbService.initialize();
    console.log('初始化结果:', initResult);

    if (!initResult.success) {
      throw new Error(`初始化失败: ${initResult.error}`);
    }

    console.log('\n2. 查询历史记录...');
    const userId = 'anonymous_user';

    // 获取历史记录总数
    const count = await userDbService.getUserHistoryCount(userId);
    console.log(`用户 ${userId} 的历史记录总数: ${count}`);

    if (count > 0) {
      // 获取历史记录列表
      const histories = await userDbService.getUserHistory(userId);
      console.log(`成功获取 ${histories.length} 条历史记录:`);

      histories.forEach((history, index) => {
        console.log(`[${index + 1}] ID: ${history.id}`);
        console.log(`    时间: ${history.timestamp}`);
        console.log(`    牌阵ID: ${history.spread_id}`);
        console.log(`    卡牌数量: ${history.card_ids?.length || 0}`);
        console.log(`    解读模式: ${history.interpretation_mode}`);
        console.log('');
      });
    } else {
      console.log('没有找到历史记录');
    }

    console.log('✅ 测试完成');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('错误详情:', error);
  }
}

testHistory();