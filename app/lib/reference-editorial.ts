// Page-specific copy, written by hand.
//
// Everything here is deliberately not generated: it is either a framing choice
// for this page, or a fact about how a reader runs the reference that its README
// expresses differently in each case. Keeping it separate from the generated
// sections means a reader can tell which claims are reproduced from the
// canonical reference and which are ours.
export interface Editorial {
  /** One sentence, in the reader's terms, not the protocol's. */
  claim: string;
  /** What a reader needs installed before step one. */
  prerequisites: string;
  /** The exact commands, run from a clean checkout of ratify-protocol. */
  run: string;
  /** Measured, from the reference's own gate. */
  evidence: string;
  /** Stated on every page, in the reference's own words. */
  endorsement: string;
}

export const EDITORIAL: Record<string, Editorial> = {
  "github-copilot": {
    claim:
      "Let GitHub Copilot use consequential tools without treating access to a tool as unlimited authority.",
    prerequisites: "Node.js 20 or later, and GitHub Copilot CLI for the Copilot path.",
    run: "cd references/github-copilot\n./run-reference-check.sh",
    evidence: "7 deterministic cases pass, zero failures, zero skips.",
    endorsement:
      "An independent Ratify Protocol project. Not a GitHub- or Microsoft-endorsed integration.",
  },
  "google-adk": {
    claim:
      "Let a Google ADK agent request cloud provisioning while the receiver checks the signed ceiling before anything is created.",
    prerequisites: "Python 3.12. No Google Cloud project, model key, or paid service.",
    run: "./scripts/google-adk-reference-check.sh",
    evidence: "33 tests pass, zero skipped, and the gate fails on any skip.",
    endorsement:
      "An independent draft reference implementation. Not a Google partnership, Google-approved integration, or Google reference architecture.",
  },
  langchain: {
    claim:
      "Let a LangChain agent cross an MCP boundary while the receiver verifies who authorized the exact action.",
    prerequisites: "Python 3.12. No model API key or paid service.",
    run: "./scripts/langchain-reference-check.sh",
    evidence: "24 tests pass, zero skipped, and the gate fails on any skip.",
    endorsement:
      "An independent draft reference implementation. Not a LangChain partnership, LangChain-approved integration, or LangChain reference architecture.",
  },
  "nvidia-nooa-openshell": {
    claim:
      "An agent at one company asks another company's service to move money, and the receiver verifies the signed ceiling, the named order, and the expiry before it acts.",
    prerequisites: "Python 3.12. The hermetic gate needs no API key, model, or paid service.",
    run: "./scripts/nvidia-reference-check.sh",
    evidence:
      "181 tests pass against both the in-tree SDK and the published package. The live OpenShell profile passed 64 of 64 gates.",
    endorsement:
      "An independent Ratify Protocol project. Not an NVIDIA partnership, NVIDIA-approved integration, or NVIDIA reference architecture.",
  },
};
