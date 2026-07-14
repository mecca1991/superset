---
topic: Metrics
routes:
  - explore
---

A metric is a numeric measurement calculated from your data, such as a count of rows, a sum of revenue, or an average duration. Metrics are what charts actually plot.

In Explore, the **Metrics** field (or **Metric** for single-metric chart types) appears in the **Data** tab. When you click it, you can define the metric in two ways:

- **Simple**: pick a column and an aggregate function such as COUNT, SUM, AVG, MIN, or MAX. For example, SUM(sales) or COUNT(*).
- **Custom SQL**: write the aggregation expression yourself, for example `SUM(price * quantity)`.

Datasets can also ship reusable saved metrics. These are defined once on the dataset (by editing the dataset and opening its **Metrics** tab) and then appear in the metric picker under **Saved**, so every chart built on that dataset can reuse the same business definition.

A metric must aggregate, because charts group rows and need one number per group. If you only want to list raw values, use a **Table** chart in **Raw records** query mode instead.

Metrics answer "measuring what?" while dimensions answer "broken down by what?".
