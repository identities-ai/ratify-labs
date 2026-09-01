// One share card per reference, in the catalog's own visual language.
//
// Drawn as SVG and rasterised at build time rather than rendered per request:
// a share card is the same bytes every time, and putting image rendering in
// the request path of an otherwise static site buys nothing.
//
// The existing public/og.jpg stays the catalog card. It is a designed asset and
// this generator does not try to redraw it; these are the per-reference cards
// it never had.

const INK = "#081326";
const NAVY = "#0d1d3b";
const BLUE = "#1559f5";
const CYAN = "#70d7ff";
const MUTED = "#8fa3c4";
const SANS = "Helvetica Neue, Helvetica, Arial, sans-serif";

// Text width, not character count. The first version wrapped at a fixed number
// of characters, which let the longest title run under the motif: "NVIDIA
// OpenShell + NOOA" is the same character count as titles half its width.
const TEXT_WIDTH = 660; // x=88 to the motif's left edge, with margin.

/** Rough advance width for bold Helvetica at a given size. */
const measure = (text, size) => text.length * size * 0.575;

/** Largest size at which the title fits in at most three lines. */
function layout(title) {
  for (const size of [92, 82, 72, 62]) {
    const lines = [];
    let line = "";
    for (const word of title.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (measure(next, size) > TEXT_WIDTH && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
    if (lines.length <= 3 && lines.every((l) => measure(l, size) <= TEXT_WIDTH)) {
      return { lines, size };
    }
  }
  // Nothing fits: fail rather than ship a card with text under the graphic.
  throw new Error(`cannot lay out title within ${TEXT_WIDTH}px: "${title}"`);
}

const escape = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function card({ title, kicker, note }) {
  const { lines, size } = layout(title);
  // Centred vertically, but never above the kicker: a three-line title centred
  // on the canvas overlaps it, which is how the first render put "NVIDIA"
  // through the middle of "OPEN REFERENCE".
  const KICKER_CLEARANCE = 268;
  const top = Math.max(KICKER_CLEARANCE, 300 - ((lines.length - 1) * size * 1.06) / 2);

  const titleLines = lines
    .map((line, i) =>
      `<text x="88" y="${top + i * size * 1.06}" font-family="${SANS}" font-size="${size}" font-weight="700" fill="#ffffff" letter-spacing="-3">${escape(line)}</text>`)
    .join("\n    ");

  // The motif is the decision itself: one path continues, one stops. It is the
  // single idea every reference in this catalog demonstrates.
  const motif = `
    <g transform="translate(880 320)">
      <circle r="196" fill="none" stroke="#1b356b" stroke-width="1"/>
      <circle r="150" fill="none" stroke="#20406f" stroke-width="1" stroke-dasharray="4 7"/>
      <circle r="96" fill="${BLUE}" opacity="0.16"/>
      <circle r="72" fill="none" stroke="${CYAN}" stroke-width="2"/>
      <path d="M -26 2 L -8 22 L 28 -20" fill="none" stroke="${CYAN}"
            stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
      <g stroke="#2a4d84" stroke-width="2">
        <line x1="-196" y1="0" x2="-150" y2="0"/>
        <line x1="150" y1="0" x2="196" y2="0"/>
      </g>
      <circle cx="0" cy="-196" r="7" fill="${CYAN}"/>
      <circle cx="170" cy="98" r="7" fill="${BLUE}"/>
      <circle cx="-170" cy="98" r="7" fill="#2a4d84"/>
    </g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="640" viewBox="0 0 1280 640">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${NAVY}"/>
      <stop offset="1" stop-color="${INK}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${BLUE}" stop-opacity="0.30"/>
      <stop offset="1" stop-color="${BLUE}" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="1280" height="640" fill="url(#bg)"/>
  <circle cx="880" cy="320" r="300" fill="url(#glow)"/>

  <text x="88" y="118" font-family="${SANS}" font-size="34" font-weight="700" letter-spacing="6">
    <tspan fill="${BLUE}">RATIFY</tspan><tspan fill="#ffffff" dx="18">LABS</tspan>
  </text>

  <text x="88" y="182" font-family="${SANS}" font-size="19" font-weight="600"
        letter-spacing="4.2" fill="${MUTED}">${escape(kicker)}</text>

  ${titleLines}

  <text x="88" y="534" font-family="${SANS}" font-size="25" fill="${MUTED}">${escape(note)}</text>
  <rect x="88" y="566" width="86" height="4" fill="${BLUE}"/>
  ${motif}
</svg>`;
}
