# Ratify Labs

Shared public catalog and routing boundary for executable Ratify references.

Ratify Labs makes authority-aware agent systems tangible: each live entry is a
public implementation with a working path, explicit bounds, inspectable source,
and independently recorded evidence. The catalog is not Ratify Verify and does
not imply endorsement by any referenced platform.

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
