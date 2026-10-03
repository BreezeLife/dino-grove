#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$project_dir"
repo="BreezeLife/dino-grove"
for command_name in gh git node npm; do
  command -v "$command_name" >/dev/null || { echo "缺少 $command_name；请由本机 Codex 配置后再执行。"; exit 1; }
done
# Reuse the host's existing authorization. Never initiate a login.
gh auth status --hostname github.com >/dev/null 2>&1 || { echo "这台电脑没有可复用的 GitHub 授权。脚本已停止，没有启动登录。"; exit 1; }
account_login="$(gh api user --jq .login)"
[ "$account_login" = BreezeLife ] || { echo "当前 GitHub 账户不是 BreezeLife，已停止。"; exit 1; }
node -e 'const [major,minor]=process.versions.node.split(".").map(Number);if(major<22||(major===22&&minor<13)){console.error("需要 Node.js 22.13 或以上");process.exit(1)}'
echo "验证源码并构建静态页面…"
npm ci
npm test
npm run build
if [ ! -d .git ]; then git init -b main; fi
if ! git config user.name >/dev/null; then git config user.name "Weiqi Zhao"; fi
if ! git config user.email >/dev/null; then
  account_id="$(gh api users/BreezeLife --jq .id)"
  git config user.email "$account_id+BreezeLife@users.noreply.github.com"
fi
existing_origin="$(git remote get-url origin 2>/dev/null || true)"
case "$existing_origin" in
  ""|https://github.com/BreezeLife/dino-grove|https://github.com/BreezeLife/dino-grove.git|git@github.com:BreezeLife/dino-grove.git) ;;
  *) echo "当前 origin 指向其他仓库，已停止以避免误推送：$existing_origin"; exit 1 ;;
esac
branch_name="$(git branch --show-current)"
[ "$branch_name" = main ] || { echo "当前分支不是 main，脚本已停止。"; exit 1; }
git add src public tests docs .github index.html package.json package-lock.json tsconfig.json vite.config.ts README.md AGENTS.md CODEX_TASK.md PROJECT.md MEMORY.md TASKS.md WORKLOG.md STATUS.md .nvmrc .gitignore deploy-github.sh
if ! git diff --cached --quiet; then git commit -m "Publish Dino Grove with automated GitHub Pages deployment"; fi
if [ -z "$existing_origin" ]; then
  if gh repo view "$repo" >/dev/null 2>&1; then
    echo "$repo 已存在；请由本机 Codex 先拉取并合并已有源码，脚本不会覆盖仓库。"
    exit 1
  fi
  gh repo create "$repo" --public --description "恐龙小丛林 · Procedural interactive Three.js dinosaur diorama" --source . --remote origin
fi
git push -u origin main
echo "开启 GitHub Pages…"
if gh api "repos/$repo/pages" >/dev/null 2>&1; then
  gh api --method PUT "repos/$repo/pages" -f build_type=workflow >/dev/null
else
  gh api --method POST "repos/$repo/pages" -f build_type=workflow >/dev/null
fi
# An explicit run avoids a first-push race with the Pages setting.
gh workflow run pages.yml --repo "$repo" --ref main
commit_sha="$(git rev-parse HEAD)"
run_id=""
for attempt in {1..20}; do
  run_id="$(gh run list --repo "$repo" --workflow pages.yml --commit "$commit_sha" --event workflow_dispatch --limit 1 --json databaseId --jq '.[0].databaseId // empty')"
  [ -n "$run_id" ] && break
  sleep 3
done
[ -n "$run_id" ] || { echo "发布任务已提交，但暂未取得运行编号。请在仓库 Actions 中检查。"; exit 1; }
gh run watch "$run_id" --repo "$repo" --exit-status
pages_url="$(gh api "repos/$repo/pages" --jq .html_url)"
echo "仓库：https://github.com/$repo"
echo "已发布：$pages_url"
