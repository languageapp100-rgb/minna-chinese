const fs = require('fs');
const path = require('path');

const tsvDir = path.join(__dirname, '../src/data/tsv');
const files = fs.readdirSync(tsvDir).filter(f => f.endsWith('.tsv') && f !== 'dictionary.tsv');

let totalRemoved = 0;

const badPatterns = [
    /新しいフレーズ/i,
    /新短语/i,
    /备用短语/i,
    /代替短语/i,
    /追加短语/i,
    /这句子/i,
    /关于这个/i,
    /フレーズ\d+/i,
    /短语\d+/i,
    /例句\d+/i,
    /关于新短语/i,
    /他说：/i, // common AI prefix
    /備用短語/i,
    /短語/i,
    /フレーズ/i,
    /追加/i,
    /代替/i
];

files.forEach(file => {
    let content = fs.readFileSync(path.join(tsvDir, file), 'utf-8');
    let lines = content.split('\n');
    let originalLen = lines.length;

    lines = lines.filter(line => {
        if (!line.trim()) return true; // keep empty lines

        // Exclude if it matches any pattern
        for (let p of badPatterns) {
            if (p.test(line)) {
                return false;
            }
        }

        // Exclude if Chinese or Japanese text just says "短语" or "フレーズ"
        const parts = line.split('\t');
        if (parts.length >= 4) {
            const ch = parts[2] || '';
            const jp = parts[3] || '';
            if (ch.includes('短语') && ch.length < 10) return false;
            if (jp.includes('フレーズ') || jp.includes('ふれーず') || jp.includes('例文')) return false;
        }

        return true;
    });

    if (lines.length !== originalLen) {
        fs.writeFileSync(path.join(tsvDir, file), lines.join('\n'), 'utf-8');
        const removed = originalLen - lines.length;
        totalRemoved += removed;
        console.log(`Cleaned up ${file}: Removed ${removed} hallucinated rows.`);
    }
});

console.log(`Total removed rows across all files: ${totalRemoved}`);
