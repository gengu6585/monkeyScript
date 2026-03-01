#!/usr/bin/env bash
# 提交最近改动到 git，不包含 .cursor/skills/
set -e
cd "$(dirname "$0")/.."
git add src/ tampermonkey.js
git reset HEAD -- .cursor/skills/ 2>/dev/null || true
git status
echo "---"
echo "已暂存（不含 skill）。若确认无误，执行："
echo "  git commit -m 'refactor(debug): 拆分为独立模块，按开关注入/卸载并打日志'"
echo "或直接运行下一行完成提交："
echo "  git commit -m 'refactor(debug): 拆分为独立模块，按开关注入/卸载并打日志'"
