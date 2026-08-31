import assert from "node:assert/strict";
import test from "node:test";
import { assertVersionChanged, currentVersionId } from "../scripts/deployed-version.mjs";

// Real shape from wrangler 4.127.1, oldest first, trimmed to what is read.
const deployments = [
  {
    id: "390789b6-658d-4c7e-a098-15c438578f22",
    created_on: "2026-08-31T03:13:56.124553Z",
    versions: [{ version_id: "1bb4a10f-0877-4a7b-98eb-cd07b0c9a1d5", percentage: 100 }],
  },
  {
    id: "e52edb1c-f3cb-4c4b-ba46-678aec276833",
    created_on: "2026-08-31T04:21:58.272435Z",
    versions: [{ version_id: "541dc9ce-73d6-4e1b-ae9a-c7fa0742bf1c", percentage: 100 }],
  },
];

test("reads the current deployment, not the oldest", () => {
  assert.equal(currentVersionId(deployments), "541dc9ce-73d6-4e1b-ae9a-c7fa0742bf1c");
});

// The specific defect this replaces. `id` is a deployment id and `version_id` is
// a version id; comparing one against the other can never match, which is what
// made the old check unfalsifiable.
test("never returns a deployment id", () => {
  const returned = currentVersionId(deployments);
  for (const deployment of deployments) {
    assert.notEqual(returned, deployment.id);
  }
});

test("refuses input it cannot read", () => {
  assert.throws(() => currentVersionId([]), /no deployments/);
  assert.throws(() => currentVersionId({}), /expected a JSON array/);
  assert.throws(() => currentVersionId([{ id: "x" }]), /version_id/);
  assert.throws(() => currentVersionId([{ id: "x", versions: [] }]), /version_id/);
});

// The point of the whole check: it has to be able to fail. A no-op deploy leaves
// the version unchanged, and that must be an error rather than a green tick.
test("fails when the deployment did not change", () => {
  const same = "541dc9ce-73d6-4e1b-ae9a-c7fa0742bf1c";
  assert.throws(() => assertVersionChanged(same, same), /did not change/);
});

test("fails when the deploy reported no version", () => {
  assert.throws(() => assertVersionChanged("before", ""), /no version id/);
  assert.throws(() => assertVersionChanged("before", undefined), /no version id/);
});

test("passes when the version actually changed", () => {
  assert.equal(
    assertVersionChanged("1bb4a10f-0877-4a7b-98eb-cd07b0c9a1d5", "541dc9ce-73d6-4e1b-ae9a-c7fa0742bf1c"),
    "541dc9ce-73d6-4e1b-ae9a-c7fa0742bf1c",
  );
});

// Guards the real defect end to end: the value the old expression produced must
// not be accepted as "changed" when the deployment is in fact unchanged.
test("the previous expression would have passed this, and must not", () => {
  const oldExpressionValue = deployments[0].id;          // .[0].id
  const deployReports = currentVersionId(deployments);    // the real version id
  assert.notEqual(oldExpressionValue, deployReports);     // why it never failed
  assert.throws(() => assertVersionChanged(deployReports, deployReports), /did not change/);
});
