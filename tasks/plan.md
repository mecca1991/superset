# Implementation Plan — Superset In-App Tutorial Assistant

## Context

`Superset_In-App_Tutorial_Assistant_Technical_Specification.md` (repo root, authoritative) specifies a prompt-based tutorial assistant inside Superset 6.1.0: a floating chat widget behind an `IN_APP_TUTORIAL` feature flag, answering from a 15-file knowledge pack via a standalone FastAPI service streaming Anthropic responses. Goal: a reproducible docker-compose demo plus a 60–90s walkthrough.

**Decided with user:** work happens **in this repo** on **one feature branch off `v6.1`** (`feature/tutorial-assistant`), rebased on `v6.1` before each todo. Plan docs live in **`tasks/`** at repo root: `tasks/plan.md`, `tasks/todo.md` (index), and one `tasks/todo-NN-<slug>.md` per todo containing that todo's tasks — the user follows along per-todo. The spec's separate `superset-tutorial/` repo and build-time patch mechanism are adapted: the integration patch becomes a **generated artifact** at the end, and the spec's standalone Vite playground is **dropped** (the `superset-node` webpack dev server on :9000 gives faster, higher-fidelity iteration; Jest covers unit tests).

**Verified integration points (v6.1 tree):**
- Mount: `superset-frontend/src/views/App.tsx:108` — render widget as sibling of `<ToastContainer />` inside `RootContextProviders` (inside `Router`, so `useLocation()` works), wrapped in `<ErrorBoundary showMessage={false}>` (`src/components/ErrorBoundary/index.tsx`), gated by `isFeatureEnabled(FeatureFlag.InAppTutorial)`.
- Flag enum: `superset-frontend/packages/superset-ui-core/src/utils/featureFlags.ts` (enum line 23, alphabetical `PascalCase = 'UPPER_SNAKE'`; `isFeatureEnabled` line 106).
- Bootstrap: `COMMON_BOOTSTRAP_OVERRIDES_FUNC` (`superset/config.py:878`, invoked `superset/views/base.py:527`) merges into `common.*`; arbitrary `FEATURE_FLAGS` keys pass through to `common.feature_flags` with **no core Python change needed** — config lives entirely in `docker/pythonpath_dev/superset_config.py`. Frontend reads via `getBootstrapData().common` (`src/utils/getBootstrapData.ts`); type in `src/types/bootstrapTypes.ts` (`CommonBootstrapData`, line 158).
- Routes (`src/views/routes.tsx`): `/superset/dashboard/:idOrSlug/` (231), `/dashboard/list/` (227), `/explore/` (297), `/superset/explore/p` (301), `/sqllab/` (321), `/chart/list/` (239).
- Compose sidecar pattern: `superset-websocket` in `docker-compose.yml:109–139` (own build dir, own port, env block).
- ⚠️ Pre-existing bug: `docker/.env` has `SUPERSET_SECRET_KEY` concatenated with `ENABLE_PLAYWRIGHT=false` on one line (missing newline) — must be fixed first. Also contains a live-looking `MAPBOX_API_KEY`; flag to user, commit no new secrets.

**Decisions adopted for remaining open points:** `uv` for the service (lockfile per §5.2; pip-tools fallback documented); if flag is on but `api_url` missing, widget mounts and shows the retryable unavailable state on ask (§4.4); `viz_type` is best-effort via guarded Redux read — dropped rather than coupled if awkward.

**New code locations:**
- Widget: `superset-frontend/src/features/tutorialAssistant/` (matches the `src/features/<name>/` convention; one import line in `App.tsx`).
- Service: top-level `tutorial-assistant/` (mirrors `superset-websocket/`): `src/{main,schemas,prompts,knowledge,settings}.py`, `knowledge/*.md`, `tests/`, `pyproject.toml`, `Dockerfile`, `patches/`, `scripts/`.

## Execution model

First implementation step (Todo 01) creates the branch and writes `tasks/plan.md`, `tasks/todo.md`, and all nine `tasks/todo-NN-*.md` files carrying the per-todo detail below (each with description, task checklist, acceptance criteria, verification commands, dependencies). Before each subsequent todo: `git fetch && git rebase v6.1`. Tracks after Todo 01 can run in parallel: **A (frontend)** 02→06→08, **B (service)** 03→04→07, **C (content)** 05; join at 06, final join at 09.

---

## Todo 01 — Branch, env repair, plan docs, flag + bootstrap plumbing (S)

Root of everything: working branch, tasks/ docs, and all core-Superset touch points.

Tasks:
1. `git checkout v6.1 && git checkout -b feature/tutorial-assistant`.
2. Write `tasks/plan.md`, `tasks/todo.md`, `tasks/todo-01…09-*.md`.
3. Fix `docker/.env`: split `SUPERSET_SECRET_KEY` / `ENABLE_PLAYWRIGHT=false` onto separate lines; add `TUTORIAL_ASSISTANT_PUBLIC_URL=http://localhost:8100`. Flag the MAPBOX key to the user.
4. Add `InAppTutorial = 'IN_APP_TUTORIAL'` to the `FeatureFlag` enum (alphabetical slot).
5. Add `tutorial_assistant?: { api_url: string }` to `CommonBootstrapData` in `bootstrapTypes.ts`.
6. In `docker/pythonpath_dev/superset_config.py`: `FEATURE_FLAGS["IN_APP_TUTORIAL"] = True` + `COMMON_BOOTSTRAP_OVERRIDES_FUNC` returning `{"tutorial_assistant": {"api_url": os.environ.get("TUTORIAL_ASSISTANT_PUBLIC_URL", "http://localhost:8100")}}` (spec §3.3).
7. Commit.

Acceptance: `.env` parses with both vars distinct; `FeatureFlag.InAppTutorial` type-checks; browser bootstrap shows `common.feature_flags.IN_APP_TUTORIAL === true` and `common.tutorial_assistant.api_url`; no secrets in committed files.
Verify: frontend typecheck; `docker compose up superset` then inspect `JSON.parse(document.getElementById('app').dataset.bootstrap).common`; `grep -c '^SUPERSET_SECRET_KEY=' docker/.env` → 1.
Deps: none. Scope: ~14 files (10 are tasks/ docs).

## Todo 02 — Widget shell: launcher + panel, hardcoded reply, flag-gated mount (M)

Spec §4.1–4.2 core / M1. Floating launcher; 380×560 panel; in-memory messages; composer; canned response; no network. Mount in `App.tsx` after `<ToastContainer />` behind flag + ErrorBoundary. Core a11y: labels, focus→input on open, `Escape` closes, focus returns to launcher.

Tasks: create `src/features/tutorialAssistant/` — `index.tsx`, `components/{Launcher,Panel,MessageList,Composer}.tsx`, `types.ts` (incl. shared error codes `VALIDATION|MODEL_UNAVAILABLE|TIMEOUT`), `config.ts` (reads bootstrap api_url); modify `App.tsx` (conditional render); Emotion styling with theme tokens; Jest tests (`TutorialAssistant.test.tsx` via `spec/helpers/testing-library`).
Acceptance (§10 widget 1,3,8,9): absent from DOM when flag false; open/close works; focus behavior per §4.2; thrown widget error doesn't break host page; accessible names.
Verify: `cd superset-frontend && npm run test -- src/features/tutorialAssistant`; manual on :9000 with flag toggled via config restart (no rebuild).
Deps: 01. Scope: ~8 files.

**✅ CHECKPOINT M1:** compose stack up with examples; launcher/panel render hardcoded reply; flag controls mounting at runtime. (§11 M1 exit; §10 smoke 1,2,4,6.)

## Todo 03 — Service skeleton: settings, schemas, knowledge loader/validator, /health (M)

Spec §5.3, §5.5, §6, §7 — everything except the model call. Placeholder knowledge files (2–3) until Todo 05.

Tasks: `tutorial-assistant/pyproject.toml` + `uv.lock` (fastapi, uvicorn, pydantic, pydantic-settings, anthropic, python-frontmatter, pytest, pytest-asyncio, httpx); `src/settings.py` (fail-fast on missing `ANTHROPIC_API_KEY`/`MODEL`; defaults `REQUEST_TIMEOUT_SECONDS=30`, `MAX_OUTPUT_TOKENS=700`); `src/schemas.py` (question ≤1000; history ≤6 × ≤2000 chars, alternating user/assistant; route enum; `viz_type` ≤50; error envelope); `src/knowledge.py` (sorted-by-filename load; frontmatter/topic-unique/≤300-words/non-empty validation, abort on violation); `src/main.py` (lifespan loads pack once; `/health` with real count, non-2xx on pack failure; `/ask` 501 stub; 422 → `VALIDATION` envelope); tests for all of the above.
Acceptance (§10 service 2–4): invalid requests → 422 `VALIDATION`; deterministic load order; every frontmatter failure mode aborts startup; missing key/model aborts startup; `/health` reports actual count.
Verify: `cd tutorial-assistant && uv run pytest -q`; run uvicorn on :8100, curl `/health` and an invalid `/ask`.
Deps: none (parallel with 02). Scope: ~12 new files.

## Todo 04 — Streaming /ask: Anthropic call, SSE, prompt caching, disconnect cancellation (L)

Spec §5.4–5.5, §6, §9 core.

Tasks: `src/prompts.py` — system blocks (instructions + knowledge in loader order) built **once at startup**, byte-identical across requests, single `cache_control: {"type":"ephemeral"}` on last block, all §5.4 behavioral rules; route/`viz_type` injected in **user turn only**; no `thinking` param. `/ask`: `asyncio.Semaphore(3)`; `client.messages.stream(...)` inside `asyncio.timeout(REQUEST_TIMEOUT_SECONDS)`; SSE `delta`/`done` with headers `text/event-stream`, `Cache-Control: no-cache`, `X-Accel-Buffering: no`; disconnect detection (`request.is_disconnected()` between chunks + cancellation handling) closes the Anthropic stream; error mapping — pre-stream JSON envelope vs mid-stream `{"type":"error"}` event, provider errors → `MODEL_UNAVAILABLE`, timeout → `TIMEOUT`; CORS restricted to `ALLOWED_ORIGINS`; structured logs (request id, route, duration, model, usage incl. `cache_read_input_tokens`) with no key/question/answer. Tests with mocked Anthropic client covering all of it, incl. byte-identity across different routes and disconnect-closes-stream.
Acceptance (§10 service 1,5–8): ordered delta→done; identical system bytes regardless of route with exactly one cache breakpoint; disconnect cancels in-flight stream; stable error codes; ≤3 concurrent calls; content-free logs.
Verify: pytest; live `curl -N` streaming check; Ctrl-C cancellation shows in logs; second identical call logs `cache_read_input_tokens > 0`.
Deps: 03. Scope: ~7 files.

## Todo 05 — Knowledge pack: author + verify 15 files (M, parallel track)

Spec §7. `knowledge/01-…15-….md` (numeric prefix = deterministic order), `topic`/`routes` frontmatter, ≤300 words, every label/path click-verified in the running 6.1.0 UI (examples loaded). Remove placeholders; add `tests/test_knowledge_pack.py` (15 files, unique topics, validator passes); record verification notes in the todo file; tune prompt boundary + add adversarial fixtures.
Acceptance: 15 valid files; `/health` → 15; all instructions verified in-app; demo questions grounded, out-of-scope declined (§11 M2 exit).
Verify: pytest knowledge test; `curl /health | jq .knowledge_docs`; live curls of 3 demo + 1 out-of-scope question.
Deps: 01 (stack) + 03 (loader). Scope: ~17 files.

## Todo 06 — Wire widget to service: stream client, route context, abort, markdown, failure states (M)

Spec §4.1, §4.3, §4.4, §6.

Tasks: `streamClient.ts` (POST fetch, read `response.body`, parse `data:` lines, `delta|done|error`, pre-stream envelope handling, `AbortController` signal); `useRouteContext.ts` (pathname → `dashboard|explore|sqllab|list|other` per §4.3 incl. `/superset/explore/p` permalink; guarded best-effort `viz_type`); panel state machine idle→streaming→done/stopped/error; Stop/close/replacement-question all abort; client-side history cap mirroring §5.5; Markdown via existing `SafeMarkdown` from `@superset-ui/core` (verify raw-HTML-off + link sanitization; fallback `react-markdown`+`rehype-sanitize`); retryable unavailable message preserving the question. Jest tests with mocked `ReadableStream` fetch: order, aborts, route table (MemoryRouter), sanitization, **no fetch when flag false**, failure/preserve.
Acceptance (§10 widget 2,4–8): all of the above testable bullets.
Verify: scoped Jest; manual against live service (route context in service logs; Stop mid-answer logs cancellation; stopped container → unavailable state).
Deps: 02, 04 (05 for grounded checks). Scope: ~8 files.

**✅ CHECKPOINT M2:** three demo questions answered with route-aware grounding; unrelated question declined; both suites green. (§11 M2 exit.)

## Todo 07 — Compose integration: assistant sidecar, loopback binding (S)

Spec §8–§9. `tutorial-assistant/Dockerfile` (python:3.11-slim, lockfile install, non-root, uvicorn :8100, HEALTHCHECK); `docker-compose.yml` service modeled on `superset-websocket` — `ports: ["127.0.0.1:8100:8100"]`, env block, env_file `docker/.env` + optional `docker/.env-local` (Anthropic key lives ONLY there, uncommitted); `docker/.env` gains `MODEL=claude-opus-4-8`, dev `ALLOWED_ORIGINS=http://localhost:8088,http://localhost:9000`; `.dockerignore`.
Acceptance (§10 smoke 1,3; §9): clean `up --build` works; `/health` from host; loopback-only binding; e2e streaming in compose UI; loud failure without key; no key committed.
Verify: full `docker compose up --build`; `lsof -iTCP:8100`; `git grep -i "sk-ant"` empty.
Deps: 03 (04/05 for e2e). Scope: ~5 files.

## Todo 08 — A11y completion, responsive panel, full state coverage (M)

Spec §4.2 + M3 states. Throttled `aria-live="polite"` announcements (not per token); full keyboard pass (tab order, Enter/Shift+Enter, focus handling while open); near-full-width panel on small screens (verify 375px); distinct empty/loading/stopped/timeout/unavailable states with retry. Jest tests for each.
Acceptance (§10 widget 9; §4.2): keyboard-only operable; live region without per-token spam; five states distinct + retryable errors; usable at 375×667.
Verify: scoped Jest; VoiceOver spot-check; devtools device mode; `REQUEST_TIMEOUT_SECONDS=1` to force timeout; kill container for unavailable.
Deps: 06. Scope: ~6 files.

## Todo 09 — Hardening, smoke test, docs, patch artifact, demo (M)

Spec §10 smoke, §11 M3. Adversarial tests (prompt injection, oversized inputs, out-of-scope phrasing); `scripts/generate-integration-patch.sh` capturing `git diff v6.1...HEAD -- <core files>` into `tutorial-assistant/patches/tutorial-assistant-integration.patch` + `git apply --check` against a v6.1 worktree; `tutorial-assistant/README.md` (architecture, env setup, run, flag toggle, limitations/security boundary, troubleshooting incl. proxy buffering + CORS); full clean-checkout smoke test (all six §10 steps incl. flag-off restart removes widget without rebuild); final rebase on v6.1; full test matrix; record 60–90s demo per checklist.
Acceptance: six smoke steps pass from clean checkout; patch applies cleanly to pristine v6.1; suites green post-rebase; README reproducible by another developer; boundary holds under injection.
Deps: all. Scope: ~8 files.

**✅ CHECKPOINT M3:** §11 M3 exit met; demo recorded.

---

## Risks

| Risk | Mitigation |
|---|---|
| `docker/.env` line-79 fix changes effective `SUPERSET_SECRET_KEY` | May need `superset re-encrypt-secrets` or fresh volume; called out in Todo 01 |
| Live-looking `MAPBOX_API_KEY` already in tracked `docker/.env` | Flag to user; never commit new secrets; Anthropic key only in `docker/.env-local` |
| Rebasing on moving `v6.1` | Only 3 frontend + 2 docker core files touched; isolated dirs can't conflict; rebase per todo |
| Heavy webpack prod build | Never in dev loop — `superset-node` dev server; prod build only for optional final image |
| :9000 vs :8088 CORS mismatch | Comma-list `ALLOWED_ORIGINS` in dev; README troubleshooting |
| `SafeMarkdown` may not meet §4.1 | Budgeted evaluation + fallback in Todo 06 |
| Cache prefix below 4096-token minimum if pack shrinks | Log `cache_read_input_tokens`; pack-size assertion in tests |

## Verification (end-to-end)

- Per-todo: scoped Jest (`npm run test -- src/features/tutorialAssistant`) and `uv run pytest -q`; frontend typecheck; `pre-commit run` on staged files before each commit/push (CLAUDE.md requirement).
- M1: flag toggling mounts/unmounts widget with zero network activity when off (devtools Network tab).
- M2: three demo questions grounded + out-of-scope declined via live curl and in-browser.
- M3: clean-checkout `docker compose up --build` smoke (all six §10 steps); patch `git apply --check` on pristine v6.1; demo recording.
