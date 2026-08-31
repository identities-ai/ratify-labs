// Read the currently deployed Worker version id from `wrangler deployments
// list --json` on stdin.
//
// This exists as a script rather than inline shell because the check that used
// it was silently unfalsifiable. It read `.[0].id`, which is two mistakes at
// once: `id` is a *deployment* id while a deploy reports a *version* id, and
// `[0]` is the oldest entry rather than the current one. The workflow then
// compared that against the deployed version id, so the two values could never
// be equal and the "did the version change" assertion always passed.
//
// A check that cannot fail is worse than no check, because it is counted as
// evidence. Extracting it makes it testable, and tests/deployed-version.test.mjs
// proves it rejects the cases it is meant to reject.
//
// Shape, confirmed against wrangler 4.127.1:
//   [ { id, created_on, versions: [ { version_id, percentage } ], ... }, ... ]
// ordered oldest first, so the current deployment is the last element.

export function currentVersionId(payload) {
  if (!Array.isArray(payload)) {
    throw new Error("expected a JSON array of deployments");
  }
  if (payload.length === 0) {
    throw new Error("no deployments returned");
  }
  const latest = payload[payload.length - 1];
  const versionId = latest?.versions?.[0]?.version_id;
  if (typeof versionId !== "string" || versionId.length === 0) {
    throw new Error("latest deployment has no versions[0].version_id");
  }
  return versionId;
}

export function assertVersionChanged(before, after) {
  if (!after) {
    throw new Error("no version id was reported by the deploy");
  }
  if (before === after) {
    throw new Error(`deployment version did not change (still ${after})`);
  }
  return after;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const stdin = await new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => { data += chunk; });
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
  try {
    process.stdout.write(`${currentVersionId(JSON.parse(stdin))}\n`);
  } catch (error) {
    process.stderr.write(`deployed-version: ${error.message}\n`);
    process.exit(1);
  }
}
