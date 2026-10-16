// Keep the high-severity audit gate while the build-tool braces advisory has no patch.
import { spawnSync } from "node:child_process";

const result = spawnSync("npm", ["audit", "--json"], {
  encoding: "utf8",
  maxBuffer: 10 * 1024 * 1024,
});
if (result.error) throw result.error;

let report;
try {
  report = JSON.parse(result.stdout);
} catch {
  console.error("dependency-audit: npm did not return a JSON audit report");
  process.exit(1);
}
if (!report.vulnerabilities) {
  console.error("dependency-audit: audit report has no vulnerabilities field");
  console.error(result.stderr.trim() || result.stdout.slice(0, 500));
  process.exit(1);
}

const allowed = new Set([
  "braces", "micromatch", "fast-glob", "@next/eslint-plugin-next",
  "vite-plugin-dynamic-import", "vite-plugin-commonjs", "vinext",
]);
const advisory = "https://github.com/advisories/GHSA-vfj7-8cjw-p6xm";
const unexpected = Object.entries(report.vulnerabilities).filter(([name, item]) =>
  ["high", "critical"].includes(item.severity) && !(
    allowed.has(name) && item.via.every((via) =>
      typeof via === "string" ? allowed.has(via) : via.url === advisory
    )
  )
);

if (unexpected.length) {
  console.error("dependency-audit: unexpected high or critical advisories:");
  for (const [name] of unexpected) console.error(`  ${name}`);
  process.exit(1);
}
console.log("dependency-audit: no unexcepted high or critical advisories");
