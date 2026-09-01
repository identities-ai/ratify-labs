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


/**
 * The server HTML carries the rendered markup and the RSC hydration payload,
 * so every string appears twice. Counting without stripping the payload
 * silently doubles every total, which is how a "there is exactly one" test
 * quietly becomes "there are exactly two".
 */
function markupOnly(html) {
  return html.replace(/<script[\s\S]*?<\/script>/g, "");
}

const PAGES = [
  { route: "/copilot", name: "GitHub Copilot", endorsement: /Not a GitHub- or Microsoft-endorsed/ },
  { route: "/google-adk", name: "Google ADK", endorsement: /Not a Google partnership/ },
  { route: "/langchain", name: "LangChain", endorsement: /Not a LangChain partnership/ },
  { route: "/nvidia-openshell-nooa", name: "NVIDIA OpenShell \\+ NOOA", endorsement: /Not an NVIDIA partnership/ },
  // The only entry a reader cannot run from a package install. Its page must
  // still carry the same not-a-hosted-lab and non-endorsement guarantees.
  { route: "/edge-sentinel", name: "Ratify Edge Physical AI", endorsement: /not a platform partnership/ },
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

// The hardware reference is the first entry a reader cannot run from a package
// install. That difference has to reach the catalog card, because a reader
// decides whether to click from the card, not from the page.
test("the catalog states the hardware requirement before a reader clicks", async () => {
  const response = await get("/", "catalog-hardware");
  assert.equal(response.status, 200);
  const html = await response.text();

  assert.match(html, /Ratify Edge Physical AI/);
  assert.match(html, /Raspberry Pi/, "the card must name the hardware");
  assert.match(html, /Arduino Uno/);
  assert.match(html, /Not runnable in the browser/);

  // It is a reference, not a lab, and the catalog must not imply otherwise.
  const card = html.slice(html.indexOf("Ratify Edge Physical AI"));
  const end = card.indexOf("</article>");
  assert.doesNotMatch(card.slice(0, end), /Run the live lab/);
});

// The Arduino is the actuator and decides nothing. If the page ever implied
// otherwise it would invert the reference's entire claim. The README states
// this as a negation, so a bare substring search is not the test: every
// occurrence has to be a denial, never an assertion.
test("the edge sentinel page never implies the actuator authorizes", async () => {
  const response = await get("/edge-sentinel", "edge-actuator");
  const html = await response.text();

  for (const match of html.matchAll(/(.{40})Arduino (?:verifies|authorizes|decides)/gi)) {
    assert.match(
      match[1],
      /\bnot\b/i,
      `an unnegated claim that the Arduino decides: ...${match[0]}`,
    );
  }

  // And the receiver is named as the thing that decides.
  assert.match(html, /Raspberry Pi|ARMv7|Linux/);
});

// One discoverability model for the whole catalog. Before this, every card
// linked straight to GitHub and the generated pages were unreachable: they
// rendered, they were tested, and nothing pointed at them.
test("every published reference is reachable from the catalog", async () => {
  const response = await get("/", "catalog-links");
  assert.equal(response.status, 200);
  const html = await response.text();

  for (const { route } of PAGES) {
    assert.match(
      html,
      new RegExp(`href="${route}"`),
      `the catalog must link ${route}, or its generated page is orphaned`,
    );
  }
});

test("every card also offers the canonical source", async () => {
  const html = await (await get("/", "catalog-source")).text();
  const sources = markupOnly(html).match(/View implementation source/g) ?? [];
  assert.equal(
    sources.length,
    PAGES.length + 1,
    "each reference card, plus the Maritime lab, keeps a link to its source",
  );
});

test("every generated page links back to its canonical source", async () => {
  for (const { route } of PAGES) {
    const html = await (await get(route, `src${route}`)).text();
    assert.match(
      html,
      /github\.com\/identities-ai\/ratify-protocol/,
      `${route} must point back at the canonical implementation`,
    );
  }
});

// The hardware notice is a fact about one reference, not decoration. If it
// appeared on the others it would be false.
test("hardware prerequisites appear on exactly one card", async () => {
  const html = await (await get("/", "catalog-hw-once")).text();
  const markup = markupOnly(html);
  assert.equal((markup.match(/Needs hardware:/g) ?? []).length, 1);
  assert.equal((markup.match(/Not runnable in the browser/g) ?? []).length, 1);
});

// Live, Published and Upcoming must keep meaning what they meant.
test("only Maritime is Live, and only it offers a hosted lab", async () => {
  const html = await (await get("/", "catalog-kinds")).text();
  const markup = markupOnly(html);
  assert.equal((markup.match(/Run the live lab/g) ?? []).length, 1);
  assert.equal((markup.match(/>Live</g) ?? []).length, 1);
  assert.equal((markup.match(/>Published</g) ?? []).length, PAGES.length);
  assert.doesNotMatch(markup, />Upcoming</, "no upcoming entry is routed");
});
