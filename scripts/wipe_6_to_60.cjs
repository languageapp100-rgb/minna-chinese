const fs = require('fs');
const path = require('path');

const tsvDir = path.join(__dirname, '../src/data/tsv');
const jsonDir = path.join(__dirname, '../src/data/phrases');

for (let i = 6; i <= 60; i++) {
    const p = String(i).padStart(3, '0');
    try { fs.unlinkSync(path.join(tsvDir, `chunk_${p}.tsv`)); } catch (e) { }
    try { fs.unlinkSync(path.join(jsonDir, `chunk_${p}.json`)); } catch (e) { }
}
console.log('Wiped 6-60');
