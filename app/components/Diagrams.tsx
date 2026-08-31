"use client";

import { useEffect } from "react";

// Fills the diagram placeholders the server left behind.
//
// Only the diagrams are client-rendered. The prose, tables, and lists are
// parsed on the server so the page carries its own content: these pages are
// what outreach links to, and a link that renders nothing without JavaScript is
// not much of a reference.
export function Diagrams({ sources }: { sources: string[] }) {
  useEffect(() => {
    if (sources.length === 0) return;
    let cancelled = false;

    (async () => {
      const mermaid = (await import("mermaid")).default;
      mermaid.initialize({
        startOnLoad: false,
        theme: "base",
        themeVariables: {
          primaryColor: "#eef3ff",
          primaryTextColor: "#081326",
          primaryBorderColor: "#b9c8e5",
          lineColor: "#657189",
          fontFamily: "var(--font-sans), sans-serif",
        },
      });

      for (const [index, source] of sources.entries()) {
        if (cancelled) return;
        const slot = document.querySelector<HTMLElement>(`[data-diagram="${index}"]`);
        if (!slot) continue;
        try {
          const { svg } = await mermaid.render(`diagram-${index}`, source);
          slot.innerHTML = svg;
          slot.removeAttribute("data-pending");
        } catch {
          // CI parses every diagram in the protocol repository, so reaching
          // this means something changed after that check. Say so rather than
          // leaving a gap where the explanation should be.
          slot.innerHTML =
            '<p class="diagram-error">This diagram could not be rendered. The written explanation above still applies.</p>';
          slot.removeAttribute("data-pending");
        }
      }
    })();

    return () => { cancelled = true; };
  }, [sources]);

  return null;
}
