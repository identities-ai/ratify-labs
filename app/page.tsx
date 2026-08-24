const references = [
  {
    name: "Maritime × Ratify",
    status: "Live",
    description: "Watch the same agent pass at $420 and stop at $501 when a signed delegation sets a $500 ceiling.",
    href: "/maritime",
    action: "Run the live lab",
    live: true,
  },
  {
    name: "LangChain",
    status: "Upcoming",
    description: "Add receiver-verified delegated authority to a tool-calling agent without making the model a policy engine.",
  },
  {
    name: "GitHub Copilot",
    status: "Upcoming",
    description: "Carry signed authority across an agent boundary and verify it immediately before protected work begins.",
  },
  {
    name: "Google ADK",
    status: "Upcoming",
    description: "Keep identity, delegation, policy, and execution evidence distinct across a multi-agent workflow.",
  },
];

export default function Home() {
  return <main>
    <header className="nav">
      <Link className="brand" href="/" aria-label="Ratify Labs home"><Image src="/ratify-logo.png" alt="" width={34} height={34} /><span>RATIFY <b>LABS</b></span></Link>
      <nav aria-label="Primary navigation"><a href="#references">References</a><a href="#principles">Principles</a><a className="source" href="https://github.com/identities-ai/ratify-labs">Source ↗</a></nav>
    </header>

    <section className="hero">
      <div className="hero-copy">
        <p className="eyebrow"><span /> EXECUTABLE AUTHORITY PATTERNS</p>
        <h1>Agents can act.<br /><em>Authority makes it safe.</em></h1>
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
      <div className="section-head"><div><p className="kicker">REFERENCE CATALOG</p><h2>See the boundary work.</h2></div><p>Open implementations. Real decisions. No pre-scripted outcomes.</p></div>
      <div className="cards">
        {references.map((reference, index) => <article className={reference.live ? "card featured" : "card"} key={reference.name}>
          <div className="card-top"><span className="index">0{index + 1}</span><span className={`status ${reference.live ? "is-live" : ""}`}>{reference.live && <i />}{reference.status}</span></div>
          {reference.live && <div className="mini-flow" aria-hidden="true"><span>AGENT</span><b>→</b><span>PROOF</span><b>→</b><span>VERIFY</span><b>→</b><span>ACT</span></div>}
          <h3>{reference.name}</h3><p>{reference.description}</p>
          {reference.href ? <Link href={reference.href}>{reference.action} <span>→</span></Link> : <span className="unavailable">In development</span>}
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

    <footer><div className="brand"><Image src="/ratify-logo.png" alt="" width={27} height={27} /><span>RATIFY <b>LABS</b></span></div><p>Open references for authority-aware agents.</p><div className="footer-links"><a href="https://github.com/identities-ai/ratify-labs/blob/main/docs/PRIVACY.md">Privacy ↗</a><a href="https://ratifyprotocol.com">Ratify Protocol ↗</a></div></footer>
  </main>;
}
import Image from "next/image";
import Link from "next/link";
