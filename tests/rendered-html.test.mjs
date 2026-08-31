import assert from "node:assert/strict";
import test from "node:test";

async function loadWorker(label) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${label}-${process.pid}-${Date.now()}`);
  return (await import(workerUrl.href)).default;
}

const assets = { fetch: async () => new Response("Not found", { status: 404 }) };
const ctx = { waitUntil() {} };

test("renders the shared Labs catalog", async () => {
  const worker = await loadWorker("catalog");
  const response = await worker.fetch(new Request("http://localhost/"), { ASSETS: assets }, ctx);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Ratify Labs — Executable authority patterns/);
  assert.match(html, /Don.t take the authority claim on trust/);
  assert.match(html, /Inspect the evidence/);
  assert.match(html, /Maritime × Ratify/);
  assert.match(html, /href="https:\/\/labs\.ratifyprotocol\.com\/maritime"/);
  assert.match(html, /href="https:\/\/github\.com\/identities-ai\/ratify-maritime-reference"/);
  assert.match(html, /Catalog source/);
  assert.doesNotMatch(html, /Your site is taking shape/);
});

test("rejects the provider hostname", async () => {
  const worker = await loadWorker("host");
  const response = await worker.fetch(new Request("https://ratify-labs.example-host.test/"), { ASSETS: assets }, ctx);
  assert.equal(response.status, 404);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("accepts an explicitly configured staging hostname", async () => {
  const worker = await loadWorker("staging-host");
  const response = await worker.fetch(
    new Request("https://ratify-labs-staging.example/"),
    { ASSETS: assets, LABS_HOSTNAME: "ratify-labs-staging.example" },
    ctx,
  );
  assert.equal(response.status, 200);
});

test("routes only read-only Maritime paths with a server credential", async () => {
  const worker = await loadWorker("route");
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (request) => {
    calls.push(request);
    return new Response("origin", { status: 200, headers: { "Set-Cookie": "private=1" } });
  };
  try {
    const routeToken = "a".repeat(64);
    const env = { ASSETS: assets, MARITIME_ORIGIN: "https://origin.example", LABS_ROUTER_TOKEN: routeToken };
    const request = new Request("https://labs.ratifyprotocol.com/maritime/_next/static/app.js", {
      headers: { Authorization: "Bearer browser", Cookie: "session=browser", "X-Ratify-Labs-Route": "Bearer attacker" },
    });
    const response = await worker.fetch(request, env, ctx);
    assert.equal(response.status, 200);
    assert.equal(calls.length, 1);
    assert.equal(new URL(calls[0].url).href, "https://origin.example/maritime/_next/static/app.js");
    assert.equal(calls[0].headers.get("x-ratify-labs-route"), `Bearer ${routeToken}`);
    assert.equal(calls[0].headers.get("authorization"), null);
    assert.equal(calls[0].headers.get("cookie"), null);
    assert.equal(response.headers.get("set-cookie"), null);
    assert.equal(response.headers.get("x-frame-options"), "SAMEORIGIN");
    assert.match(response.headers.get("content-security-policy"), /frame-ancestors 'self'/);

    const post = await worker.fetch(new Request("https://labs.ratifyprotocol.com/maritime", { method: "POST" }), env, ctx);
    assert.equal(post.status, 405);

    const arbitrary = await worker.fetch(new Request("https://labs.ratifyprotocol.com/maritime/not-registered"), env, ctx);
    assert.equal(arbitrary.status, 404);
    assert.equal(calls.length, 1);

    const asset = await worker.fetch(new Request("https://labs.ratifyprotocol.com/maritime/_next/static/app.js"), env, ctx);
    assert.equal(asset.status, 200);
    assert.equal(calls.length, 2);

    const bareStaticDirectory = await worker.fetch(new Request("https://labs.ratifyprotocol.com/maritime/_next/static/"), env, ctx);
    assert.equal(bareStaticDirectory.status, 404);
    const unusedImageOptimizer = await worker.fetch(new Request("https://labs.ratifyprotocol.com/maritime/_vinext/image?url=%2Fmaritime%2Fratify-logo.png&w=64&q=75"), env, ctx);
    assert.equal(unusedImageOptimizer.status, 404);
    assert.equal(calls.length, 2);

    globalThis.fetch = async () => new Response("internal origin detail", { status: 500, headers: { Location: "https://origin.example/private" } });
    const failed = await worker.fetch(new Request("https://labs.ratifyprotocol.com/maritime"), env, ctx);
    assert.equal(failed.status, 502);
    assert.equal(await failed.text(), "Reference unavailable");
    assert.equal(failed.headers.get("location"), null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
