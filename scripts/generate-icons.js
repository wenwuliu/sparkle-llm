#!/usr/bin/env node

/**
 * 图标生成脚本
 * 从主图标生成不同尺寸的图标文件
 */

const fs = require('fs');
const path = require('path');

// 检查是否安装了sharp
let sharp;
try {
  sharp = require('sharp');
} catch (error) {
  console.log('Sharp未安装，跳过图标生成');
  console.log('如需生成图标，请运行: npm install sharp');
  process.exit(0);
}

const sourceIcon = path.join(__dirname, '../build/icons/icon.png');
const iconsDir = path.join(__dirname, '../build/icons');

// 确保图标目录存在
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// 检查源图标是否存在
if (!fs.existsSync(sourceIcon)) {
  console.error('源图标文件不存在:', sourceIcon);
  process.exit(1);
}

// 需要生成的图标尺寸
const iconSizes = [
  { size: 16, name: '16x16.png' },
  { size: 32, name: '32x32.png' },
  { size: 48, name: '48x48.png' },
  { size: 64, name: '64x64.png' },
  { size: 128, name: '128x128.png' },
  { size: 256, name: '256x256.png' },
  { size: 512, name: '512x512.png' },
  { size: 1024, name: '1024x1024.png' }
];

async function generateIcons() {
  console.log('开始生成图标...');
  
  try {
    // 生成不同尺寸的PNG图标
    for (const { size, name } of iconSizes) {
      const outputPath = path.join(iconsDir, name);
      await sharp(sourceIcon)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      console.log(`✓ 生成 ${name}`);
    }
    
    // 为Linux生成icon.png（512x512）- 跳过，因为源文件已经是icon.png
    console.log('✓ 保持原有 icon.png');
    
    console.log('图标生成完成!');
  } catch (error) {
    console.error('生成图标时出错:', error);
    process.exit(1);
  }
}

generateIcons();