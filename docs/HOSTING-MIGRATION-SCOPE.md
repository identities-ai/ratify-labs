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
| `MARITIME_ORIGIN`, `LABS_ROUTER_TOKEN` | Sites environment | Worker secrets |
| Hosting cookie in `PRIVACY.md` | Disclosed, set by the Sites layer | No longer set; the disclosure changes |
| Provider-hostname asset exposure | Accepted limitation (LAB-005) | Does not arise |
| Deployment evidence | Recorded by hand | Emitted by the deploy job |

Files: `.openai/hosting.json` and `build/sites-vite-plugin.ts` become dead and
should be removed in the same change, not left as false signals about where the
site runs.

## The `/maritime` route, which is the delicate part

The Worker does not serve Maritime. It proxies a **closed allowlist** of paths
to `MARITIME_ORIGIN`, attaching `X-Ratify-Labs-Route: Bearer <LABS_ROUTER_TOKEN>`
so the origin can refuse anything that did not come through the router. Anything
outside the allowlist returns 404, and the origin's own document route is meant
to fail closed on direct access.

**The risk is not the proxy code.** That code is unchanged by the move; it
already runs on Workers. The risk is in three things around it:

1. **The secrets are unknown to this workspace.** `LABS_ROUTER_TOKEN` must be
   byte-identical to what the Maritime origin expects. Deploying with a wrong or
   absent token yields a 503 from the router, or a 502 once the origin refuses.
   Whoever holds the Sites environment has to supply both values.
2. **The origin may authorise on more than the token.** If the Maritime side
   also restricts by source IP, ASN, or a Cloudflare-specific attribute of the
   current caller, a Worker calling from a different egress could be refused
   even with the correct token. Nothing in this repository can answer that; it
   lives in the Maritime deployment.
3. **Egress shape changes.** Today the caller is the Sites runtime. After the
   move it is a Cloudflare Worker, so timeouts, retry behaviour, and TLS
   fingerprint differ. The 10-second `AbortSignal.timeout` and the 502 on any
   non-2xx are unchanged, but they will be exercised against a different network
   path.

**This is why the cutover is staged rather than switched.** Every one of these
is answerable before DNS moves, by deploying to a `workers.dev` hostname and
exercising `/maritime` there.

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
`MARITIME_ORIGIN` and `LABS_ROUTER_TOKEN` with `wrangler secret put`, so they
are never committed, never placed in `wrangler.json` `vars`, and never echoed by
a workflow step.

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
- **the origin does not additionally require a network identity.** If the
  Maritime side also restricts by IP, ASN, or another attribute of the caller,
  a correct token is not sufficient and this is where it surfaces.

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

- `MARITIME_ORIGIN` and `LABS_ROUTER_TOKEN`, from whoever holds the Sites
  environment.
- A Cloudflare account decision: the account holding `ratify-marketing`,
  `ratify-web`, and `ratify-maritime-demo-proxy` is the obvious home, and would
  put the whole product on one account.
- Confirmation from the Maritime side that its router-token check does not also
  depend on the caller's network identity.

## Recommendation

Worth doing, and smaller than it appears because the artifact is already a
Worker. The strongest argument is not effort: it is that every other public
surface in this product already deploys from Cloudflare with credentials that
exist, and this one cannot deploy from CI at all. A catalog that can only be
published by one tool in one kind of session will go stale again.

The honest counterweight is that `/maritime` is a working, evidenced boundary
and this touches its network path. That is what the staged verification is for,
and none of it requires a DNS change to learn the answer.
