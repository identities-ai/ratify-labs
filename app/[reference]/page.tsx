import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ROUTES } from "../lib/routes";
import { GENERATED } from "../lib/reference-content.generated";
import { EDITORIAL } from "../lib/reference-editorial";
import { Diagrams } from "../components/Diagrams";
import { renderSection } from "../lib/render";

// Only routes in the closed registry exist, and only reference routes render
// here. A lab is a deployment, not a document, and is served by its own
// implementation.
const PAGES = ROUTES.filter((entry) => entry.kind === "reference");

export function generateStaticParams() {
  return PAGES.map((entry) => ({ reference: entry.route.replace(/^\//, "") }));
}

export const dynamicParams = false;

function lookup(param: string) {
  return PAGES.find((entry) => entry.route === `/${param}`);
}

export async function generateMetadata({ params }: { params: Promise<{ reference: string }> }): Promise<Metadata> {
  const { reference } = await params;
  const entry = lookup(reference);
  if (!entry) return {};
  const editorial = EDITORIAL[entry.slug];
  return {
    title: `${entry.displayName} — Ratify Labs`,
    description: editorial?.claim,
  };
}

const ORDER = ["why", "roles", "proves", "path"] as const;

export default async function ReferencePage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const entry = lookup(reference);
  if (!entry) notFound();

  const editorial = EDITORIAL[entry.slug];
  const sections = GENERATED[entry.slug] ?? {};

  // Parsed here rather than in the browser: the page should carry its own
  // content. Only the diagrams need a client.
  const rendered: Record<string, { html: string; diagrams: string[] }> = {};
  const allDiagrams: string[] = [];
  for (const id of ORDER) {
    const part = sections[id];
    if (!part) continue;
    const { html, diagrams } = await renderSection(part.body);
    // Diagram indices are page-wide so each placeholder is unique.
    let offset = allDiagrams.length;
    rendered[id] = {
      html: html.replace(/data-diagram="(\d+)"/g, (_, n) => `data-diagram="${offset + Number(n)}"`),
      diagrams,
    };
    allDiagrams.push(...diagrams);
  }

  return <main>
    <header className="nav">
      <Link className="brand" href="/" aria-label="Ratify Labs home"><Image src="/ratify-logo.png" alt="" width={34} height={34} /><span>RATIFY <b>LABS</b></span></Link>
      <nav aria-label="Primary navigation"><Link href="/#references">References</Link><a href={entry.referenceHref}>Reference ↗</a><a className="source" href={entry.sourceHref}>Source ↗</a></nav>
    </header>

    <section className="ref-hero">
      <p className="eyebrow"><span /> OPEN REFERENCE</p>
      <h1>{entry.displayName}</h1>
      <p className="lede">{editorial?.claim}</p>

      {/* Said plainly and early. A page at a route where Maritime is runnable
          otherwise implies a deployment that does not exist. */}
      <div className="not-hosted" role="note">
        <strong>This is a reference, not a hosted lab.</strong> The source and
        instructions are open and it runs on your machine in minutes. Nothing on
        this page executes here, and no integration is hosted for you.
      </div>
      <p className="endorsement">{editorial?.endorsement}</p>
    </section>

    <section className="ref-body">
      {ORDER.map((id) => {
        const part = sections[id];
        if (!part) return null;
        return <article className="ref-section" key={id}>
          <h2>{part.heading}</h2>
          <div className="prose" dangerouslySetInnerHTML={{ __html: rendered[id]?.html ?? "" }} />
        </article>;
      })}

      <article className="ref-section" id="run">
        <h2>Run it yourself</h2>
        <p className="prereq"><strong>Before you start:</strong> {editorial?.prerequisites}</p>
        <p>Clone <a href="https://github.com/identities-ai/ratify-protocol">ratify-protocol</a>, then from the repository root:</p>
        <pre><code>{editorial?.run}</code></pre>
        <p className="evidence">{editorial?.evidence}</p>
      </article>
    </section>

    <Diagrams sources={allDiagrams} />

    <section className="ref-next">
      <div>
        <p className="kicker">NEXT</p>
        <h2>Read the reference, or watch verification run.</h2>
      </div>
      <div className="ref-next-links">
        <a className="primary" href={entry.referenceHref}>Read the full reference <span>↗</span></a>
        <a href="/maritime">See a hosted lab: Maritime <span>→</span></a>
      </div>
    </section>

    <footer><div className="brand"><Image src="/ratify-logo.png" alt="" width={27} height={27} /><span>RATIFY <b>LABS</b></span></div><p>Open references for authority-aware agents.</p><div className="footer-links"><a href="https://github.com/identities-ai/ratify-labs">Catalog source ↗</a><a href="https://ratifyprotocol.com">Ratify Protocol ↗</a></div></footer>
  </main>;
}
