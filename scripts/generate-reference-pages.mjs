// Generate the shared sections of each reference page from its canonical README.
//
// The pages restate claims that already exist in ratify-protocol: why the
// integration matters, who implements what, what the reference proves, and when
// to use the open reference against Ratify Verify. Two hand-maintained copies of
// those claims drift, and the drift is invisible until a reader compares them.
//
// So they are generated. A page cannot contradict the reference it describes,
// because it does not have its own copy to contradict it with.
//
// Only these four sections are shared. The rest of each README diverges enough
// that consuming it wholesale would either fail or force four references
// written for four audiences into one shape. Anything else on a page is
// hand-authored in app/lib/reference-editorial.ts, where it is visibly
// page-specific rather than pretending to be sourced.
import { readFileSync, existsSync, writeFileSync } from "node:fs";

const RAW = "https://raw.githubusercontent.com/identities-ai/ratify-protocol/main";
const local = process.env.RATIFY_PROTOCOL_PATH;

// Heading text varies between references; the section does not. Matched by
// intent rather than by exact string, because normalising four READMEs to one
// wording would cost more than it returns.
const SECTIONS = [
  { id: "why", match: /^##\s+.*\b(why)\b.*$/i },
  { id: "roles", match: /^##\s+Who implements what\s*$/i },
  { id: "proves", match: /^##\s+.*\bproves\b.*$/i },
  { id: "path", match: /^##\s+Which path should I use\?\s*$/i },
];

async function readme(slug) {
  const relative = `references/${slug}/README.md`;
  if (local) {
    const path = `${local}/${relative}`;
    if (!existsSync(path)) throw new Error(`missing ${path}`);
    return readFileSync(path, "utf8");
  }
  const response = await fetch(`${RAW}/${relative}`);
  if (!response.ok) throw new Error(`cannot read ${relative}: HTTP ${response.status}`);
  return response.text();
}

/** Take one `## ` section, from its heading to the next heading of any level. */
function section(markdown, pattern) {
  const lines = markdown.split("\n");
  const start = lines.findIndex((line) => pattern.test(line));
  if (start === -1) return null;
  let end = lines.length;
  let inFence = false;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (lines[i].startsWith("```")) inFence = !inFence;
    if (!inFence && /^#{1,2}\s/.test(lines[i])) { end = i; break; }
  }
  return {
    heading: lines[start].replace(/^#+\s*/, "").trim(),
    body: lines.slice(start + 1, end).join("\n").trim(),
  };
}

const source = readFileSync(new URL("../app/lib/routes.ts", import.meta.url), "utf8");
const slugs = [...source.matchAll(/slug:\s*"([^"]+)",\s*kind:\s*"reference"/g)].map((m) => m[1]);

const generated = {};
const problems = [];

for (const slug of slugs) {
  const markdown = await readme(slug);
  const found = {};
  for (const { id, match } of SECTIONS) {
    const part = section(markdown, match);
    if (!part) { problems.push(`${slug}: no section matching ${id}`); continue; }
    found[id] = part;
  }
  generated[slug] = found;
}

if (problems.length > 0) {
  console.log("generate-reference-pages: FAIL");
  for (const p of problems) console.log(`  ${p}`);
  process.exit(1);
}

const header = `// GENERATED FILE. Do not edit.
//
// Source: references/<slug>/README.md in identities-ai/ratify-protocol.
// Regenerate: node scripts/generate-reference-pages.mjs
//
// These sections are reproduced from the canonical reference so a page cannot
// state something the reference does not. Page-specific copy belongs in
// reference-editorial.ts, not here.

export interface GeneratedSection { heading: string; body: string }
export type GeneratedContent = Record<string, Record<string, GeneratedSection>>;

export const GENERATED: GeneratedContent = ${JSON.stringify(generated, null, 2)};
`;

writeFileSync(new URL("../app/lib/reference-content.generated.ts", import.meta.url), header);
const count = Object.values(generated).reduce((n, s) => n + Object.keys(s).length, 0);
console.log(`generate-reference-pages: ok (${count} sections from ${slugs.length} references)`);
