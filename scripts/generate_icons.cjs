const fs = require('fs');
const path = require('path');

const chars = [
    { name: 'panda', bg: '#E2E8F0', face: '#333' },
    { name: 'dog', bg: '#FEF3C7', face: '#854D0E' },
    { name: 'cat', bg: '#FCE7F3', face: '#BE185D' },
    { name: 'sensei', bg: '#DBEAFE', face: '#1D4ED8' },
    { name: 'me', bg: '#DCFCE7', face: '#15803D' }
];

const expressions = {
    normal: '<text x="50" y="60" font-size="30" text-anchor="middle">._.</text>',
    happy: '<text x="50" y="60" font-size="30" text-anchor="middle">^o^</text>',
    sad: '<text x="50" y="60" font-size="30" text-anchor="middle">T_T</text>',
    angry: '<text x="50" y="60" font-size="30" text-anchor="middle">｀_´</text>',
    surprise: '<text x="50" y="60" font-size="30" text-anchor="middle">O_O</text>'
};

const iconDir = path.join(__dirname, '../public/icons');
if (!fs.existsSync(iconDir)) {
    fs.mkdirSync(iconDir, { recursive: true });
}

chars.forEach(char => {
    Object.keys(expressions).forEach(exp => {
        const svg = `
<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="50" fill="${char.bg}" />
  <g fill="${char.face}">
    ${expressions[exp]}
    <text x="50" y="85" font-size="12" font-family="sans-serif" text-anchor="middle">${char.name}</text>
  </g>
</svg>
`;
        fs.writeFileSync(path.join(iconDir, `${char.name}_${exp}.svg`), svg.trim());
    });
});

console.log('Created 25 avatar icons in public/icons');
