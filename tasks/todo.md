# Tutorial Assistant — Todo Index

Spec: `../Superset_In-App_Tutorial_Assistant_Technical_Specification.md` · Plan: [plan.md](plan.md)
Branch: `feature/tutorial-assistant` (off `v6.1`). Before starting each todo: `git fetch && git rebase v6.1`.

| # | Todo | Milestone | Size | Depends on | Status |
|---|------|-----------|------|------------|--------|
| 01 | [Branch, env repair, plan docs, flag + bootstrap plumbing](todo-01-branch-flag-bootstrap.md) | M1 | S | — | ✅ done |
| 02 | [Widget shell: launcher + panel, hardcoded reply](todo-02-widget-shell.md) | M1 | M | 01 | ⬜ not started |
| 03 | [Assistant service skeleton: settings, schemas, knowledge loader, /health](todo-03-service-skeleton.md) | M2 | M | — | ⬜ not started |
| 04 | [Streaming /ask: Anthropic, SSE, caching, cancellation](todo-04-streaming-ask.md) | M2 | L | 03 | ⬜ not started |
| 05 | [Knowledge pack: author + verify 15 files](todo-05-knowledge-pack.md) | M2 | M | 01, 03 | ⬜ not started |
| 06 | [Wire widget to service: stream client, route context, abort, markdown](todo-06-wire-widget.md) | M2 | M | 02, 04 | ⬜ not started |
| 07 | [Compose integration: assistant sidecar, loopback binding](todo-07-compose-integration.md) | M3 | S | 03 | ⬜ not started |
| 08 | [A11y completion, responsive panel, full state coverage](todo-08-a11y-states.md) | M3 | M | 06 | ⬜ not started |
| 09 | [Hardening, smoke test, docs, patch artifact, demo](todo-09-hardening-demo.md) | M3 | M | all | ⬜ not started |

## Checkpoints

- **M1** after 02 — compose stack up with examples; launcher/panel render hardcoded reply; feature flag controls mounting at runtime (no rebuild). Spec §11 M1 exit.
- **M2** after 04+05+06 — three demo questions answered with route-aware grounding; unrelated question declined; Jest + pytest suites green. Spec §11 M2 exit.
- **M3** after 09 — clean-checkout smoke test passes (all six §10 steps); demo recorded. Spec §11 M3 exit.

## Parallel tracks (after 01)

- **Track A (frontend):** 02 → 06 → 08
- **Track B (service):** 03 → 04 → 07
- **Track C (content):** 05 (authoring can start right after 01; loader validation joins after 03)

Status legend: ⬜ not started · 🔄 in progress · ✅ done
