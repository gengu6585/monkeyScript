#!/usr/bin/env bash
# 查看指定 tab 的导航/跳转日志（navigationDebugger.getLogs + getLogStats）
# 用法: ./scripts/view-remote-logs.sh [tabId]
#   不传 tabId 时自动选第一个 url 含 bilibili.com 的 tab，若无则用第一个 tab

BASE="${REMOTE_EXEC_BASE_URL:-http://localhost:18080}"

if [ -n "$1" ]; then
  TAB_ID="$1"
else
  TABS_JSON=$(curl -s --connect-timeout 2 "$BASE/tabs" 2>/dev/null)
  if [ -z "$TABS_JSON" ]; then
    echo "无法获取 tabs，请确认 npm start 已启动"
    exit 1
  fi
  # 优先选 bilibili 主站 tab
  TAB_ID=$(echo "$TABS_JSON" | grep -o '"id":"[^"]*","url":"https://www.bilibili.com/[^"]*"' | head -1 | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')
  if [ -z "$TAB_ID" ]; then
    TAB_ID=$(echo "$TABS_JSON" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  fi
  if [ -z "$TAB_ID" ]; then
    echo "没有可用的 tab"
    exit 1
  fi
  echo "使用 tab id: $TAB_ID"
fi

CODE='var d=window.navigationDebugger; if(!d) return { error: "navigationDebugger 未就绪" }; return { stats: d.getLogStats && d.getLogStats(), logs: d.getLogs && d.getLogs() };'
RESP=$(curl -s -X POST "$BASE/exec" -H "Content-Type: application/json" --data "{\"tabId\":\"$TAB_ID\",\"code\":$(echo "$CODE" | jq -Rs .)}")
if [ -z "$RESP" ]; then
  echo "请求 /exec 失败"
  exit 1
fi

# 从 results[0].result 里取出 JSON 并美化
RESULT=$(echo "$RESP" | sed -n 's/.*"result":"\([^"]*\)".*/\1/p' | sed 's/\\"/"/g')
if [ -z "$RESULT" ] || [ "$RESULT" = "null" ]; then
  echo "无返回或执行失败"
  echo "$RESP"
  exit 1
fi

# 若系统有 jq 则格式化
if command -v jq >/dev/null 2>&1; then
  echo "$RESULT" | jq .
else
  echo "$RESULT"
fi
