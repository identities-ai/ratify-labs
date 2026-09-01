// Render one share card per reference, from the route registry.
//
// Every reference previously shared the catalog's card, so six different pages
// produced one identical preview. The card text is what a reader sees before
// clicking, so it should name the page.
import { readFileSync, mkdirSync } from "node:fs";
import sharp from "sharp";
import { card } from "./og/template.mjs";

const OUT = new URL("../public/og/", import.meta.url);
mkdirSync(OUT, { recursive: true });

const routes = readFileSync(new URL("../app/lib/routes.ts", import.meta.url), "utf8");

const entries = [...routes.matchAll(
  /route:\s*"([^"]+)",\s*displayName:\s*"([^"]+)",[\s\S]*?slug:\s*"([^"]+)",\s*kind:\s*"([^"]+)"([\s\S]*?)\n {2}\},/g,
)].map(([, route, displayName, slug, kind, rest]) => ({ route, displayName, slug, kind, rest }));

const references = entries.filter((e) => e.kind === "reference");
if (references.length === 0) {
  console.error("generate-og-images: no reference routes found; refusing to write nothing");
  process.exit(1);
}

for (const entry of references) {
  const hardware = /hardware:\s*true/.test(entry.rest);
  const svg = card({
    title: entry.displayName,
    kicker: "OPEN REFERENCE",
    // A reader deciding whether to click benefits more from knowing what it
    // costs to run than from a second sentence of positioning.
    note: hardware
      ? "Verify before actuating. Runs on a Pi and an Arduino."
      : "Verify delegated authority before the action runs.",
  });

  const file = new URL(`${entry.slug}.jpg`, OUT);
  await sharp(Buffer.from(svg)).jpeg({ quality: 90, chromaSubsampling: "4:4:4" }).toFile(file.pathname);
  console.log(`  ${entry.route} -> public/og/${entry.slug}.jpg`);
}

console.log(`generate-og-images: ok (${references.length} card(s))`);
