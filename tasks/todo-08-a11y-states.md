# Todo 08 — A11y completion, responsive panel, full state coverage

**Milestone:** M3 · **Size:** M · **Depends on:** 06 · **Spec:** §4.2, §11 M3

## Description

Finish §4.2 and the M3 state matrix: live-region announcements for streamed content (throttled — announce on completion or sentence boundaries, never per token), complete keyboard operability, near-full-width panel on small screens, and polished loading / empty / stopped / timeout / unavailable states.

## Tasks

- [ ] 1. `MessageList.tsx` live region: `aria-live="polite"` on a visually-hidden summary node updated on stream completion (or debounced at sentence boundaries) — **not** on the token container itself
- [ ] 2. Keyboard pass: tab order launcher → panel controls → input; Enter submits, Shift+Enter inserts newline; Stop reachable by keyboard; focus containment while open (reuse patterns from Superset's `Modal`)
- [ ] 3. Responsive: media-query near-full-width panel on small screens; verify at 375px width
- [ ] 4. Distinct UI states:
  - empty state with 2–3 example questions
  - streaming indicator
  - "stopped" marker on aborted answers
  - `TIMEOUT` vs `MODEL_UNAVAILABLE` messaging — both retryable, question preserved
- [ ] 5. Jest tests: live-region presence + non-per-token updates; keyboard flows (userEvent tab/enter/escape/shift-enter); each state renders distinctly

## Acceptance criteria (spec §10 widget test 9; §4.2)

- [ ] Panel fully operable by keyboard alone
- [ ] Streamed content announced via live region without per-token announcements
- [ ] All five states (loading/empty/stopped/timeout/unavailable) render distinctly; error states offer retry
- [ ] Panel usable at 375×667 viewport

## Verification

```bash
cd superset-frontend && npm run test -- src/features/tutorialAssistant
```
Manual: VoiceOver spot-check; Chrome devtools device toolbar at iPhone SE size; set `REQUEST_TIMEOUT_SECONDS=1` on the service to force timeout; stop the assistant container for the unavailable state.

## Files (~6)

`MessageList.tsx`, `Panel.tsx`, `Composer.tsx`, `index.tsx`, styles, tests
