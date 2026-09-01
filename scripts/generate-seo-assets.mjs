// Generate robots.txt and sitemap.xml from the route registry.
//
// Written rather than hand-maintained because a sitemap that lists a route the
// site does not serve, or omits one it does, is worse than no sitemap: it tells
// a crawler something untrue. Deriving both from ROUTES means adding a
// reference updates them, and scripts/check-routes.mjs asserts the result.
import { readFileSync, writeFileSync } from "node:fs";

const ORIGIN = "https://labs.ratifyprotocol.com";

const source = readFileSync(new URL("../app/lib/routes.ts", import.meta.url), "utf8");
const routes = [...source.matchAll(/^\s{4}route:\s*"([^"]+)"/gm)].map((m) => m[1]);
if (routes.length === 0) {
  console.error("generate-seo-assets: no routes found; refusing to write an empty sitemap");
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
const urls = ["/", ...routes]
  // The routed Maritime path is a proxy to a separate deployment which sets its
  // own metadata. Listing it here would claim authority over a page this site
  // does not author.
  .filter((route) => route !== "/maritime")
  .map((route) => `  <url>\n    <loc>${ORIGIN}${route}</loc>\n    <lastmod>${today}</lastmod>\n  </url>`)
  .join("\n");

writeFileSync(
  new URL("../public/sitemap.xml", import.meta.url),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
);

writeFileSync(
  new URL("../public/robots.txt", import.meta.url),
  `User-agent: *\nAllow: /\n\nSitemap: ${ORIGIN}/sitemap.xml\n`,
);

console.log(`generate-seo-assets: ok (${routes.length - 1} reference route(s) + root)`);
