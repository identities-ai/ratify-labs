# Ratify Labs deployment evidence

Date: 2026-08-24

## Catalog

- Public repository: `https://github.com/identities-ai/ratify-labs`
- Deployed catalog revision: `ff787dd8639062aa81f2285799a06332bb095025`
- Hosting version: 7
- Public root: `https://labs.ratifyprotocol.com/`
- Custom-domain, provider, and TLS states: active
- Catalog provider document route: HTTP 404
- Production dependency audit: 0 vulnerabilities
- Catalog tests: 3 passed; type check and lint passed

## Maritime route

- Stable route: `https://labs.ratifyprotocol.com/maritime`
- Routed reference revision: `6b9adf5`
- Reference hosting version: 9
- Reference provider document route: HTTP 404 without the server-held route credential
- Route assets resolve beneath `/maritime/_next/`
- Root and routed reference: HTTP 200
- Maritime repository gate: 72 passed with warnings treated as errors
- Agent image: `ghcr.io/identities-ai/ratify-maritime-agent@sha256:8288f4d24ada03281eec88bfab05d2e3b7552e36890a7b5a32c45c21b44f8c85`
- Agent image source revision: `f4d4b00ef4e81e8acc5fca9124da55267c69c544`
- Scenario proxy Cloudflare version: `b5aae58b-b593-49ad-8994-91537f642c74`
- Scenario proxy tests: 31 passed; type check and dry-run bundle passed

## Live smoke

The final sequence used the public console origin and the reviewed scenario
proxy:

- missing or foreign origin: HTTP 403 before rate limiting or agent contact
- `over_limit`: `DENY`, `DENY_LIMIT_EXCEEDED`, shared receiver handler count 9,
  requested amount 50,100 minor units, bound 50,000 minor units, USD
- `allow`: `ALLOW`, shared receiver handler count 10, requested amount 42,000
  minor units, bound 50,000 minor units, USD

The unchanged handler count on denial followed by a one-step increase on allow
shows that the denied request did not enter the protected handler.

Both document routes return the reviewed anti-framing, HSTS, content-type, and
referrer-policy headers. Both favicons and the Maritime-specific social card
return HTTP 200. The catalog and Maritime provider document routes return HTTP
404, as do the unregistered static-directory and image-optimizer paths.

The Sites hosting layer also serves byte-identical public static assets from
its provider hostnames before application routing. Those assets contain no
credentials, proof material, private identifiers, or execution capability.
Provider-host document and execution routes remain closed.

The catalog routes only the registered Maritime read path. It strips browser
cookies, authorization, and any caller-supplied route credential, supplies its
own secret from hosting configuration, and returns fixed responses for origin
failure.

The repository commits that record this evidence and license documentation are
evidence-only successors. They do not change the deployed bundles identified
by the catalog and routed reference revisions above.

## Prior preflight closure

- Labs revision `7ef6dcd` replaced the Maritime prefix proxy with an explicit
  allowlist for the page, owned public assets, image endpoint, and static build
  assets. `/maritime/not-registered` now returns a local 404 without the origin
  marker, while required static assets return 200.
- Maritime revision `1539b2d` served its logo from
  `/maritime/ratify-logo.png`, removing accidental catalog-asset coupling.
- `docs/PRIVACY.md` records the hosting layer's necessary `__cf_bm` cookie and
  distinguishes it from application sessions and origin-visible state.
