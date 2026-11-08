---
layout: doc
title: Method Index
component: query
---

# Method Index

This page lists the public methods of the `Query` class, grouped by topic.
Each group links to the page that explains it. The short descriptions here
name the purpose only. For the arguments and the examples, read the linked
page, or the source of the method.

Some methods are not defined on `Query` itself. They are handled by the
magic `__call()` method, and are listed in [Magic Methods](#magic-methods).

## Selecting Data

Details: [Selecting Data](/documentation/components/query/select).

| Method | Description |
|--------|-------------|
| `select()` | Adds columns. Strings are quoted as names, and `->` is a JSON path. |
| `selectAs()` | Adds a column with an alias. |
| `selectRaw()` | Adds an expression as raw SQL text. |
| `as()` | Creates an alias clause for a column, a table or a subquery. |
| `from()` | Sets the source table, a subquery, or a closure that builds one. |
| `alias()` | Sets the alias of this query when it is used as a subquery. |
| `group()` | Adds `GROUP BY` columns. |
| `groupRaw()` | Adds a `GROUP BY` expression as raw SQL text. |
| `order()` | Adds an `ORDER BY` column with a direction, as a string or `SortDirection`. A list adds several. |
| `orderByField()` | Sorts by a list of values, in the order given. The direction is optional. |
| `orderByRandom()` | Sorts randomly, with the function of the dialect. |
| `orderRaw()` | Adds an `ORDER BY` expression as raw SQL text. |
| `limit()` | Sets the `LIMIT`, or removes it with `null`. |
| `offset()` | Sets the `OFFSET`, or removes it with `null`. |
| `forUpdate()` | Adds `FOR UPDATE`, with an optional lock option. |
| `forShare()` | Adds `FOR SHARE`, with an optional lock option. |
| `rowLock()` | Adds a row lock clause, with the lock name given. |
| `union()` | Adds a query to a `UNION`. |
| `unionAll()` | Adds a query to a `UNION ALL`. |
| `unionDistinct()` | Adds a query to a `UNION DISTINCT`. |

## Joins

Details: [Joins](/documentation/components/query/join).

| Method | Description |
|--------|-------------|
| `join()` | Adds a join of the given type, such as `LEFT` or `INNER`. |
| `joinLateral()` | Adds a `LATERAL` join. Without a condition it renders `ON TRUE`. |

The typed join methods, such as `leftJoin()`, are listed in
[Magic Methods](#magic-methods).

## Conditions

Details: [Conditions](/documentation/components/query/where).

| Method | Description |
|--------|-------------|
| `where()` | Adds a condition. Accepts a column, an array or a closure. |
| `whereRaw()` | Adds a condition as raw SQL text, with template tokens. |
| `andWhere()` | Adds a group of conditions, joined by `AND` inside the group. |
| `orWhere()` | Adds a group of conditions, joined by `OR` inside the group. |
| `whereExists()` | Adds an `EXISTS` condition for a subquery. |
| `whereNotExists()` | Adds a `NOT EXISTS` condition for a subquery. |
| `having()` | Adds a `HAVING` condition. |
| `havingRaw()` | Adds a `HAVING` condition as raw SQL text. |
| `orHaving()` | Adds a group of `HAVING` conditions, joined by `OR` inside. |
| `havingExists()` | Adds a `HAVING EXISTS` condition for a subquery. |
| `havingNotExists()` | Adds a `HAVING NOT EXISTS` condition for a subquery. |
| `convertAllToWheres()` | Static. Converts an array into conditions on a query. |

## Writing Data

Details: [Writing Data](/documentation/components/query/writing).

| Method | Description |
|--------|-------------|
| `insert()` | Starts an `INSERT` into a table. |
| `update()` | Starts an `UPDATE` of a table. |
| `delete()` | Starts a `DELETE` from a table. |
| `columns()` | Sets the column names of an insert. |
| `values()` | Adds one or more rows of values to an insert. |
| `set()` | Sets one column to a value, or a list of columns and values. |
| `setRaw()` | Sets a column to an expression, as raw SQL text. |

## Upsert

Details: [Upsert](/documentation/components/query/upsert).

| Method | Description |
|--------|-------------|
| `upsert()` | Starts an insert that updates the row when a unique key conflicts. |
| `onConflict()` | Sets the conflict keys that identify a row. |
| `onConflictUpdateColumns()` | Sets the columns updated with the inserted values. |
| `onConflictUpdateValues()` | Sets the columns updated with custom values. |
| `returning()` | Sets the ID column to read back after the statement. |
| `onDuplicateKeyUpdate()` | Sets the update values of a MySQL `ON DUPLICATE KEY UPDATE`. |

## Raw SQL and Format

Details: [Raw SQL and Bindings](/documentation/components/query/expressions).

| Method | Description |
|--------|-------------|
| `raw()` | Creates a raw SQL value, formatted with the template tokens. |
| `format()` | Formats a string with the template tokens, and returns it. |
| `sql()` | Sets the whole statement to a raw SQL string. |
| `expr()` | Builds a function-like expression, such as `EXISTS()`. |
| `clause()` | Builds a low-level clause from a name and its elements. |
| `prefix()` | Adds raw SQL before the statement. |
| `suffix()` | Adds raw SQL after the statement. |

## JSON

Details: [JSON](/documentation/components/query/json).

| Method | Description |
|--------|-------------|
| `jsonSelector()` | Builds the expression of a JSON path. |
| `whereJsonContains()` | Deprecated. Use `whereJsonContainsAll()`. |
| `whereJsonContainsAll()` | Filters rows whose JSON array contains all values. |
| `whereJsonNotContains()` | Deprecated. Use `whereJsonNotContainsAll()`. |
| `whereJsonNotContainsAll()` | Negated `whereJsonContainsAll()`. |
| `whereJsonExists()` | Filters rows where a JSON path exists. |
| `whereJsonNotExists()` | Filters rows where a JSON path does not exist. |
| `whereJsonLength()` | Filters rows by the length of a JSON array. |
| `havingJsonContains()` | Deprecated. `HAVING` version of `whereJsonContains()`. |
| `havingJsonContainsAll()` | `HAVING` version of `whereJsonContainsAll()`. |
| `havingJsonNotContains()` | Deprecated. `HAVING` version of `whereJsonNotContains()`. |
| `havingJsonNotContainsAll()` | `HAVING` version of `whereJsonNotContainsAll()`. |
| `havingJsonExists()` | `HAVING` version of `whereJsonExists()`. |
| `havingJsonNotExists()` | `HAVING` version of `whereJsonNotExists()`. |
| `selectJsonLength()` | Selects the length of a JSON array. |
| `jsonSet()` | Builds a JSON update expression that sets a path. |
| `jsonRemove()` | Builds a JSON update expression that removes a path. |
| `setJson()` | Sets a JSON path of a column in an update. |
| `setJsonRemove()` | Removes a JSON path of a column in an update. |

## Common Table Expressions

Details: [Common Table Expressions](/documentation/components/query/cte).

| Method | Description |
|--------|-------------|
| `with()` | Adds a `WITH` clause. Accepts a column list and a materialization hint. |
| `withRecursive()` | Adds a `WITH RECURSIVE` clause. |

## Iteration

Details: [Iteration](/documentation/components/query/iteration).

| Method | Description |
|--------|-------------|
| `getIterator()` | Returns an iterator over one open cursor, or over pages. |
| `getPaginatedIterator()` | Returns an iterator that runs one statement per page. |
| `iterateBatched()` | Yields rows, loading one batch at a time. |
| `iterateChunks()` | Yields each batch as a `Collection`. |
| `iterateWhile()` | Repeats the same query until no row is returned. |
| `iterateBatchWhile()` | Repeats the query, and loads each batch in full. |
| `cursorPaginate()` | Static. Creates a cursor definition for keyset paging. |

## Rendering and Bindings

Details: [Rendering and Debugging](/documentation/components/query/rendering).

| Method | Description |
|--------|-------------|
| `render()` | Returns the SQL, optionally with values written in. |
| `forPDO()` | Returns the SQL with `?` placeholders, and fills the values. |
| `getMergedBounded()` | Returns the bound parameters of the whole query. |
| `debug()` | Formats the statement with its values, and prints or returns it. |
| `bind()` | Binds a value to a placeholder. |
| `bindParam()` | Binds a value by reference to a placeholder. |
| `unbind()` | Removes bound values by their keys. |
| `getBounded()` | Returns the bound values, or one of them. |
| `resetBounded()` | Removes all bound values of this query. |

## Execution

Details: [Queries](/documentation/components/database/queries) in the database
package. These methods need a `DatabaseAdapter`, a driver or an `ORM`.

| Method | Description |
|--------|-------------|
| `prepareStatement()` | Returns a statement that is not run yet. |
| `mustGet()` | Returns one row, and throws `NoResultException` when there is none. |
| `mustGetResult()` | Returns one value, and throws `NoResultException` when there is none. |
| `getDefaultItemClass()` | Returns the class used to hydrate rows by default. |
| `setDefaultItemClass()` | Sets the class used to hydrate rows by default. |

## Grammar, Escaper and Quoting

Details: [Grammars and Escaper](/documentation/components/query/grammars).

| Method | Description |
|--------|-------------|
| `getGrammar()` | Returns the grammar that renders the statement. |
| `getName()` | Returns the name of the grammar's dialect. |
| `getExpression()` | Returns the expression builder of the grammar. |
| `getEscaper()` | Returns the escaper of the query. |
| `setEscaper()` | Sets the escaper of the query. |
| `escape()` | Escapes a value, without quotes. |
| `quote()` | Quotes and escapes a value. |
| `quoteName()` | Quotes a name, such as a column or a table. |
| `stripQuote()` | Static. Removes the outer quotes of a string. |
| `stripNameQuote()` | Static. Removes the outer name quotes of a string. |
| `qnMultiple()` | Quotes several names at once. |
| `resolveColumn()` | Resolves a column name to the text used in the statement. |
| `valueize()` | Makes a value ready for the statement, quoted or bound. |
| `castValue()` | Casts a value the way the statement binds it. |
| `getDateFormat()` | Returns the date format of the dialect. |
| `nullDate()` | Returns the null date of the dialect. |
| `formatDateTime()` | Formats a date and time object for the statement. |
| `getAllTables()` | Returns the table names, read from the connection of the query. |
| `convertClassToTable()` | Static. Converts a class name into a table name. |
| `createSubQuery()` | Creates a new query with the same escaper and grammar. |
| `getSubQuery()` | Returns a subquery registered under an alias. |

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
| `whereIn()`, `whereNotIn()` | Conditions with a list of values. |
| `whereBetween()`, `whereNotBetween()` | Conditions with a range of two values. |
| `whereLike()`, `whereNotLike()` | Conditions with a `LIKE` pattern. |
| `havingIn()`, `havingNotIn()` | `HAVING` versions of the list conditions. |
| `havingBetween()`, `havingNotBetween()` | `HAVING` versions of the range conditions. |
| `havingLike()`, `havingNotLike()` | `HAVING` versions of the `LIKE` conditions. |
| `leftJoin()`, `rightJoin()`, `innerJoin()`, `outerJoin()` | Joins of the given type. The arguments follow `join()`. |
| `leftJoinLateral()`, `rightJoinLateral()`, `innerJoinLateral()` | `LATERAL` joins of the given type. |
| `qn()` | Alias of `quoteName()`. |
| `q()` | Alias of `quote()`. |
| `get()`, `all()`, `result()`, `loadColumn()`, `execute()` | Run the statement, see [Execution](#execution). |
| `count()` | Counts the rows that the query returns. |
| `__toString()` | Returns the SQL with named placeholders, see [Rendering and Debugging](/documentation/components/query/rendering). |
