const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const brainDir = 'C:/Users/user/.gemini/antigravity/brain/3686dcd9-51f6-41ea-be39-3458ba161702';
const chineseIconsDir = path.join(__dirname, '../public/icons');
const koreanIconsDir = path.join(__dirname, '../../real-korean/public/icons');

const meSprite = path.join(brainDir, 'media__1772501617763.jpg');

// The user's explicit new mapping for the 'me' grid
// Row 0: normal, smile, angry
// Row 1: surprised, tired, happy
// Row 2: question, suspicious, very happy
// Note: User said "use very happy for the happy image", so we'll map the last cell to 'happy'.

const expressionOverrides = {
    '0,0': 'normal',
    '0,1': 'smile', // New custom expression
    '0,2': 'angry',
    '1,0': 'surprise', // App uses 'surprise' instead of 'surprised'
    '1,1': 'tired',
    // '1,2': 'happy', // We skip this one because user wants very happy as happy
    '2,0': 'confused', // App uses 'confused' conceptually for question/uncertain
    '2,1': 'grumpy',   // App uses 'grumpy' conceptually for suspicious/upset
    '2,2': 'happy',    // User explicitly requested 'very happy' to be used for 'happy'
};

async function customCropMe() {
    if (!fs.existsSync(meSprite)) {
        console.error(`Image not found: ${meSprite}`);
        return;
    }

    const metadata = await sharp(meSprite).metadata();
    const imgWidth = metadata.width;
    const imgHeight = metadata.height;

    const cellWidth = Math.floor(imgWidth / 3);
    const cellHeight = Math.floor(imgHeight / 3);

    const squareSize = Math.min(cellWidth, cellHeight);
    const padding = 4;
    const cropSize = squareSize - padding * 2;

    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            const key = `${row},${col}`;
            const expression = expressionOverrides[key];

            if (!expression) continue; // Skip unmapped cells (like 1,2)

            const cellCenterX = col * cellWidth + cellWidth / 2;
            const cellCenterY = row * cellHeight + cellHeight / 2;

            let left = Math.round(cellCenterX - cropSize / 2);
            let top = Math.round(cellCenterY - cropSize / 2);

            left = Math.max(0, Math.min(left, imgWidth - cropSize));
            top = Math.max(0, Math.min(top, imgHeight - cropSize));

            const filename = `me_${expression}.png`;
            const chinesePath = path.join(chineseIconsDir, filename);
            const koreanPath = path.join(koreanIconsDir, filename);

            const buffer = await sharp(meSprite)
                .extract({
                    left: left,
                    top: top,
                    width: cropSize,
                    height: cropSize,
                })
                .resize(200, 200, { fit: 'fill' })
                .png()
                .toBuffer();

            fs.writeFileSync(chinesePath, buffer);
            fs.writeFileSync(koreanPath, buffer);
            console.log(`  ✓ Replaced ${filename}`);
        }
    }
}

async function main() {
    console.log("Replacing 'me' avatar expressions with custom grid...");
    await customCropMe();
    console.log('Done!');
}

main().catch(console.error);
