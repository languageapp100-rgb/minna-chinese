const fs = require('fs');
const path = require('path');

const jsonDir = path.join(__dirname, '../src/data/phrases');
const files = fs.readdirSync(jsonDir).filter(f => f.endsWith('.json'));

let totalCleaned = 0;

files.forEach(file => {
    let content = fs.readFileSync(path.join(jsonDir, file), 'utf-8');
    let phrases = JSON.parse(content);
    let dirty = false;

    phrases.forEach(phrase => {
        let notes = phrase.notes || '';
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
            notes.includes('定型的な一言') ||
            notes.includes('行動を促したり') ||
            notes.includes('出発する時の')
        ) {
            // Just clear it out. The fallback in main.js will look better.
            phrase.notes = '';
            dirty = true;
            totalCleaned++;
        }
    });

    if (dirty) {
        fs.writeFileSync(path.join(jsonDir, file), JSON.stringify(phrases, null, 2), 'utf-8');
        console.log(`Cleaned notes in ${file}`);
    }
});

console.log(`Total notes cleared from JSONs: ${totalCleaned}`);
