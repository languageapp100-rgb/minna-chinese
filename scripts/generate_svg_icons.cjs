const fs = require('fs');
const path = require('path');

const chars = {
    panda: { bg: '#A7F3D0', outer: '#FFFFFF', inner: '#1F2937', ears: '#1F2937' },
    dog: { bg: '#FDE68A', outer: '#FBBF24', inner: '#78350F', ears: '#D97706' },
    cat: { bg: '#FBCFE8', outer: '#F472B6', inner: '#7E22CE', ears: '#DB2777' },
    sensei: { bg: '#BFDBFE', outer: '#60A5FA', inner: '#1E3A8A', ears: '#93C5FD' },
    me: { bg: '#DDD', outer: '#FFF', inner: '#333', ears: '#CCC' }
};

const expressions = {
    normal: { eyes: '<circle cx="35" cy="45" r="5" fill="INNER"/><circle cx="65" cy="45" r="5" fill="INNER"/>', mouth: '<path d="M 40 60 Q 50 65 60 60" stroke="INNER" stroke-width="3" fill="none"/>' },
    happy: { eyes: '<path d="M 30 45 Q 35 40 40 45" stroke="INNER" stroke-width="3" fill="none"/><path d="M 60 45 Q 65 40 70 45" stroke="INNER" stroke-width="3" fill="none"/>', mouth: '<path d="M 40 60 Q 50 70 60 60" stroke="INNER" stroke-width="3" fill="none"/>' },
    sad: { eyes: '<path d="M 30 40 L 40 45" stroke="INNER" stroke-width="3"/><path d="M 60 45 L 70 40" stroke="INNER" stroke-width="3"/>', mouth: '<path d="M 40 65 Q 50 60 60 65" stroke="INNER" stroke-width="3" fill="none"/>' },
    angry: { eyes: '<path d="M 30 40 L 40 45" stroke="INNER" stroke-width="3"/><path d="M 70 40 L 60 45" stroke="INNER" stroke-width="3"/>', mouth: '<path d="M 40 65 Q 50 60 60 65" stroke="INNER" stroke-width="3" fill="none"/>' },
    tired: { eyes: '<line x1="30" y1="45" x2="40" y2="45" stroke="INNER" stroke-width="3"/><line x1="60" y1="45" x2="70" y2="45" stroke="INNER" stroke-width="3"/>', mouth: '<circle cx="50" cy="65" r="3" fill="INNER"/>' },
    surprise: { eyes: '<circle cx="35" cy="45" r="5" fill="INNER"/><circle cx="65" cy="45" r="5" fill="INNER"/>', mouth: '<circle cx="50" cy="65" r="6" fill="INNER"/>' }
};

function getCharShapes(charName, colors) {
    if (charName === 'panda') {
        return `<circle cx="20" cy="20" r="15" fill="${colors.ears}" />
                <circle cx="80" cy="20" r="15" fill="${colors.ears}" />
                <circle cx="50" cy="50" r="40" fill="${colors.outer}" />
                <ellipse cx="35" cy="45" rx="8" ry="12" fill="${colors.bg}" />
                <ellipse cx="65" cy="45" rx="8" ry="12" fill="${colors.bg}" />`;
    } else if (charName === 'dog') {
        return `<ellipse cx="20" cy="30" rx="15" ry="25" fill="${colors.ears}" />
                <ellipse cx="80" cy="30" rx="15" ry="25" fill="${colors.ears}" />
                <circle cx="50" cy="55" r="35" fill="${colors.outer}" />
                <circle cx="50" cy="55" r="25" fill="#FFF" />`;
    } else if (charName === 'cat') {
        return `<polygon points="10,40 25,10 40,25" fill="${colors.ears}" />
                <polygon points="90,40 75,10 60,25" fill="${colors.ears}" />
                <circle cx="50" cy="50" r="38" fill="${colors.outer}" />`;
    } else if (charName === 'sensei') {
        return `<circle cx="50" cy="50" r="35" fill="${colors.outer}" />
                <rect x="25" y="38" width="20" height="15" fill="none" stroke="${colors.ears}" stroke-width="2" rx="2" />
                <rect x="55" y="38" width="20" height="15" fill="none" stroke="${colors.ears}" stroke-width="2" rx="2" />
                <line x1="45" y1="45" x2="55" y2="45" stroke="${colors.ears}" stroke-width="2" />`;
    }
    return `<circle cx="50" cy="50" r="35" fill="${colors.outer}" />`;
}

const iconDir = path.join(__dirname, '../public/icons');
if (!fs.existsSync(iconDir)) {
    fs.mkdirSync(iconDir, { recursive: true });
}

Object.keys(chars).forEach(charName => {
    Object.keys(expressions).forEach(expName => {
        const colors = chars[charName];
        const exp = expressions[expName];

        const eyes = exp.eyes.replace(/INNER/g, colors.inner);
        const mouth = exp.mouth.replace(/INNER/g, colors.inner);

        const svg = `
<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="50" fill="${colors.bg}" />
  <g>
    ${getCharShapes(charName, colors)}
    ${eyes}
    ${mouth}
  </g>
</svg>
`;
        fs.writeFileSync(path.join(iconDir, `${charName}_${expName}.svg`), svg.trim());
    });
});

console.log('Created character icons as vector SVGs perfectly preserving identity.');
