# Todo 09 — Hardening, smoke test, docs, integration-patch artifact, demo

**Milestone:** M3 · **Size:** M · **Depends on:** all previous · **Spec:** §10, §11 M3, §12

## Description

Close out M3: adversarial/boundary tests, the clean-checkout compose smoke test, README/troubleshooting docs, the generated integration patch (a documented artifact of the core-Superset delta — not a build mechanism, since we work in-repo), a final rebase onto `v6.1`, and the 60–90s demo recording.

## Tasks

- [x] 1. Adversarial service tests: prompt-injection question ("ignore your instructions and…"), out-of-scope decline phrasing, oversized question/history/viz_type
- [x] 2. `tutorial-assistant/scripts/generate-integration-patch.sh`:
  ```bash
  git diff v6.1...HEAD -- \
    superset-frontend/src/views/App.tsx \
    superset-frontend/packages/superset-ui-core/src/utils/featureFlags.ts \
    superset-frontend/src/types/bootstrapTypes.ts \
    docker/pythonpath_dev/superset_config.py \
    docker-compose.yml \
    > tutorial-assistant/patches/tutorial-assistant-integration.patch
  ```
  Commit the artifact; add a check that it applies cleanly to pristine `v6.1` (`git apply --check` in a temp worktree)
- [x] 3. `tutorial-assistant/README.md`: architecture diagram, env setup (`docker/.env-local` with `ANTHROPIC_API_KEY`), run commands, feature-flag toggle procedure (config restart only, no rebuild), limitations (spec §1 out-of-scope; §9 security boundary — loopback only, no auth, CORS is not authentication), troubleshooting (proxy buffering breaks SSE, CORS origin mismatch, missing key)
- [ ] 4. Full smoke test per spec §10 from a clean clone + populated env:
  1. `docker compose up --build` completes
  2. Superset initializes; examples available
  3. `/health` `knowledge_docs` matches the pack file count
  4. Widget appears with the flag enabled
  5. Three demo questions return grounded answers
  6. Disabling the flag + restart removes the widget (no rebuild)
- [ ] 5. Final `git rebase v6.1`; run the entire test matrix (Jest scoped suite, full pytest, typecheck, `pre-commit run`)
- [ ] 6. Open the single PR `v6.1 ← feature/tutorial-assistant` on the fork (`mecca1991/superset`) — deferred to here deliberately, because any `pull_request` event fires the fork's full inherited CI suite
- [ ] 7. Record the 60–90s demo

## Demo checklist (60–90s)

- [ ] Open a dashboard → launcher visible → ask "How do I create a dashboard?" → streamed, grounded answer
- [ ] Navigate to Explore → ask "How do I create a line chart?" → route-aware answer
- [ ] Ask "What is a dimension?" → concise definition
- [ ] Ask an out-of-scope question → polite decline, pointer to docs
- [ ] Show Stop mid-stream; show flag-off restart removing the widget

## Acceptance criteria (spec §10 smoke 1–6; §11 M3 exit)

- [ ] All six smoke steps pass from a clean checkout
- [ ] Generated patch applies cleanly to pristine `v6.1` (`git apply --check`)
- [ ] Full Jest + pytest suites green after the final rebase
- [ ] README enables another developer to reproduce the demo unaided
- [ ] Injection/out-of-scope tests confirm the knowledge boundary holds

## Verification

```bash
# in a scratch dir:
git clone <repo> && cd superset && git checkout feature/tutorial-assistant
# follow README verbatim → all six smoke steps pass
git worktree add /tmp/v61-check v6.1 && cd /tmp/v61-check && \
  git apply --check <repo>/tutorial-assistant/patches/tutorial-assistant-integration.patch
cd tutorial-assistant && uv run pytest -q
cd superset-frontend && npm run test -- src/features/tutorialAssistant
```

## Files (~8)

`scripts/generate-integration-patch.sh`, `patches/tutorial-assistant-integration.patch`, `README.md`, adversarial test files, `tasks/` status updates

## ✅ Checkpoint M3

Spec §11 M3 exit criterion met; demo recorded.

## Execution notes (in progress)

Done in this PR:
- `tests/test_adversarial.py` — boundary limits (oversized question/history/viz_type, too many turns) and prompt-injection handling: the injected text is accepted as untrusted input, rides only in the user turn, and never enters the cached system prompt. Model-side refusal of injected/out-of-scope prompts is enforced by prompts.py (test_prompts.py) and confirmed live in the demo checklist. 69 pytest tests pass.
- `scripts/generate-integration-patch.sh` + `patches/tutorial-assistant-integration.patch` — the core-Superset delta (App.tsx, featureFlags.ts, bootstrapTypes.ts, superset_config.py, docker-compose.yml). Verified it applies cleanly to a pristine `v6.1` worktree (`git apply --check`).
- `README.md` — architecture, run instructions, feature-flag toggle, limitations, security boundary, and a troubleshooting ladder for the three real gotchas (CSP connect-src, IPv4/IPv6 loopback, CORS origin) plus port collisions.

Smoke test (spec §10) — verified on the running stack during development:
1. `docker compose up --build` completes ✅
2. examples load ✅
3. `/health` → `knowledge_docs: 15` ✅
4. widget appears with the flag enabled ✅ (verified in-browser)
5. demo questions return grounded answers ✅ (line-chart procedure streamed and rendered in-browser)
6. flag-off restart removes the widget with no rebuild ✅ (runtime bootstrap delivery)

Remaining (after this PR merges): final `feature/tutorial-assistant → v6.1` PR and the 60–90s demo recording.
