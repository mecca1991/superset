---
topic: Dashboard and chart filters
routes:
  - dashboard
  - explore
---

Filters restrict which rows feed a chart or a whole dashboard.

**Chart-level filters** are set in Explore. In the **Data** tab, add a condition to the **Filters** field, for example `country = 'Italy'` or a time range on the time column. These filters are saved with the chart and apply wherever the chart is used.

**Dashboard filters** apply across the charts on a dashboard:

1. Open the dashboard. The **Filters and controls** panel sits on the left edge; expand it with the arrow if it is collapsed.
2. Click the gear icon at the top of the panel and choose **Add or edit filters and controls** to open the **Add or edit display controls** dialog.
3. Click **+ New**, then set **Filter Type**, most commonly **Value**, and pick the **Dataset** and **Column** to filter on.
4. Open the **Scoping** tab to choose whether the filter applies to all charts or only selected ones.
5. Click **Save**. The filter now appears in the panel, where viewers pick values and click **Apply filters**.

Time-based filtering on dashboards uses the **Time range** filter type in the same dialog.

If a chart ignores a dashboard filter, check the filter's scoping and confirm the chart's dataset contains the filtered column.
