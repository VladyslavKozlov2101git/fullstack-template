#!/usr/bin/env node
// Checks the docs/ vault: broken wikilinks, orphan pages, stubs, open contradictions.
// Broken links fail the run; the rest are warnings. Run: pnpm docs:lint
import { readFileSync, readdirSync, statSync } from "node:fs";
import { basename, extname, join, relative, sep } from "node:path";

const VAULT = "docs";

// Templates hold placeholder links, so they are not a source of real links.
// AGENTS/CLAUDE are config read by agents, not pages someone navigates to.
const NOT_LINK_SOURCES = ["99-Templates"];
const NEVER_ORPHANS = ["00-Home/Index.md", "AGENTS.md", "CLAUDE.md", "99-Templates"];
const STUB_CHARS = 200;

const walk = (dir) =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (entry.startsWith(".")) return [];
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

const files = walk(VAULT).map((p) => relative(VAULT, p).split(sep).join("/"));
const pages = files.filter((f) => f.endsWith(".md"));

// Obsidian resolves [[Target]] by filename anywhere in the vault, case-insensitively.
const byName = new Map();
for (const file of files) {
  const key = basename(file, extname(file)).toLowerCase();
  if (!byName.has(key)) byName.set(key, file);
}

// A wikilink inside a code fence or backticks is documentation of the syntax, not a link.
const stripCode = (text) => text.replace(/```[\s\S]*?```/g, "").replace(/`[^`\r\n]*`/g, "");

const broken = [];
const contradictions = [];
const linkedTo = new Set();

for (const page of pages) {
  const body = readFileSync(join(VAULT, page), "utf8");

  if (/^>\s*\[!warning\]\s*Contradiction/im.test(body)) contradictions.push(page);

  if (NOT_LINK_SOURCES.some((skip) => page.startsWith(`${skip}/`))) continue;

  for (const [, raw] of stripCode(body).matchAll(/\[\[([^\]|#]+)(?:[#|][^\]]*)?\]\]/g)) {
    const target = raw.trim().replace(/\.md$/i, "").toLowerCase();
    const hit = byName.get(target);
    if (hit) linkedTo.add(hit);
    else broken.push({ page, target: raw.trim() });
  }
}

const orphans = pages.filter(
  (page) =>
    !linkedTo.has(page) &&
    !NEVER_ORPHANS.some((keep) => page === keep || page.startsWith(`${keep}/`)),
);

const stubs = pages.filter((page) => {
  // A template is meant to be short.
  if (page.startsWith("99-Templates/")) return false;
  const body = readFileSync(join(VAULT, page), "utf8")
    .replace(/^---[\s\S]*?\n---/, "")
    .trim();
  return body.length < STUB_CHARS;
});

const report = (label, rows) => {
  if (rows.length) console.log(`\n${label}\n${rows.map((r) => `  ${r}`).join("\n")}`);
};

report(
  `Broken wikilinks (${broken.length})`,
  broken.map((b) => `${b.page} -> [[${b.target}]]`),
);
report(`Orphans — not reachable from any page (${orphans.length})`, orphans);
report(`Stubs — under ${STUB_CHARS} chars (${stubs.length})`, stubs);
report(`Open contradictions (${contradictions.length})`, contradictions);

const counts = `${pages.length} pages, ${linkedTo.size} linked`;
if (broken.length) {
  console.log(`\n${counts} — ${broken.length} broken link(s). Fix these.`);
  process.exit(1);
}
console.log(
  `\n${counts}, no broken links.` +
    (orphans.length || stubs.length ? " Warnings above are yours to judge." : ""),
);
