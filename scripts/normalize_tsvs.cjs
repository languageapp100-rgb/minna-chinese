const fs = require('fs');
const path = require('path');

const tsvDir = path.join(__dirname, '../src/data/tsv');
const avatarMap = {};
const expressionMap = {
    'normal': 'normal', 'happy': 'happy', 'sad': 'sad', 'angry': 'angry',
    'surprised': 'surprise', 'surprise': 'surprise', 'tired': 'tired', 'disgusted': 'normal',
    '普通': 'normal', '笑う': 'happy', '微笑む': 'happy', '嘲笑': 'happy',
    '驚く': 'surprise', '惊吓': 'surprise', '惊喜': 'surprise', '惊艳': 'surprise', '崇拝': 'surprise',
    '怒る': 'angry', '愤怒': 'angry', '疲れる': 'tired', '焦る': 'tired',
    '悲しい': 'sad', '嘆く': 'sad', '叹气': 'sad', '悩む': 'sad', '安慰': 'sad',
    '疑问': 'normal', '疑問': 'normal'
};

const isChinese = true;
const langHdr1 = 'chinese';
const langHdr2 = 'pinyin';
const langHdr3 = 'japanese';

function normalizeChunk(filepath) {
    const raw = fs.readFileSync(filepath, 'utf-8');
    const lines = raw.split('\n');
    if (lines.length < 2) return;

    const standardHeaders = [
        "id", langHdr1, langHdr2, langHdr3, "category", "level",
        "example1_speaker", "example1_avatar", "example1_expression", `example1_${langHdr1}`, `example1_${langHdr2}`, `example1_${langHdr3}`,
        "example2_speaker", "example2_avatar", "example2_expression", `example2_${langHdr1}`, `example2_${langHdr2}`, `example2_${langHdr3}`,
        "notes"
    ];

    const outLines = [];
    outLines.push(standardHeaders.join('\t'));

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].replace(/\r$/, '');
        if (!line) continue;

        let p = line.split('\t');
        if (p.length < 6) {
            outLines.push(line);
            continue;
        }

        const base = p.slice(0, 6);
        const notes = p[p.length - 1];

        const examples = [];
        let idx = 6;
        while (idx < p.length - 1) {
            let spek = p[idx];
            if (!spek) break;

            let next1 = p[idx + 1] ? p[idx + 1].trim() : '';
            let next2 = p[idx + 2] ? p[idx + 2].trim() : '';

            let avat = spek;
            let expr = 'normal';

            if (expressionMap.hasOwnProperty(next1) || ['happy', 'sad', 'normal', 'angry', 'surprise', 'tired', 'confused', 'grumpy'].includes(next1.toLowerCase())) {
                expr = next1;
                avat = spek;
                idx += 2;
            } else if (expressionMap.hasOwnProperty(next2) || ['happy', 'sad', 'normal', 'angry', 'surprise', 'tired', 'confused', 'grumpy'].includes(next2.toLowerCase())) {
                avat = next1 || spek;
                expr = next2;
                idx += 3;
            } else {
                idx += 1;
            }

            let text = p[idx++] || '';
            let pron = p[idx++] || '';
            let trans = p[idx++] || '';

            examples.push({ spek, avat, expr, text, pron, trans });
        }

        const normalizedRow = [...base];

        for (let j = 0; j < 2; j++) {
            if (examples[j]) {
                normalizedRow.push(examples[j].spek, examples[j].avat, examples[j].expr, examples[j].text, examples[j].pron, examples[j].trans);
            } else {
                normalizedRow.push('', '', '', '', '', '');
            }
        }

        normalizedRow.push(notes);
        outLines.push(normalizedRow.join('\t'));
    }

    fs.writeFileSync(filepath, outLines.join('\n'));
}

const files = fs.readdirSync(tsvDir).filter(f => f.endsWith('.tsv') && f.startsWith('chunk_'));
for (const file of files) {
    normalizeChunk(path.join(tsvDir, file));
    console.log(`Normalized ${file}`);
}
