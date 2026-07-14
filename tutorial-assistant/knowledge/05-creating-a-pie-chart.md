---
topic: Creating a pie chart
routes:
  - explore
---

A pie chart shows how a single metric is divided across the values of one category.

To create a pie chart:

1. Open **Charts** and click **+ Chart**.
2. Choose a dataset and select **Pie Chart** from the chart-type gallery, then click **Create new chart**.
3. In Explore's **Data** tab, add the category column to **Dimensions**. Each distinct value becomes one slice.
4. Add one entry to **Metric** to control slice size, for example COUNT(*) or SUM of a numeric column.
5. Use **Row Limit** to cap the number of slices.
6. Click **Create chart** to render, then **Save** to store the chart.

Pie charts work best with a small number of slices. If your category has many values, either filter it in the **Filters** field or keep the row limit low so small slices do not clutter the chart.

In the **Customize** tab you can switch between a full pie and a donut, show or hide labels, and change what the labels display, such as the category name, value, or percentage.
