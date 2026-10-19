#!/usr/bin/env node
// PreToolUse(Bash): refuses to let Claude bypass this repo's own git hooks.
//
// A PreToolUse hook only sees Claude's tool calls, so the human keeps
// --no-verify in their own terminal. This closes it for the agent, which is the
// only place it was a hole: every guard here documents --no-verify as the
// escape hatch, which quietly made commit-msg, pre-commit and pre-push
// advisory for the agent too (ADR 0003).
//
// Fails open: anything it cannot parse is allowed.
let input = "";
process.stdin
  .on("data", (d) => (input += d))
  .on("end", () => {
    let cmd = "";
    try {
      cmd = JSON.parse(input)?.tool_input?.command ?? "";
    } catch {
      process.exit(0);
    }
    if (!cmd || !/\bgit\b[\s\S]*\b(commit|push)\b/.test(cmd)) process.exit(0);

    // Strip what is text rather than flags: heredoc bodies and quoted spans. A
    // commit message legitimately discusses --no-verify — this repo documents it
    // — and matching the raw command string would deny those commits.
    const flags = cmd
      .replace(/<<-?\s*["\x27]?(\w+)["\x27]?[\s\S]*?^\1/gm, " ")
      .replace(/\x27[^\x27]*\x27/g, " ")
      .replace(/"[^"]*"/g, " ");

    // Long form anywhere; short form only as its own token.
    if (!/--no-verify\b/.test(flags) && !/(^|\s)-n(\s|$)/.test(flags)) process.exit(0);

    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason:
            "--no-verify bypasses commit-msg, pre-commit and pre-push, which are this repo's only " +
            "real enforcement (ADR 0003: hooks enforce, prose advises). Fix what the hook reports " +
            "instead of skipping it. If the hook itself is wrong, say so and let the user decide.",
        },
      }),
    );
  });
