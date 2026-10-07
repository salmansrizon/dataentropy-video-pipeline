# Core SQL topics: sourced research note

Purpose: factual basis for short (about 30 s, 9:16) DataEntropy explainer videos for beginners.
Retrieved: 2026-10-06. Sources: vendor reference documentation only (PostgreSQL, SQLite, MySQL 8.4, Microsoft Learn T-SQL).

How to read this note

- Sections 1 to 3 are sourced facts. Every claim carries a link to the page that owns it.
- Section 4 is suggestions (video groupings and metaphors). They are not sourced facts.
- Section 5 lists what could not be verified. Section 6 lists sources that could not be fetched.
- "Misconception" lines are an editorial judgement about what beginners tend to believe; only the correction is sourced.
- Example queries use a fictional schema, `customers(id, name, city)` and `orders(id, customer_id, amount, placed_on)`. They were written for this note and were not executed. Where an example is copied from a vendor page, it says so.
- Quotation caveat: most pages were read through a fetch tool that summarises with a small model, so quoted wording can drift. Re-open the linked page before putting any quote on screen. The SQLite `lang_select` quotes were extracted from the raw page text and are exact.

---

## 1. Core topics

### 1.1 Table, row, column

- Definition: a table is a named collection of rows, and every row has the same named, typed columns.
- Precise behaviour: "Each table is a named collection of rows. Each row of a given table has the same set of named columns, and each column is of a specific data type." Columns have a fixed order; rows do not: "SQL does not guarantee the order of the rows within the table in any way." [PG tutorial: concepts][pg-concepts]
- "Relation is essentially a mathematical term for table." [PG tutorial: concepts][pg-concepts]
- Example: `SELECT * FROM customers;`
- Misconception: "A table is a spreadsheet, so row 5 is always row 5." Correction: rows have no inherent position; only `ORDER BY` fixes an order. [PG tutorial: concepts][pg-concepts]
- Dialect flag: SQLite is "flexibly typed"; a column's type is advisory, and a non-numeric string put in an INTEGER column is stored as text without an error. SQLite also has no separate BOOLEAN or DATETIME type. [SQLite quirks][sqlite-quirks]

### 1.2 SELECT and FROM

- Definition: `FROM` names the table(s) to read; `SELECT` lists the output columns or expressions computed for each row.
- Precise behaviour: all `FROM` elements are computed first (several elements are cross-joined), then "the actual output rows are computed using the SELECT output expressions for each selected row or row group." [PG SELECT][pg-select]
- `SELECT ALL` is the default and returns duplicates; `SELECT DISTINCT` removes duplicate rows. [PG SELECT][pg-select]
- Example: `SELECT name, city FROM customers;`
- Misconception: "SELECT runs first because it is written first." Correction: in the documented logical order it is processed after FROM, WHERE, GROUP BY and HAVING. See 1.16. [PG SELECT][pg-select], [T-SQL SELECT][ms-select]

### 1.3 WHERE filtering

- Definition: `WHERE` keeps only the rows for which a condition is true.
- Precise behaviour: "If the result of the condition is true, the row is kept in the output table, otherwise (i.e., if the result is false or null) it is discarded." [PG table expressions][pg-tableexpr]
- Example: `SELECT name FROM customers WHERE city = 'Dhaka';`
- Misconception: "WHERE removes rows where the condition is false." Correction: it also removes rows where the condition is null (unknown). A row with a NULL `city` matches neither `city = 'Dhaka'` nor `city <> 'Dhaka'`. [PG table expressions][pg-tableexpr], [PG comparison][pg-comparison]
- A column alias defined in SELECT cannot be used in WHERE. PostgreSQL: allowed in ORDER BY and GROUP BY "but not in the WHERE or HAVING clauses". [PG SELECT][pg-select] MySQL: "It is not permissible to refer to a column alias in a WHERE clause, because the column value might not yet be determined when the WHERE clause is executed." [MySQL SELECT][my-select]

### 1.4 ORDER BY and LIMIT

- Definition: `ORDER BY` sorts the result; a row-limiting clause returns only part of it.
- Precise behaviour, ordering: without ORDER BY "the rows will be returned in an unspecified order ... it must not be relied on." [PG sorting][pg-order] SQLite: "the order in which the rows are returned is undefined." [SQLite SELECT][sqlite-select] SQL Server: order "isn't guaranteed unless an ORDER BY clause is specified." [T-SQL ORDER BY][ms-orderby]
- Default direction is ascending. [MySQL sorting][my-sorting], [T-SQL ORDER BY][ms-orderby]
- Precise behaviour, limiting: without an ORDER BY that makes the order unique "you will get an unpredictable subset of the query's rows", and repeated runs may return different subsets. [PG SELECT][pg-select] SQL Server: `TOP` without ORDER BY "returns the first n number of rows in an undefined order." [T-SQL TOP][ms-top]
- Ties: if several rows share the same ORDER BY values, "the server is free to return those rows in any order". Add a unique column to the ORDER BY to make it deterministic. [MySQL LIMIT optimization][my-limitopt]
- Example (PostgreSQL, MySQL, SQLite): `SELECT name FROM customers ORDER BY name LIMIT 5;`
- Misconception: "Rows come back in the order I inserted them." Correction: no documented guarantee in any of the four systems; see the links above.
- Dialect flags: LIMIT syntax and NULL placement differ. See section 2.

### 1.5 Aggregate functions and GROUP BY

- Definition: an aggregate function combines many input values into one value; `GROUP BY` forms the groups it is computed over.
- Precise behaviour: an aggregate "combines (aggregates) multiple input values, for example by counting, averaging or adding, yielding a single output value." [PG glossary][pg-glossary] With GROUP BY "the output is combined into groups of rows that match on one or more values, and the results of aggregate functions are computed." [PG SELECT][pg-select]
- NULL handling: `count(*)` counts input rows; `count(expr)` counts rows where the value is not null; `sum`, `avg`, `min`, `max` use the non-null values. [PG aggregate functions][pg-agg]
- Empty input: "sum of no rows returns null, not zero as one might expect"; only `count` returns a number. [PG aggregate functions][pg-agg]
- "Two NULL values are regarded as equal in a GROUP BY." [MySQL working with NULL][my-null]
- Example: `SELECT customer_id, count(*), sum(amount) FROM orders GROUP BY customer_id;`
- Misconception: "count(column) and count(*) are the same." Correction: `count(column)` skips NULLs. [PG aggregate functions][pg-agg]
- Dialect flag: which non-grouped columns may appear in SELECT differs. See section 2.

### 1.6 HAVING versus WHERE

- Definition: `WHERE` filters rows before grouping; `HAVING` filters groups after grouping.
- Precise behaviour: "WHERE selects input rows before groups and aggregates are computed ... whereas HAVING selects group rows after groups and aggregates are computed." Therefore WHERE cannot contain aggregates. [PG tutorial: aggregates][pg-tutagg]
- Example (vendor): `SELECT city, count(*), max(temp_lo) FROM weather GROUP BY city HAVING max(temp_lo) < 40;` [PG tutorial: aggregates][pg-tutagg]
- Misconception: "HAVING is just WHERE for a different position." Correction: they act on different things (rows versus groups). MySQL warns "Do not use HAVING for items that should be in the WHERE clause." [MySQL SELECT][my-select]

### 1.7 JOINs

- Definition: a join combines rows from two tables into one wider result.
- Precise behaviour [PG table expressions][pg-tableexpr]:
  - CROSS: every combination. "If the tables have N and M rows respectively, the joined table will have N * M rows."
  - INNER: "For each row R1 of T1, the joined table has a row for each row in T2 that satisfies the join condition with R1."
  - LEFT OUTER: an inner join, then every unmatched T1 row is added "with null values in columns of T2". The result "always has at least one row for each row in T1."
  - RIGHT OUTER: the converse; every T2 row is kept.
  - FULL OUTER: inner join plus unmatched rows from both sides, null-filled.
- SQL Server gives the same definitions; INNER is the default when no type is written. [T-SQL FROM][ms-from]
- Example: `SELECT c.name, o.amount FROM customers c LEFT JOIN orders o ON o.customer_id = c.id;`
- Misconception 1: "A join returns one row per row of the left table." Correction: an inner or outer join returns one row per matching pair, so one customer with three orders yields three rows. [PG table expressions][pg-tableexpr]
- Misconception 2: "A filter means the same in ON and in WHERE." Correction: "a restriction placed in the ON clause is processed before the join, while a restriction placed in the WHERE clause is processed after the join. That does not matter with inner joins, but it matters a lot with outer joins." [PG table expressions][pg-tableexpr]; same statement in [T-SQL FROM][ms-from].
- Dialect flags: FULL JOIN support and the meaning of bare JOIN differ. See section 2.

### 1.8 Primary and foreign keys

- Definition: a primary key uniquely identifies each row; a foreign key requires a value to match a row in another table.
- Precise behaviour, primary key: the values must be "both unique and not null", and "A table can have at most one primary key." [PG constraints][pg-constraints]
- Precise behaviour, foreign key: values "must match the values appearing in some row of another table. We say this maintains the referential integrity between two related tables." [PG constraints][pg-constraints]
- Deleting a referenced row: the default is `NO ACTION`, which normally raises an error; `CASCADE`, `SET NULL`, `SET DEFAULT` and `RESTRICT` are alternatives that must be declared. [PG constraints][pg-constraints]
- A foreign key column may be NULL: "a referencing row need not satisfy the foreign key constraint if any of its referencing columns are null." [PG constraints][pg-constraints]
- Example (vendor): `CREATE TABLE orders (order_id integer PRIMARY KEY, product_no integer REFERENCES products (product_no), quantity integer);` [PG constraints][pg-constraints]
- Misconception: "Deleting a customer automatically deletes their orders." Correction: only if `ON DELETE CASCADE` was declared; the default blocks the delete. [PG constraints][pg-constraints]
- Dialect flags: SQLite does not enforce foreign keys by default and can allow NULL in a primary key. See section 2.

### 1.9 NULL and three-valued logic

- Definition: NULL marks a missing or unknown value; comparisons with it are neither true nor false.
- Precise behaviour: "SQL uses a three-valued logic system with true, false, and null, which represents 'unknown'." `TRUE AND NULL` is NULL, `FALSE AND NULL` is FALSE, `TRUE OR NULL` is TRUE, `FALSE OR NULL` is NULL, `NOT NULL` is NULL. [PG logical operators][pg-logical]
- "Ordinary comparison operators yield null (signifying 'unknown'), not true or false, when either input is null." Use `IS NULL` / `IS NOT NULL`. "Do not write expression = NULL because NULL is not 'equal to' NULL." [PG comparison][pg-comparison]
- MySQL shows `1 = NULL`, `1 <> NULL`, `1 < NULL`, `1 > NULL` all returning NULL. [MySQL working with NULL][my-null]
- NULL is not zero and not an empty string: zero and '' "are in fact values, whereas NULL means 'not having a value'." [MySQL working with NULL][my-null]
- `NOT IN` trap: if the list or subquery contains a NULL and no equal value is found, the result "will be null, not true", so the row is filtered out. [PG subquery expressions][pg-subq]
- Example: `SELECT name FROM customers WHERE city IS NULL;`
- Misconception: "`WHERE city = NULL` finds the rows with no city." Correction: with standard behaviour it returns zero rows. [T-SQL SET ANSI_NULLS][ms-ansinulls]
- Dialect flags: legacy switches change `= NULL`; NULL sort position and UNIQUE handling differ. See section 2.

### 1.10 INSERT, UPDATE, DELETE

- Definition: the three statements that add rows, change values in existing rows, and remove rows.
- Precise behaviour, INSERT: "Data is inserted one row at a time ... Even if you know only some column values, a complete row must be created." Unlisted columns get their default, or NULL if none. [PG inserting data][pg-insert]
- Precise behaviour, UPDATE: if WHERE is omitted "all rows in the table are updated." An update matching no rows is not an error. Rows are addressed by condition, because "SQL does not, in general, provide a unique identifier for rows"; a primary key is what lets you address one row reliably. [PG updating data][pg-update]
- Precise behaviour, DELETE: "you can only remove entire rows from a table." `DELETE FROM products;` with no WHERE deletes every row. [PG deleting data][pg-delete]
- Examples (vendor): `INSERT INTO products (product_no, name, price) VALUES (1, 'Cheese', 9.99);` [PG inserting data][pg-insert] `UPDATE products SET price = 10 WHERE price = 5;` [PG updating data][pg-update] `DELETE FROM products WHERE price = 10;` [PG deleting data][pg-delete]
- Misconception: "UPDATE and DELETE act on one row unless told otherwise." Correction: without WHERE they act on every row. [PG updating data][pg-update], [PG deleting data][pg-delete]

### 1.11 Subqueries and CTEs (WITH)

- Definition: a subquery is a query nested inside another; a CTE is a named subquery written up front with `WITH`.
- Precise behaviour, subquery: `EXISTS (subquery)` is true if the subquery returns at least one row; `expr IN (subquery)` requires a one-column subquery and is true if any equal row is found. [PG subquery expressions][pg-subq] A subquery in FROM is a "derived table" used as input to the outer query. [T-SQL FROM][ms-from]
- Precise behaviour, CTE: CTEs "can be thought of as defining temporary tables that exist just for one query." [PG WITH queries][pg-with] MySQL: "a named temporary result set that exists within the scope of a single statement and that can be referred to later within that statement, possibly multiple times." [MySQL WITH][my-with] SQLite: CTEs "act like temporary views that exist only for the duration of a single SQL statement." [SQLite WITH][sqlite-with]
- `WITH RECURSIVE` lets a query refer to its own output (hierarchies, trees). [PG WITH queries][pg-with], [SQLite WITH][sqlite-with]
- Example: `WITH totals AS (SELECT customer_id, sum(amount) AS total FROM orders GROUP BY customer_id) SELECT * FROM totals WHERE total > 100;`
- Misconception: "A CTE is always computed once and stored." Correction: in PostgreSQL a side-effect-free, non-recursive CTE referenced once can be folded into the parent query; `MATERIALIZED` / `NOT MATERIALIZED` override this. [PG WITH queries][pg-with] SQLite has the same hints from 3.35.0. [SQLite WITH][sqlite-with] So "temporary table" is a mental model, not a storage promise.

### 1.12 Indexes

- Definition: an index is an extra structure, derived from a table, that lets the database find rows without reading the whole table.
- Precise behaviour: without one "the system would have to scan the entire ... table, row by row". The documentation's own analogy is the alphabetical index at the back of a book. [PG indexes: introduction][pg-idx]
- The database, not the query author, decides: it uses the index "when it thinks doing so would be more efficient than a sequential table scan." [PG indexes: introduction][pg-idx]
- Cost: the index must be kept in sync, which "adds overhead to data manipulation operations", so rarely used indexes should be removed. [PG indexes: introduction][pg-idx]
- Indexes also help UPDATE and DELETE with search conditions, and joins. [PG indexes: introduction][pg-idx]
- A primary key creates a unique index automatically. [PG constraints][pg-constraints]
- Example (vendor): `CREATE INDEX test1_id_index ON test1 (id);` [PG indexes: introduction][pg-idx]
- Misconception: "More indexes always means faster." Correction: every index slows writes, and the planner may not use it. [PG indexes: introduction][pg-idx]
- An index does not change query results, only how they are found; it is "data derived from a table". [PG glossary][pg-glossary]

### 1.13 Transactions and ACID

- Definition: a transaction bundles several statements into one all-or-nothing unit.
- Precise behaviour: "it bundles multiple steps into a single, all-or-nothing operation." Updates are logged to permanent storage "before the transaction is reported complete", and an open transaction's updates "are invisible to other transactions until the transaction completes". [PG tutorial: transactions][pg-tx]
- ACID: "Atomicity, Consistency, Isolation, and Durability." Atomicity: all operations complete or none do. Consistency: data always complies with integrity constraints. Isolation: effects are not visible to concurrent transactions before commit. Durability: committed changes survive a crash. [PG glossary][pg-glossary]
- Without an explicit `BEGIN`, PostgreSQL wraps each statement in its own implicit transaction. [PG tutorial: transactions][pg-tx]
- Example: `BEGIN; UPDATE accounts SET balance = balance - 100 WHERE id = 1; UPDATE accounts SET balance = balance + 100 WHERE id = 2; COMMIT;` (pattern from [PG tutorial: transactions][pg-tx])
- Misconception: "Isolation means transactions never affect each other." Correction: isolation comes in levels; at Read Committed, nonrepeatable and phantom reads are possible. [PG transaction isolation][pg-iso]
- Dialect flags: default isolation level and engine coverage differ. See section 2.

### 1.14 Window functions

- Definition: a window function computes a value for each row using a set of related rows, without collapsing them.
- Precise behaviour: unlike aggregates, window functions "do not cause rows to become grouped into a single output row ... the rows retain their separate identities." [PG tutorial: window functions][pg-window] MySQL: "a window function produces a result for each query row." [MySQL window functions][my-window]
- `OVER` marks a window function; `PARTITION BY` splits the rows into groups; `ORDER BY` inside `OVER` sets processing order and need not match the output order. [PG tutorial: window functions][pg-window], [T-SQL OVER][ms-over]
- Frame default: with `ORDER BY` in `OVER`, the frame runs from the start of the partition to the current row (plus its ties); without it, the frame is the whole partition. This is why `sum(...) OVER (ORDER BY ...)` gives a running total. [PG tutorial: window functions][pg-window], [T-SQL OVER][ms-over]
- Allowed "only in the SELECT list and the ORDER BY clause", because they "logically execute after" WHERE, GROUP BY and HAVING. [PG tutorial: window functions][pg-window] Same rule in [MySQL window functions][my-window] and [SQLite window functions][sqlite-window].
- Example (vendor): `SELECT depname, empno, salary, avg(salary) OVER (PARTITION BY depname) FROM empsalary;` [PG tutorial: window functions][pg-window]
- Misconception: "PARTITION BY is another GROUP BY." Correction: GROUP BY returns one row per group; PARTITION BY keeps every row. [PG tutorial: window functions][pg-window]
- Dialect flag: version availability. See section 2.

### 1.15 Normalization (design theory, not a SQL language feature)

- Flag: normalization is database design theory. It is not defined by the SQL reference manuals read for this note, and no SQL statement "normalizes" a database. The originating academic source (Codd, 1970) and the ISO text were not reachable. See sections 5 and 6.
- Best primary source found: an archived Microsoft Learn support article written for Microsoft Access. It is vendor documentation, not a standard. [MS Learn: normalization][ms-norm]
- Definition from it: "Normalization is the process of organizing data in a database ... to protect the data and to make the database more flexible by eliminating redundancy and inconsistent dependency." [MS Learn: normalization][ms-norm]
- Its rules: first normal form removes repeating groups and gives each set of related data a primary key; second normal form moves values that apply to multiple records into separate tables linked by a foreign key; third normal form removes fields that do not depend on the key. [MS Learn: normalization][ms-norm]
- Its position: third normal form "is considered the highest level necessary for most applications", and "real world scenarios don't always allow for perfect compliance." [MS Learn: normalization][ms-norm]
- Supporting vendor definition: the MySQL glossary describes "normalized" as linking data across tables with foreign keys and joins rather than duplicating it, and "denormalized" as the opposite, typical of data warehouses. [MySQL glossary][my-glossary]
- Example of the idea (vendor): the address belongs in one Customers table, not repeated in Orders, Shipping and Invoices. [MS Learn: normalization][ms-norm]
- Misconception: "More normalization is always better." Correction: the same article says full third normal form "isn't always practical" and many small tables may degrade performance. [MS Learn: normalization][ms-norm]
- Warning: that article states "Fourth normal form, also called Boyce-Codd Normal Form (BCNF)". Do not repeat this in a video; it is a single-source claim that could not be checked against the theory literature. Listed in section 5.

### 1.16 Logical order of query evaluation

- Definition: the documented order in which a query's clauses are logically applied, which differs from the order in which they are written.
- What PostgreSQL documents ("general processing of SELECT"): 1 WITH, 2 FROM, 3 WHERE, 4 GROUP BY with aggregates then HAVING, 5 SELECT output expressions, 6 DISTINCT, 7 UNION/INTERSECT/EXCEPT, 8 ORDER BY, 9 LIMIT/OFFSET, 10 row locking. [PG SELECT][pg-select]
- What SQL Server documents ("logical processing order, or binding order"): FROM, ON, JOIN, WHERE, GROUP BY, WITH CUBE/ROLLUP, HAVING, SELECT, DISTINCT, ORDER BY, TOP. [T-SQL SELECT][ms-select]
- What MySQL documents: aliases are unusable in WHERE because the value "might not yet be determined"; HAVING is "applied nearly last"; LIMIT is applied after HAVING; window functions run after WHERE, GROUP BY and HAVING and before ORDER BY, LIMIT and SELECT DISTINCT. [MySQL SELECT][my-select], [MySQL window functions][my-window]
- What SQLite documents: input from FROM, then WHERE, then GROUP BY/HAVING, then result expressions, then DISTINCT. [SQLite SELECT][sqlite-select]
- So the beginner sequence FROM, WHERE, GROUP BY, HAVING, SELECT, ORDER BY, LIMIT is consistent with all four manuals as a logical model.

What the docs guarantee

- Name visibility: something defined in a later step cannot be used in an earlier one. A SELECT alias cannot be used in WHERE. [PG SELECT][pg-select], [MySQL SELECT][my-select], [T-SQL SELECT][ms-select]
- WHERE cannot contain aggregates, because it decides which rows enter them. [PG tutorial: aggregates][pg-tutagg]
- ORDER BY can use a SELECT alias, because it comes later. [T-SQL SELECT][ms-select], [PG sorting][pg-order]

What the docs do not guarantee

- Physical execution order. Microsoft says so directly: "The query processor determines the actual physical execution of the statement, and the order might vary from this list", and gives a case where a `CONVERT` in the select list runs before WHERE. [T-SQL SELECT][ms-select]
- A single universal alias rule. PostgreSQL accepts a SELECT alias in GROUP BY even though GROUP BY precedes SELECT in its own list. [PG SELECT][pg-select] MySQL accepts aliases in GROUP BY and HAVING as an extension. [MySQL GROUP BY handling][my-groupby] SQL Server's rule allows them only in later clauses such as ORDER BY. [T-SQL SELECT][ms-select]
- Row order at any step before ORDER BY. [PG sorting][pg-order]
- That the ISO standard words it this way: not verified, the standard text was unreachable. See section 5.

- Example: `SELECT city, count(*) AS n FROM customers WHERE city IS NOT NULL GROUP BY city HAVING count(*) > 1 ORDER BY n DESC;` (uses the alias only in ORDER BY, which is valid in all four systems per the sources above; LIMIT left out because its syntax is dialect-specific).
- Misconception: "The database runs the clauses in this order." Correction: it is a logical (binding) order that explains results and name visibility; the optimizer chooses the physical plan. [T-SQL SELECT][ms-select]

---

## 2. Dialect differences (do not state these as universal)

| Topic | PostgreSQL | MySQL 8.4 | SQLite | SQL Server (T-SQL) |
| --- | --- | --- | --- | --- |
| Limit rows | `LIMIT n OFFSET m`, and standard `OFFSET m ROWS FETCH FIRST n ROWS ONLY` (SQL:2008 syntax) [src][pg-select] | `LIMIT n`, `LIMIT m, n`, `LIMIT n OFFSET m`; grammar has no FETCH or TOP [src][my-select] | `LIMIT n OFFSET m`, and `LIMIT m, n` (offset first) [src][sqlite-select] | `TOP (n)`, or `ORDER BY ... OFFSET m ROWS FETCH NEXT n ROWS ONLY` (2012+); grammar has no LIMIT [src][ms-top], [src][ms-orderby] |
| NULL position, ASC | Last (nulls sort as larger) [src][pg-order] | First [src][my-null] | First (nulls sort as smaller) [src][sqlite-select] | First ("lowest possible values") [src][ms-orderby] |
| `NULLS FIRST/LAST` | Supported [src][pg-order] | Not in SELECT grammar [src][my-select] | Supported [src][sqlite-select] | Not in ORDER BY grammar [src][ms-orderby] |
| FULL OUTER JOIN | Supported [src][pg-tableexpr] | Not in join grammar (INNER, CROSS, STRAIGHT_JOIN, LEFT, RIGHT, NATURAL only) [src][my-join] | Supported since 3.39.0 (2022-06-25), with RIGHT JOIN [src][sqlite-339] | Supported [src][ms-from] |
| Bare `JOIN` / CROSS JOIN | CROSS JOIN is the N * M product; INNER needs a join condition [src][pg-tableexpr] | "JOIN, CROSS JOIN, and INNER JOIN are syntactic equivalents ... In standard SQL, they are not equivalent" [src][my-join] | CROSS, INNER, JOIN and comma all give the cartesian product before ON filtering [src][sqlite-select] | INNER is the default; also has `CROSS APPLY` / `OUTER APPLY` [src][ms-from] |
| Non-grouped columns in SELECT | (not checked, see section 5) | Rejected by default (`ONLY_FULL_GROUP_BY` on) unless functionally dependent; if disabled, value is nondeterministic [src][my-groupby] | Allowed ("bare columns"), value arbitrary except with a single min()/max(); "SQLite-specific extension" [src][sqlite-select] | (not checked, see section 5) |
| SELECT alias reuse | ORDER BY and GROUP BY yes; WHERE and HAVING no [src][pg-select] | GROUP BY, ORDER BY, HAVING yes; WHERE no [src][my-select], [src][my-groupby] | ORDER BY yes [src][sqlite-select] | Only clauses after SELECT, such as ORDER BY [src][ms-select] |
| `x = NULL` | Null; optional `transform_null_equals` rewrites it to IS NULL [src][pg-comparison] | NULL; "0 or NULL means false" [src][my-null] | (not checked) | UNKNOWN; legacy `SET ANSI_NULLS OFF` made it true and is deprecated [src][ms-ansinulls] |
| NULLs under UNIQUE | Multiple NULLs allowed by default; `NULLS NOT DISTINCT` changes it [src][pg-constraints] | (not checked) | "NULLs are still distinct in a UNIQUE column" [src][sqlite-nulls] | "only one null value is allowed per column" [src][ms-unique] |
| NULL in PRIMARY KEY | Not allowed [src][pg-constraints] | (not checked) | Allowed for non-INTEGER primary keys, a documented historical bug [src][sqlite-quirks] | Not allowed (UNIQUE differs from PRIMARY KEY in allowing NULL) [src][ms-unique] |
| Foreign key enforcement | Enforced [src][pg-constraints] | InnoDB and NDB engines only [src][my-fk] | Off by default; `PRAGMA foreign_keys = ON` per connection [src][sqlite-fk] | (not checked) |
| Index on FK column | Not created automatically [src][pg-constraints] | Created automatically if missing [src][my-fk] | (not checked) | (not checked) |
| ON DELETE default | NO ACTION (error, check may be deferred) [src][pg-constraints] | NO ACTION, which InnoDB treats as RESTRICT [src][my-fk] | (not checked) | (not checked) |
| Column types | Each column "is of a specific data type" [src][pg-concepts] | (not checked) | Advisory ("flexibly typed"); no BOOLEAN or DATETIME type [src][sqlite-quirks] | (not checked) |
| String quotes | (not checked) | (not checked) | Double-quoted text is accepted as a string if no identifier matches [src][sqlite-quirks] | (not checked) |
| Default isolation | Read Committed [src][pg-iso] | REPEATABLE READ (InnoDB) [src][my-iso] | Serializable [src][sqlite-tx] | (not checked) |
| ACID coverage | Transactions documented as atomic, isolated, durable [src][pg-tx] | "components such as the InnoDB storage engine" [src][my-acid] | Yes, including across power failure [src][sqlite-tx] | (not checked) |
| CTEs | Yes; planner may fold or materialize [src][pg-with] | Added in 8.0 [src][my-80] | Yes; MATERIALIZED hints from 3.35.0 [src][sqlite-with] | Yes (`WITH common_table_expression`) [src][ms-select] |
| Window functions | Yes [src][pg-window] | Added in 8.0 [src][my-80] | Added in 3.25.0 (2018-09-15) [src][sqlite-window] | Yes; ROWS/RANGE frames from 2012 [src][ms-over] |
| Row-limit position in logical order | After ORDER BY [src][pg-select] | After HAVING and windowing [src][my-select] | (not checked) | TOP is last, after ORDER BY [src][ms-select] |

Standard-level notes

- The standard is ISO/IEC 9075 "Database Language SQL"; the latest revision is SQL:2023. Earlier ones: SQL:2016, 2011, 2008, 2006, 2003, 1999, SQL-92. [PG SQL conformance][pg-features]
- "No current version of any database management system claims full conformance to Core SQL:2023." So "standard SQL" on screen should not imply any product implements all of it. [PG SQL conformance][pg-features]
- `FETCH FIRST ... ROWS ONLY` is the standard row-limit syntax (introduced in SQL:2008); `LIMIT` and `TOP` are not attributed to the standard by these docs. [PG SELECT][pg-select], [T-SQL ORDER BY][ms-orderby]
- SQLite's own documentation says the standards' description of NULL handling "seem ambiguous". [SQLite NULL handling][sqlite-nulls]

Safe-for-all-four phrasing for a video

- "Without ORDER BY, row order is not guaranteed." Stated explicitly by PostgreSQL, SQLite and SQL Server; the MySQL tutorial says only that rows appear "in no particular order". [src][pg-order], [src][sqlite-select], [src][ms-orderby], [src][my-sorting]
- "Comparing with NULL using = does not work; use IS NULL." Sourced for PostgreSQL, MySQL and SQL Server (default settings).
- Avoid: "LIMIT 5 returns the first five rows" (syntax and meaning both dialect and ORDER BY dependent), "NULLs sort last", "FULL JOIN works everywhere", "foreign keys always protect you".

---

## 3. Quick reference: one line per topic

| # | Topic | The one fact a 30 s video can carry | Source |
| --- | --- | --- | --- |
| 1 | Table/row/column | Same columns for every row; rows have no order | [src][pg-concepts] |
| 2 | SELECT/FROM | FROM picks the table, SELECT picks the columns | [src][pg-select] |
| 3 | WHERE | Keeps a row only when the condition is true | [src][pg-tableexpr] |
| 4 | ORDER BY / limit | No ORDER BY, no guaranteed order | [src][pg-order] |
| 5 | GROUP BY / aggregates | Many rows in, one value out per group | [src][pg-glossary] |
| 6 | HAVING vs WHERE | WHERE filters rows, HAVING filters groups | [src][pg-tutagg] |
| 7 | JOINs | Outer joins keep unmatched rows and fill with NULL | [src][pg-tableexpr] |
| 8 | Keys | Primary key identifies a row; foreign key must match one | [src][pg-constraints] |
| 9 | NULL | Unknown is a third answer besides true and false | [src][pg-logical] |
| 10 | INSERT/UPDATE/DELETE | No WHERE means every row | [src][pg-update] |
| 11 | Subqueries / CTEs | A named query used inside one statement | [src][pg-with] |
| 12 | Indexes | Faster lookups, slower writes | [src][pg-idx] |
| 13 | Transactions | All steps happen or none do | [src][pg-tx] |
| 14 | Window functions | A calculation across related rows that keeps every row | [src][pg-window] |
| 15 | Normalization | Store each fact once (design theory) | [src][ms-norm] |
| 16 | Logical order | Written SELECT-first, logically processed FROM-first | [src][ms-select] |

---

## 4. SUGGESTIONS (not sourced facts): three candidate groupings

Everything in this section is a proposal. The metaphors are chosen so that the facts in section 1 support them and so that they do not reuse existing DataEntropy worlds (documents into a map, token tiles, nodes and weights, meaning space, scatter chart, conveyor belt).

### (a) One 30 s video: "What SQL is"

- Topics: 1.1, 1.2, 1.3, 1.4 at headline level; one closing mention that the same language also changes data.
- Core idea: SQL is how you ask a table a question: which table, which rows, which columns, in what order.
- Visual metaphor: one grid of row cards. A question typed above it lights the table (FROM), dims non-matching rows (WHERE), slides away unwanted columns (SELECT), then the remaining cards shuffle into order (ORDER BY).
- Fits the facts because: it shows the logical order from 1.16 and "rows have no order until sorted" from 1.1.
- Avoid in this video: LIMIT/TOP syntax, NULL, and any claim that SQL is identical across databases.

### (b) Short series: five videos of 30 s

| # | Title idea | Topics | Core idea | Visual metaphor |
| --- | --- | --- | --- | --- |
| 1 | Ask a table a question | 1.1 to 1.4 | Pick the table, keep the rows, choose the columns, sort | A grid of row cards that dims, trims and reorders |
| 2 | From rows to answers | 1.5, 1.6 | Group rows, compute one number per group, then filter the groups | Cards sliding into labelled trays; each tray shows one total; some trays are removed |
| 3 | Two tables, one answer | 1.7, 1.8 | Keys link tables; a join pairs matching rows and outer joins keep the unmatched | Two columns of cards with threads between matching keys; unmatched cards get an empty slot |
| 4 | The missing value | 1.9 | NULL means unknown, so the answer can be "unknown" and the row is dropped | A sealed card: asked "equal to?", a three-way switch lands on a third position |
| 5 | Changing data safely | 1.10, 1.13 | No WHERE means every row; a transaction makes several changes all-or-nothing | Two linked levers that only move together; a rewind returns both |

Optional sixth: "The real order of a query" (1.16) as a series closer, metaphor: the written sentence's words lift and re-stack into the logical order, labelled "logical order, not the engine's plan".

### (c) Longer series: one topic per video

| # | Topic | Core idea | Visual metaphor |
| --- | --- | --- | --- |
| 1 | Tables, rows, columns | Same columns for every row; rows have no built-in order | A deck of identical-layout cards, shuffled each time it is dealt |
| 2 | SELECT and FROM | Name the table, list the columns | A spotlight on one table, then on chosen columns |
| 3 | WHERE | Only rows where the test is true pass | A gate with three lamps: true passes, false and unknown do not |
| 4 | ORDER BY and row limits | Order exists only if you ask for it | Cards settle into a line; "first five" is meaningless until they do |
| 5 | Aggregates and GROUP BY | Many rows become one value per group | Cards drop into trays and each tray shows one number |
| 6 | HAVING vs WHERE | Filter rows before grouping, groups after | Two gates: one before the trays, one after |
| 7 | INNER JOIN | One output row per matching pair | Threads between matching keys; each thread becomes a row |
| 8 | Outer and cross joins | Unmatched rows are kept and padded with NULL | Unmatched cards paired with a blank card |
| 9 | Primary and foreign keys | A unique label, and a reference that must point at one | A numbered tag and a string that cannot be tied to nothing |
| 10 | NULL and three-valued logic | Unknown is neither true nor false | A sealed envelope and a three-position switch |
| 11 | INSERT, UPDATE, DELETE | Whole rows in and out; no WHERE means all rows | A stamp that hits every card unless a mask is placed first |
| 12 | Subqueries and CTEs | Name a step, then use it | A small answer card set aside, then slotted into the next question |
| 13 | Indexes | A lookup list, paid for on every write | The back-of-book index (the documentation's own analogy) beside a page-by-page scan |
| 14 | Transactions and ACID | All or nothing, and it survives a crash | Two levers joined by a bar, plus a save point |
| 15 | Window functions | Compare each row with its group, keep every row | A sliding frame moving down a column, writing a running total beside each row |
| 16 | Normalization | Store each fact once, link by key | One repeated address collapsing into a single card with threads to it |
| 17 | Logical order of a query | Written one way, processed another | The clause words re-stacking from written order to logical order |

Production notes for any grouping

- Put the dialect on screen when a query shows LIMIT, TOP or FETCH FIRST, or pick examples that avoid them.
- For joins, show at least one key with two matches, otherwise the picture teaches "one row per left row" (misconception in 1.7).
- For the logical-order video, the label must say "logical order"; do not animate it as the engine's actual steps.
- Videos 9, 10 and 16 need the dialect caveats in section 2 kept out of the voiceover or worded as "in most databases" only where section 2 supports it.

---

## 5. UNVERIFIED (not confirmed from a primary source in this session)

1. UNVERIFIED: that ISO/IEC 9075 itself specifies the logical clause order, three-valued logic, or the NULL ordering rules. The standard text is paywalled and the ISO catalogue page returned HTTP 403. All "standard" statements above are as reported by vendor documentation.
2. UNVERIFIED: that the "common misconception" lines are in fact the most common beginner errors. They are editorial; no primary source ranks misconceptions.
3. UNVERIFIED: the claim in the Microsoft article that fourth normal form is "also called Boyce-Codd Normal Form". Single archived source, not checked against the theory literature. Do not use.
4. UNVERIFIED: formal definitions of 1NF, 2NF, 3NF from the originating papers (Codd 1970 and later). The ACM page returned HTTP 403. Section 1.15 rests on vendor material only.
5. UNVERIFIED: PostgreSQL's and SQL Server's exact rule for non-grouped columns in an aggregate SELECT (the pages stating it were not read).
6. UNVERIFIED: SQL Server and MySQL behaviour for the cells marked "(not checked)" in section 2, including MySQL NULLs under UNIQUE, SQL Server default isolation level, SQL Server foreign key defaults and SQLite `= NULL` wording.
7. UNVERIFIED: that MySQL has no FULL OUTER JOIN in any current version. Evidence is the absence of FULL from the 8.4 join grammar, not an explicit statement.
8. UNVERIFIED: that MySQL and SQL Server reject `NULLS FIRST/LAST`. Evidence is absence from the documented grammar only.
9. UNVERIFIED: whether SQLite accepts `FETCH FIRST` (not found either way).
10. UNVERIFIED: the Microsoft page's note that "Starting with SQL Server 2017 (14.x), ANSI_NULLS is always set to ON". It appears on the page next to text describing OFF as still selectable, and the page's own summary says `= NULL` evaluates to "False" while its table says UNKNOWN. Treat as "OFF is deprecated" only.
11. UNVERIFIED: MySQL glossary wording. The fetch tool appears to have paraphrased several entries, so only the gist of "normalized/denormalized" is used, with no direct quote.
12. UNVERIFIED: the SQLite clause-processing order line in 1.16 is from a summarised read of the "Simple Select Processing" section, not an exact quote.
13. UNVERIFIED: none of the example queries written for this note were executed against any database.
14. Not covered: Oracle, DB2, MariaDB, BigQuery, Snowflake and other dialects were out of scope and not checked.

## 6. Sources that could not be fetched

- https://www.iso.org/standard/76583.html (ISO/IEC 9075-1:2023 catalogue page): HTTP 403.
- https://dl.acm.org/doi/10.1145/362384.362685 (Codd, "A Relational Model of Data for Large Shared Data Banks", 1970): HTTP 403.
- https://www.sqlite.org/lang_select.html: the fetch tool truncated the page; the ORDER BY, LIMIT, join and bare-column passages were recovered from the raw page text instead.
- All other pages listed below were fetched successfully. PostgreSQL links point at `/docs/current/`, so wording can change with a new major release.

<!-- Sources -->
[pg-concepts]: https://www.postgresql.org/docs/current/tutorial-concepts.html
[pg-select]: https://www.postgresql.org/docs/current/sql-select.html
[pg-tableexpr]: https://www.postgresql.org/docs/current/queries-table-expressions.html
[pg-order]: https://www.postgresql.org/docs/current/queries-order.html
[pg-tutagg]: https://www.postgresql.org/docs/current/tutorial-agg.html
[pg-agg]: https://www.postgresql.org/docs/current/functions-aggregate.html
[pg-comparison]: https://www.postgresql.org/docs/current/functions-comparison.html
[pg-logical]: https://www.postgresql.org/docs/current/functions-logical.html
[pg-subq]: https://www.postgresql.org/docs/current/functions-subquery.html
[pg-constraints]: https://www.postgresql.org/docs/current/ddl-constraints.html
[pg-insert]: https://www.postgresql.org/docs/current/dml-insert.html
[pg-update]: https://www.postgresql.org/docs/current/dml-update.html
[pg-delete]: https://www.postgresql.org/docs/current/dml-delete.html
[pg-with]: https://www.postgresql.org/docs/current/queries-with.html
[pg-idx]: https://www.postgresql.org/docs/current/indexes-intro.html
[pg-tx]: https://www.postgresql.org/docs/current/tutorial-transactions.html
[pg-iso]: https://www.postgresql.org/docs/current/transaction-iso.html
[pg-window]: https://www.postgresql.org/docs/current/tutorial-window.html
[pg-glossary]: https://www.postgresql.org/docs/current/glossary.html
[pg-features]: https://www.postgresql.org/docs/current/features.html
[sqlite-select]: https://www.sqlite.org/lang_select.html
[sqlite-quirks]: https://www.sqlite.org/quirks.html
[sqlite-nulls]: https://www.sqlite.org/nulls.html
[sqlite-fk]: https://www.sqlite.org/foreignkeys.html
[sqlite-tx]: https://www.sqlite.org/transactional.html
[sqlite-with]: https://www.sqlite.org/lang_with.html
[sqlite-window]: https://www.sqlite.org/windowfunctions.html
[sqlite-339]: https://www.sqlite.org/releaselog/3_39_0.html
[my-select]: https://dev.mysql.com/doc/refman/8.4/en/select.html
[my-join]: https://dev.mysql.com/doc/refman/8.4/en/join.html
[my-null]: https://dev.mysql.com/doc/refman/8.4/en/working-with-null.html
[my-sorting]: https://dev.mysql.com/doc/refman/8.4/en/sorting-rows.html
[my-limitopt]: https://dev.mysql.com/doc/refman/8.4/en/limit-optimization.html
[my-groupby]: https://dev.mysql.com/doc/refman/8.4/en/group-by-handling.html
[my-with]: https://dev.mysql.com/doc/refman/8.4/en/with.html
[my-window]: https://dev.mysql.com/doc/refman/8.4/en/window-functions-usage.html
[my-fk]: https://dev.mysql.com/doc/refman/8.4/en/create-table-foreign-keys.html
[my-acid]: https://dev.mysql.com/doc/refman/8.4/en/mysql-acid.html
[my-iso]: https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-isolation-levels.html
[my-glossary]: https://dev.mysql.com/doc/refman/8.4/en/glossary.html
[my-80]: https://dev.mysql.com/doc/refman/8.0/en/mysql-nutshell.html
[ms-select]: https://learn.microsoft.com/en-us/sql/t-sql/queries/select-transact-sql?view=sql-server-ver17
[ms-orderby]: https://learn.microsoft.com/en-us/sql/t-sql/queries/select-order-by-clause-transact-sql?view=sql-server-ver17
[ms-top]: https://learn.microsoft.com/en-us/sql/t-sql/queries/top-transact-sql?view=sql-server-ver17
[ms-from]: https://learn.microsoft.com/en-us/sql/t-sql/queries/from-transact-sql?view=sql-server-ver17
[ms-over]: https://learn.microsoft.com/en-us/sql/t-sql/queries/select-over-clause-transact-sql?view=sql-server-ver17
[ms-ansinulls]: https://learn.microsoft.com/en-us/sql/t-sql/statements/set-ansi-nulls-transact-sql?view=sql-server-ver17
[ms-unique]: https://learn.microsoft.com/en-us/sql/relational-databases/tables/unique-constraints-and-check-constraints?view=sql-server-ver17
[ms-norm]: https://learn.microsoft.com/en-us/previous-versions/troubleshoot/microsoft-365/microsoft-365-apps/access/database-normalization-description
