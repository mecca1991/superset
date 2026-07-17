<!--
Licensed to the Apache Software Foundation (ASF) under one
or more contributor license agreements.  See the NOTICE file
distributed with this work for additional information
regarding copyright ownership.  The ASF licenses this file
to you under the Apache License, Version 2.0 (the
"License"); you may not use this file except in compliance
with the License.  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing,
software distributed under the License is distributed on an
"AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, either express or implied.  See the License for the
specific language governing permissions and limitations
under the License.
-->

# Superset In-App Tutorial Assistant

A prompt-based tutorial assistant inside Apache Superset 6.1.0. A floating chat
widget answers questions such as "How do I create a dashboard?" from a curated,
version-specific knowledge pack, without the user leaving the page. Controlled
by the `IN_APP_TUTORIAL` feature flag.

## Architecture

```
Browser ──(Superset UI)──► Patched Superset 6.1.0 ──► PostgreSQL / Redis
   │
   └──(POST /ask)────────► FastAPI assistant ──► Knowledge pack
                                    │
                                    └──► Anthropic API
```

The assistant is a standalone FastAPI service. Superset only carries the widget,
the feature flag, route-context extraction, and the public service URL — no LLM
code or provider dependencies live in Superset itself.

- **Widget**: `superset-frontend/src/features/tutorialAssistant/`
- **Service**: `tutorial-assistant/` (this directory)
- **Config**: `docker/pythonpath_dev/superset_config.py` (flag, bootstrap URL, CSP)
- **Core delta**: `tutorial-assistant/patches/tutorial-assistant-integration.patch`

## Running the demo

The whole stack runs through Docker Compose from the repository root.

1. Put your Anthropic API key in `docker/.env-local` (git-ignored — never in
   `docker/.env` or the image):

   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```

   See `docker/.env-local.example`. The model is pinned to `claude-opus-4-8`
   via the `MODEL` env with a compose default.

2. Start the stack (the `superset-websocket` sidecar is optional and can be
   skipped if its config mount is flaky on your Docker):

   ```bash
   docker compose up --build --scale superset-websocket=0
   ```

3. Open Superset:
   - **`http://localhost:9000`** — the webpack dev server (serves your
     working-tree frontend, including the widget). Also served at
     **`http://localhost:8088`** once the dev build completes.
   - The floating launcher appears bottom-right on any authenticated page.

4. Ask a demo question ("How do I create a dashboard?"). The answer streams in,
   grounded in the knowledge pack.

### Toggling the feature

The flag is delivered at runtime through the bootstrap payload, so switching
`IN_APP_TUTORIAL` in `docker/pythonpath_dev/superset_config.py` and restarting
the `superset` container adds or removes the widget with **no rebuild**.

## Development

Run the service directly:

```bash
cd tutorial-assistant
uv sync
ANTHROPIC_API_KEY=... MODEL=claude-opus-4-8 KNOWLEDGE_DIR=./knowledge \
  uv run uvicorn src.main:build_app --factory --port 8100
curl -s localhost:8100/health          # {"status":"ok","knowledge_docs":15}
uv run pytest -q                        # service tests
```

Widget tests:

```bash
cd superset-frontend
npm run test -- src/features/tutorialAssistant
```

Regenerate the core-Superset integration patch after changing a touch point:

```bash
bash tutorial-assistant/scripts/generate-integration-patch.sh v6.1
```

## Limitations (v1)

- No retrieval over the full documentation — answers come only from the 15-file
  knowledge pack.
- No product tours or automatic UI actions; no answers about the user's own
  data, charts, or query results.
- No conversation persistence across reloads; no per-user targeting.
- **No authentication on the assistant API.** v1 is a local demo only.

## Security boundary

- The assistant port binds to loopback only (`127.0.0.1:8100`).
- CORS is restricted to the exact Superset origins; it is a browser control,
  not authentication.
- The Anthropic key lives only in the assistant container (from
  `docker/.env-local`) — never in the image, repository, logs, or the frontend
  bootstrap payload.
- Request-size, timeout, output-token, and concurrency limits are enforced.
- Model output is rendered with raw HTML disabled and links sanitized.

A remote or shared deployment must add an authenticated reverse proxy (or
validate the Superset session) before exposing `/ask`. That is out of scope for
v1.

## Troubleshooting

**The widget shows "currently unavailable".** Work down this ladder — each was a
real issue during development:

1. **Content-Security-Policy.** The browser blocks the widget's cross-origin
   fetch unless the assistant origin is in Superset's CSP `connect-src`. The
   config adds `http://127.0.0.1:8100` and `http://localhost:8100`; confirm the
   header includes them:
   ```bash
   curl -s -D - -o /dev/null http://localhost:8088/superset/welcome/ | grep -i connect-src
   ```
   Symptom: `Failed to fetch` in the console with **no request reaching the
   service** (not even a CORS preflight).

2. **IPv4 vs IPv6 loopback.** The service publishes `127.0.0.1:8100` (IPv4), but
   browsers often resolve `localhost` to `::1` (IPv6). The bootstrap `api_url`
   therefore uses `127.0.0.1`, not `localhost`. If you override
   `TUTORIAL_ASSISTANT_PUBLIC_URL`, keep it on `127.0.0.1` (or publish IPv6 too).

3. **CORS origin.** The page origin must be in the service's `ALLOWED_ORIGINS`
   (both `localhost` and `127.0.0.1` for 8088/9000 by default). Symptom: an
   `OPTIONS /ask` reaches the service but the `POST` never follows.

4. **Missing key.** With no `ANTHROPIC_API_KEY`, the container fails at startup
   with `SettingsError: Missing or invalid required environment variables`.
   `docker compose logs tutorial-assistant` shows it.

**Streaming appears buffered.** A proxy in front of the service must not buffer
the response; the service sets `X-Accel-Buffering: no`, but the proxy must honor
it.

**Host port already in use** (`bind: address already in use` for 8100, 6379, or
5432). A host Redis/Postgres or a stray process holds the port. Free it, or set
`TUTORIAL_ASSISTANT_PORT` / the standard `REDIS_PORT` etc. in `docker/.env-local`.
