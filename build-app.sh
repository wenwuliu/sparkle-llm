#!/bin/bash

# 设置颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Sparkle LLM 应用打包工具${NC}"
echo -e "${YELLOW}=======================${NC}"

# 检查参数
if [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
    echo -e "用法: ./build-app.sh [平台]"
    echo -e "平台选项:"
    echo -e "  linux  - 构建Linux AppImage"
    echo -e "  win    - 构建Windows EXE"
    echo -e "  mac    - 构建macOS DMG"
    echo -e "  all    - 构建所有平台 (默认)"
    exit 0
fi

PLATFORM=${1:-"all"}

# 检查依赖
echo -e "${YELLOW}检查依赖...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}未找到Node.js，请先安装Node.js${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}未找到npm，请先安装npm${NC}"
    exit 1
fi

# 安装依赖
echo -e "${YELLOW}安装项目依赖...${NC}"
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}安装项目依赖失败!${NC}"
    exit 1
fi

# update
# 安装electron和electron-builder
echo -e "${YELLOW}安装Electron相关依赖...${NC}"
# 设置Electron镜像源
export ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
export ELECTRON_BUILDER_BINARIES_MIRROR="https://npmmirror.com/mirrors/electron-builder-binaries/"
# 使用淘宝镜像源安装
npm install --save-dev electron electron-builder --registry=https://registry.npmmirror.com
if [ $? -ne 0 ]; then
    echo -e "${RED}安装Electron依赖失败!${NC}"
    exit 1
fi

# 转换图标
echo -e "${YELLOW}转换图标...${NC}"
node scripts/convert-icon.js
if [ $? -ne 0 ]; then
    echo -e "${RED}图标转换失败!${NC}"
    exit 1
fi

# 执行构建脚本
echo -e "${YELLOW}开始构建应用...${NC}"
./scripts/build-electron.sh $PLATFORM
if [ $? -ne 0 ]; then
    echo -e "${RED}构建失败!${NC}"
    exit 1
fi

echo -e "${GREEN}应用构建成功!${NC}"
echo -e "${YELLOW}可执行文件位于 releases 目录${NC}"

# 将构建后的可执行文件Sparkle LLM-1.0.0.AppImage复制到~/appImages/sparkle-llm/sparkle-llm.AppImage
echo -e "${YELLOW}复制可执行文件到 ~/Softwares/sparkle-llm...${NC}"
cp releases/Sparkle\ LLM-1.0.0.AppImage ~/Softwares/sparkle-llm/sparkle-llm.AppImage

zenity --info --text="构建完成！可执行文件位于 ~/Softwares/sparkle-llm/sparkle-llm.AppImage"