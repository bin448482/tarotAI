/**
 * 简单数据库测试脚本
 * Simple database test script for Node.js
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// 数据库文件路径
const dbPath = path.join(__dirname, '..', 'assets', 'db', 'tarot_config.db');

console.log('🔍 Testing database at:', dbPath);

// 检查数据库文件是否存在
if (!fs.existsSync(dbPath)) {
    console.error('❌ Database file not found at:', dbPath);
    process.exit(1);
}

console.log('✅ Database file exists');

// 打开数据库连接
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error('❌ Error opening database:', err.message);
        process.exit(1);
    }
    console.log('✅ Database connection established');
});

// 测试数据完整性
const tests = [
    {
        name: 'card',
        query: 'SELECT COUNT(*) as count FROM card',
        expected: 78,
        mode: 'exact'
    },
    {
        name: 'card (Major Arcana)',
        query: "SELECT COUNT(*) as count FROM card WHERE arcana = 'Major'",
        expected: 22,
        mode: 'exact'
    },
    {
        name: 'card (Minor Arcana)',
        query: "SELECT COUNT(*) as count FROM card WHERE arcana = 'Minor'",
        expected: 56,
        mode: 'exact'
    },
    {
        name: 'card_style',
        query: 'SELECT COUNT(*) as count FROM card_style',
        expected: 1,
        mode: 'minimum'
    },
    {
        name: 'dimension',
        query: 'SELECT COUNT(*) as count FROM dimension',
        expected: 20,
        mode: 'minimum'
    },
    {
        name: 'spread',
        query: 'SELECT COUNT(*) as count FROM spread',
        expected: 1,
        mode: 'minimum'
    },
    {
        name: 'card_interpretation',
        query: 'SELECT COUNT(*) as count FROM card_interpretation',
        expected: 156,
        mode: 'exact'
    },
    {
        name: 'card_interpretation_dimension',
        query: 'SELECT COUNT(*) as count FROM card_interpretation_dimension',
        expected: 1000,
        mode: 'minimum'
    }
];

let completedTests = 0;
let passedTests = 0;
const results = [];

function runTest(test) {
    return new Promise((resolve) => {
        db.get(test.query, (err, row) => {
            if (err) {
                console.log(`❌ ${test.name}: ERROR - ${err.message}`);
                results.push({
                    name: test.name,
                    passed: false,
                    error: err.message,
                    expected: test.expected,
                    actual: 0
                });
            } else {
                const actual = row.count;
                const passed = test.mode === 'exact' ? actual === test.expected : actual >= test.expected;
                const status = passed ? '✅' : '❌';
                const comparison = test.mode === 'exact' ? '==' : '>=';
                
                console.log(`${status} ${test.name}: ${actual} ${comparison} ${test.expected} (${passed ? 'PASS' : 'FAIL'})`);
                
                results.push({
                    name: test.name,
                    passed,
                    expected: test.expected,
                    actual
                });
                
                if (passed) passedTests++;
            }
            
            completedTests++;
            if (completedTests === tests.length) {
                printSummary();
                db.close();
            }
            resolve();
        });
    });
}

function printSummary() {
    console.log('\n📊 Database Test Summary:');
    console.log('=' .repeat(50));
    
    const failed = results.filter(r => !r.passed);
    
    console.log(`Total tests: ${tests.length}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${tests.length - passedTests}`);
    
    if (failed.length > 0) {
        console.log('\n❌ Failed tests:');
        failed.forEach(result => {
            console.log(`  - ${result.name}: expected ${result.expected}, got ${result.actual}`);
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

// 运行所有测试
console.log('\n🔍 Starting database integrity checks...\n');
tests.forEach(test => runTest(test));