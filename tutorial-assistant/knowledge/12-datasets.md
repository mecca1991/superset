---
topic: Datasets
routes:
  - list
  - explore
---

A dataset is Superset's semantic layer over a database table or SQL query. Charts are always built on a dataset, not directly on a table. The dataset defines which columns are available, which are temporal, and which saved metrics exist.

To create a dataset from a table:

1. In the top navigation bar, open **Datasets**.
2. Click the **+ Dataset** button in the top-right corner.
3. Pick the **Database**, **Schema**, and **Table**.
4. Click **Create dataset and create chart**. The dataset is saved and you continue straight into chart creation.

To adjust a dataset after creating it, hover over its row on the **Datasets** page and click the **Edit** (pencil) action. The edit dialog has tabs including:

- **Columns**: mark a column as temporal, filterable, or groupable, and set labels.
- **Calculated columns**: define new columns with SQL expressions.
- **Metrics**: define reusable saved metrics for every chart on this dataset.

A dataset can also be created from SQL Lab by saving a query's result definition as a dataset, which is useful when a chart needs a query rather than a single table.
