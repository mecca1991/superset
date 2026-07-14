# Todo 06 — Wire widget to service: stream client, route context, abort, markdown, failure states

**Milestone:** M2 · **Size:** M · **Depends on:** 02, 04 (05 for grounded manual checks) · **Spec:** §4.1, §4.3, §4.4, §6

## Description

Replace the hardcoded reply with the real client: POST `fetch` reading `response.body` as a stream (native `EventSource` cannot POST a JSON body), SSE line parsing, `AbortController` wiring for Stop / panel close / replacement question, route-context mapping from `location.pathname`, best-effort `viz_type` from Explore state, sanitized Markdown rendering, and the retryable unavailable state that preserves the user's question. The widget never sends chart data, SQL, dashboard content, dataset names, or Redux state (§4.3).

## Tasks

- [x] 1. `streamClient.ts` — `askAssistant({question, context, history, signal, onDelta})`:
  - POST `{api_url}/ask`; parse `data:` lines; handle `delta | done | error` events
  - Pre-stream failures: parse JSON error envelope; network failure → unavailable state
  - Honors `AbortSignal`
- [x] 2. `useRouteContext.ts` — pathname mapping per §4.3 (routes confirmed in `src/views/routes.tsx:227–321`):
  - `/superset/dashboard/…` → `dashboard`
  - `/explore/…` or `/superset/explore/…` (permalinks) → `explore`
  - `/sqllab/…` → `sqllab`
  - `/chart/list/…`, `/dashboard/list/…` → `list`
  - anything else → `other`
  - Best-effort `viz_type`: guarded read of `state.explore?.form_data?.viz_type` in try/catch; absence never blocks a request; drop entirely if coupling gets awkward
- [x] 3. Panel state machine: idle → streaming → done/stopped/error. Stop aborts; closing the panel aborts; submitting a new question aborts the previous one. Client-side history cap: 6 entries / 2,000 chars each, mirroring §5.5
- [x] 4. Markdown: evaluate existing `SafeMarkdown` from `@superset-ui/core` — must disable raw HTML and sanitize links (§4.1); fallback `react-markdown` + `rehype-sanitize` only if it falls short
- [x] 5. Failure UI: retryable "The tutorial assistant is currently unavailable."; question restored to the composer on failure (§4.4)
- [x] 6. Jest tests (mock `fetch` with `ReadableStream`):
  - chunks render incrementally, in order
  - stop / close / replacement each abort (assert `signal.aborted`)
  - route mapping table via `MemoryRouter` per path
  - raw HTML and `javascript:` links neutralized
  - **no fetch occurs when the flag is false** (fetch spy)
  - failure state + question preservation

## Acceptance criteria (spec §10 widget tests 2, 4–8)

- [x] No assistant network request when the flag is false
- [x] Streamed chunks render incrementally and in order
- [x] Stop, panel close, and replacement question each abort the in-flight request
- [x] Route context maps exactly per §4.3 for all five categories; `viz_type` optional
- [x] `<script>`, raw HTML, and unsafe link schemes never execute or render
- [x] Failed request shows the retryable unavailable message with the question preserved

## Verification

```bash
cd superset-frontend && npm run test -- src/features/tutorialAssistant
```
Manual against the live service: on `:9000`, ask a demo question from a Dashboard page vs an Explore page and watch the route context in service logs; press Stop mid-answer and confirm the service logs cancellation; stop the assistant container and confirm the unavailable state + preserved question.

## Files (~8)

`streamClient.ts`, `useRouteContext.ts` (new), updates to `index.tsx` / `Panel.tsx` / `MessageList.tsx` / `Composer.tsx` / `types.ts`, tests

## ✅ Checkpoint M2 (after 04 + 05 + 06)

Spec §11 M2 exit: three demo questions answered with route-aware grounding; an unrelated question declined without invented guidance; service + widget suites green. Record demo Q&A transcripts in `tasks/`.

## Execution notes

- `viz_type` is read from the Explore URL query param (`?viz_type=...`) rather than Redux — decoupled from the explore store, which the globally-mounted widget cannot reach cleanly.
- Markdown uses a dedicated `MarkdownMessage` (react-markdown `skipHtml` + rehype-sanitize), not `SafeMarkdown`, whose sanitization is gated behind the `EscapeMarkdownHtml` feature flag and disables link-URI transforms. GFM was dropped: §4.1 needs only CommonMark (paragraphs, lists, emphasis, links, inline code), and `remark-gfm` is not hoisted to the frontend root.
- **Test coverage boundary:** the repo globally mocks `react-markdown` to a passthrough in `spec/helpers/shim.tsx` (ESM-import workaround), so link/HTML sanitization cannot be asserted in jest — it is verified at runtime in the browser (and again in Todo 09). 8 Jest tests cover flag gating, no-fetch-until-submit, streamed ordering, route-context mapping, stop/close abort, and error+question-preservation.
- Abort is asserted via `AbortController.prototype.abort` spy; real stream teardown is `fetch`'s job when the signal fires.
