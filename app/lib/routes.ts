// The closed route registry.
//
// decisions/ratify-labs-catalog-and-routing.md requires routes to be
// constructed from a closed registry rather than discovered, so this file is
// the whole set. Adding a reference to the catalog means adding it here.
//
// `route` and `slug` are deliberately allowed to differ. A route is chosen for
// a reader; a slug is chosen for a repository. /copilot has always been the
// intended path for a reference slugged github-copilot, and the NVIDIA slug
// reads nooa-openshell where its own display name reads OpenShell + NOOA.
// scripts/check-routes.mjs asserts the mapping so the difference stays
// deliberate rather than becoming drift.
//
// `kind` separates what a reader can do:
//   "lab"       a deployment they drive here; real decisions come back
//   "reference" source and instructions, run on their machine
//   "upcoming"  not available, and exposes no control
export type ReferenceKind = "lab" | "reference" | "upcoming";

export interface RouteEntry {
  route: string;
  displayName: string;
  /** Registry slug in ratify-protocol. Not required to match the route. */
  slug: string;
  kind: ReferenceKind;
  /** Canonical source. Required for anything not "upcoming". */
  sourceHref?: string;
  /** The reference README. Required for "reference". */
  referenceHref?: string;
  /** Hosted deployment. Required for, and only for, "lab". */
  labHref?: string;
}

const PROTOCOL = "https://github.com/identities-ai/ratify-protocol";

export const ROUTES: RouteEntry[] = [
  {
    route: "/maritime",
    displayName: "Maritime × Ratify",
    slug: "maritime",
    kind: "lab",
    labHref: "https://labs.ratifyprotocol.com/maritime",
    sourceHref: "https://github.com/identities-ai/ratify-maritime-reference",
  },
  {
    route: "/copilot",
    displayName: "GitHub Copilot",
    slug: "github-copilot",
    kind: "reference",
    referenceHref: `${PROTOCOL}/blob/main/references/github-copilot/README.md`,
    sourceHref: `${PROTOCOL}/tree/main/references/github-copilot`,
  },
  {
    route: "/google-adk",
    displayName: "Google ADK",
    slug: "google-adk",
    kind: "reference",
    referenceHref: `${PROTOCOL}/blob/main/references/google-adk/README.md`,
    sourceHref: `${PROTOCOL}/tree/main/references/google-adk`,
  },
  {
    route: "/langchain",
    displayName: "LangChain",
    slug: "langchain",
    kind: "reference",
    referenceHref: `${PROTOCOL}/blob/main/references/langchain/README.md`,
    sourceHref: `${PROTOCOL}/tree/main/references/langchain`,
  },
  {
    route: "/nvidia-openshell-nooa",
    displayName: "NVIDIA OpenShell + NOOA",
    // The slug inverts the two words. The display name is authoritative for
    // readers; the slug is authoritative for the repository. Both are pinned.
    slug: "nvidia-nooa-openshell",
    kind: "reference",
    referenceHref: `${PROTOCOL}/blob/main/references/nvidia-nooa-openshell/README.md`,
    sourceHref: `${PROTOCOL}/tree/main/demos/nvidia-nooa-delegated-authority`,
  },
];
