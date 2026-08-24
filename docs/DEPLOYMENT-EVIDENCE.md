# Ratify Labs deployment evidence

Date: 2026-08-24

## Catalog

- Public repository: `https://github.com/identities-ai/ratify-labs`
- Deployed catalog revision: `408f78a0d85d1ec683f5f3364135e0ea365c712b`
- Hosting version: 4
- Public root: `https://labs.ratifyprotocol.com/`
- Custom-domain, provider, and TLS states: active
- Catalog provider hostname: HTTP 404
- Production dependency audit: 0 vulnerabilities
- Catalog tests: 3 passed; type check and lint passed

## Maritime route

- Stable route: `https://labs.ratifyprotocol.com/maritime`
- Routed reference revision: `2c2f62e`
- Reference hosting version: 7
- Reference provider hostname: HTTP 404 without the server-held route credential
- Route assets resolve beneath `/maritime/_next/`
- Root and routed reference: HTTP 200
- Maritime repository gate: 72 passed with warnings treated as errors
- Scenario proxy Cloudflare version: `d4000e40-b65c-4007-88b5-37a1cb41cb45`
- Scenario proxy tests: 30 passed; type check and dry-run bundle passed

## Live smoke

The final sequence used the public console origin and the reviewed scenario
proxy:

- missing or foreign origin: HTTP 403 before rate limiting or agent contact
- `over_limit`: `DENY`, `DENY_LIMIT_EXCEEDED`, shared receiver handler count 7,
  requested amount 50,100 minor units, bound 50,000 minor units, USD
- `allow`: `ALLOW`, shared receiver handler count 8, requested amount 42,000
  minor units, bound 50,000 minor units, USD

The unchanged handler count on denial followed by a one-step increase on allow
shows that the denied request did not enter the protected handler.

Both document routes return the reviewed anti-framing, HSTS, content-type, and
referrer-policy headers. Both favicons and the Maritime-specific social card
return HTTP 200. The catalog and Maritime provider hostnames return HTTP 404,
as do the unregistered static-directory and image-optimizer paths.

The catalog routes only the registered Maritime read path. It strips browser
cookies, authorization, and any caller-supplied route credential, supplies its
own secret from hosting configuration, and returns fixed responses for origin
failure.

## Prior preflight closure

- Labs revision `7ef6dcd` replaced the Maritime prefix proxy with an explicit
  allowlist for the page, owned public assets, image endpoint, and static build
  assets. `/maritime/not-registered` now returns a local 404 without the origin
  marker, while required static assets return 200.
- Maritime revision `1539b2d` served its logo from
  `/maritime/ratify-logo.png`, removing accidental catalog-asset coupling.
- `docs/PRIVACY.md` records the hosting layer's necessary `__cf_bm` cookie and
  distinguishes it from application sessions and origin-visible state.
