import assert from "node:assert/strict";
import test from "node:test";

async function loadWorker(label) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${label}-${process.pid}-${Date.now()}`);
  return (await import(workerUrl.href)).default;
}

const assets = { fetch: async () => new Response("Not found", { status: 404 }) };
const ctx = { waitUntil() {} };

async function get(path, label) {
  const worker = await loadWorker(label);
  return worker.fetch(new Request(`http://localhost${path}`), { ASSETS: assets }, ctx);
}

const PAGES = [
  { route: "/copilot", name: "GitHub Copilot", endorsement: /Not a GitHub- or Microsoft-endorsed/ },
  { route: "/google-adk", name: "Google ADK", endorsement: /Not a Google partnership/ },
  { route: "/langchain", name: "LangChain", endorsement: /Not a LangChain partnership/ },
  { route: "/nvidia-openshell-nooa", name: "NVIDIA OpenShell \\+ NOOA", endorsement: /Not an NVIDIA partnership/ },
];

for (const page of PAGES) {
  test(`serves ${page.route} with its content in the HTML`, async () => {
    const response = await get(page.route, `page${page.route}`);
    assert.equal(response.status, 200);
    const html = await response.text();

    assert.match(html, new RegExp(page.name));

    // The generated sections must be present in the server HTML, not fetched
    // by the browser. These pages are what outreach links to, and a link that
    // renders nothing without JavaScript is not a reference.
    assert.match(html, /Why would a developer or enterprise need this/);
    assert.match(html, /Who implements what/);
    assert.match(html, /What the reference proves/);
    assert.match(html, /<table/, "expected generated tables in the server HTML");

    // A page must never read as a hosted deployment or an endorsement.
    assert.match(html, /This is a reference, not a hosted lab/);
    assert.match(html, page.endorsement);
    assert.doesNotMatch(html, /Run the live lab/);
  });
}

test("an unknown reference route is not served", async () => {
  const response = await get("/not-a-reference", "unknown");
  assert.equal(response.status, 404);
});

test("the catalog links a hosted lab only for Maritime", async () => {
  const response = await get("/", "catalog-controls");
  const html = await response.text();

  // Counting a phrase is not the test: server-rendered React emits it in both
  // the markup and the hydration payload. What matters is that exactly one
  // reference points at a deployment, and that it is Maritime.
  // Route segments only. Asset URLs on the same host (og.jpg, the logo) are
  // not lab links, and counting them was the first version of this test.
  const labLinks = [...html.matchAll(/https:\/\/labs\.ratifyprotocol\.com\/([a-z][a-z0-9-]*)(?![\w.])/g)]
    .map((match) => match[1]);
  assert.ok(labLinks.length > 0, "expected the Maritime lab to be linked");
  assert.deepEqual([...new Set(labLinks)], ["maritime"]);

  // The published references link to source, never to a deployment here.
  for (const slug of ["github-copilot", "google-adk", "langchain"]) {
    assert.match(html, new RegExp(`ratify-protocol/tree/main/references/${slug}`));
  }
});
