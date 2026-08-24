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
  assert.match(html, /Agents can act/);
  assert.match(html, /Maritime × Ratify/);
  assert.match(html, /href="\/maritime"/);
  assert.doesNotMatch(html, /Your site is taking shape/);
});

test("rejects the provider hostname", async () => {
  const worker = await loadWorker("host");
  const response = await worker.fetch(new Request("https://ratify-labs.example-host.test/"), { ASSETS: assets }, ctx);
  assert.equal(response.status, 404);
  assert.equal(response.headers.get("cache-control"), "no-store");
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

    const post = await worker.fetch(new Request("https://labs.ratifyprotocol.com/maritime", { method: "POST" }), env, ctx);
    assert.equal(post.status, 405);

    const arbitrary = await worker.fetch(new Request("https://labs.ratifyprotocol.com/maritime/not-registered"), env, ctx);
    assert.equal(arbitrary.status, 404);
    assert.equal(calls.length, 1);

    const asset = await worker.fetch(new Request("https://labs.ratifyprotocol.com/maritime/_next/static/app.js"), env, ctx);
    assert.equal(asset.status, 200);
    assert.equal(calls.length, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
