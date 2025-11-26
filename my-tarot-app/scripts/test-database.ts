/**
 * 数据库完整性检查脚本
 * Database integrity check script
 * 
 * 验证预置数据库中的数据完整性和预期数量
 */

import { DatabaseInitializer } from '../lib/database/initializer';
import { CardService } from '../lib/services/CardService';
import { DimensionService } from '../lib/services/DimensionService';
import { SpreadService } from '../lib/services/SpreadService';
import { CardInterpretationService } from '../lib/services/CardInterpretationService';

interface IntegrityCheckResult {
  table: string;
  expected: number;
  actual: number;
  passed: boolean;
  error?: string;
}

class DatabaseIntegrityChecker {
  private initializer: DatabaseInitializer;
  private cardService: CardService;
  private dimensionService: DimensionService;
  private spreadService: SpreadService;
  private interpretationService: CardInterpretationService;

  constructor() {
    this.initializer = new DatabaseInitializer();
    this.cardService = CardService.getInstance();
    this.dimensionService = DimensionService.getInstance();
    this.spreadService = SpreadService.getInstance();
    this.interpretationService = CardInterpretationService.getInstance();
  }

  async runIntegrityChecks(): Promise<IntegrityCheckResult[]> {
    const results: IntegrityCheckResult[] = [];

    console.log('🔍 Starting database integrity checks...\n');

    // 1. 检查卡牌数量 (78张)
    results.push(await this.checkTableCount(
      'card',
      78,
      async () => {
        const result = await this.cardService.getAllCards();
        return result.success ? result.data?.length || 0 : 0;
      }
    ));

    // 2. 检查大阿卡纳数量 (22张)
    results.push(await this.checkTableCount(
      'card (Major Arcana)',
      22,
      async () => {
        const result = await this.cardService.getMajorArcana();
        return result.success ? result.data?.length || 0 : 0;
      }
    ));

    // 3. 检查小阿卡纳数量 (56张)
    results.push(await this.checkTableCount(
      'card (Minor Arcana)',
      56,
      async () => {
        const result = await this.cardService.getMinorArcana();
        return result.success ? result.data?.length || 0 : 0;
      }
    ));

    // 4. 检查卡牌风格数量 (至少1个)
    results.push(await this.checkTableCount(
      'card_style',
      1,
      async () => {
        const result = await this.cardService.getAllCardStyles();
        return result.success ? result.data?.length || 0 : 0;
      },
      'minimum'
    ));

    // 5. 检查维度数量 (预期数量根据实际数据调整)
    results.push(await this.checkTableCount(
      'dimension',
      20, // 预期至少20个维度
      async () => {
        const result = await this.dimensionService.getAllDimensions();
        return result.success ? result.data?.length || 0 : 0;
      },
      'minimum'
    ));

    // 6. 检查牌阵数量 (至少1个)
    results.push(await this.checkTableCount(
      'spread',
      1,
      async () => {
        const result = await this.spreadService.getAllSpreads();
        return result.success ? result.data?.length || 0 : 0;
      },
      'minimum'
    ));

    // 7. 检查卡牌解读数量 (78 * 2 = 156，正位+逆位)
    results.push(await this.checkTableCount(
      'card_interpretation',
      156,
      async () => {
        // 通过数据库服务直接查询
        const dbService = (this.cardService as any).dbService;
        const result = await dbService.query('SELECT COUNT(*) as count FROM card_interpretation');
        return result.success ? result.data?.[0]?.count || 0 : 0;
      }
    ));

    // 8. 检查维度解读数量 (预期大量数据)
    results.push(await this.checkTableCount(
      'card_interpretation_dimension',
      4000, // 预期至少4000条记录
      async () => {
        const dbService = (this.cardService as any).dbService;
        const result = await dbService.query('SELECT COUNT(*) as count FROM card_interpretation_dimension');
        return result.success ? result.data?.[0]?.count || 0 : 0;
      },
      'minimum'
    ));

    return results;
  }

  private async checkTableCount(
    tableName: string,
    expected: number,
    countFunction: () => Promise<number>,
    mode: 'exact' | 'minimum' = 'exact'
  ): Promise<IntegrityCheckResult> {
    try {
      const actual = await countFunction();
      const passed = mode === 'exact' ? actual === expected : actual >= expected;
      
      const result: IntegrityCheckResult = {
        table: tableName,
        expected,
        actual,
        passed
      };

      const status = passed ? '✅' : '❌';
      const comparison = mode === 'exact' ? '==' : '>=';
      console.log(`${status} ${tableName}: ${actual} ${comparison} ${expected} (${passed ? 'PASS' : 'FAIL'})`);

      return result;
    } catch (error) {
      const result: IntegrityCheckResult = {
        table: tableName,
        expected,
        actual: 0,
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      console.log(`❌ ${tableName}: ERROR - ${result.error}`);
      return result;
    }
  }

  async checkDatabaseInitialization(): Promise<boolean> {
    try {
      console.log('🚀 Initializing database...');
      const success = await this.initializer.initialize();
      
      if (success) {
        console.log('✅ Database initialization successful\n');
        return true;
      } else {
        console.log('❌ Database initialization failed\n');
        return false;
      }
    } catch (error) {
      console.error('❌ Database initialization error:', error);
      return false;
    }
  }

  printSummary(results: IntegrityCheckResult[]): void {
    console.log('\n📊 Integrity Check Summary:');
    console.log('=' .repeat(50));
    
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    const failed = results.filter(r => !r.passed);
    
    console.log(`Total checks: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${total - passed}`);
    
    if (failed.length > 0) {
      console.log('\n❌ Failed checks:');
      failed.forEach(result => {
        console.log(`  - ${result.table}: expected ${result.expected}, got ${result.actual}`);
        if (result.error) {
          console.log(`    Error: ${result.error}`);
        }
      });
    }
    
    const overallSuccess = failed.length === 0;
    console.log(`\n${overallSuccess ? '🎉' : '💥'} Overall result: ${overallSuccess ? 'PASS' : 'FAIL'}`);
    
    if (!overallSuccess) {
      process.exit(1);
    }
  }
}

// 主执行函数
async function main() {
  const checker = new DatabaseIntegrityChecker();
  
  try {
    // 1. 初始化数据库
    const initSuccess = await checker.checkDatabaseInitialization();
    if (!initSuccess) {
      console.error('❌ Database initialization failed, aborting integrity checks');
      process.exit(1);
    }
    
    // 2. 运行完整性检查
    const results = await checker.runIntegrityChecks();
    
    // 3. 打印总结
    checker.printSummary(results);
    
  } catch (error) {
    console.error('❌ Integrity check failed with error:', error);
    process.exit(1);
  }
}

// 运行检查
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
  });
}

export { DatabaseIntegrityChecker };