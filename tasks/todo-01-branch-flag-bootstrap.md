# Todo 01 — Branch, env repair, plan docs, flag + bootstrap plumbing

**Milestone:** M1 · **Size:** S · **Depends on:** none · **Spec:** §3.3, §9

## Description

Root of everything: create the working branch off `v6.1`, write the plan docs, repair the pre-existing `docker/.env` corruption, and land every "core Superset touch point" the rest of the work depends on — the `IN_APP_TUTORIAL` feature-flag enum entry, the bootstrap payload typing, and the docker config plumbing. No core Python file changes are needed: arbitrary `FEATURE_FLAGS` keys pass through to `common.feature_flags`, and `COMMON_BOOTSTRAP_OVERRIDES_FUNC` (invoked at `superset/views/base.py:527`) merges into `common.*`.

## Tasks

- [x] 1. `git checkout v6.1 && git checkout -b feature/tutorial-assistant`
- [x] 2. Write `tasks/plan.md`, `tasks/todo.md`, and `tasks/todo-01…09-*.md`
- [x] 3. Fix `docker/.env` (local-only, **never commit** — it contains your secrets):
  - Split the concatenated line `SUPERSET_SECRET_KEY=...ENABLE_PLAYWRIGHT=false` into two lines
  - Add `TUTORIAL_ASSISTANT_PUBLIC_URL=http://localhost:8100`
  - ⚠️ Note: the file also contains a live-looking `MAPBOX_API_KEY` — do not stage this file
  - ⚠️ Note: fixing the line changes the effective `SUPERSET_SECRET_KEY` (the old effective value included the `ENABLE_PLAYWRIGHT=false` suffix). If a local metadata DB already encrypted secrets under the corrupted key, run `superset re-encrypt-secrets` or start with a fresh volume.
- [x] 4. Add `InAppTutorial = 'IN_APP_TUTORIAL'` to the enum in `superset-frontend/packages/superset-ui-core/src/utils/featureFlags.ts` (alphabetical slot: between `GlobalTaskFramework` and `ListviewsDefaultCardView`)
- [x] 5. Add `tutorial_assistant?: { api_url: string }` to `CommonBootstrapData` in `superset-frontend/src/types/bootstrapTypes.ts`
- [x] 6. In `docker/pythonpath_dev/superset_config.py`:
  - Add `"IN_APP_TUTORIAL": True` to `FEATURE_FLAGS`
  - Define `tutorial_assistant_bootstrap(payload)` returning `{"tutorial_assistant": {"api_url": os.environ.get("TUTORIAL_ASSISTANT_PUBLIC_URL", "http://localhost:8100")}}` and assign it to `COMMON_BOOTSTRAP_OVERRIDES_FUNC` (spec §3.3)
- [x] 7. Stage everything except `docker/.env`, run `pre-commit run`, commit

## Acceptance criteria

- [x] `docker/.env` parses cleanly; `SUPERSET_SECRET_KEY` and `ENABLE_PLAYWRIGHT` are distinct variables
- [x] `FeatureFlag.InAppTutorial` compiles; `isFeatureEnabled(FeatureFlag.InAppTutorial)` type-checks
- [x] Running Superset serves `common.feature_flags.IN_APP_TUTORIAL === true` and `common.tutorial_assistant.api_url` in bootstrap data
- [x] No API key or new secret appears in any committed file (spec §9)

## Verification

```bash
grep -c '^SUPERSET_SECRET_KEY=' docker/.env   # → 1
grep -c '^ENABLE_PLAYWRIGHT=' docker/.env     # → 1
cd superset-frontend && npx tsc --noEmit -p tsconfig.json   # or scoped typecheck
# With the stack running (docker compose up superset), in browser devtools:
#   JSON.parse(document.getElementById('app').dataset.bootstrap).common.tutorial_assistant
#   JSON.parse(document.getElementById('app').dataset.bootstrap).common.feature_flags.IN_APP_TUTORIAL
git diff --cached --name-only | grep -v 'docker/.env'   # .env not staged
```

## Environment notes (recorded during execution)

- Local toolchain vs `superset-frontend/package.json` engines (`node ^22.22.0`, `npm ^10.8.1`): local node is v20.17.0 and npm 11.6.0. npm 11's stricter `npm ci` validation rejects the v6.1 lockfile ("Missing: d3-cloud@1.2.9") — install with `npx -y npm@10 ci` instead. Consider `nvm use 22` for this project.
- `docker/.env` also carries a live-looking `MAPBOX_API_KEY`; the file is kept out of all commits.
- Fixing the `SUPERSET_SECRET_KEY` line changes the effective secret: if the local metadata DB was initialized under the corrupted value, run `superset re-encrypt-secrets` or recreate the volume.

## Files

- `tasks/*.md` (new, 11 files)
- `superset-frontend/packages/superset-ui-core/src/utils/featureFlags.ts` (1 line)
- `superset-frontend/src/types/bootstrapTypes.ts` (interface addition)
- `docker/pythonpath_dev/superset_config.py` (flag + override func)
- `docker/.env` (local-only fix, uncommitted)
