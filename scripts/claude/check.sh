#!/bin/sh
# Stop hook: won't let the turn end while typecheck or lint are red.
# exit 2 feeds the errors back so Claude keeps fixing; exit 0 lets the turn end.
set -u

root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
cd "$root" || exit 0

# Nothing compiled changed -> nothing to check. Keeps talk-only turns free.
[ -n "$(git status --porcelain -- '*.ts' '*.tsx' | head -1)" ] || exit 0

tries_file=".turbo/claude-stop-tries"

if out=$(pnpm typecheck 2>&1 && pnpm lint 2>&1); then
  rm -f "$tries_file"
  exit 0
fi

tries=$(cat "$tries_file" 2>/dev/null || echo 0)
tries=$((tries + 1))
mkdir -p .turbo && echo "$tries" > "$tries_file"

echo "$out" | tail -40 >&2

# Three blocked turns is enough — never trap the session in a loop it can't exit.
if [ "$tries" -ge 3 ]; then
  rm -f "$tries_file"
  echo "" >&2
  echo "Still red after $tries attempts. Ending the turn anyway — fix this by hand." >&2
  exit 0
fi

exit 2
