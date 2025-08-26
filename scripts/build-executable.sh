#!/bin/bash

# 设置颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 版本号
VERSION=$(node -e "console.log(require('./package.json').version)")

echo -e "${YELLOW}开始构建 Sparkle LLM 独立可执行文件 v${VERSION}...${NC}"

# 检查pkg是否安装
if ! command -v pkg &> /dev/null; then
    echo -e "${YELLOW}安装pkg工具...${NC}"
    npm install -g pkg
fi

# 确保目录存在
mkdir -p releases

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
cd ..

# 创建临时目录
echo -e "${YELLOW}准备打包文件...${NC}"
mkdir -p temp/backend
mkdir -p temp/frontend/dist

# 复制必要文件
cp -r backend/dist temp/backend/
cp -r backend/package.json temp/backend/
cp -r frontend/dist temp/frontend/

# 创建pkg配置文件
cat > temp/backend/package.json << EOL
{
  "name": "sparkle-llm",
  "version": "${VERSION}",
  "description": "Sparkle LLM Platform",
  "main": "dist/index.js",
  "bin": "dist/index.js",
  "pkg": {
    "assets": [
      "dist/**/*",
      "../frontend/dist/**/*",
      "node_modules/**/*.node"
    ],
    "targets": [
      "node18-linux-x64",
      "node18-win-x64",
      "node18-macos-x64"
    ],
    "outputPath": "../../releases"
  },
  "dependencies": {
    "better-sqlite3": "^8.0.0",
    "express": "^4.18.2"
  }
}
EOL

# 使用pkg打包
echo -e "${YELLOW}使用pkg打包应用...${NC}"
cd temp/backend
pkg .
if [ $? -ne 0 ]; then
    echo -e "${RED}打包失败!${NC}"
    cd ../..
    rm -rf temp
    exit 1
fi
cd ../..

# 创建安装脚本
echo -e "${YELLOW}创建安装脚本...${NC}"

# Linux安装脚本
cat > releases/install-linux.sh << EOL
#!/bin/bash

# 设置颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 安装目录
INSTALL_DIR=\${1:-"/opt/sparkle-llm"}

echo -e "\${YELLOW}安装 Sparkle LLM 到 \${INSTALL_DIR}...${NC}"

# 创建安装目录
sudo mkdir -p \${INSTALL_DIR}
sudo mkdir -p \${INSTALL_DIR}/data
sudo mkdir -p \${INSTALL_DIR}/logs
sudo mkdir -p \${INSTALL_DIR}/snapshots
sudo mkdir -p \${INSTALL_DIR}/models

# 复制可执行文件
sudo cp sparkle-llm-linux \${INSTALL_DIR}/sparkle-llm
sudo chmod +x \${INSTALL_DIR}/sparkle-llm

# 创建systemd服务
sudo tee /etc/systemd/system/sparkle-llm.service > /dev/null << EOF
[Unit]
Description=Sparkle LLM Service
After=network.target

[Service]
Type=simple
WorkingDirectory=\${INSTALL_DIR}
ExecStart=\${INSTALL_DIR}/sparkle-llm
Restart=on-failure
Environment=NODE_ENV=production PORT=3001

[Install]
WantedBy=multi-user.target
EOF

# 设置权限
sudo chown -R \$(whoami):\$(whoami) \${INSTALL_DIR}

# 启用服务
sudo systemctl daemon-reload
sudo systemctl enable sparkle-llm
sudo systemctl start sparkle-llm

echo -e "\${GREEN}安装完成!${NC}"
echo -e "\${YELLOW}服务已启动，可通过以下命令管理:${NC}"
echo -e "  sudo systemctl start sparkle-llm   # 启动服务"
echo -e "  sudo systemctl stop sparkle-llm    # 停止服务"
echo -e "  sudo systemctl restart sparkle-llm # 重启服务"
echo -e "  sudo systemctl status sparkle-llm  # 查看状态"
echo -e "\${YELLOW}应用可通过以下地址访问:${NC}"
echo -e "  http://localhost:3001"
EOL

# Windows安装脚本
cat > releases/install-windows.bat << EOL
@echo off
setlocal

set INSTALL_DIR=%APPDATA%\sparkle-llm

echo Installing Sparkle LLM to %INSTALL_DIR%...

:: Create installation directory
mkdir "%INSTALL_DIR%" 2>nul
mkdir "%INSTALL_DIR%\data" 2>nul
mkdir "%INSTALL_DIR%\logs" 2>nul
mkdir "%INSTALL_DIR%\snapshots" 2>nul
mkdir "%INSTALL_DIR%\models" 2>nul

:: Copy executable
copy sparkle-llm-win.exe "%INSTALL_DIR%\sparkle-llm.exe"

:: Create shortcut
powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%USERPROFILE%\Desktop\Sparkle LLM.lnk'); $Shortcut.TargetPath = '%INSTALL_DIR%\sparkle-llm.exe'; $Shortcut.Save()"

:: Create startup script
echo @echo off > "%INSTALL_DIR%\start.bat"
echo cd /d "%INSTALL_DIR%" >> "%INSTALL_DIR%\start.bat"
echo start sparkle-llm.exe >> "%INSTALL_DIR%\start.bat"
echo start http://localhost:3001 >> "%INSTALL_DIR%\start.bat"

echo Installation complete!
echo A shortcut has been created on your desktop.
echo You can also start the application from: %INSTALL_DIR%\start.bat
echo The application will be available at: http://localhost:3001

pause
EOL

# 设置权限
chmod +x releases/install-linux.sh

# 清理临时文件
echo -e "${YELLOW}清理临时文件...${NC}"
rm -rf temp

echo -e "${GREEN}构建完成!${NC}"
echo -e "${YELLOW}可执行文件已生成在 releases 目录:${NC}"
ls -la releases/
echo -e "${YELLOW}使用以下命令安装:${NC}"
echo -e "  Linux: ./releases/install-linux.sh [安装目录]"
echo -e "  Windows: 双击 releases/install-windows.bat"
