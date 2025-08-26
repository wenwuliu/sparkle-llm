#!/bin/bash

# 设置颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}准备应用图标...${NC}"

# 检查必要的工具
if ! command -v convert &> /dev/null; then
    echo -e "${YELLOW}需要安装ImageMagick...${NC}"
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt-get update
        sudo apt-get install -y imagemagick
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew install imagemagick
    else
        echo -e "${RED}请手动安装ImageMagick: https://imagemagick.org/script/download.php${NC}"
        exit 1
    fi
fi

# 创建图标目录
mkdir -p build/icons

# 如果没有提供自定义图标，则创建一个简单的默认图标
if [ ! -f "build/icons/icon.png" ]; then
    echo -e "${YELLOW}创建默认图标...${NC}"
    
    # 创建一个简单的PNG图标
    convert -size 512x512 xc:transparent \
        -fill "#3498db" -draw "circle 256,256 256,100" \
        -fill white -font Arial -pointsize 200 -gravity center -annotate 0 "S" \
        build/icons/icon.png
    
    # 创建不同尺寸的图标
    for size in 16 24 32 48 64 128 256 512; do
        convert build/icons/icon.png -resize ${size}x${size} build/icons/icon_${size}x${size}.png
    done
    
    # 为Windows创建ICO文件
    if command -v convert &> /dev/null; then
        convert build/icons/icon_16x16.png build/icons/icon_24x24.png build/icons/icon_32x32.png \
            build/icons/icon_48x48.png build/icons/icon_64x64.png build/icons/icon_128x128.png \
            build/icons/icon_256x256.png build/icons/icon.ico
    fi
    
    # 为Linux创建各种尺寸的图标
    for size in 16 24 32 48 64 128 256 512; do
        cp build/icons/icon_${size}x${size}.png build/icons/${size}x${size}.png
    done
    
    echo -e "${GREEN}默认图标创建完成!${NC}"
else
    echo -e "${GREEN}使用现有图标...${NC}"
fi

echo -e "${GREEN}图标准备完成!${NC}"
