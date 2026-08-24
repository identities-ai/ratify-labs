# Ratify Labs deployment evidence

Date: 2026-08-24

## Catalog

- Public repository: `https://github.com/identities-ai/ratify-labs`
- Deployed catalog revision: `a789476125625a3b368adaa26dd324860cd137b1`
- Hosting version: 2
- Public root: `https://labs.ratifyprotocol.com/`
- Custom-domain, provider, and TLS states: active
- Catalog provider hostname: HTTP 404
- Production dependency audit: 0 vulnerabilities
- Catalog tests: 3 passed; type check and lint passed

## Maritime route

- Stable route: `https://labs.ratifyprotocol.com/maritime`
- Routed reference revision: `8f0e2f9c468a68dddb81cbba2a99e91b844661d4`
- Reference hosting version: 4
- Reference provider hostname: HTTP 404 without the server-held route credential
- Route assets resolve beneath `/maritime/_next/`
- Root and routed reference: HTTP 200
- Maritime repository gate: 72 passed with warnings treated as errors

## Live smoke

The final sequence used the public console origin and the reviewed scenario
proxy:

- `over_limit`: `DENY`, `DENY_LIMIT_EXCEEDED`, shared receiver handler count 5
- `allow`: `ALLOW`, shared receiver handler count 6

The unchanged handler count on denial followed by a one-step increase on allow
shows that the denied request did not enter the protected handler.

The catalog routes only the registered Maritime read path. It strips browser
cookies, authorization, and any caller-supplied route credential, supplies its
own secret from hosting configuration, and returns fixed responses for origin
failure.

## Internal preflight closure

- Labs revision `7ef6dcd` replaces the Maritime prefix proxy with an explicit
  allowlist for the page, owned public assets, image endpoint, and static build
  assets. `/maritime/not-registered` now returns a local 404 without the origin
  marker, while required static assets return 200.
- Maritime revision `1539b2d` serves its logo from
  `/maritime/ratify-logo.png`, removing accidental catalog-asset coupling.
- `docs/PRIVACY.md` records the hosting layer's necessary `__cf_bm` cookie and
  distinguishes it from application sessions and origin-visible state.
