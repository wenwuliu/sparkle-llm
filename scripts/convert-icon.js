const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

// 源图标路径
const sourceIconPath = path.join(os.homedir(), 'Pictures', 'robot.png');
// 目标图标目录
const iconDir = path.join(__dirname, '..', 'build', 'icons');

// 确保目标目录存在
if (!fs.existsSync(iconDir)) {
  fs.mkdirSync(iconDir, { recursive: true });
  console.log(`Created directory: ${iconDir}`);
}

// 检查源图标是否存在
if (!fs.existsSync(sourceIconPath)) {
  console.error(`Error: Source icon not found at ${sourceIconPath}`);
  process.exit(1);
}

console.log(`Using source icon: ${sourceIconPath}`);

// 需要生成的图标尺寸
const sizes = [16, 24, 32, 48, 64, 128, 256, 512, 1024];

// 使用ImageMagick转换图标
try {
  // 复制原始图标到图标目录
  const iconPath = path.join(iconDir, 'icon.png');
  fs.copyFileSync(sourceIconPath, iconPath);
  console.log(`Copied original icon to: ${iconPath}`);

  // 生成各种尺寸的图标
  for (const size of sizes) {
    const outputPath = path.join(iconDir, `${size}x${size}.png`);
    const command = `convert "${sourceIconPath}" -resize ${size}x${size} "${outputPath}"`;
    
    try {
      execSync(command);
      console.log(`Created ${size}x${size} icon: ${outputPath}`);
    } catch (error) {
      console.error(`Error creating ${size}x${size} icon: ${error.message}`);
    }
  }

  // 为Linux创建.icns文件 (macOS图标)
  try {
    const icnsPath = path.join(iconDir, 'icon.icns');
    const command = `png2icns "${icnsPath}" "${path.join(iconDir, '16x16.png')}" "${path.join(iconDir, '32x32.png')}" "${path.join(iconDir, '48x48.png')}" "${path.join(iconDir, '128x128.png')}" "${path.join(iconDir, '256x256.png')}" "${path.join(iconDir, '512x512.png')}" "${path.join(iconDir, '1024x1024.png')}"`;
    
    try {
      execSync(command);
      console.log(`Created .icns icon: ${icnsPath}`);
    } catch (error) {
      console.error(`Warning: Could not create .icns file (this is normal on non-macOS systems): ${error.message}`);
    }
  } catch (error) {
    console.error(`Warning: Could not create .icns file: ${error.message}`);
  }

  // 为Windows创建.ico文件
  try {
    const icoPath = path.join(iconDir, 'icon.ico');
    const command = `convert "${path.join(iconDir, '16x16.png')}" "${path.join(iconDir, '32x32.png')}" "${path.join(iconDir, '48x48.png')}" "${path.join(iconDir, '64x64.png')}" "${path.join(iconDir, '128x128.png')}" "${path.join(iconDir, '256x256.png')}" "${icoPath}"`;
    
    try {
      execSync(command);
      console.log(`Created .ico icon: ${icoPath}`);
    } catch (error) {
      console.error(`Error creating .ico file: ${error.message}`);
    }
  } catch (error) {
    console.error(`Error creating .ico file: ${error.message}`);
  }

  console.log('Icon conversion completed successfully!');
} catch (error) {
  console.error(`Error during icon conversion: ${error.message}`);
  process.exit(1);
}
