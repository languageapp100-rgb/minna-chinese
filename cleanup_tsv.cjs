const fs = require('fs');
const path = require('path');
const dir = 'src/data/tsv';
fs.readdirSync(dir).forEach(file => {
    if (file.endsWith('.tsv')) {
        const p = path.join(dir, file);
        const content = fs.readFileSync(p, 'utf8');
        // Remove "坐" at the end of each line (before newline)
        const newContent = content.split('\n').map(line => {
            if (line.endsWith('坐\r')) {
                return line.slice(0, -2) + '\r';
            }
            if (line.endsWith('坐')) {
                return line.slice(0, -1);
            }
            return line;
        }).join('\n');
        if (content !== newContent) {
            fs.writeFileSync(p, newContent);
            console.log(`Cleaned ${file}`);
        }
    }
});
