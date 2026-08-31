# Proposal: deploying the Labs Worker from CI

Not implemented. This is a design for review. No workflow file is added by this
change, and nothing here deploys.

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

## One correction to the handover

**The deployed Worker is not the archived artifact.** The archive was captured so
both deployments would serve identical filenames. The Worker was built fresh
instead, and six of twenty one asset paths differ:

```
archive and previous host:  index-CDw4Ti2u.js
deployed Worker:            index-TwZtTkZl.js
```

Nothing is broken by this. The consequence is narrower and worth stating: **the
rollback is no longer clean.** Falling back to the previous host means markup
already held by a visitor references script names that host does not have. That
is the mixed-generation hazard this scope spent four review rounds on, and it now
applies to the rollback rather than to the cutover.

Rollback remains correct for a total failure, where visitors reload anyway. It is
not a seamless revert, and it should not be described as one.

The archive stays useful as the last artifact known to match the previous host.

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
      - name: Confirm the deploy target
        run: |
          set -euo pipefail
          NAME=$(jq -r '.name' dist/server/wrangler.json)
          [ "$NAME" = "ratify-labs" ] || { echo "::error::would deploy to '$NAME'"; exit 1; }
          echo "target=$NAME"

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

**Rollback.** Unchanged by this proposal and not clean, for the reason recorded
above: the previous host serves a different asset generation. If a seamless
rollback is wanted, deploy the archived artifact so both sides match, and do that
before relying on rollback rather than during an incident.

**Asset identity.** The fingerprint is the catalog's own script name. It changes
on every build, which is what makes it a fingerprint, and it is read from the
build rather than hardcoded.

**What this does not cover.** The job verifies the catalog. It does not verify
that the routed console is serving current content, because that is a separate
deployment on a different host with its own publishing path. A green deploy here
says nothing about the console beyond the fact that the proxy still reaches it.

## Remaining risks

1. **The rollback target is a different asset generation.** Recorded above.
   Fixable by deploying the archived artifact once.
2. **The console is still on the previous host** and still publishes by hand, so
   half the original problem remains. It has its own migration.
3. **Unattended deploys on merge.** Recommend the environment gate until the job
   has proven itself.
4. **`wrangler deployments list` output parsing.** The version is extracted with a
   regex over human-readable output. A wrangler upgrade could change that format
   and turn the version check into a silent pass. Pin wrangler and treat an empty
   parse as a failure, which the proposed steps do.

## Recommended next action

Open this as a pull request against `main` with the workflow change, then run the
manual sequence above once from a clean checkout. Only after that sequence
behaves exactly as described should the job be trusted to run on merge. Deploying
the archived artifact to restore a clean rollback is worth doing first, and it is
a one command change.
