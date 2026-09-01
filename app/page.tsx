const REPO = "https://github.com/identities-ai/ratify-protocol";

// A published reference card links to its page on this site, and offers the
// canonical source as the second link. Linking the card straight to GitHub left
// every generated page unreachable: they rendered, they were tested, and nothing
// pointed at them. scripts/check-routes.mjs now refuses that state.

// Three states, because there are three real situations and collapsing them
// misleads. `live` is a lab hosted here that a visitor can run in the browser.
// `published` is merged, open source they run themselves; the link goes to the
// reference, not to a promise. Anything else is genuinely not ready, and says so.
const references = [
  {
    name: "Maritime × Ratify",
    status: "Live",
    description: "Watch the same agent pass at $420 and stop at $501 when a signed delegation sets a $500 ceiling.",
    href: "https://labs.ratifyprotocol.com/maritime",
    sourceHref: "https://github.com/identities-ai/ratify-maritime-reference",
    action: "Run the live lab",
    live: true,
  },
  {
    name: "GitHub Copilot",
    status: "Published",
    description: "Copilot calls a deployment tool over MCP. An independently operated receiver verifies that a recognized principal authorized this exact action, on this exact resource, before the protected handler runs.",
    href: "/copilot",
    sourceHref: `${REPO}/tree/main/references/github-copilot`,
    action: "Read the reference",
    published: true,
  },
  {
    name: "LangChain",
    status: "Published",
    description: "A LangChain agent crosses an MCP boundary. The receiver verifies who authorized the exact action and which bounds still apply, without the model ever holding the signing key.",
    href: "/langchain",
    sourceHref: `${REPO}/tree/main/references/langchain`,
    action: "Read the reference",
    published: true,
  },
  {
    name: "Google ADK",
    status: "Published",
    description: "An ADK agent requests cloud provisioning. An independent MCP receiver verifies the signed ceiling and the named resource before anything is created.",
    href: "/google-adk",
    sourceHref: `${REPO}/tree/main/references/google-adk`,
    action: "Read the reference",
    published: true,
  },
  {
    name: "NVIDIA OpenShell + NOOA",
    status: "Published",
    description: "An agent at one company asks another company's service to move money. The receiver verifies the signed ceiling, the named order, and the expiry before it acts.",
    href: "/nvidia-openshell-nooa",
    sourceHref: `${REPO}/tree/main/demos/nvidia-nooa-delegated-authority`,
    action: "Read the reference",
    published: true,
  },
  {
    name: "Ratify Edge Physical AI",
    status: "Published",
    description: "An agent asks for a physical action. A Linux edge receiver verifies the signed delegation, the zone, the duration and the exact invocation, then drives the actuator. The Arduino only actuates; it decides nothing.",
    // Stated on the card, not only on the page. Every other reference here runs
    // from a package install. This one needs hardware on a desk, and a reader
    // deserves to know that before clicking rather than after.
    requires: "Needs hardware: a Raspberry Pi 2 or compatible Linux device, an Arduino Uno, and a USB serial cable. Not runnable in the browser.",
    href: "/edge-sentinel",
    sourceHref: `${REPO}/tree/main/references/physical-ai-edge-sentinel`,
    action: "Read the reference",
    published: true,
  },
];

export default function Home() {
  // The catalog is the entry point an answer engine is most likely to cite, so
  // it states what the site is and what it lists rather than leaving both to be
  // inferred from headings.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Ratify Labs",
    url: "https://labs.ratifyprotocol.com/",
    description: "Open reference implementations showing how a receiver verifies delegated authority before an agent acts.",
    publisher: { "@type": "Organization", name: "Ratify Protocol", url: "https://ratifyprotocol.com" },
    mainEntity: {
      "@type": "ItemList",
      name: "Reference catalog",
      itemListElement: references.map((reference, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: reference.name,
        description: reference.description,
        url: reference.href.startsWith("http")
          ? reference.href
          : `https://labs.ratifyprotocol.com${reference.href}`,
      })),
    },
  };

  return <main>
    <script type="application/ld+json" suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <header className="nav">
      <Link className="brand" href="/" aria-label="Ratify Labs home"><Image src="/ratify-logo.png" alt="" width={34} height={34} /><span>RATIFY <b>LABS</b></span></Link>
      <nav aria-label="Primary navigation"><a href="#references">References</a><a href="#principles">Principles</a><a className="source" href="https://github.com/identities-ai/ratify-labs">Catalog source ↗</a></nav>
    </header>

    <section className="hero">
      <div className="hero-copy">
        <p className="eyebrow"><span /> EXECUTABLE AUTHORITY PATTERNS</p>
        <h1>Don&rsquo;t take the authority claim on trust.<br /><em>Run it.</em></h1>
        <p className="lede">Ratify Labs turns abstract authorization claims into systems you can run, inspect, and try. Each reference keeps agent reasoning separate from the authority required to perform real work.</p>
        <a className="primary" href="#references">Explore the references <span>↓</span></a>
      </div>
      <div className="signal" aria-label="Authority verification sequence">
        <div className="orbit orbit-a" /><div className="orbit orbit-b" />
        <div className="signal-core"><small>RECEIVER</small><strong>VERIFY</strong><span>before execution</span></div>
        <div className="signal-node node-a"><i>01</i><b>IDENTITY</b></div>
        <div className="signal-node node-b"><i>02</i><b>DELEGATION</b></div>
        <div className="signal-node node-c"><i>03</i><b>POLICY</b></div>
      </div>
    </section>

    <section className="catalog" id="references">
      <div className="section-head"><div><p className="kicker">REFERENCE CATALOG</p><h2>See the boundary. Inspect the evidence.</h2></div><p>Open implementations. Real decisions. No pre-scripted outcomes.</p></div>
      <div className="cards">
        {references.map((reference, index) => <article className={reference.live ? "card featured" : "card"} key={reference.name}>
          <div className="card-top"><span className="index">0{index + 1}</span><span className={`status ${reference.live ? "is-live" : ""} ${reference.published ? "is-published" : ""}`.trim()}>{reference.live && <i />}{reference.status}</span></div>
          {reference.live && <div className="mini-flow" aria-hidden="true"><span>AGENT</span><b>→</b><span>PROOF</span><b>→</b><span>VERIFY</span><b>→</b><span>ACT</span></div>}
          <h3>{reference.name}</h3><p>{reference.description}</p>
          {reference.requires && <p className="requires">{reference.requires}</p>}
          {reference.href ? <div className="card-links"><a href={reference.href}>{reference.action} <span>→</span></a><a href={reference.sourceHref}>View implementation source</a></div> : <span className="unavailable">In development</span>}
        </article>)}
      </div>
      <p className="catalog-note">Ratify Labs publishes open reference implementations, not the Ratify Verify product. A listed platform is implementation context, not an endorsement or partnership claim.</p>
    </section>

    <section className="principles" id="principles">
      <div><p className="kicker">THE LABS STANDARD</p><h2>Evidence over promises.</h2></div>
      <ol>
        <li><span>01</span><div><h3>Executable</h3><p>Every live reference has a working path, not a diagram standing in for a system.</p></div></li>
        <li><span>02</span><div><h3>Inspectable</h3><p>Source, bounds, decisions, and limitations stay visible enough to challenge.</p></div></li>
        <li><span>03</span><div><h3>Receiver-owned</h3><p>Authorization is verified at the protected boundary, after the model has finished reasoning.</p></div></li>
      </ol>
    </section>

    <footer><div className="brand"><Image src="/ratify-logo.png" alt="" width={27} height={27} /><span>RATIFY <b>LABS</b></span></div><p>Open references for authority-aware agents.</p><div className="footer-links"><a href="https://github.com/identities-ai/ratify-labs">Catalog source ↗</a><a href="https://github.com/identities-ai/ratify-labs/blob/main/docs/PRIVACY.md">Privacy ↗</a><a href="https://ratifyprotocol.com">Ratify Protocol ↗</a></div></footer>
  </main>;
}
import Image from "next/image";
import Link from "next/link";
