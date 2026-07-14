# Todo 03 — Assistant service skeleton: settings, schemas, knowledge loader/validator, /health

**Milestone:** M2 · **Size:** M · **Depends on:** none (parallel with 02) · **Spec:** §5.2, §5.3, §5.5, §6, §7

## Description

Stand up the FastAPI service in top-level `tutorial-assistant/` (mirrors the `superset-websocket/` sidecar convention) with everything except the model call: fail-fast settings, strict Pydantic request validation, the knowledge loader with startup validation, and `GET /health`. Ship 2–3 placeholder knowledge files so tests run before the real pack (Todo 05) lands. Dependency management: `uv` with a committed lockfile (spec §5.2 requires locked deps; pip-tools is the fallback if preferred).

## Tasks

- [ ] 1. `tutorial-assistant/pyproject.toml` + `uv.lock` — deps: fastapi, uvicorn, pydantic, pydantic-settings, anthropic, python-frontmatter; dev: pytest, pytest-asyncio, httpx
- [ ] 2. `src/settings.py` — env vars per spec §5.3:
  - Required, fail startup with a clear error if missing: `ANTHROPIC_API_KEY`, `MODEL`
  - Optional with defaults: `KNOWLEDGE_DIR=/app/knowledge`, `ALLOWED_ORIGINS=http://localhost:8088`, `REQUEST_TIMEOUT_SECONDS=30`, `MAX_OUTPUT_TOKENS=700`
- [ ] 3. `src/schemas.py` — `AskRequest`:
  - `question` ≤ 1,000 chars, non-empty
  - `history` ≤ 6 entries; each entry ≤ 2,000 chars; roles only `user`/`assistant`, strictly alternating
  - `context.route` ∈ {`dashboard`, `explore`, `sqllab`, `list`, `other`}
  - `context.viz_type` optional, ≤ 50 chars
  - Error envelope model with codes `VALIDATION | MODEL_UNAVAILABLE | TIMEOUT`
- [ ] 4. `src/knowledge.py` — load `KNOWLEDGE_DIR/*.md` **sorted by filename** (deterministic); validate: frontmatter present, `topic` present + unique, `routes` ⊆ valid set, body non-empty and ≤ 300 words; any violation → raise → startup abort
- [ ] 5. `src/main.py` — app factory; lifespan loads knowledge once; `GET /health` → `{"status": "ok", "knowledge_docs": N}` (real count, non-2xx when pack failed); `POST /ask` returns 501 stub; 422 handler emits `{"error": {"code": "VALIDATION", ...}}`
- [ ] 6. Seed `tutorial-assistant/knowledge/` with 2–3 placeholder files (replaced in Todo 05)
- [ ] 7. Tests: `tests/test_schemas.py` (every §5.5 limit, valid/invalid routes, alternation), `tests/test_knowledge.py` (deterministic order; each frontmatter failure mode aborts), `tests/test_health.py`, `tests/test_settings.py` (missing key/model → clear startup error)

## Acceptance criteria (spec §10 service tests 2–4)

- [ ] Invalid route/history/size requests → 422 with `code: "VALIDATION"`
- [ ] Knowledge files load in deterministic (sorted) order, stable across runs
- [ ] Any invalid frontmatter, empty body, or >300-word file aborts startup with an actionable message
- [ ] Missing `ANTHROPIC_API_KEY` or `MODEL` aborts startup
- [ ] `/health` reports the actual loaded file count

## Verification

```bash
cd tutorial-assistant && uv run pytest -q
ANTHROPIC_API_KEY=test MODEL=claude-opus-4-8 KNOWLEDGE_DIR=./knowledge \
  uv run uvicorn src.main:app --port 8100 &
curl -s localhost:8100/health
curl -s -X POST localhost:8100/ask -H 'content-type: application/json' \
  -d '{"question":"","context":{"route":"bogus"}}'   # → 422 VALIDATION envelope
```

## Files (~12, all new under `tutorial-assistant/`)

`pyproject.toml`, `uv.lock`, `src/{__init__,settings,schemas,knowledge,main}.py`, `knowledge/*.md` (placeholders), `tests/test_{schemas,knowledge,health,settings}.py`
