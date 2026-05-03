#!/usr/bin/env python3
"""
腾讯云中转脚本：复用 lark-cli token 调飞书 OpenAPI 写多维表格

部署位置：腾讯云 /root/feishu-bitable-push.py
触发方式：
  1. 本地 Next.js POST 到一个 cloudflare/nginx 代理 → 转发到本脚本（用 Flask/FastAPI 包一层）
  2. 或者本地 scp JSON → ssh cloud 跑这个脚本读 stdin

运行模式：
  - HTTP 服务模式（推荐）：python3 feishu-bitable-push.py serve
    监听 :8765，POST /push body=`{"fields": {...}}`
  - 单次 stdin 模式：cat data.json | python3 feishu-bitable-push.py push

依赖：
  - lark-cli 已安装并已 `lark-cli auth login --domain docs` 授权
  - flask（serve 模式）：pip install flask
  - 飞书多维表格 app_token + table_id 写在 env 或下面的常量里
"""

import json
import os
import sys
import subprocess
from pathlib import Path

# ============ 配置区 ============
APP_TOKEN = os.environ.get('FEISHU_BITABLE_APP_TOKEN', '')
TABLE_ID = os.environ.get('FEISHU_BITABLE_TABLE_ID', '')

# lark-cli token 缓存位置（确认下实际路径）
LARK_CACHE = Path(os.path.expanduser('~/.lark-cli'))
NODE_BIN = '/root/.nvm/versions/node/v22.22.0/bin'
LARK_CLI = f'{NODE_BIN}/lark-cli'

# 服务模式监听端口
PORT = int(os.environ.get('FEISHU_PUSH_PORT', '8765'))
AUTH_TOKEN = os.environ.get('FEISHU_PUSH_TOKEN', '')  # 可选 bearer，调用方需带

# ============ 核心 ============

def get_user_access_token():
    """
    复用 lark-cli 的 token。
    lark-cli token 存在 ~/.lark-cli/<...>，结构因版本而异。
    实操时建议：第一次跑前手动 cat 一下确认路径，再改这个函数。

    简化版：直接调 lark-cli 一个无副作用命令，让它刷新 token，
    然后从缓存里读。
    """
    # 先调一次 lark-cli 让它确认 token 有效
    env = {**os.environ, 'PATH': f'{NODE_BIN}:{os.environ.get("PATH", "")}'}
    r = subprocess.run(
        [LARK_CLI, 'docs', '+list', '--limit', '1'],
        capture_output=True, text=True, timeout=30, env=env,
    )
    # 输出里通常会带 token 信息，但更稳的是从 ~/.lark-cli/ 读

    # 实际项目里这里要根据 lark-cli 实际缓存格式实现
    # 占位：假设 token 缓存在 ~/.lark-cli/token.json
    token_file = LARK_CACHE / 'token.json'
    if not token_file.exists():
        raise RuntimeError(
            f'lark-cli token 缓存找不到：{token_file}\n'
            f'请先在服务器上跑 `lark-cli auth login --domain docs` 授权'
        )
    data = json.loads(token_file.read_text())
    # 字段名按实际调整
    return data.get('access_token') or data.get('user_access_token')

def push_record(fields: dict) -> dict:
    """调飞书 OpenAPI 写一行 record"""
    import urllib.request

    if not APP_TOKEN or not TABLE_ID:
        raise RuntimeError('FEISHU_BITABLE_APP_TOKEN / TABLE_ID 未配置')

    token = get_user_access_token()
    url = f'https://open.feishu.cn/open-apis/bitable/v1/apps/{APP_TOKEN}/tables/{TABLE_ID}/records'
    body = json.dumps({'fields': fields}).encode('utf-8')

    req = urllib.request.Request(
        url,
        data=body,
        headers={
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json',
        },
        method='POST',
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        result = json.loads(resp.read())

    if result.get('code') and result['code'] != 0:
        raise RuntimeError(f'飞书 API 错误: code={result["code"]} msg={result.get("msg")}')

    record = result.get('data', {}).get('record', {})
    return {
        'record_id': record.get('record_id', 'unknown'),
        'raw': result,
    }

# ============ 入口模式 ============

def main_stdin():
    """单次：从 stdin 读 JSON，写一行 record"""
    payload = json.loads(sys.stdin.read())
    fields = payload.get('fields', payload)
    result = push_record(fields)
    print(json.dumps(result, ensure_ascii=False))

def main_serve():
    """HTTP 服务模式（需要 flask）"""
    try:
        from flask import Flask, request, jsonify
    except ImportError:
        print('请先 pip install flask', file=sys.stderr)
        sys.exit(1)

    app = Flask(__name__)

    @app.route('/push', methods=['POST'])
    def push():
        # bearer token 鉴权
        if AUTH_TOKEN:
            auth = request.headers.get('Authorization', '')
            if auth != f'Bearer {AUTH_TOKEN}':
                return jsonify({'error': 'unauthorized'}), 401

        payload = request.get_json(force=True)
        fields = payload.get('fields', payload)
        try:
            result = push_record(fields)
            return jsonify(result)
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    @app.route('/health', methods=['GET'])
    def health():
        return jsonify({'ok': True})

    print(f'feishu-bitable-push 监听 0.0.0.0:{PORT}')
    app.run(host='0.0.0.0', port=PORT)

if __name__ == '__main__':
    mode = sys.argv[1] if len(sys.argv) > 1 else 'push'
    if mode == 'serve':
        main_serve()
    else:
        main_stdin()
