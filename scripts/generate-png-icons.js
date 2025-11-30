// このスクリプトはブラウザで実行する必要があります
// または、sharpライブラリを使用してNode.jsで実行できます

console.log(`
PNGアイコンを生成するには、以下のいずれかの方法を使用してください:

方法1: オンラインツールを使用
1. public/icon.svgを開く
2. オンラインのSVG to PNGコンバーター（例: https://svgtopng.com/）を使用
3. 以下のサイズでPNGを生成:
   - icon-192x192.png (192x192)
   - icon-512x512.png (512x512)
   - apple-icon.png (180x180)
4. 生成したPNGファイルをpublicフォルダに保存

方法2: sharpライブラリを使用（推奨）
1. npm install sharp --save-dev
2. 以下のスクリプトを実行
`);

// sharpを使用する場合のコード例（sharpがインストールされている場合のみ実行）
try {
  const sharp = require('sharp');
  const fs = require('fs');
  const path = require('path');
  
  const svgPath = path.join(__dirname, '..', 'public', 'icon.svg');
  const publicDir = path.join(__dirname, '..', 'public');
  
  if (fs.existsSync(svgPath)) {
    const svgBuffer = fs.readFileSync(svgPath);
    
    // 192x192 PNG
    sharp(svgBuffer)
      .resize(192, 192)
      .png()
      .toFile(path.join(publicDir, 'icon-192x192.png'))
      .then(() => console.log('✓ icon-192x192.png created'));
    
    // 512x512 PNG
    sharp(svgBuffer)
      .resize(512, 512)
      .png()
      .toFile(path.join(publicDir, 'icon-512x512.png'))
      .then(() => console.log('✓ icon-512x512.png created'));
    
    // 180x180 PNG (Apple)
    sharp(svgBuffer)
      .resize(180, 180)
      .png()
      .toFile(path.join(publicDir, 'apple-icon.png'))
      .then(() => console.log('✓ apple-icon.png created'));
  }
} catch (e) {
  console.log('sharp is not installed. Please install it with: npm install sharp --save-dev');
}

