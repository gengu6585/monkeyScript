#!/bin/bash

# 启动 Chrome 远程调试模式的脚本
# 使用方法: ./scripts/start-chrome-debug.sh

echo "启动 Chrome 远程调试模式..."

# 检测操作系统
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    CHROME_PATH="google-chrome"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    # Windows
    CHROME_PATH="C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
else
    echo "不支持的操作系统: $OSTYPE"
    exit 1
fi

# 检查 Chrome 是否存在
if ! command -v "$CHROME_PATH" &> /dev/null && [ ! -f "$CHROME_PATH" ]; then
    echo "错误: 找不到 Chrome 浏览器"
    echo "请确保 Chrome 已安装，或修改脚本中的 CHROME_PATH 变量"
    exit 1
fi

# 创建用户数据目录
USER_DATA_DIR="$PWD/.vscode/chrome-debug-profile"
mkdir -p "$USER_DATA_DIR"

echo "Chrome 用户数据目录: $USER_DATA_DIR"
echo "远程调试端口: 9222"
echo "按 Ctrl+C 停止 Chrome"

# 启动 Chrome 并开启远程调试
if [[ "$OSTYPE" == "darwin"* ]]; then
    "$CHROME_PATH" \
        --remote-debugging-port=9222 \
        --disable-web-security \
        --disable-features=VizDisplayCompositor \
        --user-data-dir="$USER_DATA_DIR" \
        --no-first-run \
        --no-default-browser-check
else
    "$CHROME_PATH" \
        --remote-debugging-port=9222 \
        --disable-web-security \
        --disable-features=VizDisplayCompositor \
        --user-data-dir="$USER_DATA_DIR" \
        --no-first-run \
        --no-default-browser-check
fi
