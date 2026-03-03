const fs = require('fs');
const path = require('path');
const phDir = path.join(__dirname, '../src/data/phrases');
for (let i = 16; i <= 60; i++) {
    const f = path.join(phDir, `chunk_${String(i).padStart(3, '0')}.json`);
    if (fs.existsSync(f)) {
        fs.unlinkSync(f);
        console.log('deleted', f);
    }
}
