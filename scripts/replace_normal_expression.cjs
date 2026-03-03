const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const brainDir = 'C:/Users/user/.gemini/antigravity/brain/3686dcd9-51f6-41ea-be39-3458ba161702';
const chineseIconsDir = path.join(__dirname, '../public/icons');
const koreanIconsDir = path.join(__dirname, '../../real-korean/public/icons');

const newSprites = {
    sensei: path.join(brainDir, 'media__1772499703725.jpg'),
    panda: path.join(brainDir, 'media__1772499703800.jpg'),
    dog: path.join(brainDir, 'media__1772499703921.jpg'),
    me: path.join(brainDir, 'media__1772499703995.jpg'),
    cat: path.join(brainDir, 'media__1772499704022.jpg'),
};

async function replaceNormalExpression(characterName, imagePath) {
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

    // The user wants bottom-right (row 2, col 2) to replace the tongue-out face (which was mapped to 'normal')
    const row = 2;
    const col = 2;

    const cellCenterX = col * cellWidth + cellWidth / 2;
    const cellCenterY = row * cellHeight + cellHeight / 2;

    let left = Math.round(cellCenterX - cropSize / 2);
    let top = Math.round(cellCenterY - cropSize / 2);

    left = Math.max(0, Math.min(left, imgWidth - cropSize));
    top = Math.max(0, Math.min(top, imgHeight - cropSize));

    const filename = `${characterName}_normal.png`;
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

    console.log(`  ✓ Overwrote ${filename} with bottom-right expression.`);
}

async function main() {
    console.log('Replacing tongue-out (normal) with bottom-right expression...');
    for (const [name, imagePath] of Object.entries(newSprites)) {
        console.log(`Processing ${name}...`);
        await replaceNormalExpression(name, imagePath);
    }
    console.log('Done!');
}

main().catch(console.error);
