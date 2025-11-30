const fs = require('fs');
const path = require('path');

// SVGアイコンの内容
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#a855f7;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#ec4899;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="80" fill="url(#grad1)"/>
  <text x="256" y="380" font-size="320" text-anchor="middle" fill="white" font-family="Arial, sans-serif">📚</text>
</svg>`;

// SVGファイルを保存
const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgIcon);

console.log('SVG icon created successfully!');
console.log('Note: PNG icons (icon-192x192.png, icon-512x512.png, apple-icon.png)');
console.log('can be generated from the SVG using online tools or image conversion tools.');
console.log('For now, the SVG icon will work for most browsers.');

