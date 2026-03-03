/**
 * Crop 3x3 sprite sheets into 9 individual avatar images per character.
 * Extracts a centered square from each cell to ensure the character is centered.
 * 
 * Grid layout:
 *   Row 0: happy(col0), sad(col1), angry(col2)
 *   Row 1: surprise(col0), tired(col1), normal(col2)
 *   Row 2: confused(col0), grumpy(col1), laughing(col2)
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const outputDir = path.join(__dirname, '../public/icons');

// Source sprite sheets (absolute paths)
const brainDir = 'C:/Users/user/.gemini/antigravity/brain/def681ed-1fed-46d2-83b8-df107f5fa473';
const sprites = {
    cat: path.join(brainDir, 'media__1772234308026.png'),
    dog: path.join(brainDir, 'media__1772234524109.png'),
    panda: path.join(brainDir, 'media__1772234638886.png'),
    sensei: path.join(brainDir, 'media__1772235548466.jpg'),
    me: path.join(brainDir, 'media__1772236070668.jpg'),
};

// Expression mapping: [row][col] = expression name
const expressionGrid = [
    ['happy', 'sad', 'angry'],
    ['surprise', 'tired', 'normal'],
    ['confused', 'grumpy', 'laughing'],
];

async function cropSpriteSheet(characterName, imagePath) {
    if (!fs.existsSync(imagePath)) {
        console.error(`Image not found: ${imagePath}`);
        return;
    }

    const metadata = await sharp(imagePath).metadata();
    const imgWidth = metadata.width;
    const imgHeight = metadata.height;

    const cellWidth = Math.floor(imgWidth / 3);
    const cellHeight = Math.floor(imgHeight / 3);

    // Use the shorter dimension to make a square crop from the center of each cell
    const squareSize = Math.min(cellWidth, cellHeight);
    // Padding to skip grid lines (approx 2px on each side)
    const padding = 4;
    const cropSize = squareSize - padding * 2;

    console.log(`\n${characterName}: ${imgWidth}x${imgHeight}, cell: ${cellWidth}x${cellHeight}, crop: ${cropSize}x${cropSize} square`);

    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            const expression = expressionGrid[row][col];
            const outputPath = path.join(outputDir, `${characterName}_${expression}.png`);

            // Calculate center of the cell
            const cellCenterX = col * cellWidth + cellWidth / 2;
            const cellCenterY = row * cellHeight + cellHeight / 2;

            // Extract a square centered on the cell
            let left = Math.round(cellCenterX - cropSize / 2);
            let top = Math.round(cellCenterY - cropSize / 2);

            // Clamp to image bounds
            left = Math.max(0, Math.min(left, imgWidth - cropSize));
            top = Math.max(0, Math.min(top, imgHeight - cropSize));

            await sharp(imagePath)
                .extract({
                    left: left,
                    top: top,
                    width: cropSize,
                    height: cropSize,
                })
                .resize(200, 200, { fit: 'fill' })
                .png()
                .toFile(outputPath);

            console.log(`  ✓ ${characterName}_${expression}.png (center: ${Math.round(cellCenterX)},${Math.round(cellCenterY)}, crop: ${left},${top})`);
        }
    }
}


async function main() {
    console.log('Cropping sprite sheets into individual avatars (centered squares)...');

    for (const [name, imagePath] of Object.entries(sprites)) {
        await cropSpriteSheet(name, imagePath);
    }

    console.log('\nDone! All avatars created.');
}

main().catch(console.error);
