---
topic: Creating a bar chart
routes:
  - explore
---

A bar chart compares a metric across the values of a category.

To create a bar chart:

1. Open **Charts** and click **+ Chart**.
2. Choose a dataset and select **Bar Chart** from the chart-type gallery, then click **Create new chart**.
3. In Explore's **Data** tab, set the **X-Axis** to the column whose values become the bars, for example a category or a time column.
4. Add at least one entry to **Metrics** to control bar height, for example COUNT(*) or SUM of a numeric column.
5. Optionally add a column to **Dimensions** to split each bar into one bar per value (grouped bars).
6. Use **Row Limit** to cap how many bars are drawn.
7. Click **Create chart** to render, then **Save** to store the chart.

In the **Customize** tab you can switch the **Bar orientation** between vertical and horizontal, stack series, and show value labels. If categories appear in an unhelpful order, add a sort in the **Data** tab using **Sort Descending** or the sort controls for the X-axis.
