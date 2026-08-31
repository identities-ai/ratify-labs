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

## Verification, in order

Nothing below moves DNS until the step before it has passed.

**0. Check the Worker configuration before deploying anything.** The
`wrangler.json` is generated on every build, so it is worth reading rather than
assuming: Worker name, `compatibility_date`, `nodejs_compat`, and the `ASSETS`
directory binding. Set the staging hostname explicitly rather than inheriting a
default.

**1. Deploy to a temporary hostname.** `wrangler deploy` to
`ratify-labs.<subdomain>.workers.dev` with the real secrets set. Set
`LABS_ROUTER_TOKEN` with `wrangler secret put`, so it is never committed, never
placed in `wrangler.json` `vars`, and never echoed by a workflow step.
`MARITIME_ORIGIN` is a plain var and can live in configuration.

**2. Verify the site on that hostname**, not on the production domain:

- `/` and all four reference routes return 200
- content is present in the server HTML, not only after hydration
- static assets resolve: logo, favicon, `og.jpg`
- OG and canonical metadata are correct and do not name the staging hostname
- an unknown path returns 404

**3. Exercise `/maritime` against the real origin, from the new host.** This is
the step that settles the network-path questions:

- `/maritime` returns 200 and renders the console
- `/maritime/_next/static/...` resolves
- a path outside the allowlist, for example `/maritime/api/anything`, returns 404
- a `POST /maritime` returns 405
- the response carries `X-Ratify-Labs-Reference: maritime` and no `Set-Cookie`
- **token failure is observable**: with a deliberately wrong `LABS_ROUTER_TOKEN`,
  the origin refuses and the Worker returns 502 rather than passing anything
  through. Restore the real token afterwards and re-confirm ALLOW.
- **non-2xx and timeout behave as written**: any non-2xx from the origin becomes
  a 502, and the 10 second `AbortSignal.timeout` fires rather than hanging.
- **the Host header reaches the origin as the provider hostname.** This is the
  origin's other gate, and a proxy or redirect that rewrote Host would produce a
  404 that looks like a token failure. Distinguish the two before debugging.

**4. Run the boundary tests against the deployed Worker**, not only in-process.
`tests/rendered-html.test.mjs` already covers the provider hostname rejection
and the read-only path allowlist; point them at the real deployment.

**5. Compare the two hosts byte for byte.** The same routes on
`labs.ratifyprotocol.com` and the staging hostname should differ only in
host-specific headers. A diff is cheaper than an opinion about whether anything
changed.

**6. Move DNS**, with the Sites deployment left in place and unchanged.

**7. Confirm the domain actually resolves to the Worker before smoke-testing
it.** This is the one trap that would waste the whole exercise: until the custom
domain is attached and DNS has propagated, every request to
`labs.ratifyprotocol.com` is still answered by Sites, so a green smoke test
proves nothing about the Worker. Check the resolution and a Worker-specific
response header first, then re-run steps 2 through 4 against the custom domain.

**8. Test the rollback once, deliberately**, rather than trusting that it works.
Repoint the CNAME back to Sites, confirm the site still serves, then repoint
forward again. A rollback that has never been executed is a plan, not a
rollback.

**9. Record the evidence `LAB-014` requires**: catalog revision, Worker version,
routed reference revision, and the live allow and deny observations.

**10. Only then remove the Sites artifacts** and update `PRIVACY.md`, since the
cookie it discloses will no longer be set.

## How this splits into pull requests

Three changes, kept separate so that a problem in one does not hold the others.

| PR | Contains |
|---|---|
| **Verification** (#4) | CI that verifies every change. No deployment. |
| **Migration** | Worker deployment, secrets, staging validation, DNS cutover, rollback, and the deploy job reintroduced. |
| **Labs content** | Catalog and reference changes, independent of hosting. |

## PR #4 has to change before it merges

PR #4 adds CI to a repository that had none, and its verify job is right and
should land. Its deploy job is wrong against today's hosting, in a way that
would produce a green check for a deploy that changed nothing.

`npx wrangler deploy` would create a `ratify-labs` Worker on whichever account
the credentials belong to. Nothing routes to it, because the domain still
resolves to Sites. The job's own confirmation step then curls
`labs.ratifyprotocol.com` and gets 200 from the Sites deployment it did not
touch, and reports success.

That is the same false-green shape this pipeline was written to eliminate. The
deploy job should be removed from PR #4 and reintroduced with the migration,
once there is a Worker the domain actually resolves to. Merging verify alone
still fixes the problem that prompted the pull request: three merges reaching
main with no checks.

## Rollback

Repoint the CNAME. The Sites deployment is untouched throughout, so rollback is
a DNS change and not a redeploy, and step 8 executes it once rather than
assuming it works. This is the reason step 7 is last: removing
`.openai/hosting.json` before the new host has proven itself would make the
rollback a code change under time pressure.

## What this needs from someone else

- `LABS_ROUTER_TOKEN`, read from the Sites deployment environment. This is the
  only blocking unknown. `MARITIME_ORIGIN` is already known.
- A Cloudflare account decision: the account holding `ratify-marketing`,
  `ratify-web`, and `ratify-maritime-demo-proxy` is the obvious home, and would
  put the whole product on one account.
Nothing else. The question about the origin requiring a network identity is
answered above, from its source and confirmed live.

## Recommendation

Worth doing, and smaller than it appears because the artifact is already a
Worker. The strongest argument is not effort: it is that every other public
surface in this product already deploys from Cloudflare with credentials that
exist, and this one cannot deploy from CI at all. A catalog that can only be
published by one tool in one kind of session will go stale again.

The honest counterweight is that `/maritime` is a working, evidenced boundary
and this touches its network path. That is what the staged verification is for,
and none of it requires a DNS change to learn the answer.
