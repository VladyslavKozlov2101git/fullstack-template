#!/usr/bin/env node
// Every page renders its own <title> and <meta name="description"> — the rule
// lives in apps/web/CLAUDE.md, this is what enforces it. Run: pnpm pages:lint
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const PAGES = "apps/web/src/pages";

// A page is Name/Name.tsx. A folder without one breaks the component
// convention, not this rule, so it is left to lint rather than failed here.
const pages = readdirSync(PAGES, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .flatMap((entry) => {
    try {
      return [
        {
          name: entry.name,
          body: readFileSync(join(PAGES, entry.name, `${entry.name}.tsx`), "utf8"),
        },
      ];
    } catch {
      return [];
    }
  });

const missing = pages.flatMap(({ name, body }) => {
  const gaps = [];
  // Matched loosely on purpose: a page is free to build either tag's content
  // from props, and this only asks that the tag is there at all.
  if (!/<title[\s>]/.test(body)) gaps.push("<title>");
  if (!/<meta\s[^>]*name="description"/.test(body)) gaps.push('<meta name="description">');
  return gaps.length ? [`${name} — missing ${gaps.join(" and ")}`] : [];
});

if (missing.length) {
  console.log(`Pages missing metadata (${missing.length}):`);
  console.log(missing.map((row) => `  ${row}`).join("\n"));
  console.log("\nEvery page needs both — see the Rules section of apps/web/CLAUDE.md.");
  process.exit(1);
}

console.log(`${pages.length} pages, all with <title> and <meta name="description">.`);
