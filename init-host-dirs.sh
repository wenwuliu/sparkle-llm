#!/bin/bash

# 设置颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 主目录
SPARKLE_HOME=~/.sparkle-llm

echo -e "${YELLOW}正在初始化 Sparkle LLM 主机目录...${NC}"

# 创建主目录
mkdir -p $SPARKLE_HOME
echo -e "${GREEN}创建主目录: $SPARKLE_HOME${NC}"

# 创建数据目录
mkdir -p $SPARKLE_HOME/data
echo -e "${GREEN}创建数据目录: $SPARKLE_HOME/data${NC}"

# 创建日志目录
mkdir -p $SPARKLE_HOME/logs
echo -e "${GREEN}创建日志目录: $SPARKLE_HOME/logs${NC}"

# 创建快照目录
mkdir -p $SPARKLE_HOME/snapshots
echo -e "${GREEN}创建快照目录: $SPARKLE_HOME/snapshots${NC}"

# 创建模型缓存目录
mkdir -p $SPARKLE_HOME/models
echo -e "${GREEN}创建模型缓存目录: $SPARKLE_HOME/models${NC}"

# 创建Ollama数据目录
mkdir -p $SPARKLE_HOME/ollama
echo -e "${GREEN}创建Ollama数据目录: $SPARKLE_HOME/ollama${NC}"

# 创建环境配置目录
mkdir -p $SPARKLE_HOME/env
echo -e "${GREEN}创建环境配置目录: $SPARKLE_HOME/env${NC}"

# 设置权限
chmod -R 777 $SPARKLE_HOME/data
chmod -R 777 $SPARKLE_HOME/logs
chmod -R 777 $SPARKLE_HOME/snapshots
chmod -R 777 $SPARKLE_HOME/models
echo -e "${GREEN}设置目录权限${NC}"

# 复制环境配置文件
if [ -f .env.production ]; then
  cp .env.production $SPARKLE_HOME/env/
  echo -e "${GREEN}复制环境配置文件: .env.production -> $SPARKLE_HOME/env/.env.production${NC}"
else
  echo -e "${YELLOW}警告: .env.production 文件不存在，将创建默认配置${NC}"
  cat > $SPARKLE_HOME/env/.env.production << EOL
# 生产环境配置

# 服务器配置
PORT=3001
HOST=0.0.0.0

# 数据库配置
DATABASE_PATH=/app/backend/data/database.sqlite

# 模型配置
DEFAULT_MODEL=ollama
OLLAMA_ENDPOINT=http://ollama:11434

# 向量数据库配置
VECTOR_DB_ENABLED=true
VECTOR_DB_PATH=/app/backend/data/vector_db

# 模型缓存配置
TRANSFORMERS_CACHE=/app/backend/models

# 日志配置
LOG_LEVEL=info
LOG_FILE=/app/backend/logs/app.log
EOL
  echo -e "${GREEN}创建默认环境配置文件: $SPARKLE_HOME/env/.env.production${NC}"
fi

echo -e "${GREEN}主机目录初始化完成!${NC}"
echo -e "${YELLOW}现在您可以使用以下命令启动 Sparkle LLM:${NC}"
echo -e "  docker-compose up -d        # 完整部署（包含Ollama）"
echo -e "  docker-compose -f docker-compose.local.yml up -d  # 使用本地Ollama"
