#!/bin/sh
# One-shot: makes master and development require a PR on GitHub, and points new
# PRs at development by default. Re-running is safe — it replaces the ruleset.
#
# Needs the gh CLI, authenticated: https://cli.github.com  →  gh auth login
# No gh? Do it by hand: Settings → Rules → Rulesets → New branch ruleset,
# targets master + development, tick "Require a pull request before merging",
# "Block force pushes", "Restrict deletions".
set -e

command -v gh >/dev/null || { echo "gh CLI not found — see the comment in this file."; exit 1; }

repo=$(gh repo view --json nameWithOwner -q .nameWithOwner)
echo "Protecting master + development on $repo"

# Delete an existing ruleset of the same name so this is idempotent.
old=$(gh api "repos/$repo/rulesets" -q '.[] | select(.name=="protected branches") | .id' || true)
[ -n "$old" ] && gh api -X DELETE "repos/$repo/rulesets/$old"

gh api -X POST "repos/$repo/rulesets" --input - <<'JSON'
{
  "name": "protected branches",
  "target": "branch",
  "enforcement": "active",
  "conditions": {
    "ref_name": { "include": ["refs/heads/master", "refs/heads/development"], "exclude": [] }
  },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": false,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": false,
        "allowed_merge_methods": ["squash", "merge"]
      }
    }
  ]
}
JSON

# Feature PRs should target development, not master.
gh repo edit "$repo" --default-branch development
# Keeps merged branches from piling up.
gh repo edit "$repo" --delete-branch-on-merge

echo "Done. master and development now need a PR; direct pushes are rejected."
