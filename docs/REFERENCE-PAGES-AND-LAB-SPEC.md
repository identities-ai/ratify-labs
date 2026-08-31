# Reference pages and the receiver lab

Two proposals, deliberately separate, because they are different artifacts with
different honesty requirements and very different costs.

Draft for review. Nothing here is built.

## The distinction that this rests on

A **reference page** explains why an integration exists, what it does, who
implements what, and how to run it. It is read.

A **lab** is a deployment a visitor drives, where real verification happens and
real decisions come back. It is used.

Conflating them is how a lab becomes a simulation. A page that calls itself a
lab has to invent something runnable, and the only thing available to invent is
a scripted animation of a decision that never occurred.

`decisions/ratify-labs-catalog-and-routing.md` already prohibits the halfway
state: an upcoming entry "must not expose a runnable control." This proposal
keeps that line by never routing a page as if it were a lab.

## Why four labs is the wrong target

The agent half of three references cannot be hosted honestly.

| Reference | Agent half | Can it be hosted? |
|---|---|---|
| GitHub Copilot | Copilot CLI, installed by the visitor | **No.** Copilot runs on their machine. A hosted "Copilot" would be a recording |
| NVIDIA OpenShell + NOOA | OpenShell, an NVIDIA service | **No.** Not ours to operate |
| Google ADK | ADK runtime with a deterministic model double | Yes, but the double means enumerated scenarios |
| LangChain | `create_agent` with a deterministic model double | Yes, same caveat |

Maritime is honest about exactly this. Its published results carry a
`disclosures` object stating that scenarios are enumerated rather than
model-chosen and that both runtimes are Ratify-operated. That is the standard: a
lab may stage its inputs, and must say so.

Three of four would therefore be staging the agent entirely, which is a
different and weaker claim than Maritime makes.

The second reason is that the marginal lab teaches little. All four references
demonstrate the same mechanism: a receiver verifies delegated authority before
acting. What differs is framework plumbing, and plumbing is better read than
watched.

---

# Route and registry mapping

Routes and registry slugs are deliberately not the same string, and were not the
same before this proposal. `decisions/ratify-labs-catalog-and-routing.md` already
names `/copilot` as the intended path for a reference whose slug is
`github-copilot`. A public URL is chosen for readers; a slug is chosen for the
repository. Forcing them to match would mean renaming published paths.

So the mapping is stated, and checked.

| Route | Display name | Registry slug | Reference directory |
|---|---|---|---|
| `/copilot` | GitHub Copilot | `github-copilot` | `references/github-copilot/` |
| `/google-adk` | Google ADK | `google-adk` | `references/google-adk/` |
| `/langchain` | LangChain | `langchain` | `references/langchain/` |
| `/nvidia-openshell-nooa` | NVIDIA OpenShell + NOOA | `nvidia-nooa-openshell` | `references/nvidia-nooa-openshell/` |

**The NVIDIA row inverts two words.** The slug reads `nooa-openshell`; the route
and the display name read `openshell-nooa`. The display name has been
`NVIDIA OpenShell + NOOA` since the reference was written, so the slug is the
outlier rather than the route.

Renaming the slug was considered and rejected. It is published on `main`, it is
referenced by the registry file name, the reference directory, the demo path,
and the evidence record, and none of that is visible to a reader. The cost of
renaming is real and the benefit is cosmetic. A mapping that is checked is
better than a rename that ripples.

**Route-to-registry consistency check.** A new check asserts that every route in
the Labs registry names a registry slug that exists in `ratify-protocol`, that
every published reference has exactly one route, and that the display name
matches the registry entry's title. It fails on:

- a route pointing at a slug that does not exist;
- a published reference with no route, or with two;
- a display name that has drifted from the registry title.

Without it, this table is a comment. `check-reference-versions.py` is the
precedent: the mapping is only real if something rejects the drift.

**Room for future NVIDIA references.** `/nvidia-openshell-nooa` names the two
systems this reference integrates rather than claiming the vendor. A later
NVIDIA reference against a different stack takes its own route naming its own
systems. A bare `/nvidia` would have been the mistake, because the second NVIDIA
reference would then have nowhere to go without renaming the first.

---

# Proposal A: four reference pages

`labs.ratifyprotocol.com/copilot`, `/google-adk`, `/langchain`, `/nvidia`.

Static pages. No runnable control, no `live` badge, no implication of a hosted
deployment. Each links to the canonical reference on `ratify-protocol` and to
the command that runs it locally.

## What each page carries

Ordered as a reader asks, which is the order the reference READMEs already use.

1. **What this lets you do**, in one sentence, in the reader's terms.
2. **Why the platform's own controls do not answer it.** The comparison table
   from the README, naming the platform's real strengths first.
3. **Who implements what.** The four-role table, including the row that says the
   platform implements nothing. This is the section an outreach message quotes.
4. **How one request runs.** The sequence diagram, rendered rather than as a
   code block.
5. **What the reference proves.** The allow and deny matrix, with the protected
   handler column, because a decision without an observed effect is not
   evidence.
6. **Run it yourself.** The exact commands, with prerequisites stated first, and
   the measured test count.
7. **Limitations**, unsoftened.
8. **Open source or Ratify Verify.**

## Where the content comes from

Every section above already exists in the reference README, because the README
standard requires it. The page is a presentation of reviewed content, not a
second source of truth.

**This is the main design risk.** Two copies of the same claims drift, and the
drift is invisible until a reader compares them. Three options:

- **Generate the page from the README at build time.** No drift by
  construction. Costs a markdown pipeline and constrains page design to what
  the README expresses.
- **Hand-write the page and check it against the README in CI**, the way
  `check-reference-versions.py` checks pins today. Full design freedom, and the
  checker has to be taught every claim worth guarding.
- **Hand-write and accept drift.** Cheapest, and this session is a long argument
  against it.

I would generate. The pages are the outreach surface, and a page that
contradicts the reference it describes is worse than no page.

## What this does not do

It does not let a visitor run anything. The card stays **Published**, not Live.
The page says plainly that the reference runs on their machine and gives the
command.

## Effort

Moderate. One shared template, four content sources, a markdown pipeline if
generated. The content exists and is reviewed. Days rather than weeks, and no
new runtime, deployment, or security surface.

---

# Proposal B: one receiver lab

`labs.ratifyprotocol.com/verify` (name open).

## The idea

The receiver is the enforcement point. It is the half of every reference that
carries the consequence, the half the protocol exists to serve, and the only
half we can operate honestly.

A visitor composes a request against a hosted receiver, watches real
verification run, and sees the real decision: `identity_status`, the actual
`error_reason` string, and whether the protected handler was invoked.

Nothing is simulated. The signatures are hybrid Ed25519 and ML-DSA-65, verified
by the same SDK the references use. A denial is a denial the verifier reached,
not a branch a page selected.

## What a visitor does

1. **Sees the delegation** they have been granted: scope, resource, ceiling,
   expiry, rendered from the actual signed certificate.
2. **Composes a request.** Change the amount, the resource, the region. Ask for
   more than the ceiling allows.
3. **Watches the decision.** The receiver verifies and returns allow or deny
   with the real reason. The protected handler's invocation count is displayed
   and does not move on a denial.
4. **Reaches the interesting cases** without hand-crafting them: replay the same
   proof, present after expiry, present a revoked delegation, present a proof
   signed by a key the presenter does not hold.
5. **Inspects the bundle.** The actual JSON, so nothing is taken on trust.

The last two are the point. Someone who watches a replayed proof get refused
with `unknown_challenge: challenge was not issued by this verifier or has
already been used` understands the mechanism in a way no diagram delivers.

## What must be true for this to be a lab

Borrowed from Maritime, because that bar is already set and met:

- **Real verification.** Every decision reaches the SDK. No decision is
  precomputed, and the recorded result names which layer decided.
- **Real key material,** generated per session, never a fixture pretending to be
  live.
- **Locally reproducible.** A visitor can run the same scenarios against their
  own receiver and get the same decisions, without trusting the deployment.
- **Disclosures stated on the page,** in Maritime's style: what is operated by
  us, what is staged, what is asserted rather than proven.

## What it must not be

- A scripted walkthrough with a progress bar.
- A page that shows a denial reason it did not obtain.
- Anything claiming an agent framework is running when it is not.

If the build drifts toward any of these, the honest move is to ship Proposal A
alone. A missing lab costs nothing. A lab that turns out to be a mock costs the
credibility the references were built to earn.

## Framework framing

The lab is framework-neutral, and each reference page links to it as *"see the
verification half running."* Presenting one receiver per framework would imply
four deployments where there is one, which is the kind of small dishonesty this
project does not need.

## Effort

Substantial, and the routing decision says why: each reference repository owns
its executable integration and its Labs-path UI, and a route may be marked
available only after "the routed deployment has independent closure evidence."
Maritime needed an implementation repository, a container image, a scenario
proxy, a live gate, and a disclosures record.

This is a project, not a page. It should be scoped and staffed as one, after
Proposal A ships.

---

# Sequencing

1. **Proposal A**, all four pages. The outreach needs somewhere to point.
2. **Decide the drift question** before writing page one. Generation is the
   answer that does not rot.
3. **Proposal B** as a separate, scoped effort, with the Maritime evidence bar
   as the acceptance criterion rather than an aspiration.

Cards stay **Published** until a route exists and its closure evidence is
published. The catalog has said "In development" about a shipped reference for
sixteen days; it should not now say "Live" about a deployment that does not
exist.

# Findings, from the repositories rather than from assumption

## Generation: possible for four sections, not for a whole page

All four READMEs carry the same four core sections, so those can be generated:

| Section | copilot | google-adk | langchain | nvidia |
|---|:--:|:--:|:--:|:--:|
| Why would a developer or enterprise need this? | yes | yes | yes | yes |
| Who implements what | yes | yes | yes | yes |
| What the reference proves | yes | yes | yes | yes |
| Which path should I use? | yes | yes | yes | yes |

Everything else diverges, and not trivially:

- **Order differs.** Google ADK puts "Which path should I use?" third; the
  others place it late.
- **Section sets differ.** Copilot has "What is cryptographically bound?", ADK
  has "Layer separation" and "Security boundary", LangChain has "Boundary".
  These are not the same section under different names.
- **The limitations heading differs four ways**: "Evidence, security status, and
  limitations", "Reference scope and production requirements", and "Limitations"
  twice.
- **NVIDIA's discovery README carries no run commands at all.** It points at the
  executable README under `demos/nvidia-nooa-delegated-authority/`. A generator
  reading only `references/*/README.md` produces a page with no way to run it.

So: generate the four core sections plus the diagrams, and hand-write the rest.
A generator that tried to consume the whole README would either fail on NVIDIA
or force a normalisation of four READMEs that were deliberately written for
their own audiences.

## Every proposed lab scenario reaches real verification, but not all at the same layer

Checked against outcomes this project has actually observed:

| Scenario | Decided by | Real status |
|---|---|---|
| Within bounds | SDK | `authorized_agent` |
| Over the ceiling | SDK constraint evaluation | `constraint_denied` |
| Wrong resource | SDK constraint evaluation | `constraint_denied` |
| Wrong scope | SDK | `scope_denied` |
| Expired | SDK | `expired` |
| Revoked | SDK, through the revocation callback | `revoked` |
| Replayed | SDK challenge store | `invalid`, detail begins `unknown_challenge:` |
| Certificate copied by a presenter who lacks the key | SDK signature verification | `invalid` |
| **Untrusted root** | **the application, not the SDK** | SDK returns `authorized_agent`; the anchor comparison rejects it |

The last row is the one to get right. The SDK verifies that a chain is
internally consistent; it cannot know which principal a deployment trusts. A
lab that showed "DENY: untrusted root" without saying which layer decided would
imply the protocol rejects it. It does not. The application does.

Maritime already solved this: every decision records `decided_by`. The lab must
do the same, and the untrusted-root case is the reason.

## Endorsement, hosted execution, and implied platform work

Three specific risks, and what removes each:

1. **A route at `/copilot` sitting where `/maritime` is runnable** implies a
   hosted deployment by position alone. Removed by the card status, an explicit
   line on the page saying the reference runs on the reader's machine, and no
   control that looks actionable.
2. **"Who implements what" says the platform implements nothing.** True, and
   worth saying, but it must not read as though the platform participated. The
   phrasing stays "no change to X is required", never "works with X" unqualified.
3. **A vendor name in a route** can read as a joint offering. `/copilot` and
   `/google-adk` name the product being integrated, which is accurate and is
   what every reference README already says. Each page repeats the
   non-endorsement line the READMEs carry.

# Open questions

1. Generate the pages from the READMEs, check them in CI, or accept drift?
2. Is one framework-neutral receiver lab right, or does a LangChain user need to
   see LangChain specifically? My view is that the page shows their framework
   and the lab shows the verification, which is framework-independent.
3. Should the lab issue each visitor a real delegation from a session-scoped
   root, or present a fixed reference identity? Per-visitor is more honest and
   costs key management.
4. Does `/verify` belong in `ratify-labs` or its own implementation repository?
   The routing decision points at the latter.
5. Is there a fifth audience for a lab we have not considered, such as an
   MCP operator wanting to test their own receiver against our proofs?
