import { marked } from "marked";

// Parse a generated section on the server, holding mermaid blocks aside for the
// browser. Returns the HTML and the diagram sources, so the page can render its
// own content and hydrate only the pictures.
export async function renderSection(body: string): Promise<{ html: string; diagrams: string[] }> {
  const diagrams: string[] = [];
  const withSlots = body.replace(/```mermaid\n([\s\S]*?)```/g, (_, code: string) => {
    diagrams.push(code);
    return `<div class="mermaid-slot" data-diagram="${diagrams.length - 1}" data-pending="1">`
      + `<p class="diagram-pending">Diagram loading…</p></div>`;
  });
  return { html: await marked.parse(withSlots, { async: true }), diagrams };
}
