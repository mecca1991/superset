# Todo 07 — Compose integration: assistant sidecar, loopback binding, env wiring

**Milestone:** M3 · **Size:** S · **Depends on:** 03 (04/05 for full e2e) · **Spec:** §8, §9

## Description

Add the assistant to `docker-compose.yml` modeled on the `superset-websocket` sidecar (lines 109–139): own build dir, own port, env block, source volumes for dev iteration. The port binds to loopback only (`127.0.0.1:8100:8100`, spec §9). The Anthropic key lives **only** in `docker/.env-local` (compose already loads it as an optional, uncommitted override on every service).

## Tasks

- [ ] 1. `tutorial-assistant/Dockerfile`:
  - `python:3.11-slim`; install from `uv.lock`; copy `src/` + `knowledge/`
  - Non-root `USER`; `CMD uvicorn src.main:app --host 0.0.0.0 --port 8100`
  - `HEALTHCHECK` hitting `/health`
- [ ] 2. `docker-compose.yml` — new `tutorial-assistant` service:
  - `build: ./tutorial-assistant`
  - `ports: ["127.0.0.1:8100:8100"]`
  - `env_file`: `docker/.env` (required) + `docker/.env-local` (optional, for `ANTHROPIC_API_KEY`)
  - `environment`: `MODEL`, `ALLOWED_ORIGINS`, `REQUEST_TIMEOUT_SECONDS`, `MAX_OUTPUT_TOKENS`, `KNOWLEDGE_DIR`
  - volumes: `./tutorial-assistant/src`, `./tutorial-assistant/knowledge` (live reload in dev)
- [ ] 3. `docker/.env` additions (committed defaults go in the tracked template, values without secrets): `MODEL=claude-opus-4-8` (exact alias, no date suffix — spec §5.3), `TUTORIAL_ASSISTANT_ALLOWED_ORIGINS=http://localhost:8088,http://localhost:9000`; document that `ANTHROPIC_API_KEY` goes in `docker/.env-local` only
- [ ] 4. `tutorial-assistant/.dockerignore` (tests, caches, `__pycache__`)

## Acceptance criteria (spec §10 smoke 1, 3; §9)

- [ ] `docker compose up --build tutorial-assistant` succeeds from clean state
- [ ] `curl localhost:8100/health` works from the host; `docker compose ps` shows `127.0.0.1:8100->8100` (loopback only)
- [ ] Widget in the compose-served UI streams answers end-to-end
- [ ] Startup fails loudly (container exit + clear log) when `ANTHROPIC_API_KEY` is absent
- [ ] No API key in any committed file

## Verification

```bash
docker compose up --build            # full stack
curl -s localhost:8100/health
lsof -iTCP:8100 -sTCP:LISTEN         # bound to 127.0.0.1
git grep -i "sk-ant" -- . ':!docker/.env-local'   # → empty
```
Browser demo question at `http://localhost:8088`.

## Files (~5)

`tutorial-assistant/Dockerfile`, `tutorial-assistant/.dockerignore` (new), `docker-compose.yml`, `docker/.env` (tracked additions — no secrets)
