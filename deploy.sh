#!/bin/bash
# 部署到腾讯云服务器（不覆盖服务器 .env.local）
set -e

SERVER="root@43.156.46.230"
PORT=2222
KEY="/Users/believe/Downloads/macos.pem"
REMOTE_DIR="/root/resume-builder"
NODE_PATH="/root/.nvm/versions/node/v22.22.0/bin"

echo "=== 同步代码（排除 .env.local / .next / node_modules）==="
rsync -avz \
  --exclude '.next' \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '.env.local' \
  --exclude '.env*.local' \
  -e "ssh -p $PORT -i $KEY" \
  ./ "$SERVER:$REMOTE_DIR/"

echo "=== 服务器端构建 & reload ==="
ssh -p "$PORT" -i "$KEY" "$SERVER" "
  cd $REMOTE_DIR
  export PATH=$NODE_PATH:\$PATH
  npm run build
  pm2 reload resume-builder --update-env
  echo '✅ 部署完成'
"
