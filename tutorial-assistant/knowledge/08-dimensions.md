---
topic: Dimensions
routes:
  - explore
---

A dimension is a column used to group, split, or filter your data. Dimensions are usually qualitative values such as country, product category, device type, or status.

In Explore, the **Dimensions** field appears in the **Data** tab for chart types that support grouping. When you add a column there, the query groups rows by that column's values:

- In a bar chart, each dimension value can become its own bar or bar group.
- In a line chart, adding a dimension draws one line per value.
- In a table with **Aggregate** query mode, each dimension becomes a grouping column.

To add a dimension, drag a column from the dataset panel on the left into **Dimensions**, or click the field and pick a column. You can also define an ad-hoc dimension with **Custom SQL**, for example an expression that buckets values.

Adding more dimensions increases the number of groups the query returns, so charts can become crowded; the **Row Limit** field caps the result size.

Dimensions answer "broken down by what?" while metrics answer "measuring what?". A useful chart usually combines one or two dimensions with one metric.
