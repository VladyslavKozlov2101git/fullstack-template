#!/bin/sh
# Stop hook: won't let the turn end while typecheck, lint or the docs vault are red.
# exit 2 feeds the errors back so Claude keeps fixing; exit 0 lets the turn end.
set -u

root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
cd "$root" || exit 0

changed() { [ -n "$(git status --porcelain -- "$@" | head -1)" ]; }

code_changed=false
docs_changed=false
changed '*.ts' '*.tsx' && code_changed=true
changed 'docs/*.md' 'docs/**/*.md' && docs_changed=true

# Nothing checkable changed -> nothing to check. Keeps talk-only turns free.
if [ "$code_changed" = false ] && [ "$docs_changed" = false ]; then
  exit 0
fi

out=""
ok=true

if [ "$code_changed" = true ]; then
  if ! out=$(pnpm typecheck 2>&1 && pnpm lint 2>&1 && pnpm pages:lint 2>&1); then ok=false; fi
fi

if [ "$ok" = true ] && [ "$docs_changed" = true ]; then
  if ! out=$(pnpm docs:lint 2>&1); then ok=false; fi
fi

tries_file=".turbo/claude-stop-tries"

if [ "$ok" = true ]; then
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
