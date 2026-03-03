const fs = require('fs');
const path = require('path');

const tsvDir = path.join(__dirname, '../src/data/tsv');
const files = fs.readdirSync(tsvDir).filter(f => f.endsWith('.tsv') && f !== 'dictionary.tsv');

files.forEach(file => {
    let content = fs.readFileSync(path.join(tsvDir, file), 'utf-8');
    let lines = content.split('\n');
    let originalLen = lines.length;

    // Filter out rows that contain AI hallucination strings like "新短语" or "新しいフレーズ"
    // Also remove rows where chinese has "关于这句" (About this sentence) etc that are typical LLM meta-talk
    lines = lines.filter(line => {
        if (!line.trim()) return true; // keep empty newlines at end if any
        return !line.includes('新しいフレーズ') &&
            !line.includes('新短语') &&
            !line.includes('这句子') &&
            !line.includes('关于这个');
    });

    if (lines.length !== originalLen) {
        fs.writeFileSync(path.join(tsvDir, file), lines.join('\n'), 'utf-8');
        console.log(`Cleaned up ${file}: Removed ${originalLen - lines.length} hallucinated rows.`);
    }
});
