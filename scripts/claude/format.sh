#!/bin/sh
# PostToolUse(Edit|Write): formats the one file that just changed.
# node parses the hook payload because this machine has no jq.
set -u

root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
cd "$root" || exit 0

file=$(node -e '
let s = "";
process.stdin.on("data", (d) => (s += d)).on("end", () => {
  try {
    const j = JSON.parse(s);
    process.stdout.write(j.tool_response?.filePath || j.tool_input?.file_path || "");
  } catch {}
});
') || exit 0

[ -n "$file" ] || exit 0

case "$file" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs|*.scss|*.css|*.json|*.md|*.yml|*.yaml|*.html) ;;
  *) exit 0 ;;   # .prisma, .nginx, .hbs, .sh — prettier has nothing to say
esac

[ -x node_modules/.bin/prettier ] || exit 0
node_modules/.bin/prettier --write --ignore-unknown --log-level error "$file" >/dev/null 2>&1 || true
