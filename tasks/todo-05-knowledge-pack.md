# Todo 05 — Knowledge pack: author + verify the 15 files

**Milestone:** M2 · **Size:** M · **Depends on:** 01 (running stack), 03 (loader validation) · **Spec:** §7 · **Parallel track:** authoring can start any time after Todo 01

## Description

Write the 15 topic files with `topic`/`routes` frontmatter, each ≤ 300 words, using the **exact labels and paths from the running Superset 6.1.0 UI**. Every instruction is click-verified in the browser against the compose stack (with examples loaded) before a file is accepted. Numeric filename prefixes fix the deterministic load order. The `routes` frontmatter is forward-looking metadata (v1 loads all files unconditionally) but is validated now so v2 retrieval inherits clean data.

## Topics (spec §7)

| # | File | Topic | routes |
|---|------|-------|--------|
| 01 | `01-creating-a-dashboard.md` | Creating a dashboard | dashboard |
| 02 | `02-creating-a-chart.md` | Creating a chart | explore |
| 03 | `03-creating-a-line-chart.md` | Creating a line chart | explore |
| 04 | `04-creating-a-bar-chart.md` | Creating a bar chart | explore |
| 05 | `05-creating-a-pie-chart.md` | Creating a pie chart | explore |
| 06 | `06-creating-a-big-number-chart.md` | Creating a Big Number or KPI chart | explore |
| 07 | `07-creating-a-table-chart.md` | Creating a table chart | explore |
| 08 | `08-dimensions.md` | Dimensions | explore |
| 09 | `09-metrics.md` | Metrics | explore |
| 10 | `10-dimensions-vs-metrics.md` | Dimensions compared with metrics | explore |
| 11 | `11-dashboard-and-chart-filters.md` | Dashboard and chart filters | dashboard |
| 12 | `12-datasets.md` | Datasets | list |
| 13 | `13-connecting-a-database.md` | Connecting a database | other |
| 14 | `14-sql-lab-basics.md` | SQL Lab basics | sqllab |
| 15 | `15-editing-and-arranging-a-dashboard.md` | Editing and arranging a dashboard | dashboard |

(Adjust `routes` lists during verification — multiple values allowed.)

## Tasks

- [x] 1. Author all 15 files in `tutorial-assistant/knowledge/` with frontmatter per spec §7
- [x] 2. Verify each procedure click-by-click in the running 6.1.0 UI (`http://localhost:8088` or `:9000`); correct label drift; record verification notes below
- [x] 3. Remove the Todo 03 placeholder files
- [x] 4. Add `tests/test_knowledge_pack.py`: asserts 15 files, unique topics, all pass the validator, and an estimated pack token count above the 4096-token cache minimum
- [x] 5. Tune the system-prompt boundary instructions in `prompts.py` if authoring reveals gaps; add adversarial fixtures (out-of-scope question, prompt-injection attempt) for Todos 06/09

## Acceptance criteria (spec §10 smoke 3; §11 M2 exit)

- [x] Exactly 15 valid files; `/health` reports `knowledge_docs` equal to the file count
- [x] Each file ≤ 300 words with valid unique `topic` + valid `routes`
- [x] Every UI label/path verified in the running 6.1.0 app (notes recorded here)
- [x] The three demo questions ("How do I create a dashboard?", "How do I create a line chart?", "What is a dimension?") get grounded answers; an unrelated question (e.g. "How do I configure Kafka?") is declined without invented guidance

## Verification

```bash
cd tutorial-assistant && uv run pytest tests/test_knowledge_pack.py -q
curl -s localhost:8100/health | jq .knowledge_docs   # → 15
# Live curls: 3 demo questions + 1 out-of-scope question
```

## Verification notes (click-through against running 6.1.0, examples loaded)

Verified in the browser at http://localhost:8088 using the `birth_names`,
`cleaned_sales_data`, and example dashboards.

| File | Verified in UI | Corrections made |
|------|----------------|------------------|
| 01 Dashboard | ✅ Dashboards list, **+ Dashboard**, edit mode | none |
| 02 Chart | ✅ Charts, **+ Chart**, **Choose a dataset**, chart gallery, **Create new chart** | none |
| 03 Line chart | ✅ Explore: **X-axis**, **Time Grain**, **Metrics**, **Create chart**, **Save** | none |
| 04 Bar chart | ✅ **Bar Chart** in gallery; Explore controls shared with 03 | none |
| 05 Pie chart | ✅ **Pie Chart** in gallery | none |
| 06 Big Number | ✅ **Big Number** and **Big Number with Trendline** in gallery | none |
| 07 Table | ✅ **Table** in gallery | none |
| 08 Dimensions | ✅ column popover **Saved / Simple / Custom SQL** | none |
| 09 Metrics | ✅ metric popover **Saved / Simple / Custom SQL**, COUNT(*)/sum__num | none |
| 10 Dims vs metrics | ✅ conceptual, consistent with 08/09 | none |
| 11 Filters | ✅ **Filters and controls** panel; gear → **Add or edit filters and controls**; **Add or edit display controls** dialog, **+ New**, **Filter Type: Value**, **Scoping** tab | **fixed**: was "filter bar" / "+ Add/Edit Filters"; now the gear-menu path and correct dialog/labels |
| 12 Datasets | ✅ Datasets, **+ Dataset**, **Database/Schema/Table** | none |
| 13 Connect DB | ✅ Settings → **Database Connections**, **+ Database**, engine tiles, step 2 **Host/Port/Database name/Username/Password**, **Connect** | none |
| 14 SQL Lab | ✅ **SQL → SQL Lab**, Database/Schema selectors, object-name search, **Run**, **Results/Query history** | **fixed**: removed nonexistent "See table schema" label; described the object-name search box |
| 15 Edit dashboard | ✅ **Edit dashboard**, **⋮** menu | none |

## Files (~17)

15 knowledge files, `tests/test_knowledge_pack.py`
