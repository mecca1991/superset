---
topic: Creating a Big Number or KPI chart
routes:
  - explore
---

A Big Number chart displays a single headline value, such as total sales or user count. It is the usual choice for KPI tiles on a dashboard.

To create one:

1. Open **Charts** and click **+ Chart**.
2. Choose a dataset and select **Big Number** from the chart-type gallery. Pick **Big Number with Trendline** instead if you also want a small line showing the value over time.
3. Click **Create new chart**.
4. In Explore's **Data** tab, set **Metric** to the value you want to display, for example COUNT(*) or SUM of a numeric column.
5. For **Big Number with Trendline**, also set the time column and a **Time Grain** so the trendline has points to draw.
6. Optionally add a **Subheader** text under the number.
7. Click **Create chart** to render, then **Save** to store it.

Use the **Customize** tab to control number formatting, such as currency symbols or thousands separators. Filters added in the **Filters** field restrict which rows feed the number, which is how you scope a KPI to a segment or time window.
