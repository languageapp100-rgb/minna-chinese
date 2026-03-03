const fs = require('fs');
const path = require('path');

const tsvDir = path.join(__dirname, '../src/data/tsv');
const files = fs.readdirSync(tsvDir).filter(f => f.endsWith('.tsv') && f !== 'dictionary.tsv');

let totalCleaned = 0;

files.forEach(file => {
    let content = fs.readFileSync(path.join(tsvDir, file), 'utf-8');
    let lines = content.split('\n');
    let dirty = false;

    for (let i = 1; i < lines.length; i++) {
        let parts = lines[i].split('\t');
        if (parts.length < 19) continue;

        let notes = parts[18] || '';
        if (notes.includes('ビジネスからプライベートまで') ||
            notes.includes('汎用性の高い表現です') ||
            notes.includes('テスト用の新しい文です') ||
            notes.includes('追加データ') ||
            notes.includes('学習用フレーズ') ||
            notes.includes('実際の場面を想像しながら') ||
            notes.includes('自然に口から出るように') ||
            notes.includes('ぜひ声に出して何度も練習して') ||
            notes.includes('このフレーズをマスターすれば') ||
            notes.includes('ニュアンスを掴めば') ||
            notes.includes('元号的な一') ||
            notes.includes('定型的な一言')
        ) {
            // Just clear it out. The fallback in main.js will look better.
            parts[18] = '';
            dirty = true;
            totalCleaned++;
        }

        lines[i] = parts.join('\t');
    }

    if (dirty) {
        fs.writeFileSync(path.join(tsvDir, file), lines.join('\n'), 'utf-8');
        console.log(`Cleaned notes in ${file}`);
    }
});

console.log(`Total notes cleared: ${totalCleaned}`);
