# Runbook: the one publishing session

For the session that can publish to the current host. Everything here needs that
access and nothing here can be done from a session without it.

Two goals, in priority order: **publish the reference pages, which have never
been public**, and **capture the exact artifact** so a later migration can make
two deployments byte-identical.

## The ordering trap

Script filenames are not reproducible. Two builds of the same commit produce the
same stylesheet name and different script names, proven by building `81624b1`
twice and comparing. The live stylesheet matches that commit exactly, which is
how the deployed source was identified.

So **the artifact that gets published is the only artifact that can ever match
the live site.** Rebuilding after publishing produces different script names and
the capture is worthless.

> Build once. Publish that build. Archive that same `dist/`. Do not rebuild
> between those steps, and do not run any command that triggers a build.

Everything else in this runbook is ordinary. This part is the one that cannot be
undone by trying again.

## Steps

**1. Start clean and build once.**

```bash
cd products/ratify/repositories/ratify-labs
git checkout main && git pull
git rev-parse HEAD            # record this
npm ci
npm run build                 # the only build in this session
```

**2. Archive the artifact before publishing anything.**

```bash
tar czf ~/labs-artifact-$(git rev-parse --short HEAD).tar.gz dist/
ls dist/client/_next/static/chunks/ | grep -E '^index-'   # record
ls dist/client/_next/static/css/                          # record
```

Keep the archive outside the repository. It is the only copy of a build that can
be reproduced, and a later migration needs it to make both deployments serve
identical filenames.

**3. Publish that build.** Use the host's own publishing mechanism. Do not run a
build command as part of publishing if that would rebuild; if the tool insists on
building, capture the artifact it produced rather than the one from step 1, and
note that in the record.

**4. Verify every route, not just the root.** All six must return 200. Four of
them return 404 today, which is the reason for this session:

```bash
for r in "" copilot google-adk langchain nvidia-openshell-nooa maritime; do
  printf "%-26s %s\n" "/$r" \
    "$(curl -s -o /dev/null -w '%{http_code}' https://labs.ratifyprotocol.com/$r)"
done
```

**5. Confirm the published assets match the archive.** This is what proves the
capture is usable:

```bash
curl -s https://labs.ratifyprotocol.com/ \
  | grep -oE '/_next/static/[A-Za-z0-9_./-]+\.(js|css)' | sort -u
```

Every path listed must exist under `dist/client` in the archive. If any does not,
the published build is not the archived build, and the capture has to be redone.

**6. Confirm the routed reference still works.**

```bash
curl -s -o /dev/null -w '%{http_code} %header{X-Ratify-Labs-Reference}\n' \
  https://labs.ratifyprotocol.com/maritime
curl -s -o /dev/null -w '%{http_code}\n' \
  https://labs.ratifyprotocol.com/maritime/api/anything    # must be 404
```

**7. Retrieve the router token.** Put it straight into a secret store or password
manager. Do not paste it into a terminal, a file in the repository, a commit, or
a transcript. If it can only be rotated rather than read, rotate it in the routed
reference's environment first, then in the catalog's, then redeploy both, then
re-run step 6. A rotation that updates one side and not the other takes the
routed reference down.

**8. Record what was deployed**, in `.memory/CURRENT.md`: the commit, the
archive path, the script and stylesheet names from step 2, and the six route
results from step 4.

## After this session

The staged token-preserving migration becomes the preferred route, because the
archived artifact can be deployed to a Worker so both deployments serve identical
filenames, and the mixed-generation asset problem does not arise.

Until then the migration does not start. See `HOSTING-MIGRATION-SCOPE.md`.
