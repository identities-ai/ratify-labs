// Refresh the pinned snapshot of the protocol reference registry.
//
// Deliberate, and the only script here that uses the network. The route check
// reads the snapshot instead of fetching, so a Labs build does not depend on
// GitHub being reachable and cannot change behaviour because someone merged
// something in another repository.
//
// This is a lockfile, with a lockfile's tradeoff: the snapshot is reproducible
// and can go stale. Staleness is visible, because the pinned commit is recorded
// in the snapshot and printed by the check.
//
//   node scripts/sync-protocol-registry.mjs            pins current main
//   node scripts/sync-protocol-registry.mjs <sha>      pins an exact commit
import { createHash } from "node:crypto";
import { writeFileSync, readFileSync } from "node:fs";

const API = "https://api.github.com/repos/identities-ai/ratify-protocol";
const RAW = "https://raw.githubusercontent.com/identities-ai/ratify-protocol";

const requested = process.argv[2];

async function resolveCommit() {
  if (requested) {
    const response = await fetch(`${API}/commits/${requested}`);
    if (!response.ok) throw new Error(`cannot resolve ${requested}: HTTP ${response.status}`);
    return (await response.json()).sha;
  }
  const response = await fetch(`${API}/commits/main`);
  if (!response.ok) throw new Error(`cannot resolve main: HTTP ${response.status}`);
  return (await response.json()).sha;
}

const commit = await resolveCommit();

const source = readFileSync(new URL("../app/lib/routes.ts", import.meta.url), "utf8");
const slugs = [...source.matchAll(/slug:\s*"([^"]+)",\s*kind:\s*"reference"/g)].map((m) => m[1]);

const entries = {};
for (const slug of slugs) {
  const path = `references/registry/${slug}.md`;
  const response = await fetch(`${RAW}/${commit}/${path}`);
  if (!response.ok) throw new Error(`${path} at ${commit.slice(0, 8)}: HTTP ${response.status}`);
  entries[slug] = await response.text();
}

const payload = { commit, capturedAt: new Date().toISOString().slice(0, 10), entries };
// Integrity over the content only, so a re-capture of the same commit on a
// different day does not look like a content change.
const integrity = createHash("sha256").update(JSON.stringify({ commit, entries })).digest("hex");

writeFileSync(
  new URL("../app/lib/protocol-registry.snapshot.json", import.meta.url),
  `${JSON.stringify({ ...payload, integrity }, null, 2)}\n`,
);

console.log(`sync-protocol-registry: pinned ${commit.slice(0, 12)} (${slugs.length} entries)`);
console.log(`  integrity ${integrity.slice(0, 16)}`);
