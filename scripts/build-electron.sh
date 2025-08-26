#!/bin/bash

# 设置颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 获取平台参数
PLATFORM=${1:-"all"}

# 安装electron-builder到项目依赖
echo -e "${YELLOW}安装electron-builder...${NC}"
npm install --save-dev electron-builder

# 检查electron是否在项目依赖中
if ! npm list electron > /dev/null 2>&1; then
    echo -e "${YELLOW}安装electron到项目依赖...${NC}"
    npm install --save-dev electron@latest
fi

# 图标已在build-app.sh中准备好

# 更新package.json
echo -e "${YELLOW}更新package.json...${NC}"
node -e "
const fs = require('fs');
const pkg = require('./package.json');

// 添加Electron相关配置
pkg.main = 'electron.js';
pkg.build = require('./electron-builder.json');

// 添加Electron相关脚本
pkg.scripts = pkg.scripts || {};
pkg.scripts['electron:start'] = 'electron .';
pkg.scripts['electron:build'] = 'electron-builder build';
pkg.scripts['electron:build:linux'] = 'electron-builder build --linux';
pkg.scripts['electron:build:win'] = 'electron-builder build --win';
pkg.scripts['electron:build:mac'] = 'electron-builder build --mac';

// 写回package.json
fs.writeFileSync('./package.json', JSON.stringify(pkg, null, 2));
"

# 构建后端
echo -e "${YELLOW}构建后端...${NC}"
cd backend
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}后端构建失败!${NC}"
    exit 1
fi
cd ..

# 构建前端
echo -e "${YELLOW}构建前端...${NC}"
cd frontend
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}前端构建失败!${NC}"
    exit 1
fi

# 验证前端构建文件
echo -e "${YELLOW}验证前端构建文件...${NC}"
if [ ! -d "dist/assets" ]; then
    echo -e "${RED}前端构建文件不完整，缺少assets目录!${NC}"
    exit 1
fi

JS_FILES=$(find dist/assets -name "*.js" | wc -l)
CSS_FILES=$(find dist/assets -name "*.css" | wc -l)

if [ "$JS_FILES" -eq 0 ]; then
    echo -e "${RED}前端构建文件不完整，缺少JavaScript文件!${NC}"
    exit 1
fi

if [ "$CSS_FILES" -eq 0 ]; then
    echo -e "${RED}前端构建文件不完整，缺少CSS文件!${NC}"
    exit 1
fi

echo -e "${GREEN}前端构建文件验证通过!${NC}"
cd ..

# 复制dist目录到项目根目录
echo -e "${YELLOW}复制构建文件...${NC}"
mkdir -p dist
cp -r backend/dist/* dist/

# 确保前端构建文件目录存在
echo -e "${YELLOW}验证前端构建文件目录...${NC}"
if [ ! -d "frontend/dist" ]; then
    echo -e "${RED}前端构建文件目录不存在!${NC}"
    exit 1
fi

# 设置环境变量以使用国内镜像
export ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
export ELECTRON_BUILDER_BINARIES_MIRROR="https://npmmirror.com/mirrors/electron-builder-binaries/"
export NPM_CONFIG_REGISTRY="https://registry.npmmirror.com"

# 根据平台参数构建
echo -e "${YELLOW}开始构建Electron应用...${NC}"

case "$PLATFORM" in
    "linux")
        echo -e "${YELLOW}构建Linux AppImage...${NC}"
        npx electron-builder build --linux --publish never
        ;;
    "win")
        echo -e "${YELLOW}构建Windows EXE...${NC}"
        npx electron-builder build --win --publish never
        ;;
    "mac")
        echo -e "${YELLOW}构建macOS DMG...${NC}"
        npx electron-builder build --mac --publish never
        ;;
    "all")
        echo -e "${YELLOW}构建所有平台...${NC}"
        npx electron-builder build --linux --win --publish never
        ;;
    *)
        echo -e "${RED}未知平台: $PLATFORM${NC}"
        echo -e "${YELLOW}可用选项: linux, win, mac, all${NC}"
        exit 1
        ;;
esac

if [ $? -ne 0 ]; then
    echo -e "${RED}Electron构建失败!${NC}"
    exit 1
fi

echo -e "${GREEN}构建完成!${NC}"
echo -e "${YELLOW}可执行文件已生成在 releases 目录:${NC}"
ls -la releases/

# 清理临时文件
echo -e "${YELLOW}清理临时文件...${NC}"
rm -rf dist

echo -e "${GREEN}所有操作完成!${NC}"
