---
topic: SQL Lab basics
routes:
  - sqllab
---

SQL Lab is Superset's SQL editor for exploring data with queries.

To run a query:

1. In the top navigation bar, open **SQL** and choose **SQL Lab**.
2. In the left panel, pick the **Database** and **Schema**, then use the object-name search box to find a table; selecting one lists its columns below.
3. Type your query in the editor, for example `SELECT * FROM my_table LIMIT 100;`.
4. Click **Run** (or press Ctrl+Enter / Cmd+Enter). Results appear in the grid under the editor.

Useful features:

- **Limit** control next to Run caps returned rows.
- Multiple editor tabs let you keep several queries open.
- **Save** stores the query under **SQL → Saved Queries**; **Query History** under the same menu lists past runs.
- **Copy link** shares the current query with other users.

To turn results into a visualization, run the query and use the **Create Chart** action on the results pane. This creates a dataset backed by your query and opens Explore, where you build the chart as usual.

SQL Lab only queries databases that were added under **Settings → Database Connections**, and respects each database's permissions and row limits.
