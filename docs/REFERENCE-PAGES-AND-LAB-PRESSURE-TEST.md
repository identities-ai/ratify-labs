# Pressure-test prompt: Labs reference pages and receiver lab

```text
Review docs/REFERENCE-PAGES-AND-LAB-SPEC.md in ratify-labs against the actual
repositories. Do not rely on the spec's own claims.

Context. Four Ratify references are published on ratify-protocol main: GitHub
Copilot, Google ADK, LangChain, and NVIDIA OpenShell + NOOA. The Labs catalog
lists them as Published with links to source. Maritime is the only hosted lab.
The spec proposes four static reference pages now, and one framework-neutral
receiver lab later, rather than four labs.

A0. The route mapping

0a. Routes and registry slugs deliberately differ, and did before this proposal:
    the routing decision already names /copilot for a reference slugged
    github-copilot. Is a checked mapping the right answer, or should the slugs
    be renamed to match the routes?
0b. The NVIDIA slug reads nvidia-nooa-openshell while the display name and the
    proposed route read openshell-nooa. Confirm the slug is the outlier. Is the
    inversion worth a rename, given the slug appears in the registry file name,
    the reference directory, the demo path, and the evidence record?
0c. Does /nvidia-openshell-nooa leave room for a future NVIDIA reference against
    a different stack, or does it still claim too much of the vendor?
0d. What exactly should the route-to-registry check assert, and what should it
    deliberately not assert?

A. The central judgement

1. Is the page-versus-lab split correct, or is it a rationalisation for doing
   less? Argue the opposite case: what would four real labs give a visitor that
   four pages plus one shared lab would not?
2. The spec claims the agent half of Copilot and NVIDIA cannot be hosted
   honestly. Verify that from those references. Is there a hosting shape that
   would be honest and has been missed?
3. Maritime discloses that its scenarios are enumerated rather than
   model-chosen. Does the proposed receiver lab clear that bar, or does it stage
   more than Maritime does while claiming the same standing?
4. Is a framework-neutral lab actually useful to a LangChain user, or does it
   fail the audience it is meant to serve?

B. The drift problem

5. The spec says every page section already exists in the reference README and
   proposes generating pages from those READMEs. Confirm the content really is
   there for all four, or name what is missing.
6. Assess the three drift options: generate, check in CI, or accept. This
   session found several checks that passed while the thing they described was
   wrong. Which option actually survives that failure mode?
7. If generation is chosen, what breaks? Consider diagrams, tables, relative
   links, and the fact that the NVIDIA discovery page points at an executable
   README in a different directory.

C. Honesty and the publication rule

8. decisions/ratify-labs-catalog-and-routing.md says a route may be marked
   available only after its canonical reference is public, its discovery
   surfaces are merged, its gate passes, and the routed deployment has
   independent closure evidence. Do static pages need closure evidence, or is
   that requirement about executable routes only? The spec assumes the latter.
9. The same decision says an upcoming entry must not expose a runnable control.
   Does a static page at /copilot risk implying a runnable deployment simply by
   existing at a route where Maritime is runnable?
10. Would a visitor arriving at /copilot and /maritime understand that one is a
    document and the other is a system? If not, what distinguishes them.

D. The lab, if it is built

11. Is the five-step visitor flow the right one, or does it demonstrate the
    mechanism without demonstrating the value?
12. Per-visitor session identities versus a fixed reference identity: which is
    honest, and what does per-visitor key management actually require?
13. What would make this lab a simulation despite good intentions? Name the
    specific compromises most likely to be made under time pressure.
14. Should it live in ratify-labs or its own implementation repository, given
    that each reference repository owns its executable integration and Labs-path
    UI?

E. Scope and cost

15. Is "days rather than weeks" credible for four generated pages?
16. Is the Maritime evidence bar the right acceptance criterion for the lab, or
    is it heavier than a receiver-only deployment needs?
17. What in this spec should be cut entirely?

Return: agreement or disagreement with the split, defects in either proposal,
anything the spec claims that the repositories do not support, a recommended
sequence, and whether Proposal A should start now or wait on an answer to the
drift question.

Do not implement anything.
```
