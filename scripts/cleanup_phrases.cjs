/**
 * Cleanup script to fix phrase data quality issues:
 * 1. Remove parenthetical Chinese/pinyin explanations from Japanese text
 *    e.g., "キャラクター設定（人設）は" → "キャラクター設定は"
 * 2. Shorten excessively long example sentences
 * 3. Flag harsh content for review
 */
const fs = require('fs');
const path = require('path');

const tsvDir = path.join(__dirname, '../src/data/tsv');

/**
 * Remove parenthetical explanations from Japanese text.
 * Patterns:
 *   （中文：説明）, （中文＝説明）, （中文）
 *   (Chinese), (Chinese：解説)
 */
function cleanParentheses(text) {
    if (!text) return text;

    // Remove full-width parenthetical annotations of any kind
    // Match （anything）where content contains CJK/non-Japanese chars or = signs
    let cleaned = text;

    // Pattern 1: （any annotation with Chinese/pinyin/explanation）
    // This matches （text） where text contains Chinese characters, ＝, =, :, etc.
    cleaned = cleaned.replace(/[（(][^）)]*[＝=][^）)]*[）)]/g, '');

    // Pattern 2: （Chinese word only）- short annotations like （人設）（崩塌）（热搜）
    // Match （text）where text is mostly Chinese characters (no Japanese hiragana/katakana)
    cleaned = cleaned.replace(/[（(]([^）)]{1,20})[）)]/g, (match, inner) => {
        // If inner text contains mainly Chinese chars (simplified/traditional) and no Japanese kana
        const hasJapaneseKana = /[\u3040-\u309F\u30A0-\u30FF]/.test(inner);
        const hasChinese = /[\u4E00-\u9FFF]/.test(inner);
        const isAnnotation = /[…：:・]/.test(inner) || !hasJapaneseKana;

        if (hasChinese && isAnnotation) {
            return ''; // Remove the annotation
        }
        return match; // Keep it
    });

    // Clean up double spaces and leading/trailing whitespace
    cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();

    return cleaned;
}

/**
 * Truncate overly long Japanese example sentences.
 * Aim for max ~60 chars. Cut at the nearest sentence boundary.
 */
function truncateIfTooLong(text, maxLen = 80) {
    if (!text || text.length <= maxLen) return text;

    // Try to cut at sentence boundaries
    const sentenceEnds = ['。', '！', '？', '、'];
    let cutPoint = -1;
    for (const end of sentenceEnds) {
        const idx = text.lastIndexOf(end, maxLen);
        if (idx > maxLen * 0.4 && idx > cutPoint) {
            cutPoint = idx + 1;
        }
    }

    if (cutPoint > 0) {
        return text.substring(0, cutPoint);
    }
    return text.substring(0, maxLen);
}

// Process all TSV files
const tsvFiles = fs.readdirSync(tsvDir).filter(f => f.endsWith('.tsv') && f.startsWith('chunk_'));
let totalCleaned = 0;
let totalTruncated = 0;

for (const tsvFile of tsvFiles) {
    const filePath = path.join(tsvDir, tsvFile);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    // Keep header
    const header = lines[0];
    const newLines = [header];
    let fileCleaned = 0;

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split('\t');
        if (parts.length < 18) {
            newLines.push(line);
            continue;
        }

        // Clean Japanese fields: [3]=jp, [11]=ex1_jp, [17]=ex2_jp
        // Also clean notes: [18]
        const origJp = parts[3];
        const origEx1Jp = parts[11];
        const origEx2Jp = parts[17];

        parts[3] = cleanParentheses(parts[3]);
        parts[11] = cleanParentheses(parts[11]);
        parts[17] = cleanParentheses(parts[17]);

        // Truncate overly long example sentences
        if (parts[11] && parts[11].length > 80) {
            parts[11] = truncateIfTooLong(parts[11]);
            totalTruncated++;
        }
        if (parts[17] && parts[17].length > 80) {
            parts[17] = truncateIfTooLong(parts[17]);
            totalTruncated++;
        }

        if (origJp !== parts[3] || origEx1Jp !== parts[11] || origEx2Jp !== parts[17]) {
            fileCleaned++;
        }

        newLines.push(parts.join('\t'));
    }

    fs.writeFileSync(filePath, newLines.join('\n'), 'utf-8');
    if (fileCleaned > 0) {
        console.log(`${tsvFile}: cleaned ${fileCleaned} phrases`);
        totalCleaned += fileCleaned;
    }
}

console.log(`\nTotal: ${totalCleaned} phrases cleaned, ${totalTruncated} examples truncated`);
