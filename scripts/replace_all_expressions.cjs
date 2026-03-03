const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const brainDir = 'C:/Users/user/.gemini/antigravity/brain/3686dcd9-51f6-41ea-be39-3458ba161702';
const chineseIconsDir = path.join(__dirname, '../../real-chinese/public/icons');
const koreanIconsDir = path.join(__dirname, '../../real-korean/public/icons');

// Order from user: sensei, panda, dog, me, cat
const newSprites = {
    sensei: path.join(brainDir, 'media__1772499703725.jpg'),
    panda: path.join(brainDir, 'media__1772499703800.jpg'),
    dog: path.join(brainDir, 'media__1772499703921.jpg'),
    me: path.join(brainDir, 'media__1772499703995.jpg'),
    cat: path.join(brainDir, 'media__1772499704022.jpg'),
};

const expressionGrid = [
    ['happy', 'sad', 'angry'],
    ['surprise', 'tired', 'normal'],
    ['confused', 'grumpy', 'laughing'],
];

async function cropAllAndReplace(characterName, imagePath) {
    if (!fs.existsSync(imagePath)) {
        console.error(`Image not found: ${imagePath}`);
        return;
    }

    const metadata = await sharp(imagePath).metadata();
    const imgWidth = metadata.width;
    const imgHeight = metadata.height;

    const cellWidth = Math.floor(imgWidth / 3);
    const cellHeight = Math.floor(imgHeight / 3);

    const squareSize = Math.min(cellWidth, cellHeight);
    const padding = 4;
    const cropSize = squareSize - padding * 2;

    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            const expression = expressionGrid[row][col];
            const cellCenterX = col * cellWidth + cellWidth / 2;
            const cellCenterY = row * cellHeight + cellHeight / 2;

            let left = Math.round(cellCenterX - cropSize / 2);
            let top = Math.round(cellCenterY - cropSize / 2);

            left = Math.max(0, Math.min(left, imgWidth - cropSize));
            top = Math.max(0, Math.min(top, imgHeight - cropSize));

            const filename = `${characterName}_${expression}.png`;
            const chinesePath = path.join(chineseIconsDir, filename);
            const koreanPath = path.join(koreanIconsDir, filename);

            const buffer = await sharp(imagePath)
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
    console.log('Starting full expression replacement for all characters...');
    for (const [name, imagePath] of Object.entries(newSprites)) {
        console.log(`Processing ${name}...`);
        await cropAllAndReplace(name, imagePath);
    }
    console.log('Done replacing all 45 avatar icons in both projects!');
}

main().catch(console.error);
