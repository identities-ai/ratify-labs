# Scope: moving Ratify Labs from OpenAI Sites to Cloudflare

Draft for review. Nothing has been changed or deployed.

## Why this is being considered

`labs.ratifyprotocol.com` is a CNAME to `custom-domains.chatgpt.site`. The site
is hosted on OpenAI Sites, fronted by Cloudflare DNS. There is no `ratify-labs`
Worker on any reachable Cloudflare account, which is why neither an operator nor
an automated deploy could find one.

No record explains the choice. `.openai/hosting.json` and a purpose-built
`build/sites-vite-plugin.ts` were both present in the first commit, so the
repository was scaffolded for Sites rather than moved to it after an
evaluation. Every later mention treats Sites as a constraint to work around:
provider hostnames serving byte-identical assets, an abuse-prevention cookie
that `docs/PRIVACY.md` exists partly to disclose, and `LAB-014` requiring
deployment evidence to be recorded by hand.

The operational cost surfaced on 2026-08-30: three pull requests merged and the
site kept serving the previous build, because publishing requires a Codex
session with the Sites connector and nothing reported that it had not happened.

## What makes this smaller than it looks

**The application is already a Cloudflare Worker.** `worker/index.ts` is written
against the Workers runtime: an `Env` with an `ASSETS` fetcher binding, an
`IMAGES` binding, and `ExecutionContext`. Every build already emits
`dist/server/wrangler.json` naming a Worker `ratify-labs` with its assets
directory bound, and `.wrangler/deploy/config.json` already points at it. The
existing tests invoke `worker.fetch(request, env, ctx)`, which is the Workers
entry signature.

Nothing needs porting. The artifact is being built for Cloudflare today and
deployed somewhere else.

## What changes

| Item | Now | After |
|---|---|---|
| Runtime | OpenAI Sites | Cloudflare Workers |
| Publish | Sites connector, inside a Codex session | `wrangler deploy`, from CI or any operator |
| `labs.ratifyprotocol.com` | CNAME to `custom-domains.chatgpt.site` | Worker custom domain |
| `LABS_ROUTER_TOKEN` | Sites environment | Worker secret |
| `MARITIME_ORIGIN` | Sites environment | Worker var, not a secret |
| Hosting cookie in `PRIVACY.md` | Disclosed, set by the Sites layer | No longer set; the disclosure changes |
| Provider-hostname asset exposure | Accepted limitation (LAB-005) | Does not arise |
| Deployment evidence | Recorded by hand | Emitted by the deploy job |

Files: `.openai/hosting.json` and `build/sites-vite-plugin.ts` become dead and
should be removed in the same change, not left as false signals about where the
site runs.

## The `/maritime` route, and what the origin actually checks

The Worker does not serve Maritime. It proxies a **closed allowlist** of paths
to `MARITIME_ORIGIN`, attaching `X-Ratify-Labs-Route: Bearer <LABS_ROUTER_TOKEN>`
so the origin can refuse anything that did not come through the router.

An earlier draft of this scope said the origin's authorization rules were
unknowable from here and would have to be discovered by testing. That was
wrong. The origin is
`ratify-maritime-reference/apps/demo-console/site/worker/index.ts`, in this
workspace, and its gate is four lines:

```js
const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
const routed = url.hostname === PROVIDER_HOST
  && await hasValidRouteCredential(request, env.LABS_ROUTER_TOKEN);
if (!local && !routed) return new Response("Not found", { status: 404 });
```

`PROVIDER_HOST` is `ratify-maritime-lab.chuksy0x01.chatgpt.site`, and
`hasValidRouteCredential` is a constant-time SHA-256 comparison that also
rejects a header containing a comma, which is how a duplicated header would
arrive.

So the origin requires exactly two things: the request's **Host header must be
the provider hostname**, and the token must match. There is **no IP, ASN, or
other network-identity check**. Confirmed live: that hostname returns 404 with
no token and 404 with a wrong token, while the same path through
`labs.ratifyprotocol.com` returns 200 with `X-Ratify-Labs-Reference: maritime`.

This resolves the migration question in the reassuring direction. The Labs
Worker builds its upstream request with `new Request(target, ...)`, so the Host
header is whatever `MARITIME_ORIGIN` names. A Cloudflare Worker fetching that
same URL sends the same Host and the same token, so the origin cannot tell the
difference and `routed` stays true. Egress shape does not enter into it.

**`MARITIME_ORIGIN` is therefore not a secret.** It is
`https://ratify-maritime-lab.chuksy0x01.chatgpt.site`, fixed by the origin's own
`PROVIDER_HOST` constant and verifiable without any credential. Treating it as
an unknown was an error in the earlier draft.

**`LABS_ROUTER_TOKEN` is the only real secret**, and it is not in either
repository, in any local environment file, or in any `.wrangler` state. It
exists in two places, both of them Sites deployment environments: Labs' and
Maritime's. It has to be read from the Sites console.

### Two consequences worth stating plainly

**Migrating Labs does not remove this product's dependency on Sites.** The
Maritime console is a separate repository with its own Sites project, and after
the migration `/maritime` still terminates there. The Labs catalog would deploy
from CI; the console behind its most important route still would not. That
halves the benefit, and the console is the surface that has already gone stale
once. It deserves its own migration, and this one does not deliver it.

**The token is shared state across two deployments.** The Worker needs the same
value the Maritime origin already expects, so the cutover copies the token
rather than rotating it. Rotating it means changing both sides together, and one
of those sides publishes only from a Sites session. Copy first, migrate, and
treat rotation as its own coordinated change once both ends can be deployed
normally.

## The image route: a defect that already exists, not a new risk

The generated `wrangler.json` has no `images` binding, but `worker/index.ts`
calls `env.IMAGES` for `/_vinext/image`. That looked like a migration risk. It
is not, and the direction is the opposite of what it appeared.

vinext calls `transformImage` inside a `try`, and on failure logs and falls
through to serving the original asset. So `env.IMAGES` being undefined does not
fail the request. It silently degrades it.

Measured against production today:

| Request | Result |
|---|---|
| `/ratify-logo.png` | 200, `image/png`, 16456 bytes |
| `/_vinext/image?...&w=64&q=75` | 200, `image/png`, 16456 bytes |
| the same, `Accept: image/webp` | 200, `image/png`, 16456 bytes |
| the same, `Accept: image/avif`, `w=32` | 200, `image/png`, 16456 bytes |

Byte-identical to the original at every width, quality, and negotiated format.
The optimizer has never transformed an image on this site. It returns the
source, and the `try/catch` is why nothing ever reported it.

This changes two things. It removes the blocker: deploying to Cloudflare without
the binding behaves exactly as production behaves now, so it is not a
regression and does not gate the cutover. And it turns the migration into the
fix, because binding Cloudflare Images is what would make the route do its job
for the first time.

Recommendation: migrate first, then bind Images as a separate change with its
own before-and-after evidence, so the byte counts above become the baseline it
has to beat.

## Scope boundary

"Everything on Cloudflare Workers" is too broad, and stating it loosely would
mislead. Three surfaces are in scope: the Labs catalog, the Maritime console,
and the scenario proxy already running there. The agent and receiver are Docker
workloads on the Maritime platform performing hybrid Ed25519 and ML-DSA-65
operations. They cannot run on Workers and are not part of this.

## The sequence

Reviewed and agreed. The governing constraint is that **the two cutovers are
never combined**, because the console migration and the transport change are
each reversible alone and not reversible together.

| # | Step | Reversible by |
|---|---|---|
| 1 | Merge the verification-only CI change | Revert; nothing is deployed |
| 2 | Deploy Labs to a staging Worker hostname, console untouched | Delete the staging Worker |
| 3 | Test every Labs route, asset, 404, and the `/maritime` proxy directly on staging | Nothing to reverse |
| 4 | Cut Labs production DNS over, existing token path unchanged | CNAME back to Sites |
| 5 | Deploy the console with **both** authentication paths supported | Redeploy the previous console |
| 6 | Test the service binding on a staging Worker | Delete the staging Worker |
| 7 | Cut the console over, after staging and production checks pass | Both paths still work |
| 8 | Remove the public token path in a later cleanup release | Separate, unhurried change |

Step 5 is what makes step 7 safe. The console temporarily accepts the existing
authenticated public path **and** the service binding, so at every moment before
step 8 there is a working fallback. Removing the old path first is what would
make a rollback impossible, which is why it is last and separate.

Step 2 is safe to run alone only if all of the following hold. Any exception
means it is no longer the independent step it appears to be:

- the console is unchanged
- `PROVIDER_HOST` remains the existing console hostname
- `LABS_ROUTER_TOKEN` is copied into the Worker secret exactly
- the `/maritime` path allowlist is unchanged
- deployment verification targets the new Worker hostname directly

## Three requirements that apply to every step

**Staging Workers get unique hostnames, and checks target them directly.** A
post-deploy check that requests `labs.ratifyprotocol.com` is not checking what
was just deployed until DNS has moved. This is the exact shape of the deploy job
removed from PR #4.

**Every check verifies artifact identity, not HTTP status.** A 200 proves
something is serving, not that it is the thing just built. Checks assert Worker
version or a deployment identifier. Without that, a stale deployment produces a
green check, which has already happened twice on this surface.

**The console is versioned independently of the agent and receiver image pins.**
Its repository also builds those images and carries delegation SHA pins under
weekly renewal. A console deploy job must not imply those workloads were
updated, and must not be able to ship a console that disagrees with the pinned
images.

## What to verify on staging, before any DNS change

**Labs, on the staging hostname:**

- `/` and all four reference routes return 200
- content is in the server HTML, not only after hydration
- assets resolve: logo, favicon, `og.jpg`
- OG and canonical metadata are correct and do not name the staging hostname
- an unknown path returns 404

**The `/maritime` proxy, from the staging Worker:**

- `/maritime` returns 200 and renders; `/maritime/_next/static/...` resolves
- a path outside the allowlist, for example `/maritime/api/anything`, returns 404
- `POST /maritime` returns 405
- the response carries `X-Ratify-Labs-Reference: maritime` and no `Set-Cookie`
- with a deliberately wrong token the origin refuses and the Worker returns 502,
  passing nothing through; restore the real token and re-confirm ALLOW
- a non-2xx from the origin becomes 502, and the 10 second timeout fires
- the Host reaching the origin is the provider hostname. A rewritten Host
  produces a 404 that looks exactly like a token failure; distinguish them
  before debugging.

**The service binding, at step 6.** The console receives a request carrying the
Labs hostname, so everything that derives from its own hostname has to be
checked, and each of these fails silently rather than loudly:

- `basePath` resolution
- generated asset URLs
- redirects
- canonical and OpenGraph URLs
- any absolute URL construction

Decide deliberately whether the binding preserves or rewrites Host, rather than
discovering the answer from a broken page.

## Keep the allowlist narrow

The `/maritime` allowlist admits five path shapes and nothing else. A service
binding makes widening it feel harmless. It is not: the allowlist is what keeps
the routed surface a known set rather than whatever the console happens to
expose. A new font, image, or route should require an explicit allowlist change
with its own test, which is the current behaviour and should stay.

## Blockers, and what only a person can do

**`LABS_ROUTER_TOKEN` gates step 2 completely.** It exists only in the two Sites
deployment environments and must be read from the Sites console. If it cannot be
retrieved, step 2 does not proceed. Do not guess it, and do not rotate it
without validating the console side, because rotation is a coordinated change
across both deployments and one of them publishes by hand.

**DNS and custom-domain attachment cannot be automated here.** The available
Cloudflare token has `workers`, `workers_scripts`, and `workers_routes` write,
but `zone` read only. Deploying Workers is scriptable; attaching
`labs.ratifyprotocol.com` is not. Partial automation is acceptable only if the
manual boundary is explicit and the check after cutover verifies the actual
Worker rather than the domain.

## On the image route

The optimizer is dead code, and the route real traffic uses is a redirect.

The catalog's HTML requests `/_next/image`, not `/_vinext/image`. That path
302-redirects to the original file: `/_next/image?url=%2Fratify-logo.png&w=64&q=75`
returns `Location: /ratify-logo.png`, and the followed response is the source PNG
at 16456 bytes. The Worker's `/_vinext/image` branch, which is the only code that
touches the `IMAGES` binding, is referenced by nothing in the built output.

So images today are unoptimized and pay an extra round trip, on both the catalog
and the console. Cloudflare Images is not required to preserve this, because
there is nothing to preserve. Passthrough must never be described as
optimization. The branch should either be wired to a real binding with
before-and-after byte counts, or deleted, and deleting it is the smaller change.

## What does not change

The `PRIVACY.md` note stays as written. An earlier draft of this scope said the
disclosed cookie would stop being set after the migration. That was wrong: the
note already describes it as "Cloudflare's necessary `__cf_bm` cookie", Sites
sits behind Cloudflare, and the cookie is set today and after. No privacy change
follows from this work.

## A hazard both plans share

Assets are content-hashed, so two builds of identical source produce identical
filenames and a request that crosses between stacks still resolves. The Sites
deployment is not identical source: it is stale, which is the reason this work
exists.

During DNS propagation one hostname is answered by both stacks. A visitor can
receive HTML from one and request its assets from the other, and those hashes
will not exist there. The page breaks rather than degrades.

This is not a property of either plan. It applies equally to the staged plan's
Labs cutover and to the parallel pair's single flip, and it was missed in both
reviews. The clean fix is to republish the current commit to Sites before any
cutover, so both stacks share content hashes. That needs a Sites session.
Without it, the window is real and has to be accepted deliberately rather than
discovered.

Related: the build id is a fresh UUID per build, proven by building identical
source twice and getting `4c277bde-bc69-45c6-9536-0932c4cfdedf` then
`55f87b30-78b3-47b1-8f59-b844d6a94910`. Only the build and SSG manifests live
under it and the served HTML does not reference them, so severity is low, but it
should be pinned with `generateBuildId` so builds are reproducible.

## Alternative evaluated: the parallel pair

Build a complete second pair on Workers, leave the Sites pair untouched, and
move the hostname once. Its attraction is that it never needs
`LABS_ROUTER_TOKEN`, which is the blocker that currently stops everything.

What the checks found:

| Question | Answer |
|---|---|
| Service binding configurable | Yes, via `localBindingConfig` in `vite.config.ts`, since the Worker config is generated |
| Console under a binding | `basePath` is path-based and safe; `metadataBase` is hardcoded to the production URL, so canonical and OpenGraph do not derive from Host |
| Token can deploy both and bind them | Yes. Bindings ship with the script upload |
| Token can attach the domain | No. `zone` is read only |
| Artifact identity verifiable | Yes, `wrangler versions list` returns a version id |
| Rollback target stays valid | Yes, while the Sites pair is never modified. It restores stale content |

Two consequences follow. The hardcoded `metadataBase` means **staging cannot
validate canonical or OpenGraph URLs**, because they will claim the production
hostname wherever they run. And the console's `PROVIDER_HOST` check fails under
a binding, because the console now sees the catalog's hostname.

### The failure that would make it unsafe

Deleting the console's host check is what makes the binding elegant, and it is
also what would leave the console unauthenticated. Staging requires a public
route on that Worker, and with the check gone the binding becomes the intended
path rather than the only one.

The fix is not to delete the check. Keep it with `PROVIDER_HOST` set to the
catalog hostname, add a freshly generated token between the two Workers, and
confirm the console carries no public route in production. That is defence in
depth, and it still never reads the old token.

## Decision: the parallel pair, with asset compatibility as a precondition

Settled after a second review round. The parallel pair is preferred, not because
it is more elegant, but because the token it avoids is inaccessible and the
previous deployment survives untouched as a rollback target.

The combined cutover is accepted. The earlier objection to combining cutovers was
grounded in non-symmetric rollback, and that does not apply here: the previous
pair is never modified, the hostname points back to a complete working stack, and
nothing has to be republished to restore service. Moving two surfaces at once is
a real property of this route, and it is acceptable because the fallback is a
whole deployment rather than a code path.

The asset hazard is a **hard precondition**, not a risk to accept. A short broken
window is not acceptable on a public site, and neither low traffic, pinned build
ids, nor pre-warming addresses it, because none of them stops markup from one
deployment requesting names absent from the other.

### The hazard, measured

Across the five catalog pages, the live deployment's markup references 28 unique
asset paths. A fresh build of current source contains 11 of them, all fonts,
which are addressed by a stable content hash. **17 are absent: 15 script chunks
and 2 stylesheets, 444 KB in total.** All 17 return 200 today, so they can be
captured.

That is the exact size of the problem. During propagation a visitor holding the
old markup and reaching the new deployment would fail on 17 files including both
stylesheets, which is a broken page rather than a degraded one.

An earlier count in this investigation said 23 missing, six of which appeared to
be missing from the live site itself. That was a measurement error: the crawl
matched the routed reference's asset prefix and dropped it, so six of the
reference's own assets were attributed to the catalog. The live site is serving
them correctly. The corrected figure is 17.

### Two acceptable fixes

1. **Republish the previous deployment from current source** before cutover, so
   both sides share content hashes. Needs a session on the existing host.
2. **Carry both generations in the new deployment.** Include the 17 captured
   files alongside the new build, or proxy unrecognized historical asset paths to
   the previous origin for a bounded window.

Option 2 is self-contained, needs no session on the old host, and is bounded at
444 KB. It is the route to take if a republish is not available. Whichever is
chosen, the four combinations are tested explicitly: old markup with new assets,
new markup with old assets, and each generation with its own.

If neither is in place, the cutover does not happen.

### On the routed surface's authentication

State it accurately. Once the binding exists and the receiving surface carries no
public route, **the binding is the access control**. An external caller cannot
reach it by forging a Host header, because routing happens before the code does.
The retained host check and the fresh credential are compatibility and
defence in depth. They are not what makes it safe, and should never be described
as though they are.

The binding path should construct the internal request URL explicitly rather than
forwarding whatever arrives, and a test must assert which hostname the receiving
surface actually sees.

### Sequence

1. Build both Workers from the same commit.
2. Deploy both to staging hostnames.
3. Verify the binding, routes, metadata, assets, and the routed reference.
4. Add old-asset compatibility, or republish the previous build.
5. Test mixed-deployment requests across all four combinations.
6. One DNS cutover.
7. Keep the previous pair intact through an observation window.
8. Remove legacy authentication and the optimizer branch in later, separate
   changes.

Step 8 stays separate. The optimizer branch is not on the deployed path, so
removing it is cleanup rather than migration, and it needs its own build, route
check, and a note recording that image handling is passthrough.

## Recommendation

Superseded by the decision above, and kept for the reasoning that led there.

Two routes were on the table.

The staged plan is agreed and safe, and is blocked on a token that can only be
read from a Sites session. The parallel pair is not blocked, keeps production
untouched until one reversible flip, and rolls back by hostname rather than by
republishing something that publishes by hand. It moves two surfaces at once,
which is the objection it has to answer directly.

Whichever is chosen, the shared asset hazard above is a precondition, not a
detail.

The paragraph below states the case for the staged plan as originally agreed.

Proceed, in the eight steps above, and do not combine the cutovers. The goal is
CI-driven Workers deployment reached by a reversible, staged transition, not the
shortest path to the tidiest architecture.

The service binding is genuinely better than the token proxy: it deletes a
shared secret, a hostname coupling, and roughly twenty lines of hand-rolled
comparison, and it removes the console's public hostname. That is the
destination. It is not a reason to arrive in one move, and step 8 is where the
deletion belongs.
