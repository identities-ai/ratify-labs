import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const SNAPSHOT = new URL("../app/lib/protocol-registry.snapshot.json", import.meta.url);
const CHECK = new URL("../scripts/check-routes.mjs", import.meta.url);

function runCheck() {
  try {
    execFileSync("node", [CHECK.pathname], { encoding: "utf8", stdio: "pipe" });
    return { ok: true, output: "" };
  } catch (error) {
    return { ok: false, output: `${error.stdout ?? ""}${error.stderr ?? ""}` };
  }
}

/** Corrupt the snapshot, run the check, restore. */
function withSnapshot(mutate) {
  const original = readFileSync(SNAPSHOT, "utf8");
  try {
    const parsed = JSON.parse(original);
    mutate(parsed);
    writeFileSync(SNAPSHOT, `${JSON.stringify(parsed, null, 2)}\n`);
    return runCheck();
  } finally {
    writeFileSync(SNAPSHOT, original);
  }
}

test("the integrity hash covers the content and excludes itself", () => {
  // A file cannot hash its own bytes if the hash is among them. The payload is
  // the pinned commit and the registry entries; the hash and the capture date
  // are outside it.
  const snapshot = JSON.parse(readFileSync(SNAPSHOT, "utf8"));
  const recomputed = createHash("sha256")
    .update(JSON.stringify({ commit: snapshot.commit, entries: snapshot.entries }))
    .digest("hex");
  assert.equal(recomputed, snapshot.integrity);
});

test("the check accepts the snapshot as committed", () => {
  assert.ok(runCheck().ok, "the committed snapshot should verify");
});

test("editing registry content is rejected", () => {
  const result = withSnapshot((snapshot) => {
    snapshot.entries.langchain = snapshot.entries.langchain.replace("LangChain", "Acme");
  });
  assert.equal(result.ok, false);
  assert.match(result.output, /integrity hash/);
});

test("editing the recorded hash is rejected", () => {
  const result = withSnapshot((snapshot) => {
    snapshot.integrity = "0".repeat(64);
  });
  assert.equal(result.ok, false);
  assert.match(result.output, /integrity hash/);
});

test("editing the pinned commit is rejected", () => {
  const result = withSnapshot((snapshot) => {
    snapshot.commit = "deadbeef".repeat(5);
  });
  assert.equal(result.ok, false);
  assert.match(result.output, /integrity hash/);
});

test("the capture date is outside the hash, so re-pinning the same commit is not a change", () => {
  // Capturing the same commit on a different day must not read as tampering.
  const result = withSnapshot((snapshot) => {
    snapshot.capturedAt = "1999-01-01";
  });
  assert.ok(result.ok, "capturedAt should not participate in the integrity hash");
});
