# Todo 02 — Widget shell: launcher + panel, hardcoded reply, flag-gated mount

**Milestone:** M1 · **Size:** M · **Depends on:** 01 · **Spec:** §4.1, §4.2, §4.4

## Description

Build the visible skeleton: a floating launcher in the bottom-right of authenticated pages, a ~380×560px panel, an in-memory message list, a composer, and a hardcoded canned response on submit — no network yet. Mount it in `src/views/App.tsx` as a sibling of `<ToastContainer />` inside `RootContextProviders` (inside `Router`, so `useLocation()` works later), wrapped in `<ErrorBoundary showMessage={false}>`, gated by `isFeatureEnabled(FeatureFlag.InAppTutorial)` so the component is **not mounted at all** when the flag is off. Core accessibility lands now: labels, focus-to-input on open, `Escape` closes, focus returns to launcher.

## Tasks

- [x] 1. Create `superset-frontend/src/features/tutorialAssistant/`:
  - `index.tsx` — `TutorialAssistant` root: open/close state, focus management (focus input on open, restore to launcher on close, `Escape` handler)
  - `components/Launcher.tsx` — floating button, accessible name
  - `components/Panel.tsx` — panel chrome, header with close button
  - `components/MessageList.tsx` — in-memory messages
  - `components/Composer.tsx` — input + submit
  - `types.ts` — message/status types; shared error codes `VALIDATION | MODEL_UNAVAILABLE | TIMEOUT`
  - `config.ts` — reads `getBootstrapData().common.tutorial_assistant?.api_url` (from `src/utils/getBootstrapData.ts`)
- [x] 2. Modify `superset-frontend/src/views/App.tsx` (~line 108): conditional render after `<ToastContainer />`:
  ```tsx
  {isFeatureEnabled(FeatureFlag.InAppTutorial) && (
    <ErrorBoundary showMessage={false}>
      <TutorialAssistant />
    </ErrorBoundary>
  )}
  ```
- [x] 3. Style with Emotion + antd theme tokens (no custom CSS beyond positioning): fixed bottom-right, 380×560 desktop; basic near-full-width under a small-screen breakpoint (polish in Todo 08)
- [x] 4. Jest tests `TutorialAssistant.test.tsx` using `spec/helpers/testing-library` (use `test()`, not `describe()`):
  - absent from DOM when flag false
  - renders when flag true; launcher opens/closes panel
  - focus → input on open; `Escape` closes; focus → launcher on close
  - a render-throwing child inside the boundary does not break siblings

## Acceptance criteria (spec §10 widget tests 1, 3, 8, 9)

- [x] Widget absent from DOM when `IN_APP_TUTORIAL` is false; zero assistant code paths execute
- [x] Launcher opens/closes the panel; hardcoded reply renders after submit
- [x] Focus behavior per §4.2 (open → input; Escape → close; close → launcher)
- [x] A thrown widget render error does not break the host page (§4.4)
- [x] Launcher and panel controls have accessible names

## Verification

```bash
cd superset-frontend && npm run test -- src/features/tutorialAssistant
```
Manual: `docker compose up`, open `http://localhost:9000` (webpack dev server), submit a question → canned reply. Toggle `IN_APP_TUTORIAL` to `False` in `docker/pythonpath_dev/superset_config.py`, restart the `superset` container → widget gone, no rebuild.

## Files (~8)

- 7 new under `src/features/tutorialAssistant/`
- 1 modified: `src/views/App.tsx`

## ✅ Checkpoint M1 (after this todo)

**Status:** code + unit tests done (9/9 passing). In-browser verification on :9000 requires the `superset-node` dev-server container (or a frontend rebuild for :8088) — see Environment notes below.

Spec §11 M1 exit: compose stack up with examples; launcher/panel render hardcoded reply; flag controls mounting end-to-end at runtime (bootstrap-delivered, no rebuild). Covers §10 smoke items 1, 2, 4, 6.

## Environment notes (recorded during execution)

- All 9 Jest tests pass: `npm run test -- src/features/tutorialAssistant`.
- The repo pins `@testing-library/user-event` v12 — synchronous API, no `userEvent.keyboard`; Escape is tested with `fireEvent.keyDown`.
- The running compose stack has no `superset-node` service, so `http://localhost:9000` (webpack dev server with the new widget) is not up by default; `http://localhost:8088` serves the image's prebuilt assets and will not show the widget until the frontend is rebuilt or the dev server is started (`docker compose up superset-node`).
