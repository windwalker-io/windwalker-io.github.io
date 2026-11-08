---
layout: doc
title: Method Index
component: query
---

# Method Index

This page lists the public methods of the `Query` class, grouped by topic.
Each method links to the page that explains it, and to the section when the
page has one. The short descriptions here name the purpose only. For the
arguments and the examples, read the linked page, or the source of the method.

Some methods are not defined on `Query` itself. They are handled by the
magic `__call()` method, and are listed in [Magic Methods](#magic-methods).

## Selecting Data

| Method | Description |
|--------|-------------|
| [`select()`](/documentation/components/query/select#columns-and-expressions) | Adds columns. Strings are quoted as names, and `->` is a JSON path. |
| [`selectAs()`](/documentation/components/query/select#columns-and-expressions) | Adds a column with an alias. |
| [`selectRaw()`](/documentation/components/query/expressions#raw-methods) | Adds an expression as raw SQL text. |
| [`as()`](/documentation/components/query/select#columns-and-expressions) | Creates an alias clause for a column, a table or a subquery. |
| [`from()`](/documentation/components/query/select#tables-and-aliases) | Sets the source table, a subquery, or a closure that builds one. |
| [`alias()`](/documentation/components/query/select#subqueries) | Sets the alias of this query when it is used as a subquery. |
| [`group()`](/documentation/components/query/select#grouping) | Adds `GROUP BY` columns. |
| [`groupRaw()`](/documentation/components/query/expressions#raw-methods) | Adds a `GROUP BY` expression as raw SQL text. |
| [`order()`](/documentation/components/query/select#ordering) | Adds an `ORDER BY` column with a direction, as a string or `SortDirection`. A list adds several. |
| [`orderByField()`](/documentation/components/query/select#ordering) | Sorts by a list of values, in the order given. The direction is optional. |
| [`orderByRandom()`](/documentation/components/query/select#ordering) | Sorts randomly, with the function of the dialect. |
| [`orderRaw()`](/documentation/components/query/expressions#raw-methods) | Adds an `ORDER BY` expression as raw SQL text. |
| [`limit()`](/documentation/components/query/select#limit-and-offset) | Sets the `LIMIT`, or removes it with `null`. |
| [`offset()`](/documentation/components/query/select#limit-and-offset) | Sets the `OFFSET`, or removes it with `null`. |
| [`forUpdate()`](/documentation/components/query/select#row-locks) | Adds `FOR UPDATE`, with an optional lock option. |
| [`forShare()`](/documentation/components/query/select#row-locks) | Adds `FOR SHARE`, with an optional lock option. |
| [`rowLock()`](/documentation/components/query/select#row-locks) | Adds a row lock clause, with the lock name given. |
| [`union()`](/documentation/components/query/select#combining-queries) | Adds a query to a `UNION`. |
| [`unionAll()`](/documentation/components/query/select#combining-queries) | Adds a query to a `UNION ALL`. |
| [`unionDistinct()`](/documentation/components/query/select#combining-queries) | Adds a query to a `UNION DISTINCT`. |

## Joins

| Method | Description |
|--------|-------------|
| [`join()`](/documentation/components/query/join#join-types) | Adds a join of the given type, such as `LEFT` or `INNER`. |
| [`joinLateral()`](/documentation/components/query/join#lateral-join) | Adds a `LATERAL` join. Without a condition it renders `ON TRUE`. |

The typed join methods, such as `leftJoin()`, are listed in
[Magic Methods](#magic-methods).

## Conditions

| Method | Description |
|--------|-------------|
| [`where()`](/documentation/components/query/where#operators) | Adds a condition. Accepts a column, an array or a closure. |
| [`whereRaw()`](/documentation/components/query/expressions#raw-methods) | Adds a condition as raw SQL text, with template tokens. |
| [`andWhere()`](/documentation/components/query/where#nested-groups) | Adds a group of conditions, joined by `AND` inside the group. |
| [`orWhere()`](/documentation/components/query/where#nested-groups) | Adds a group of conditions, joined by `OR` inside the group. |
| [`whereExists()`](/documentation/components/query/where#exists) | Adds an `EXISTS` condition for a subquery. |
| [`whereNotExists()`](/documentation/components/query/where#exists) | Adds a `NOT EXISTS` condition for a subquery. |
| [`having()`](/documentation/components/query/where#having) | Adds a `HAVING` condition. |
| [`havingRaw()`](/documentation/components/query/expressions#raw-methods) | Adds a `HAVING` condition as raw SQL text. |
| [`orHaving()`](/documentation/components/query/where#nested-groups) | Adds a group of `HAVING` conditions, joined by `OR` inside. |
| [`havingExists()`](/documentation/components/query/where#exists) | Adds a `HAVING EXISTS` condition for a subquery. |
| [`havingNotExists()`](/documentation/components/query/where#exists) | Adds a `HAVING NOT EXISTS` condition for a subquery. |
| [`convertAllToWheres()`](/documentation/components/query/where#array-conditions) | Static. Converts an array into conditions on a query. |

## Writing Data

| Method | Description |
|--------|-------------|
| [`insert()`](/documentation/components/query/writing#insert) | Starts an `INSERT` into a table. |
| [`update()`](/documentation/components/query/writing#update) | Starts an `UPDATE` of a table. |
| [`delete()`](/documentation/components/query/writing#delete) | Starts a `DELETE` from a table. |
| [`columns()`](/documentation/components/query/writing#insert) | Sets the column names of an insert. |
| [`values()`](/documentation/components/query/writing#insert) | Adds one or more rows of values to an insert. |
| [`set()`](/documentation/components/query/writing#update) | Sets one column to a value, or a list of columns and values. |
| [`setRaw()`](/documentation/components/query/writing#update) | Sets a column to an expression, as raw SQL text. |

## Upsert

| Method | Description |
|--------|-------------|
| [`upsert()`](/documentation/components/query/upsert#basic-usage) | Starts an insert that updates the row when a unique key conflicts. |
| [`onConflict()`](/documentation/components/query/upsert#conflict-keys) | Sets the conflict keys that identify a row. |
| [`onConflictUpdateColumns()`](/documentation/components/query/upsert#updating-columns) | Sets the columns updated with the inserted values. |
| [`onConflictUpdateValues()`](/documentation/components/query/upsert#updating-columns) | Sets the columns updated with custom values. |
| [`returning()`](/documentation/components/query/upsert#returning-the-id) | Sets the ID column to read back after the statement. |
| [`onDuplicateKeyUpdate()`](/documentation/components/query/upsert#dialects) | Sets the update values of a MySQL `ON DUPLICATE KEY UPDATE`. |

## Raw SQL and Format

| Method | Description |
|--------|-------------|
| [`raw()`](/documentation/components/query/expressions#helper-functions) | Creates a raw SQL value, formatted with the template tokens. |
| [`format()`](/documentation/components/query/expressions#format) | Formats a string with the template tokens, and returns it. |
| [`sql()`](/documentation/components/query/rendering#forms-of-the-sql) | Sets the whole statement to a raw SQL string. |
| [`expr()`](/documentation/components/query/expressions#raw-methods) | Builds a function-like expression, such as `EXISTS()`. |
| [`clause()`](/documentation/components/query/expressions#raw-methods) | Builds a low-level clause from a name and its elements. |
| [`prefix()`](/documentation/components/query/expressions#raw-methods) | Adds raw SQL before the statement. |
| [`suffix()`](/documentation/components/query/expressions#raw-methods) | Adds raw SQL after the statement. |

## JSON

| Method | Description |
|--------|-------------|
| [`jsonSelector()`](/documentation/components/query/json#selecting-a-path) | Builds the expression of a JSON path. |
| [`whereJsonContains()`](/documentation/components/query/json#comparing-arrays) | Deprecated. Use `whereJsonContainsAll()`. |
| [`whereJsonContainsAll()`](/documentation/components/query/json#comparing-arrays) | Filters rows whose JSON array contains all values. |
| [`whereJsonNotContains()`](/documentation/components/query/json#comparing-arrays) | Deprecated. Use `whereJsonNotContainsAll()`. |
| [`whereJsonNotContainsAll()`](/documentation/components/query/json#comparing-arrays) | Negated `whereJsonContainsAll()`. |
| [`whereJsonExists()`](/documentation/components/query/json#path-existence) | Filters rows where a JSON path exists. |
| [`whereJsonNotExists()`](/documentation/components/query/json#path-existence) | Filters rows where a JSON path does not exist. |
| [`whereJsonLength()`](/documentation/components/query/json#empty-values) | Filters rows by the length of a JSON array. |
| [`havingJsonContains()`](/documentation/components/query/json#comparing-arrays) | Deprecated. `HAVING` version of `whereJsonContains()`. |
| [`havingJsonContainsAll()`](/documentation/components/query/json#comparing-arrays) | `HAVING` version of `whereJsonContainsAll()`. |
| [`havingJsonNotContains()`](/documentation/components/query/json#comparing-arrays) | Deprecated. `HAVING` version of `whereJsonNotContains()`. |
| [`havingJsonNotContainsAll()`](/documentation/components/query/json#comparing-arrays) | `HAVING` version of `whereJsonNotContainsAll()`. |
| [`havingJsonExists()`](/documentation/components/query/json#path-existence) | `HAVING` version of `whereJsonExists()`. |
| [`havingJsonNotExists()`](/documentation/components/query/json#path-existence) | `HAVING` version of `whereJsonNotExists()`. |
| [`selectJsonLength()`](/documentation/components/query/json#empty-values) | Selects the length of a JSON array. |
| [`jsonSet()`](/documentation/components/query/json#updating-a-value) | Builds a JSON update expression that sets a path. |
| [`jsonRemove()`](/documentation/components/query/json#updating-a-value) | Builds a JSON update expression that removes a path. |
| [`setJson()`](/documentation/components/query/json#updating-a-value) | Sets a JSON path of a column in an update. |
| [`setJsonRemove()`](/documentation/components/query/json#updating-a-value) | Removes a JSON path of a column in an update. |

## Common Table Expressions

| Method | Description |
|--------|-------------|
| [`with()`](/documentation/components/query/cte#basic-usage) | Adds a `WITH` clause. Accepts a column list and a materialization hint. |
| [`withRecursive()`](/documentation/components/query/cte#recursive-ctes) | Adds a `WITH RECURSIVE` clause. |

## Iteration

| Method | Description |
|--------|-------------|
| [`getIterator()`](/documentation/components/query/iteration#get-iterator) | Returns an iterator over one open cursor, or over pages. |
| [`getPaginatedIterator()`](/documentation/components/query/iteration#get-paginated-iterator) | Returns an iterator that runs one statement per page. |
| [`iterateBatched()`](/documentation/components/query/iteration#iterate-batched) | Yields rows, loading one batch at a time. |
| [`iterateChunks()`](/documentation/components/query/iteration#iterate-chunks) | Yields each batch as a `Collection`. |
| [`iterateWhile()`](/documentation/components/query/iteration#iterate-while) | Repeats the same query until no row is returned. |
| [`iterateBatchWhile()`](/documentation/components/query/iteration#iterate-batch-while) | Repeats the query, and loads each batch in full. |
| [`cursorPaginate()`](/documentation/components/query/cursor-pagination#creating-a-cursor) | Static. Creates a cursor definition for keyset paging. |
| [`withCursor()`](/documentation/components/query/cursor-pagination#single-query-with-withcursor) | Returns a new query with a cursor applied. The original query is not changed. |

## Rendering and Bindings

| Method | Description |
|--------|-------------|
| [`render()`](/documentation/components/query/rendering#forms-of-the-sql) | Returns the SQL, optionally with values written in. |
| [`forPDO()`](/documentation/components/query/rendering#forms-of-the-sql) | Returns the SQL with `?` placeholders, and fills the values. |
| [`getMergedBounded()`](/documentation/components/query/rendering#notes-on-binding) | Returns the bound parameters of the whole query. |
| [`debug()`](/documentation/components/query/rendering#debug-output) | Formats the statement with its values, and prints or returns it. |
| [`bind()`](/documentation/components/query/rendering#notes-on-binding) | Binds a value to a placeholder. |
| [`bindParam()`](/documentation/components/query/rendering#notes-on-binding) | Binds a value by reference to a placeholder. |
| [`unbind()`](/documentation/components/query/rendering#notes-on-binding) | Removes bound values by their keys. |
| [`getBounded()`](/documentation/components/query/rendering#notes-on-binding) | Returns the bound values, or one of them. |
| [`resetBounded()`](/documentation/components/query/rendering#notes-on-binding) | Removes all bound values of this query. |

## Execution

Details: [Queries](/documentation/components/database/queries) in the database
package. These methods need a `DatabaseAdapter`, a driver or an `ORM`.

| Method | Description |
|--------|-------------|
| [`prepareStatement()`](/documentation/components/database/queries) | Returns a statement that is not run yet. |
| [`mustGet()`](/documentation/components/database/queries) | Returns one row, and throws `NoResultException` when there is none. |
| [`mustGetResult()`](/documentation/components/database/queries) | Returns one value, and throws `NoResultException` when there is none. |
| [`getDefaultItemClass()`](/documentation/components/database/queries) | Returns the class used to hydrate rows by default. |
| [`setDefaultItemClass()`](/documentation/components/database/queries) | Sets the class used to hydrate rows by default. |

## Grammar, Escaper and Quoting

| Method | Description |
|--------|-------------|
| [`getGrammar()`](/documentation/components/query/grammars#grammar-classes) | Returns the grammar that renders the statement. |
| [`getName()`](/documentation/components/query/grammars#grammar-classes) | Returns the name of the grammar's dialect. |
| [`getExpression()`](/documentation/components/query/grammars#grammar-classes) | Returns the expression builder of the grammar. |
| [`getEscaper()`](/documentation/components/query/grammars#escaper) | Returns the escaper of the query. |
| [`setEscaper()`](/documentation/components/query/grammars#escaper) | Sets the escaper of the query. |
| [`escape()`](/documentation/components/query/grammars#escaper) | Escapes a value, without quotes. |
| [`quote()`](/documentation/components/query/grammars#escaper) | Quotes and escapes a value. |
| [`quoteName()`](/documentation/components/query/grammars#escaper) | Quotes a name, such as a column or a table. |
| [`stripQuote()`](/documentation/components/query/grammars#escaper) | Static. Removes the outer quotes of a string. |
| [`stripNameQuote()`](/documentation/components/query/grammars#escaper) | Static. Removes the outer name quotes of a string. |
| [`qnMultiple()`](/documentation/components/query/grammars#escaper) | Quotes several names at once. |
| [`resolveColumn()`](/documentation/components/query/grammars#escaper) | Resolves a column name to the text used in the statement. |
| [`valueize()`](/documentation/components/query/grammars#escaper) | Makes a value ready for the statement, quoted or bound. |
| [`castValue()`](/documentation/components/query/grammars#escaper) | Casts a value the way the statement binds it. |
| [`getDateFormat()`](/documentation/components/query/grammars#platform-specific-behavior) | Returns the date format of the dialect. |
| [`nullDate()`](/documentation/components/query/expressions#constant-tokens) | Returns the null date of the dialect. |
| [`formatDateTime()`](/documentation/components/query/grammars#platform-specific-behavior) | Formats a date and time object for the statement. |
| [`getAllTables()`](/documentation/components/query/grammars#without-a-connection) | Returns the table names, read from the connection of the query. |
| [`convertClassToTable()`](/documentation/components/query/grammars#platform-specific-behavior) | Static. Converts a class name into a table name. |
| [`createSubQuery()`](/documentation/components/query/select#subqueries) | Creates a new query with the same escaper and grammar. |
| [`getSubQuery()`](/documentation/components/query/select#subqueries) | Returns a subquery registered under an alias. |

## Utilities

These methods come from the chaining and macro helpers of the framework. They
have no topic page of their own.

| Method | Description |
|--------|-------------|
| `clear()` | Clears the whole query, or only the named clauses. |
| `pipe()` | Passes the query to a callback, and returns the query. |
| `pipeIf()` | Passes the query to one of two callbacks, depending on a condition. |
| `tap()` | Calls a callback with the query, and returns the query. |
| `tapIf()` | Calls one of two callbacks, depending on a condition. |
| `do()` | Calls a registered macro by its name. |
| `macro()` | Static. Registers a macro under a name. |
| `hasMacro()` | Static. Checks whether a macro is registered. |
| `clearMarco()` | Static. Removes all registered macros. |

## Magic Methods

These calls are handled by `__call()`, and they work as if they were methods.

| Call | Description |
|------|-------------|
| [`whereIn()`](/documentation/components/query/where#operators), [`whereNotIn()`](/documentation/components/query/where#operators) | Conditions with a list of values. |
| [`whereBetween()`](/documentation/components/query/where#operators), [`whereNotBetween()`](/documentation/components/query/where#operators) | Conditions with a range of two values. |
| [`whereLike()`](/documentation/components/query/where#operators), [`whereNotLike()`](/documentation/components/query/where#operators) | Conditions with a `LIKE` pattern. |
| [`havingIn()`](/documentation/components/query/where#having), [`havingNotIn()`](/documentation/components/query/where#having) | `HAVING` versions of the list conditions. |
| [`havingBetween()`](/documentation/components/query/where#having), [`havingNotBetween()`](/documentation/components/query/where#having) | `HAVING` versions of the range conditions. |
| [`havingLike()`](/documentation/components/query/where#having), [`havingNotLike()`](/documentation/components/query/where#having) | `HAVING` versions of the `LIKE` conditions. |
| [`leftJoin()`](/documentation/components/query/join#join-types), [`rightJoin()`](/documentation/components/query/join#join-types), [`innerJoin()`](/documentation/components/query/join#join-types), [`outerJoin()`](/documentation/components/query/join#join-types) | Joins of the given type. The arguments follow `join()`. |
| [`leftJoinLateral()`](/documentation/components/query/join#lateral-join), [`rightJoinLateral()`](/documentation/components/query/join#lateral-join), [`innerJoinLateral()`](/documentation/components/query/join#lateral-join) | `LATERAL` joins of the given type. |
| [`qn()`](/documentation/components/query/grammars#escaper) | Alias of `quoteName()`. |
| [`q()`](/documentation/components/query/grammars#escaper) | Alias of `quote()`. |
| [`get()`](/documentation/components/database/queries), [`all()`](/documentation/components/database/queries), [`result()`](/documentation/components/database/queries), [`loadColumn()`](/documentation/components/database/queries), [`execute()`](/documentation/components/database/queries) | Run the statement, see [Execution](#execution). |
| [`count()`](/documentation/components/database/queries#counting-rows) | Counts the rows that the query returns. |
| [`__toString()`](/documentation/components/query/rendering#forms-of-the-sql) | Returns the SQL with named placeholders, see [Rendering and Debugging](/documentation/components/query/rendering). |
