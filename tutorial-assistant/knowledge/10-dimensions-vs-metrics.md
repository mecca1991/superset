---
topic: Dimensions compared with metrics
routes:
  - explore
---

Dimensions and metrics play different roles in a chart:

- A **dimension** is a column you group or split by. It is usually qualitative: country, category, browser, status. Dimensions answer "broken down by what?".
- A **metric** is a numeric measurement aggregated across rows: COUNT(*), SUM(sales), AVG(duration). Metrics answer "measuring what?".

In a query, dimensions become the GROUP BY columns and metrics become the aggregated SELECT expressions. Superset builds that query from the **Dimensions** and **Metrics** fields in Explore's **Data** tab.

Example: "revenue by country per month" uses

- Dimensions: country (and a time column on the X-axis with a monthly time grain),
- Metric: SUM(revenue).

Rules of thumb:

- If you would say "per X" or "by X", X is a dimension.
- If you would say "total", "count", "average", or "rate", that is a metric.
- The same column can serve either role: `price` can be a metric as SUM(price), while `price_tier` derived from it can be a dimension.

A chart with metrics but no dimensions shows one overall value; adding dimensions splits it into groups.
