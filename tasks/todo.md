# Tutorial Assistant — Todo Index

Spec: `../Superset_In-App_Tutorial_Assistant_Technical_Specification.md` · Plan: [plan.md](plan.md)

## Branching & PR strategy

- **Integration branch:** `feature/tutorial-assistant` (off `v6.1`), pushed to the `fork` remote (`mecca1991/superset`).
- **Per todo:** branch `todo/NN-<slug>` off `feature/tutorial-assistant`, do the work, push the branch, and open a **PR into `feature/tutorial-assistant`** for review (user-decided after Todo 02; Todo 02 itself was merged locally). GitHub Actions is disabled on the fork, so PRs trigger no CI.
- The single PR `v6.1 ← feature/tutorial-assistant` is still opened at Todo 09, after the final rebase and full test matrix (re-enable Actions first if that final CI run is wanted).
- Before starting each todo: `git fetch origin v6.1 && git rebase origin/v6.1 feature/tutorial-assistant` (while nothing is stacked on top).

| # | Todo | Milestone | Size | Depends on | Status |
|---|------|-----------|------|------------|--------|
| 01 | [Branch, env repair, plan docs, flag + bootstrap plumbing](todo-01-branch-flag-bootstrap.md) | M1 | S | — | ✅ done |
| 02 | [Widget shell: launcher + panel, hardcoded reply](todo-02-widget-shell.md) | M1 | M | 01 | ✅ done |
| 03 | [Assistant service skeleton: settings, schemas, knowledge loader, /health](todo-03-service-skeleton.md) | M2 | M | — | ✅ done |
| 04 | [Streaming /ask: Anthropic, SSE, caching, cancellation](todo-04-streaming-ask.md) | M2 | L | 03 | ✅ done |
| 05 | [Knowledge pack: author + verify 15 files](todo-05-knowledge-pack.md) | M2 | M | 01, 03 | ✅ done |
| 06 | [Wire widget to service: stream client, route context, abort, markdown](todo-06-wire-widget.md) | M2 | M | 02, 04 | ✅ done |
| 07 | [Compose integration: assistant sidecar, loopback binding](todo-07-compose-integration.md) | M3 | S | 03 | ✅ done |
| 08 | [A11y completion, responsive panel, full state coverage](todo-08-a11y-states.md) | M3 | M | 06 | ⬜ not started |
| 09 | [Hardening, smoke test, docs, patch artifact, demo](todo-09-hardening-demo.md) | M3 | M | all | ⬜ not started |
| 10 | [Model evaluation and provider abstraction](todo-10-model-evaluation.md) | post-v1 | M | 01–09 | ⬜ deferred |

## Checkpoints

- **M1** after 02 — compose stack up with examples; launcher/panel render hardcoded reply; feature flag controls mounting at runtime (no rebuild). Spec §11 M1 exit.
- **M2** after 04+05+06 — three demo questions answered with route-aware grounding; unrelated question declined; Jest + pytest suites green. Spec §11 M2 exit.
- **M3** after 09 — clean-checkout smoke test passes (all six §10 steps); demo recorded. Spec §11 M3 exit.

## Parallel tracks (after 01)

- **Track A (frontend):** 02 → 06 → 08
- **Track B (service):** 03 → 04 → 07
- **Track C (content):** 05 (authoring can start right after 01; loader validation joins after 03)

Status legend: ⬜ not started · 🔄 in progress · ✅ done
