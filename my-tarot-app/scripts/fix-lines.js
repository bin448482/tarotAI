const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "..", "lib", "database", "connection.ts");
let lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
lines[165] = "        throw new Error('Failed to load config database asset: ' + (assetError instanceof Error ? assetError.message : 'Unknown error'));";
lines[209] = "      throw new Error('Failed to copy/verify config database: ' + (error instanceof Error ? error.message : 'Unknown error'));";
fs.writeFileSync(file, lines.join("\n"));
console.log("fixed-lines");