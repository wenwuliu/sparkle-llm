const fs = require('fs');
const path = require('path');

// 创建一个简单的SVG图标
const createSvgIcon = (size) => {
  const halfSize = size / 2;
  const quarterSize = size / 4;
  
  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <circle cx="${halfSize}" cy="${halfSize}" r="${halfSize - 10}" fill="#3498db" />
  <text x="${halfSize}" y="${halfSize + quarterSize/2}" font-family="Arial" font-size="${halfSize}" fill="white" text-anchor="middle">S</text>
</svg>`;
};

// 确保目录存在
const iconDir = path.join(__dirname, '..', 'build', 'icons');
if (!fs.existsSync(iconDir)) {
  fs.mkdirSync(iconDir, { recursive: true });
}

// 创建不同尺寸的图标
const sizes = [16, 24, 32, 48, 64, 128, 256, 512, 1024];

sizes.forEach(size => {
  const iconPath = path.join(iconDir, `${size}x${size}.png`);
  const svgContent = createSvgIcon(size);
  const svgPath = path.join(iconDir, `${size}x${size}.svg`);
  
  // 保存SVG文件
  fs.writeFileSync(svgPath, svgContent);
  console.log(`Created SVG icon: ${svgPath}`);
});

// 创建icon.png (512x512)
fs.copyFileSync(
  path.join(iconDir, '512x512.svg'),
  path.join(iconDir, 'icon.svg')
);
console.log(`Created icon.svg`);

console.log('All icons created successfully!');
