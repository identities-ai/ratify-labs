# Ratify Labs

The public catalog and routing boundary for executable Ratify references at
[labs.ratifyprotocol.com](https://labs.ratifyprotocol.com).

Licensed under Apache-2.0.

Ratify Labs makes authority-aware agent systems tangible: each live entry is a
public implementation with a working path, explicit bounds, inspectable source,
and independently recorded evidence. The catalog is not Ratify Verify and does
not imply endorsement by any referenced platform.

## What this repository contains

This repository contains the shared Labs homepage, visual system, closed route
registry, and privacy-preserving router. It does not contain the agent,
receiver, proof flow, deployment images, or adversarial test suite for each
reference. Those live in the reference's own public repository.

The main Ratify website's `/labs` URL is only an entry point. The canonical
catalog and all live lab routes are under `labs.ratifyprotocol.com`.

## Published references

| Lab | Run it | Implementation source |
|---|---|---|
| Maritime × Ratify | [Live lab](https://labs.ratifyprotocol.com/maritime) | [`identities-ai/ratify-maritime-reference`](https://github.com/identities-ai/ratify-maritime-reference) |

The Maritime repository contains the LangChain agent, separately deployed MCP
receiver, Ratify boundary implementation, Dockerfiles, issuance tooling,
Cloudflare scenario proxy, console source, tests, threat model, and deployment
evidence. This catalog repository only makes that independently deployed lab
discoverable at its stable Ratify Labs URL.

## Local development

```bash
npm install
npm test
```

Local routing requires `MARITIME_ORIGIN` and `LABS_ROUTER_TOKEN` in an ignored
`.env` file. Production values are managed as hosting secrets and environment
configuration; they never enter source control.

Read [`docs/PRODUCT-REQUIREMENTS.md`](docs/PRODUCT-REQUIREMENTS.md) before
adding a catalog entry or route.

See [`docs/PRIVACY.md`](docs/PRIVACY.md) for the application boundary and the
hosting layer's necessary abuse-prevention cookie.
