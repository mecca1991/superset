# Todo 06 — Wire widget to service: stream client, route context, abort, markdown, failure states

**Milestone:** M2 · **Size:** M · **Depends on:** 02, 04 (05 for grounded manual checks) · **Spec:** §4.1, §4.3, §4.4, §6

## Description

Replace the hardcoded reply with the real client: POST `fetch` reading `response.body` as a stream (native `EventSource` cannot POST a JSON body), SSE line parsing, `AbortController` wiring for Stop / panel close / replacement question, route-context mapping from `location.pathname`, best-effort `viz_type` from Explore state, sanitized Markdown rendering, and the retryable unavailable state that preserves the user's question. The widget never sends chart data, SQL, dashboard content, dataset names, or Redux state (§4.3).

## Tasks

- [ ] 1. `streamClient.ts` — `askAssistant({question, context, history, signal, onDelta})`:
  - POST `{api_url}/ask`; parse `data:` lines; handle `delta | done | error` events
  - Pre-stream failures: parse JSON error envelope; network failure → unavailable state
  - Honors `AbortSignal`
- [ ] 2. `useRouteContext.ts` — pathname mapping per §4.3 (routes confirmed in `src/views/routes.tsx:227–321`):
  - `/superset/dashboard/…` → `dashboard`
  - `/explore/…` or `/superset/explore/…` (permalinks) → `explore`
  - `/sqllab/…` → `sqllab`
  - `/chart/list/…`, `/dashboard/list/…` → `list`
  - anything else → `other`
  - Best-effort `viz_type`: guarded read of `state.explore?.form_data?.viz_type` in try/catch; absence never blocks a request; drop entirely if coupling gets awkward
- [ ] 3. Panel state machine: idle → streaming → done/stopped/error. Stop aborts; closing the panel aborts; submitting a new question aborts the previous one. Client-side history cap: 6 entries / 2,000 chars each, mirroring §5.5
- [ ] 4. Markdown: evaluate existing `SafeMarkdown` from `@superset-ui/core` — must disable raw HTML and sanitize links (§4.1); fallback `react-markdown` + `rehype-sanitize` only if it falls short
- [ ] 5. Failure UI: retryable "The tutorial assistant is currently unavailable."; question restored to the composer on failure (§4.4)
- [ ] 6. Jest tests (mock `fetch` with `ReadableStream`):
  - chunks render incrementally, in order
  - stop / close / replacement each abort (assert `signal.aborted`)
  - route mapping table via `MemoryRouter` per path
  - raw HTML and `javascript:` links neutralized
  - **no fetch occurs when the flag is false** (fetch spy)
  - failure state + question preservation

## Acceptance criteria (spec §10 widget tests 2, 4–8)

- [ ] No assistant network request when the flag is false
- [ ] Streamed chunks render incrementally and in order
- [ ] Stop, panel close, and replacement question each abort the in-flight request
- [ ] Route context maps exactly per §4.3 for all five categories; `viz_type` optional
- [ ] `<script>`, raw HTML, and unsafe link schemes never execute or render
- [ ] Failed request shows the retryable unavailable message with the question preserved

## Verification

```bash
cd superset-frontend && npm run test -- src/features/tutorialAssistant
```
Manual against the live service: on `:9000`, ask a demo question from a Dashboard page vs an Explore page and watch the route context in service logs; press Stop mid-answer and confirm the service logs cancellation; stop the assistant container and confirm the unavailable state + preserved question.

## Files (~8)

`streamClient.ts`, `useRouteContext.ts` (new), updates to `index.tsx` / `Panel.tsx` / `MessageList.tsx` / `Composer.tsx` / `types.ts`, tests

## ✅ Checkpoint M2 (after 04 + 05 + 06)

Spec §11 M2 exit: three demo questions answered with route-aware grounding; an unrelated question declined without invented guidance; service + widget suites green. Record demo Q&A transcripts in `tasks/`.
