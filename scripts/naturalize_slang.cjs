/**
 * Replace quoted Chinese slang terms in Japanese translations with natural Japanese equivalents.
 * Applies to main phrase translations (column 3) AND example sentence translations (columns 11, 17).
 */
const fs = require('fs');
const path = require('path');

const tsvDir = path.join(__dirname, '../src/data/tsv');

// Mapping of literal/quoted slang to natural Japanese
const slangReplacements = [
    // Main slang terms
    ['「内巻き」', '競争が激し'],
    ['「内卷」', '競争が激し'],
    ['「捲」', '競争'],
    ['「摸魚」', 'サボ'],
    ['「魚を撫でて」', 'サボって'],
    ['「魚を撫でる」', 'サボる'],
    ['「サボってタオバオ眺めてる」', 'サボってネットショッピングしてる'],
    ['「ベルサイユ」', '自慢'],
    ['「大きな餅を描く」', '口先だけの約束をする'],
    ['「槓精」', 'へそ曲がり'],
    ['「詭弁ばかり言うへそ曲がり」', 'なんでも反論してくるやつ'],
    ['「ネットで大人気のレストラン」', 'SNSで話題のレストラン'],
    ['「若くてイケメンのアイドル」', '若手イケメンアイドル'],
    ['「小鮮肉」', '若手イケメン'],
    ['「女神」', '高嶺の花の女性'],
    ['「出鱈目・嘘」', 'でたらめ'],
    ['「忽悠」', 'でたらめ'],
    ['「ニラを刈り取る」', 'カモから搾り取る'],
    ['「白蓮の花」', '清楚ぶってる女'],
    ['「白蓮花」', '清楚ぶってる女'],
    ['「腐るに任せる」', 'やる気をなくして自暴自棄になる'],
    ['「擺爛」', '自暴自棄'],
    ['「老六」', 'ずるいやつ'],
    ['「上頭」', 'ハマりすぎる'],
    ['「頭に血が上る」', 'ハマりすぎる'],
    ['「サンキュー」', 'もう終わり'],
    ['「栓Q」', 'もう終わり'],
    ['「神曲」', 'ヒット曲'],
    ['「洗脳的」', '中毒性が高'],
    ['「套牢」', '塩漬け'],
    ['「罠に固定された」', '塩漬けになった'],
    ['「小さくても確かな幸せ」', 'ささやかな幸せ'],
    ['「下頭男」', 'ドン引きするクズ男'],
    ['「気分が下がる男」', 'ドン引きするクズ男'],
    ['「リズムを引っ張る」', '世論を扇動する'],
    ['「帯節奏」', '世論を扇動する'],
    ['「投稿を削除して口を塞ぐ」', '投稿削除で口封じする'],
    ['「毒のチキンスープ」', '有害な自己啓発'],
    ['「毒雞湯」', '有害な自己啓発'],
    ['「ホント美味い」', '真香（手のひら返し）'],
    ['「真香」', '手のひら返し'],
    ['「打工人」', 'しがないサラリーマン'],
    ['「レンガ運び」', '単調な仕事'],
    ['「搬磚」', '単調な仕事'],
    ['「雰囲気感（オーラ）」', 'オーラ'],
    ['「鉱山を持っている」', '金持ち'],
    ['「画大餅」', '口先だけの約束'],
    ['「絶絶子」', '最高'],
    ['「塌房」', 'イメージ崩壊'],
    ['「脱粉回踩」', 'ファンを辞めてアンチ化'],
    ['「人设」', 'キャラ設定'],
    ['「人設」', 'キャラ設定'],
    ['「崩塌」', '崩壊'],
    ['「肝臓すり減らして」', '必死で'],
    // Additional cleanup
    ['（オーラ）', ''],
    ['（チョー綺麗）', ''],
    ['文字通り', ''],
    ['マジで絶美', 'マジで超綺麗'],
    ['マジで絶版モノの', ''],
    ['渉世未深の', '世間知らずの'],
];

let totalFixed = 0;

const tsvFiles = fs.readdirSync(tsvDir).filter(f => f.endsWith('.tsv') && f.startsWith('chunk_'));

for (const tsvFile of tsvFiles) {
    const filePath = path.join(tsvDir, tsvFile);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const header = lines[0];
    const newLines = [header];
    let fileFixed = 0;

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split('\t');
        if (parts.length < 18) {
            newLines.push(line);
            continue;
        }

        // Fix Japanese fields: [3]=main jp, [11]=ex1_jp, [17]=ex2_jp
        let changed = false;
        for (const colIdx of [3, 11, 17]) {
            if (!parts[colIdx]) continue;
            const orig = parts[colIdx];
            let text = parts[colIdx];
            for (const [from, to] of slangReplacements) {
                text = text.replace(new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), to);
            }
            if (text !== orig) {
                parts[colIdx] = text;
                changed = true;
            }
        }

        if (changed) {
            fileFixed++;
            totalFixed++;
        }

        newLines.push(parts.join('\t'));
    }

    fs.writeFileSync(filePath, newLines.join('\n'), 'utf-8');
    if (fileFixed > 0) {
        console.log(`${tsvFile}: fixed ${fileFixed} phrases`);
    }
}

console.log(`\nTotal: ${totalFixed} phrases naturalized`);
