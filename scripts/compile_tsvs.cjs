const fs = require('fs');
const path = require('path');

const tsvDir = path.join(__dirname, '../src/data/tsv');
const jsonDir = path.join(__dirname, '../src/data/phrases');

// Avatar name mapping (Japanese/Chinese → English)
const avatarMap = {
    'dog': 'dog', 'cat': 'cat', 'me': 'me', 'panda': 'panda', 'sensei': 'sensei',
    '犬': 'dog', '猫': 'cat', '私': 'me', 'パンダ': 'panda', '先生': 'sensei', '老师': 'sensei',
    '熊猫': 'panda',
    // Chinese character avatars → fallback to closest match
    '主人公': 'me', '打工人': 'me', '职员': 'me', '同事': 'me', '买家': 'me',
    '粉丝': 'me', '网民': 'me', '听众': 'me', '受害者': 'me', '清醒者': 'me',
    '闺蜜': 'cat', '妹妹': 'cat', '女孩': 'cat',
    '哥哥': 'dog', '朋友': 'dog', '老同学': 'dog', '吃瓜群众': 'dog',
    '主管': 'sensei', '业内专家': 'sensei', '过来人': 'sensei', '知情者': 'sensei',
    '发烧友': 'panda', '极客': 'panda', '炒股者': 'panda', '老股民': 'panda', '懒汉': 'panda',
};

// Expression name mapping (Japanese/Chinese → English)
const expressionMap = {
    'normal': 'normal', 'happy': 'happy', 'sad': 'sad', 'angry': 'angry',
    'surprised': 'surprise', 'surprise': 'surprise', 'tired': 'tired', 'disgusted': 'normal',
    '普通': 'normal',
    '笑う': 'happy', '微笑む': 'happy', '嘲笑': 'happy',
    '驚く': 'surprise', '惊吓': 'surprise', '惊喜': 'surprise', '惊艳': 'surprise', '崇拝': 'surprise',
    '怒る': 'angry', '愤怒': 'angry',
    '疲れる': 'tired', '焦る': 'tired',
    '悲しい': 'sad', '嘆く': 'sad', '叹气': 'sad', '悩む': 'sad', '安慰': 'sad',
    '疑問': 'normal', '疑问': 'normal',
};

function mapAvatar(raw) {
    return avatarMap[raw.trim()] || 'me';
}

function mapExpression(raw) {
    return expressionMap[raw.trim()] || 'normal';
}

// Clear all existing JSON files in phrases dir
if (fs.existsSync(jsonDir)) {
    const files = fs.readdirSync(jsonDir);
    for (const file of files) {
        if (file.endsWith('.json')) {
            fs.unlinkSync(path.join(jsonDir, file));
        }
    }
} else {
    fs.mkdirSync(jsonDir, { recursive: true });
}

let allPhrasesData = [];

// Convert all TSV files to JSON
const tsvFiles = fs.readdirSync(tsvDir).filter(f => f.endsWith('.tsv') && f.startsWith('chunk_'));
for (const tsvFile of tsvFiles) {
    const tsvContent = fs.readFileSync(path.join(tsvDir, tsvFile), 'utf-8');
    const lines = tsvContent.split('\n').map(l => l.trim()).filter(l => l);

    // Skip header
    const headers = lines[0].split('\t');
    const jsonData = [];

    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split('\t');
        if (parts.length < 18) continue; // Skip malformed lines

        const examples = [];
        // Use robust lookahead parsing
        let idx = 6;
        while (idx < parts.length - 1) { // stop before notes
            let spek = parts[idx];
            // If it's empty or the first col doesn't look like a speaker/avatar marker at all, break
            if (!spek || !['me', 'dog', 'cat', 'panda', 'sensei', 'A', 'B'].some(s => spek.includes(s))) {
                break;
            }

            let avat = '';
            let expr = '';

            // Check properties
            const next1 = parts[idx + 1] ? parts[idx + 1].trim() : '';
            const next2 = parts[idx + 2] ? parts[idx + 2].trim() : '';

            const isExpr1 = expressionMap.hasOwnProperty(next1);
            const isExpr2 = expressionMap.hasOwnProperty(next2);

            if (isExpr1) {
                avat = spek;
                expr = next1;
                idx += 2;
            } else if (isExpr2) {
                avat = next1;
                expr = next2;
                idx += 3;
            } else {
                avat = spek;
                expr = 'normal';
                idx += 1;
            }

            let zh = parts[idx++] || '';
            let py = parts[idx++] || '';
            let jp = parts[idx++] || '';

            examples.push({
                speaker: spek,
                avatar: mapAvatar(avat),
                expression: mapExpression(expr),
                chinese: zh,
                pinyin: py,
                japanese: jp
            });
        }

        jsonData.push({
            id: parts[0],
            chinese: parts[1],
            pinyin: parts[2],
            japanese: parts[3],
            category: parts[4],
            level: parseInt(parts[5], 10) || 1,
            example: examples,
            notes: (parts[parts.length - 1] || '').replace(/"/g, '')
        });
    }

    allPhrasesData = allPhrasesData.concat(jsonData);
    console.log(`Parsed ${tsvFile} (${jsonData.length} phrases)`);
}

// Write the unified JSON array to phrases.json
const outputFilePath = path.join(__dirname, '../src/data/phrases.json');
fs.writeFileSync(outputFilePath, JSON.stringify(allPhrasesData, null, 2), 'utf-8');
console.log(`\nSuccessfully compiled all TSVs into a single file: phrases.json (Total ${allPhrasesData.length} phrases)`);
