#!/bin/sh
# Scans staged ADDED lines for credentials. Called from .githooks/pre-commit.
# This repo is public, so a pasted key is published the moment it is pushed.
#
# Run standalone against whatever is staged: sh scripts/secret-scan.sh
set -u

# Only added lines, and not the +++ header. -U0 keeps hunks tight.
added=$(git diff --cached -U0 --no-color -- . ':(exclude)*.example' ':(exclude)pnpm-lock.yaml' |
  grep -E '^\+' | grep -vE '^\+\+\+' || true)

[ -n "$added" ] || exit 0

hit=""
match() {
  found=$(printf '%s\n' "$added" | grep -nE "$1" || true)
  [ -z "$found" ] || hit="$hit
  $2:
$found"
}

match 'sk-[A-Za-z0-9_-]{20,}' 'API key (sk-…)'
match 'AKIA[0-9A-Z]{16}' 'AWS access key id'
match '\-\-\-\-\-BEGIN [A-Z ]*PRIVATE KEY' 'private key block'
match 'gh[pousr]_[A-Za-z0-9]{16,}' 'GitHub token'
match '(password|secret|api_?key|access_token)[[:space:]]*[:=][[:space:]]*["'"'"'][^"'"'"']{8,}' 'hardcoded credential'

if [ -n "$hit" ]; then
  echo "" >&2
  echo "  Staged changes look like they contain a credential:" >&2
  echo "$hit" >&2
  echo "" >&2
  echo "  Move it to apps/api/.env (gitignored) and reference it from process.env." >&2
  echo "  A placeholder belongs in .env.example, which this scan skips." >&2
  echo "  Wrong call? git commit --no-verify — but read the match first." >&2
  echo "" >&2
  exit 1
fi
