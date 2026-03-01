#!/usr/bin/env bash
# 提交最近改动并推送到远程（需在仓库根目录执行，且已 source credentials.env）
set -e
cd "$(dirname "$0")/.."
source /Users/gugen/.cursor/skills/my-github-repos/credentials.env 2>/dev/null || true
if [ -z "$GITHUB_PAT" ]; then
  echo "未设置 GITHUB_PAT，请 source credentials.env"
  exit 1
fi
git add -A
git status
if git diff --cached --quiet; then
  echo "无变更需要提交"
  exit 0
fi
git commit -m "feat: 油猴调试 - 远程执行、日志拦截、console 拉取、npm start 合并服务端"
git push "https://gengu6585:${GITHUB_PAT}@github.com/gengu6585/monkeyScript.git" main
