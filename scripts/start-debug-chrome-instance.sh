#!/bin/bash

# 启动一个新的 Chrome 调试实例，不影响现有的 Chrome
# 使用方法: ./scripts/start-debug-chrome-instance.sh

echo "启动新的 Chrome 调试实例..."

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
    echo "错误: 不支持的操作系统: $OSTYPE"
    exit 1
fi

# 检查 Chrome 是否存在
if ! command -v "$CHROME_PATH" &> /dev/null && [ ! -f "$CHROME_PATH" ]; then
    echo "错误: 找不到 Chrome 浏览器"
    echo "请确保 Chrome 已安装，或修改脚本中的 CHROME_PATH 变量"
    exit 1
fi

# 创建专用的调试用户数据目录
DEBUG_USER_DATA_DIR="$PWD/.vscode/chrome-debug-instance"
mkdir -p "$DEBUG_USER_DATA_DIR"

echo "Chrome 调试实例用户数据目录: $DEBUG_USER_DATA_DIR"
echo "远程调试端口: 9222"
echo "这个实例不会影响你现有的 Chrome 浏览器"
echo "按 Ctrl+C 停止调试实例"

# 启动新的 Chrome 调试实例
if [[ "$OSTYPE" == "darwin"* ]]; then
    "$CHROME_PATH" \
        --remote-debugging-port=9222 \
        --disable-web-security \
        --disable-features=VizDisplayCompositor \
        --user-data-dir="$HOME/Library/Application\ Support/Google/Chrome" \
        --no-first-run \
        --no-default-browser-check \
        --new-window \
        --incognito \
        --disable-extensions \
        --disable-plugins \
        --disable-background-timer-throttling \
        --disable-backgrounding-occluded-windows \
        --disable-renderer-backgrounding
else
    "$CHROME_PATH" \
        --remote-debugging-port=9222 \
        --disable-web-security \
        --disable-features=VizDisplayCompositor \
        --user-data-dir="$HOME/Library/Application\ Support/Google/Chrome" \
        --no-first-run \
        --no-default-browser-check \
        --new-window \
        --incognito \
        --disable-extensions \
        --disable-plugins \
        --disable-background-timer-throttling \
        --disable-backgrounding-occluded-windows \
        --disable-renderer-backgrounding
fi

echo ""
echo "Chrome 调试实例已启动！"
echo "现在你可以："
echo "1. 在 VS Code 中使用 'Attach to Chrome' 配置进行调试"
echo "2. 访问 http://localhost:9222 查看调试页面"
echo "3. 在这个新的 Chrome 实例中测试你的油猴脚本"
