# Todo 10 — Model evaluation and provider abstraction (post-v1)

**Milestone:** post-implementation (v2) · **Size:** M · **Depends on:** 01–09 complete · **Spec:** §13 v2 backlog ("Provider abstraction if a second model vendor is required")

## Why

v1 is deliberately tied to Anthropic Claude (`MODEL=claude-opus-4-8`): the official Anthropic Python client, the prompt-caching strategy (`cache_control: ephemeral`), and the SSE streaming shape are all written against that SDK. That was the right call for a reproducible demo, but it hard-codes one vendor. This todo revisits that choice **after** the feature works end to end — not before — so the evaluation is grounded in a working baseline rather than speculation.

Do **not** start this until Todos 01–09 are merged and the demo is reproducible. Premature abstraction would slow v1 for a second vendor that may never be needed.

## Questions to answer

- [ ] **Is a second provider actually needed?** Capture the concrete trigger (cost, latency, availability, org policy, offline/self-hosted requirement, or a specific model that answers Superset questions better). If there is no trigger, record that and stop — YAGNI.
- [ ] **Answer quality per model.** Run the same question set (the 3 demo questions + the adversarial/out-of-scope fixtures from Todo 09) across candidate models and score grounding, refusal correctness, and instruction-boundary adherence.
- [ ] **Caching parity.** Each candidate's equivalent of prompt caching (or lack of it) and its effect on cost/latency, since v1's economics depend on the cached ~4.6k-token prefix.
- [ ] **Streaming + cancellation parity.** Whether the candidate SDK supports incremental token streaming and mid-stream cancellation the way `stream_model_events` / disconnect handling rely on.
- [ ] **Cost and latency** at the demo's request profile.

## Candidate work if a second provider is justified

- [ ] Introduce a thin provider interface behind `/ask`: `build_messages(...)`, `stream(...)`-style adapter, and a normalized usage/error mapping to the existing `VALIDATION | MODEL_UNAVAILABLE | TIMEOUT` codes. Keep the route/user-turn/cached-prefix contract identical across providers.
- [ ] Move Anthropic-specific pieces (`cache_control` breakpoint placement, `AnthropicError` mapping, usage field names) behind that interface.
- [ ] Add a `PROVIDER` env var alongside `MODEL`; keep Anthropic the default so v1 behavior is unchanged.
- [ ] Provider-parameterized tests reusing the existing fake-client pattern (`tests/fakes.py`).

## Acceptance criteria

- [ ] A written recommendation: stay single-provider, or adopt an abstraction with a named second provider and the trigger that justified it.
- [ ] If abstraction is adopted: Anthropic path is behavior-identical to v1 (same tests green), and at least one alternate provider passes the same streaming/cancellation/error-code test matrix.
- [ ] Demo reproducibility (spec §10 smoke) still holds with the default provider.

## Notes

- Keep `MODEL` pinned to an explicit ID per provider (spec §2 decisions): no moving "current model" default.
- The knowledge-boundary system prompt (`prompts.py`) is provider-agnostic prose and should port unchanged; only the transport/caching/usage plumbing is provider-specific.
