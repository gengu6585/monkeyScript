#!/usr/bin/env bash
# 验证远程执行：1) 查看活跃标签 GET /tabs  2) 在指定 tab 执行代码 POST /exec
# 前置：npm install && npm run remote-exec-server，并至少打开一个注入油猴调试脚本的页面

BASE="${REMOTE_EXEC_BASE_URL:-http://localhost:18080}"

echo "=== 1. 查询活跃标签 GET $BASE/tabs ==="
TABS_RESP=$(curl -s -w "\n%{http_code}" --connect-timeout 2 "$BASE/tabs" 2>/dev/null) || true
HTTP_CODE=$(echo "$TABS_RESP" | tail -n1)
BODY=$(echo "$TABS_RESP" | sed '$d')

if [ "$HTTP_CODE" != "200" ]; then
  echo "请求失败或服务未启动 (HTTP: ${HTTP_CODE:-连接被拒})"
  echo "请先: npm install  然后: npm run remote-exec-server"
  exit 1
fi

echo "$BODY" | head -c 500
echo ""
TAB_COUNT=$(echo "$BODY" | grep -o '"id"' | wc -l | tr -d ' ')
echo "--- 当前连接 tab 数: $TAB_COUNT ---"

if [ "$TAB_COUNT" -eq 0 ]; then
  echo "暂无注入页连接。请用油猴加载 app.bundle.js 并打开任意匹配页面（非 localhost:8080）。"
  exit 0
fi

# 取第一个 tab id（简单解析）
FIRST_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -z "$FIRST_ID" ]; then
  echo "无法解析 tab id，跳过执行测试"
  exit 0
fi

echo ""
echo "=== 2. 在 tab $FIRST_ID 执行: return location.href ==="
EXEC_RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/exec" \
  -H "Content-Type: application/json" \
  -d "{\"tabId\":\"$FIRST_ID\",\"code\":\"return location.href\"}")
EXEC_HTTP=$(echo "$EXEC_RESP" | tail -n1)
EXEC_BODY=$(echo "$EXEC_RESP" | sed '$d')
echo "$EXEC_BODY"
if [ "$EXEC_HTTP" = "200" ]; then
  echo "--- 远程执行请求成功 ---"
else
  echo "--- 远程执行请求 HTTP $EXEC_HTTP ---"
fi
