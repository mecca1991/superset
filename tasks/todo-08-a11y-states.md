# Todo 08 — A11y completion, responsive panel, full state coverage

**Milestone:** M3 · **Size:** M · **Depends on:** 06 · **Spec:** §4.2, §11 M3

## Description

Finish §4.2 and the M3 state matrix: live-region announcements for streamed content (throttled — announce on completion or sentence boundaries, never per token), complete keyboard operability, near-full-width panel on small screens, and polished loading / empty / stopped / timeout / unavailable states.

## Tasks

- [x] 1. `MessageList.tsx` live region: `aria-live="polite"` on a visually-hidden summary node updated on stream completion (or debounced at sentence boundaries) — **not** on the token container itself
- [x] 2. Keyboard pass: tab order launcher → panel controls → input; Enter submits, Shift+Enter inserts newline; Stop reachable by keyboard; focus containment while open (reuse patterns from Superset's `Modal`)
- [x] 3. Responsive: media-query near-full-width panel on small screens; verify at 375px width
- [x] 4. Distinct UI states:
  - empty state with 2–3 example questions
  - streaming indicator
  - "stopped" marker on aborted answers
  - `TIMEOUT` vs `MODEL_UNAVAILABLE` messaging — both retryable, question preserved
- [x] 5. Jest tests: live-region presence + non-per-token updates; keyboard flows (userEvent tab/enter/escape/shift-enter); each state renders distinctly

## Acceptance criteria (spec §10 widget test 9; §4.2)

- [x] Panel fully operable by keyboard alone
- [x] Streamed content announced via live region without per-token announcements
- [x] All five states (loading/empty/stopped/timeout/unavailable) render distinctly; error states offer retry
- [x] Panel usable at 375×667 viewport

## Verification

```bash
cd superset-frontend && npm run test -- src/features/tutorialAssistant
```
Manual: VoiceOver spot-check; Chrome devtools device toolbar at iPhone SE size; set `REQUEST_TIMEOUT_SECONDS=1` on the service to force timeout; stop the assistant container for the unavailable state.

## Files (~6)

`MessageList.tsx`, `Panel.tsx`, `Composer.tsx`, `index.tsx`, styles, tests

## Execution notes

- Live region: dedicated visually-hidden `role="status" aria-live="polite"` (LiveRegion.tsx) announces only terminal states — completed answer, "Response stopped.", or the error message — never per token. Dropped the implicit `role="log"` on the message list to avoid per-token announcements.
- Keyboard: composer is now `Input.TextArea` — Enter submits, Shift+Enter inserts a newline; Panel traps Tab focus within the dialog (wraps at both ends, skips disabled controls); input is focused on open via a ref effect.
- States: empty state offers three clickable example questions that submit on click; TIMEOUT now shows a distinct "took too long to respond" message vs the generic unavailable one; loading/stopped markers retained.
- Responsive: on <=576px the panel goes near-fullscreen (insets 2u on all sides, auto height) for usability at 375px.
- 14 Jest tests (5 new): focus-on-open, example questions submit, polite live-region announcement, timeout-specific message, and the Tab focus trap.
