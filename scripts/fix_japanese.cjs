const fs = require('fs');
const path = require('path');

const tsvDir = path.join(__dirname, '../src/data/tsv');

const simplifiedToJapaneseMap = {
    '这': 'これ/この', '那': 'あれ/あの', '哪': 'どれ/どの', '吗': 'か', '里': 'の中',
    '车': '車', '门': '門', '发': '発', '个': '個', '么': '麼', '点': '点',
    '开': '開', '关': '関', '觉': '覚', '电': '電', '话': '話', '机': '機',
    '会': '会', '国': '国', '圆': '円', '图': '図', '卖': '売', '买': '買',
    '岁': '歳', '宝': '宝', '实': '実', '对': '対', '说': '説', '请': '請',
    '读': '読', '谁': '誰', '写': '写', '过': '過', '边': '辺', '还': '還',
    '进': '進', '迟': '遅', '听': '聴', '视': '視', '见': '見', '观': '観',
    '贝': '貝', '账': '帳', '质': '質', '赞': '賛', '赠': '贈', '赢': '贏',
    '红': '紅', '级': '級', '线': '線', '练': '練', '组': '組', '结': '結',
    '给': '給', '统': '統', '网': '網', '罗': '羅', '罚': '罰', '罢': '罷',
    '铁': '鉄', '铃': '鈴', '钱': '銭', '错': '錯', '锁': '鎖', '镇': '鎮',
    '险': '険', '隐': '隠', '离': '離', '难': '難', '飞': '飛', '马': '馬',
    '验': '験', '麦': '麦', '学': '学', '汉': '漢', '语': '語', '馆': '館',
    '饱': '飽', '饰': '飾', '样': '様', '查': '査', '当': '当', '数': '数',
    '条': '条', '乐': '楽', '气': '気', '专': '専', '带': '帯', '归': '帰',
    '广': '広', '应': '応', '庞': '龐', '庆': '慶', '库': '庫', '废': '廃',
    '度': '度', '为': '為', '办': '弁', '辞': '辞', '医': '医', '参': '参',
    '双': '双', '发': '発', '变': '変', '台': '台', '号': '号', '叶': '葉',
    '么': '麼', '万': '万', '与': '与', '丑': '醜', '业': '業', '东': '東',
    '丝': '糸', '丢': '丟', '两': '両', '严': '厳', '丧': '喪', '亚': '亜',
    '产': '産', '产': '產', '网': '網', '？': '？', '！': '！', '，': '、', '。': '。'
};

const cjRegex = /[\u4e00-\u9fa5]/g;

function cleanText(text) {
    if (!text) return text;
    let out = text;
    // Remove specific names
    out = out.replace(/（王さん.*?）/g, '');
    out = out.replace(/（李さん.*?）/g, '');
    out = out.replace(/李さん/g, '佐藤さん');
    out = out.replace(/张さん/g, '田中さん');
    out = out.replace(/王さん/g, '鈴木さん');

    // Replace typical punctuations
    out = out.replace(/，/g, '、').replace(/。/g, '。').replace(/！/g, '！').replace(/？/g, '？');

    // Optional: map known characters if it's strictly japanese text (no chinese parts)
    // Actually, simple regex to fix known simplified->japanese kanji conversions
    Object.keys(simplifiedToJapaneseMap).forEach(key => {
        // Safe replace for common words in Japanese notes that are typos like 语法 -> 文法
        out = out.replace(/语法/g, '文法');
        out = out.replace(/词汇/g, '語彙');
    });

    return out;
}

const files = fs.readdirSync(tsvDir).filter(f => f.endsWith('.tsv') && f !== 'dictionary.tsv');

files.forEach(file => {
    let content = fs.readFileSync(path.join(tsvDir, file), 'utf-8');
    let lines = content.split('\n');
    let dirty = false;
    for (let i = 1; i < lines.length; i++) {
        let parts = lines[i].split('\t');
        if (parts.length < 19) continue;

        [3, 11, 17, 18].forEach(idx => {
            if (parts[idx]) {
                let original = parts[idx];
                parts[idx] = cleanText(parts[idx]);
                if (original !== parts[idx]) {
                    dirty = true;
                }
            }
        });
        lines[i] = parts.join('\t');
    }

    if (dirty) {
        fs.writeFileSync(path.join(tsvDir, file), lines.join('\n'), 'utf-8');
        console.log("Fixed " + file);
    }
});
