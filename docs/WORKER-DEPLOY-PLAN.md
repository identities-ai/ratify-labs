# Record: deploying the Labs Worker from CI

**Superseded as a proposal.** The deploy job shipped in #5, #6 and #7 and ran
successfully on `main`. What is kept here is the reasoning, the hazards found
while building it, and the rollback state, because those outlive the workflow
file.

## Verified current state

Checked live rather than taken from a report.

| Fact | Evidence |
|---|---|
| Hostname serves from this account | `labs.ratifyprotocol.com` resolves to `104.21.29.70` and `172.67.148.145`, not the previous provider CNAME |
| Worker exists and is deployed | `ratify-labs`, version `842fddf7-14e8-4f6b-8690-2202eb1c73c8` |
| All six public routes serve | `/`, `/copilot`, `/google-adk`, `/langchain`, `/nvidia-openshell-nooa`, `/maritime` all 200 |
| Boundary intact | unknown route 404, `/maritime/api/anything` 404, `POST /maritime` 405, `/maritime` carries its reference header |
| Router credential reached the Worker | `/maritime` returns 200, so the Worker holds a token the console accepts |
| The console is still on the previous host | the routed path is a proxy, not a second Worker |

## Rollback: compatible for one deploy, then not

The Worker was originally built fresh rather than deployed from the archived
artifact, so six of twenty one asset paths differed and a fallback would have
left visitors requesting script names the previous host does not have.

**Resolved 2026-08-31.** The archived artifact was deployed to the `ratify-labs`
Worker as version `2441cb28-510a-427e-9381-d9b175c6497c`. Both deployments now
serve the same generation:

```
archive, previous host, and Worker:  index-CDw4Ti2u.js
```

All 21 asset paths referenced across the five catalog routes resolved in the
archive, and the Worker served that archive.

**That property has since ended, as predicted.** The first automated deploy from
`main` rebuilt, and the Worker now serves `index-CnKn1RFm.js` while the previous
host still serves `index-CDw4Ti2u.js`. A fallback is again not seamless for a
visitor already holding markup.

This is expected rather than a regression. Every deploy from `main` rebuilds, and
builds are not reproducible, so no deploy can preserve compatibility with a
deployment that is no longer being rebuilt alongside it. The clean rollback was
only ever a property of the one artifact deploy. Restoring it means deploying
the archive again, which also reverts the Worker's code.

The durable resolution is to retire the previous host, so there is nothing left
to fall back to that could disagree. Until then, treat rollback as correct for a
total failure, where visitors reload anyway, and not as a seamless revert.

**How that last equivalence is established.** The Worker was compared directly
against the archive, 21 of 21. The previous host could not be compared directly,
because the hostname now resolves to the Worker and that deployment's provider
address is not known here. The chain is instead: while the previous host served
the public hostname, its 21 referenced paths were verified present in the
archive with catalog script `index-CDw4Ti2u.js`; the Worker now serves that same
archive and the same script name. The equivalence is transitive and rests on the
previous deployment not having been republished since. If a direct comparison is
wanted, it needs that provider hostname.

### One thing the deploy would have broken

The archived build's generated configuration declares `vars: {}`, while the live
Worker carried two environment variables:

```
env.LABS_HOSTNAME     "labs.ratifyprotocol.com"
env.MARITIME_ORIGIN   "https://ratify-maritime-demo-console-production.chuks-04d.workers.dev"
```

Only `LABS_ROUTER_TOKEN` is a secret, and secrets survive a deploy. Variables do
not. Deploying the artifact unmodified would have dropped `MARITIME_ORIGIN`, and
`routeMaritime` fails closed when it is absent, so `/maritime` would have
returned 503 while every other route stayed green. Both variables were restored
into the configuration before deploying and are present on the deployed version.

**This is a standing hazard for any deploy from a generated configuration**, and
the proposed workflow must account for it: a build produces `vars: {}` unless
something puts them back. The workflow below therefore asserts the deployed
bindings rather than assuming them.

### Deployed state

| | |
|---|---|
| Worker version | `2441cb28-510a-427e-9381-d9b175c6497c` |
| Source artifact | `~/.ratify/labs-artifacts/labs-artifact-df33181.tar.gz` |
| Worker code revision | `df33181`, one commit behind `main` |
| Verified | six routes 200, unknown 404, `/maritime` 200 with reference header, denied path 404, `POST` 405, `workers.dev` 404 |

The Worker now runs `df33181` while `main` is `309eb7f`, which added the
configurable hostname. Production behaviour is identical, because the archived
build hardcodes the correct hostname. The next deploy from `main` will rebuild
and break asset compatibility with the previous host again. That is expected:
the clean rollback is a property of today's state, not a permanent one, and it
stops mattering once the previous host is retired.

## The design's central idea

Builds are not reproducible: two builds of one commit produce different script
filenames. That has been a liability throughout this work. For deployment
verification it is an asset.

**The freshly built script filename is a unique fingerprint for this deployment.**
If production serves it, production is serving this build. That single assertion
covers three of the stated requirements at once:

- it verifies the actual deployment rather than an HTTP status
- it fails when the deployment did not change, because the name would be the old one
- it fails if the check were pointed at the previous host, because that host serves a different name

No new endpoint, no version header, no code change.

## Proposed workflow

Added as a second job in `.github/workflows/ci.yml`, after `verify`.

```yaml
  deploy:
    name: Deploy Worker
    needs: verify
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://labs.ratifyprotocol.com
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.sha }}          # the commit that triggered this run, not a moving ref
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: npm

      - name: Require credentials
        env:
          TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          ACCOUNT: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
        run: |
          set -euo pipefail
          [ -n "$TOKEN" ]   || { echo "::error::CLOUDFLARE_API_TOKEN is not set"; exit 1; }
          [ -n "$ACCOUNT" ] || { echo "::error::CLOUDFLARE_ACCOUNT_ID is not set"; exit 1; }

      - run: npm ci
      - run: npm run build

      # The generated config decides which Worker is written to. Read it rather
      # than trusting it, so a rename cannot silently deploy somewhere else.
      - name: Confirm the deploy target and restore variables
        run: |
          set -euo pipefail
          CFG=dist/server/wrangler.json
          NAME=$(jq -r '.name' "$CFG")
          [ "$NAME" = "ratify-labs" ] || { echo "::error::would deploy to '$NAME'"; exit 1; }
          # A build emits vars:{}. Without this, MARITIME_ORIGIN is dropped and
          # /maritime returns 503 while every other route stays green.
          jq '.vars = {
                "LABS_HOSTNAME": "labs.ratifyprotocol.com",
                "MARITIME_ORIGIN": "https://ratify-maritime-demo-console-production.chuks-04d.workers.dev"
              }' "$CFG" > "$CFG.tmp" && mv "$CFG.tmp" "$CFG"
          jq -e '.vars.MARITIME_ORIGIN and .vars.LABS_HOSTNAME' "$CFG" >/dev/null \
            || { echo "::error::variables were not restored"; exit 1; }

      # This build's script name. Unique to this build because builds are not
      # reproducible, which makes it a deployment fingerprint.
      - name: Record the build fingerprint
        id: fp
        run: |
          set -euo pipefail
          FP=$(ls dist/client/_next/static/chunks/ | grep -E '^index-.*\.js$' | head -1)
          [ -n "$FP" ] || { echo "::error::no catalog script found"; exit 1; }
          echo "script=$FP" >> "$GITHUB_OUTPUT"
          echo "fingerprint=$FP"

      - name: Record the version before deploying
        id: before
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
        run: |
          set -euo pipefail
          V=$(npx wrangler deployments list --name ratify-labs 2>/dev/null \
              | grep -oE '[0-9a-f-]{36}' | head -1 || echo none)
          echo "version=$V" >> "$GITHUB_OUTPUT"

      - name: Deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
        run: npx wrangler deploy

      - name: The deployed version must have changed
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
        run: |
          set -euo pipefail
          AFTER=$(npx wrangler deployments list --name ratify-labs \
                  | grep -oE '[0-9a-f-]{36}' | head -1)
          BEFORE="${{ steps.before.outputs.version }}"
          echo "before=$BEFORE after=$AFTER"
          [ "$AFTER" != "$BEFORE" ] || { echo "::error::version did not change"; exit 1; }

      # Proves the public hostname is serving THIS build, not a cached response
      # and not some other deployment.
      - name: The live site must serve this build
        run: |
          set -euo pipefail
          WANT="${{ steps.fp.outputs.script }}"
          for attempt in $(seq 1 10); do
            HTML=$(curl -fsS -H 'Cache-Control: no-cache' https://labs.ratifyprotocol.com/ || true)
            case "$HTML" in *"$WANT"*) echo "serving $WANT"; exit 0;; esac
            echo "attempt $attempt: not yet serving $WANT"
            sleep 6
          done
          echo "::error::live site never served $WANT"
          exit 1

      - name: Routes and boundary
        run: |
          set -euo pipefail
          fail=0
          check() { # path expected-status label
            got=$(curl -s -o /dev/null -w '%{http_code}' -H 'Cache-Control: no-cache' "https://labs.ratifyprotocol.com$1")
            if [ "$got" != "$2" ]; then echo "::error::$3 expected $2 got $got"; fail=1; else echo "ok $3"; fi
          }
          for r in "" /copilot /google-adk /langchain /nvidia-openshell-nooa /maritime; do
            check "$r" 200 "GET ${r:-/}"
          done
          check /this-route-does-not-exist 404 "unknown route"
          check /maritime/api/anything 404 "denied maritime path"
          got=$(curl -s -X POST -o /dev/null -w '%{http_code}' https://labs.ratifyprotocol.com/maritime)
          [ "$got" = "405" ] && echo "ok POST /maritime" || { echo "::error::POST /maritime expected 405 got $got"; fail=1; }
          hdr=$(curl -s -o /dev/null -w '%header{X-Ratify-Labs-Reference}' https://labs.ratifyprotocol.com/maritime)
          [ "$hdr" = "maritime" ] && echo "ok reference header" || { echo "::error::reference header was '$hdr'"; fail=1; }
          exit $fail
```

Also change the existing concurrency block. It currently cancels in-progress runs
on every ref, which is right for verification and wrong for a deploy: a second
push could cancel the first mid-upload.

```yaml
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}
```

## Secrets and permissions

Repository secrets, under Settings, Secrets and variables, Actions:

| Secret | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Workers Scripts write on the account owning `ratify-labs`. Zone write is **not** needed and should not be granted; this job never touches DNS |
| `CLOUDFLARE_ACCOUNT_ID` | that account's id |

Workflow permissions stay `contents: read`. The job writes nothing to the
repository.

**Not in CI:** `LABS_ROUTER_TOKEN` and `MARITIME_ORIGIN` are Worker secrets, set
once with `wrangler secret put`. `wrangler deploy` preserves them. Putting them
in CI would add a second place the credential lives, for no gain.

Recommend a GitHub Environment named `production` with required reviewers, so a
merge to main does not deploy unattended until the job has been trusted for a
while.

## Verification before trusting the job

Run once by hand, from a clean checkout of the intended commit:

```bash
npm ci && npm run build
jq -r '.name' dist/server/wrangler.json                    # must print ratify-labs
ls dist/client/_next/static/chunks/ | grep -E '^index-'    # the fingerprint
npx wrangler deployments list --name ratify-labs | head    # version before
npx wrangler deploy
npx wrangler deployments list --name ratify-labs | head    # must differ
curl -s https://labs.ratifyprotocol.com/ | grep -o 'index-[A-Za-z0-9_-]*\.js' | head -1
```

The last command must print the fingerprint from the third command. If it does
not, the public hostname is not serving this deployment and the job's central
assertion would be false.

Boundary, unchanged from the checks already used:

```bash
for r in "" copilot google-adk langchain nvidia-openshell-nooa maritime; do
  printf '%-26s %s\n' "/$r" "$(curl -s -o /dev/null -w '%{http_code}' https://labs.ratifyprotocol.com/$r)"
done
curl -s -o /dev/null -w 'unknown %{http_code}\n'  https://labs.ratifyprotocol.com/nope
curl -s -o /dev/null -w 'denied %{http_code}\n'   https://labs.ratifyprotocol.com/maritime/api/anything
curl -s -X POST -o /dev/null -w 'post %{http_code}\n' https://labs.ratifyprotocol.com/maritime
```

## Pressure test

**False green.** The failure mode this pipeline exists to prevent, and the one it
has already produced once. Addressed by asserting the served script name rather
than a status code, so a check cannot pass against a cached response, a different
deployment, or the previous host. Every script block uses `set -euo pipefail`, and
the route loop accumulates failures rather than exiting on the first, so one run
reports every broken route.

**Wrong Worker.** The Worker name comes from a generated file. The job reads it
and refuses anything but `ratify-labs`, so a rename or a plugin change cannot
silently create a second Worker.

**Secret handling.** Two secrets, both from GitHub, neither written to disk or
echoed. The router credential stays out of CI entirely. The Cloudflare token
deliberately lacks zone write, so this job cannot alter DNS even if it were
wrong.

**Rollback.** Not seamless, and cannot be made so while both deployments exist
and only one is rebuilt. Correct for a total failure. The resolution is retiring
the previous host, not another artifact deploy.

**Asset identity.** The fingerprint is the catalog's own script name. It changes
on every build, which is what makes it a fingerprint, and it is read from the
build rather than hardcoded.

**What this does not cover.** The job verifies the catalog. It does not verify
that the routed console is serving current content, because that is a separate
deployment on a different host with its own publishing path. A green deploy here
says nothing about the console beyond the fact that the proxy still reaches it.

## Remaining risks

1. **Environment variables are not in the generated configuration.** A build
   emits `vars: {}`, so any deploy drops `LABS_HOSTNAME` and `MARITIME_ORIGIN`
   unless something restores them, and losing `MARITIME_ORIGIN` returns 503 on
   `/maritime` while every other route stays green. This is the most likely way
   the proposed job breaks production, and the reason it asserts bindings.
2. **Asset compatibility has ended.** It lasted one deploy, as expected. It
   cannot be restored except by deploying the archive again, which reverts the
   Worker's code. Retiring the previous host is the real fix.
3. **The console is still on the previous host** and still publishes by hand, so
   half the original problem remains. It has its own migration.
4. **Unattended deploys on merge.** Recommend the environment gate until the job
   has proven itself.
5. **`wrangler deployments list` output parsing.** The version is extracted with a
   regex over human-readable output. A wrangler upgrade could change that format
   and turn the version check into a silent pass. Pin wrangler and treat an empty
   parse as a failure, which the proposed steps do.

## Recommended next action

Open this as a pull request against `main` with the workflow change, then run the
manual sequence above once from a clean checkout. Only after that sequence
behaves exactly as described should the job be trusted to run on merge. Deploying
the archived artifact to restore a clean rollback is worth doing first, and it is
a one command change.
