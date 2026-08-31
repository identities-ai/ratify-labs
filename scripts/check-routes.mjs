// Assert the Labs route registry against the published references.
//
// Routes and registry slugs deliberately differ. That is only safe if something
// rejects the difference becoming accidental, so this checks the mapping rather
// than trusting a table in a document.
//
// It also makes the publication rule mechanical. The routing decision says a
// route may be marked available only after its canonical reference is public.
// Nothing enforced that, so this refuses to route an unpublished one.
//
// The protocol registry is read from a pinned, checked-in snapshot rather than
// fetched. A check whose input can change underneath it is not reproducible: the
// same Labs commit would pass today and fail after an unrelated merge in another
// repository, and a GitHub outage would fail a build that has nothing to do with
// GitHub. Refresh the pin deliberately with scripts/sync-protocol-registry.mjs.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const snapshot = JSON.parse(
  readFileSync(new URL("../app/lib/protocol-registry.snapshot.json", import.meta.url), "utf8"),
);

// The snapshot is only evidence if it has not been edited by hand.
const expected = createHash("sha256")
  .update(JSON.stringify({ commit: snapshot.commit, entries: snapshot.entries }))
  .digest("hex");
if (expected !== snapshot.integrity) {
  console.log("route-registry: FAIL");
  console.log("  the pinned registry snapshot does not match its own integrity hash;");
  console.log("  re-run scripts/sync-protocol-registry.mjs rather than editing it");
  process.exit(1);
}

function registryEntry(slug) {
  return snapshot.entries[slug] ?? null;
}

const source = readFileSync(new URL("../app/lib/routes.ts", import.meta.url), "utf8");
const entries = [...source.matchAll(
  /\{\s*route:\s*"([^"]+)",\s*displayName:\s*"([^"]+)",(?:[\s\S]*?)slug:\s*"([^"]+)",\s*kind:\s*"([^"]+)"([\s\S]*?)\n  \},/g,
)].map(([, route, displayName, slug, kind, rest]) => ({ route, displayName, slug, kind, rest }));

const failures = [];
const seenRoutes = new Set();
const seenSlugs = new Set();

for (const entry of entries) {
  const { route, displayName, slug, kind, rest } = entry;

  if (seenRoutes.has(route)) failures.push(`${route}: duplicate route`);
  if (seenSlugs.has(slug)) failures.push(`${route}: slug ${slug} is routed twice`);
  seenRoutes.add(route);
  seenSlugs.add(slug);

  if (!/^\/[a-z0-9-]+$/.test(route)) {
    failures.push(`${route}: route must be lowercase, hyphenated, single segment`);
  }

  // A control is only offered where something can be driven.
  const hasLab = /labHref:/.test(rest);
  const hasReference = /referenceHref:/.test(rest);
  const hasSource = /sourceHref:/.test(rest);

  if (kind === "lab" && !hasLab) failures.push(`${route}: kind "lab" needs labHref`);
  if (kind !== "lab" && hasLab) failures.push(`${route}: only a lab may carry labHref`);
  if (kind === "reference" && !hasReference) failures.push(`${route}: kind "reference" needs referenceHref`);
  if (kind !== "upcoming" && !hasSource) failures.push(`${route}: needs sourceHref`);
  if (kind === "upcoming" && (hasSource || hasReference)) {
    failures.push(`${route}: an upcoming entry must expose no link a reader can act on`);
  }

  // Maritime lives in its own repository and has no protocol registry entry.
  if (kind === "lab") continue;
  if (kind === "upcoming") {
    failures.push(`${route}: upcoming entries are not routable; remove the route until it publishes`);
    continue;
  }

  const text = registryEntry(slug);
  if (text === null) {
    failures.push(`${route}: no registry entry references/registry/${slug}.md in ratify-protocol`);
    continue;
  }

  const title = text.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (title !== displayName) {
    failures.push(`${route}: display name "${displayName}" does not match the registry title "${title}"`);
  }

  // The reference has to actually be published. A registry entry that still
  // says upcoming, or a profile link that does not resolve, is not routable.
  if (/\bupcoming\b/i.test(text)) {
    failures.push(`${route}: registry entry still reads as upcoming; an unpublished reference must not be routed`);
  }

  const expectedSource = `references/${slug}`;
  const sourceHref = rest.match(/sourceHref:\s*[`"]([^`"]+)[`"]/)?.[1] ?? "";
  const resolved = sourceHref.replace("${PROTOCOL}", "https://github.com/identities-ai/ratify-protocol");
  if (!resolved.includes(expectedSource) && !resolved.includes("demos/")) {
    failures.push(`${route}: sourceHref ${resolved} does not point at ${expectedSource} or a demos path`);
  }
}

if (failures.length > 0) {
  console.log("route-registry: FAIL");
  for (const failure of failures) console.log(`  ${failure}`);
  process.exit(1);
}
console.log(
  `route-registry: ok (${entries.length} route(s), ` +
  `${entries.filter((e) => e.kind === "reference").length} checked against protocol ${snapshot.commit.slice(0, 12)})`,
);
