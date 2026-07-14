---
topic: Creating a line chart
routes:
  - explore
---

A line chart shows how one or more metrics change over a continuous axis, usually time.

To create a line chart:

1. Open **Charts** and click **+ Chart**.
2. Choose a dataset that contains a time or numeric column.
3. Select **Line Chart** from the chart-type gallery and click **Create new chart**.
4. In Explore's **Data** tab, set the **X-Axis** field, typically the dataset's time column.
5. If you use a time column, pick a **Time Grain** such as Day, Week, or Month to control how points are bucketed.
6. Add at least one entry to **Metrics**, for example COUNT(*) or SUM of a numeric column.
7. Optionally add a column to **Dimensions** to draw one line per value of that column.
8. Click **Create chart** to render the lines.
9. Click **Save** to store the chart.

If the chart is empty, check the time range filter in the **Filters** field; the default range may exclude your data. Use the **Customize** tab to adjust axis labels, legend placement, and colors.
