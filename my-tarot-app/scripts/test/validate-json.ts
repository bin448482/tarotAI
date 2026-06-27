/**
 * JSON文件数据验证脚本
 * Validate JSON data files
 */

import * as fs from 'fs';
import * as path from 'path';

console.log('🔍 JSON Data Validation Test...\n');

// 获取当前工作目录并计算正确的数据目录路径
const currentDir = process.cwd();
const dataDir = path.join(currentDir, 'assets', 'data');
console.log(`📁 Looking for data files in: ${dataDir}\n`);
const jsonFiles = [
  'card_styles.json',
  'cards.json', 
  'spreads.json',
  'dimensions.json',
  'card_interpretations.json',
  'card_interpretation_dimensions.json'
];

interface ValidationResult {
  file: string;
  exists: boolean;
  size: number;
  recordCount: number;
  version?: string;
  updatedAt?: string;
  valid: boolean;
  errors: string[];
}

async function validateJsonFiles(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  for (const fileName of jsonFiles) {
    const filePath = path.join(dataDir, fileName);
    const result: ValidationResult = {
      file: fileName,
      exists: false,
      size: 0,
      recordCount: 0,
      valid: false,
      errors: []
    };

    try {
      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        result.errors.push('File does not exist');
        results.push(result);
        continue;
      }

      result.exists = true;
      
      // 获取文件大小
      const stats = fs.statSync(filePath);
      result.size = stats.size;

      // 读取和解析JSON
      const content = fs.readFileSync(filePath, 'utf-8');
      const jsonData = JSON.parse(content);

      // 验证基本结构
      if (!jsonData.version || !jsonData.updated_at || !jsonData.data || !Array.isArray(jsonData.data)) {
        result.errors.push('Invalid JSON structure - missing required fields');
      } else {
        result.version = jsonData.version;
        result.updatedAt = jsonData.updated_at;
        result.recordCount = jsonData.data.length;
        
        // 特定文件的数据量验证
        switch (fileName) {
          case 'cards.json':
            if (result.recordCount !== 78) {
              result.errors.push(`Expected 78 cards, found ${result.recordCount}`);
            }
            break;
          case 'card_styles.json':
            if (result.recordCount !== 1) {
              result.errors.push(`Expected 1 card style, found ${result.recordCount}`);
            }
            break;
          case 'spreads.json':
            if (result.recordCount !== 1) {
              result.errors.push(`Expected 1 spread, found ${result.recordCount}`);
            }
            break;
          case 'card_interpretations.json':
            if (result.recordCount !== 156) {
              result.errors.push(`Expected 156 interpretations (78×2), found ${result.recordCount}`);
            }
            break;
        }
      }

      result.valid = result.errors.length === 0;

    } catch (error) {
      result.errors.push(`Failed to process file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    results.push(result);
  }

  return results;
}

// 运行验证
validateJsonFiles().then(results => {
  console.log('📋 JSON File Validation Results:\n');
  
  let totalRecords = 0;
  let totalSize = 0;
  let allValid = true;
  
  results.forEach(result => {
    const status = result.valid ? '✅' : '❌';
    const sizeKB = (result.size / 1024).toFixed(1);
    
    console.log(`${status} ${result.file}`);
    if (result.exists) {
      console.log(`   📦 Size: ${sizeKB}KB`);
      console.log(`   📊 Records: ${result.recordCount}`);
      console.log(`   🏷️  Version: ${result.version}`);
      console.log(`   📅 Updated: ${result.updatedAt}`);
      
      totalRecords += result.recordCount;
      totalSize += result.size;
    }
    
    if (result.errors.length > 0) {
      result.errors.forEach(error => {
        console.log(`   ⚠️  ${error}`);
      });
      allValid = false;
    }
    console.log();
  });
  
  console.log('📊 Summary:');
  console.log(`- Total files: ${results.length}`);
  console.log(`- Valid files: ${results.filter(r => r.valid).length}`);
  console.log(`- Total records: ${totalRecords.toLocaleString()}`);
  console.log(`- Total size: ${(totalSize / 1024).toFixed(1)}KB`);
  
  if (allValid) {
    console.log('\n🎉 All JSON files are valid and ready for import!');
  } else {
    console.log('\n⚠️ Some JSON files have validation issues.');
  }
}).catch(error => {
  console.error('💥 Validation failed:', error);
});