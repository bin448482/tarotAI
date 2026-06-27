const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'lib', 'database', 'connection.ts');
let s = fs.readFileSync(file, 'utf8');
const lines = s.split(/\r?\n/);
const start = 156; const end = 192; // inclusive
const method = fs.readFileSync(path.join(__dirname, 'new-method.txt'), 'utf8').replace(/\r?\n$/, '');
lines.splice(start-1, end-start+1, method);
fs.writeFileSync(file, lines.join('\n'));
console.log('patched connection.ts ensureConfigDatabaseCopied');