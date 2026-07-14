---
topic: Connecting a database
routes:
  - other
---

Superset reads data through database connections. You need one connection before datasets and charts can be created.

To connect a database:

1. Open the **Settings** menu in the top-right of the navigation bar and choose **Database Connections**.
2. Click the **+ Database** button in the top-right corner.
3. In the **Connect a database** dialog, pick your database engine, for example **PostgreSQL** or **MySQL**. If it is not listed, choose **Other** under supported databases.
4. For the common engines, fill in the connection fields: **Host**, **Port**, **Database name**, **Username**, and **Password**, then continue. Some engines instead take a single **SQLAlchemy URI**.
5. Click **Connect** to test and save the connection.

Optional behaviour lives under the **Advanced** settings of the same dialog, including whether SQL Lab can run DML statements against this database and asynchronous query execution.

The database's driver must be installed in the Superset environment; a missing driver produces an error naming the required package when you try to connect. After connecting, the database appears in **Datasets** creation and in SQL Lab's database selector.
