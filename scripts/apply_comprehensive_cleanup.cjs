const fs = require('fs');
const path = require('path');

const tsvDir = path.join(__dirname, '../src/data/tsv');
const scriptsToFix = [
    path.join(__dirname, 'generate_transport_tsv.cjs'),
    path.join(__dirname, 'generate_basic_tsv.cjs')
];

function cleanText(text) {
    if (!text) return text;
    // 1. Remove parenthetical descriptions like （...） or (...)
    // We use a non-greedy catch-all to handle multiple sets
    let cleaned = text.replace(/[（\(].*?[）\)]/g, '');

    // 2. Naturalize specific problematic phrases
    cleaned = cleaned.replace(/あなたに（代わって）/g, 'あなたに代わって');
    cleaned = cleaned.replace(/私に（代わって）/g, '私に代わって');
    cleaned = cleaned.replace(/OS（システム）/g, 'OS');
    cleaned = cleaned.replace(/OSを再インストール/g, 'OSをインストール');
    cleaned = cleaned.replace(/再インストール/g, 'インストール');

    // Additional case from the user's example
    cleaned = cleaned.replace(/「私のパソコンウイルスにやられたみたい、/g, '「私のパソコン、ウイルスに感染したみたい。');

    // 3. Clean up double spaces or leading/trailing spaces created by removal
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    cleaned = cleaned.replace(/^、/, '').trim(); // remove leading comma if any
    cleaned = cleaned.replace(/[:：]\s*$/, ''); // Remove trailing colons if context removed

    return cleaned;
}

function processLine(line) {
    const parts = line.split('\t');
    if (parts.length < 4) return line;

    // indices: 1=chinese, 2=pinyin, 3=japanese, 9=ex1_ch, 10=ex1_py, 11=ex1_jp, 15=ex2_ch, 16=ex2_py, 17=ex2_jp
    [1, 2, 3, 9, 10, 11, 15, 16, 17].forEach(idx => {
        if (parts[idx]) parts[idx] = cleanText(parts[idx]);
    });

    return parts.join('\t');
}

// Process TSV files
const tsvFiles = fs.readdirSync(tsvDir).filter(f => f.endsWith('.tsv'));
tsvFiles.forEach(file => {
    const filePath = path.join(tsvDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const newLines = lines.map(line => processLine(line));

    fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
    console.log(`Cleaned TSV: ${file}`);
});

// Process Scripts (Hardcoded strings)
scriptsToFix.forEach(scriptPath => {
    if (fs.existsSync(scriptPath)) {
        let content = fs.readFileSync(scriptPath, 'utf8');

        // Strategy for scripts: since we can't easily regex-replace code without risk,
        // we'll target the specific known problematic strings in a safe way if possible,
        // or use a broader replace if the script structure allows.

        // For generate_transport_tsv.cjs, it has a 'phrases' array.
        // We'll do a simple string replacement for the known problematic case first.
        content = content.replace(/私に（代わって）OS（システム）を再インストールしてくれませんか？/g, '私に代わってOSをインストールしてくれませんか？');
        content = content.replace(/私に代わってOSを再インストールしてくれませんか？/g, '私に代わってOSをインストールしてくれませんか？');

        // Generic regex removal for parentheticals in scripts might be dangerous for code,
        // so we'll only apply it to the TSVs for "bulk" and handle scripts selectively where needed,
        // but for this task, the user specifically mentions "all scripts".
        // Let's try to target strings within quotes.
        content = content.replace(/(['"`])([^'"`]*[（\(][^'"`）\)]*[）\)][^'"`]*)\1/g, (match, quote, p1) => {
            return quote + cleanText(p1) + quote;
        });

        fs.writeFileSync(scriptPath, content, 'utf8');
        console.log(`Cleaned Script: ${path.basename(scriptPath)}`);
    }
});

// Finally, trigger a recompile
console.log('Cleanup complete. Please run compile_tsvs.cjs to update JSON.');
