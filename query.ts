import * as utils from "./utils.ts";
import {
  AdvancedCondition,
  AdvancedUpdate,
  DataRow,
  QueryOptionsParams,
  RawCondition,
} from "./common.ts";
import { Expression } from "./expr.ts";
import { assert } from "assert";
import Messages from "./messages.ts";

/**
 * A versatile query builder for constructing and executing SQL queries.
 *
 * @typeparam Q - The type of the data rows returned by the query.
 * @typeparam R - The type of the query result (e.g., number of affected rows for INSERT/UPDATE/DELETE).
 */
export class QueryBuilder<Q = DataRow, R = any> {
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Creates a new Expression builder.
   * @returns A new Expression builder instance.
   * @remarks
   * This method provides a way to create and build SQL expressions.
   *
   * @example
   * ```typescript
   * const expression = QueryBuilder.expr();
   * ```
   */
  public static expr(): Expression {
    return new Expression();
  }

  /**
   * Creates a new QueryBuilder and sets the primary table name.
   * @param name - The name of the primary table for the query.
   * @returns A new QueryBuilder instance with the primary table name set.
   * @remarks
   * This method initializes a new query and sets the primary table for subsequent operations.
   *
   * @example
   * ```typescript
   * const query = QueryBuilder.table("users");
   * ```
   */
  public static table<Q = DataRow, R = any>(name: string): QueryBuilder<Q, R> {
    return new QueryBuilder().table(name);
  }

  /**
   * Creates a new QueryBuilder for performing UPDATE operations.
   * @returns A new QueryBuilder instance configured for UPDATE operations.
   * @remarks
   * This method initializes a new query for performing table updates.
   *
   * @example
   * ```typescript
   * const updateQuery = QueryBuilder.update();
   * ```
   */
  public static update<Q = DataRow, R = any>(): QueryBuilder<Q, R> {
    return new QueryBuilder().update();
  }

  /**
   * Creates a new SELECT query.
   * @param fields - The list of fields to be selected in the query.
   * @returns A new QueryBuilder instance configured for SELECT operations.
   * @remarks
   * This method initializes a new query for retrieving data from the database.
   *
   * @example
   * ```typescript
   * const selectQuery = QueryBuilder.select("id", "name", "email");
   * ```
   */
  public static select<Q = DataRow, R = any>(
    ...fields: string[]
  ): QueryBuilder<Q, R> {
    return new QueryBuilder().select(...fields);
  }

  /**
   * Creates a new SELECT DISTINCT query.
   * @param fields - The list of fields to be selected uniquely in the query.
   * @returns A new QueryBuilder instance configured for SELECT DISTINCT operations.
   * @remarks
   * This method initializes a new query for retrieving distinct data from the database.
   *
   * @example
   * ```typescript
   * const distinctQuery = QueryBuilder.selectDistinct("category");
   * ```
   */
  public static selectDistinct<Q = DataRow, R = any>(
    ...fields: string[]
  ): QueryBuilder<Q, R> {
    return new QueryBuilder().selectDistinct(...fields);
  }

  /**
   * Creates a new INSERT query.
   * @param data - The data to be inserted into the table.
   * @returns A new QueryBuilder instance configured for INSERT operations.
   * @remarks
   * This method initializes a new query for inserting data into the database.
   *
   * @example
   * ```typescript
   * const insertQuery = QueryBuilder.insert({ name: "John", age: 30 });
   * ```
   */
  public static insert<Q = DataRow, R = any>(
    data: Array<Partial<Q>> | Partial<Q>,
  ): QueryBuilder<Q, R> {
    return new QueryBuilder().insert(data);
  }

  /**
   * Creates a new DELETE query.
   * @returns A new QueryBuilder instance configured for DELETE operations.
   * @remarks
   * This method initializes a new query for deleting data from the database.
   *
   * @example
   * ```typescript
   * const deleteQuery = QueryBuilder.delete();
   * ```
   */
  public static delete<Q = DataRow, R = any>(): QueryBuilder<Q, R> {
    return new QueryBuilder().delete();
  }

  //////////////////////////////////////////////////////////////////////////////

  protected readonly _data: {
    tableName?: string;
    tableNameEscaped?: string;
    fields: string[];
    conditions: string[];
    type: string;
    update: string[];
    insert: string;
    insertRows: number;
    delete: string;
    sql: string;
    sqlTpl: string;
    sqlValues: any[];
    orderFields: string;
    orderBy: string;
    groupBy: string;
    offsetRows: number;
    limitRows: number;
    limit: string;
    mapTableToAlias: Record<string, string>;
    mapAliasToTable: Record<string, string>;
    currentJoinTableName: string;
    joinTables: Array<{
      table: string;
      fields: string[];
      type: "LEFT JOIN" | "JOIN" | "RIGHT JOIN";
      on: string;
      alias: string;
    }>;
  };

  /**
   * Creates a new instance of QueryBuilder.
   * @remarks
   * This constructor initializes a new QueryBuilder instance with default settings.
   *
   * @example
   * ```typescript
   * const queryBuilder = new QueryBuilder();
   * ```
   */
  constructor() {
    this._data = {
      fields: [],
      conditions: [],
      type: "",
      update: [],
      insert: "",
      insertRows: 0,
      delete: "",
      sql: "",
      sqlTpl: "",
      sqlValues: [],
      orderFields: "",
      orderBy: "",
      groupBy: "",
      offsetRows: 0,
      limitRows: 0,
      limit: "",
      mapTableToAlias: {},
      mapAliasToTable: {},
      currentJoinTableName: "",
      joinTables: [],
    };
  }

  /**
   * Creates a clone of the current QueryBuilder instance.
   * @returns A new QueryBuilder instance with the same configuration as the original.
   * @remarks
   * This method is useful for creating a copy of an existing query builder to make variations.
   *
   * @example
   * ```typescript
   * const original = new QueryBuilder().table("users").select("name");
   * const clone = original.clone().where("age > 30");
   * ```
   */
  public clone(): QueryBuilder {
    const q = new QueryBuilder();
    (q as any)._data = utils.deepCopy(this._data);
    return q;
  }

  /**
   * Formats a template string with optional values.
   * @param tpl - The template string to format.
   * @param values - Optional values to interpolate into the template.
   * @returns The formatted string.
   * @remarks
   * This method allows you to create formatted SQL queries by interpolating values into a template string.
   * It supports both object and array values.
   *
   * @example
   * ```typescript
   * const query = QueryBuilder.expr()
   *   .select("name", "age")
   *   .from("users")
   *   .where(QueryBuilder.expr().format("age > ?", 30));
   * ```
   */
  public format(tpl: string): string;
  /**
   * Formats a template string with key-value pairs.
   * @param tpl - The template string to format.
   * @param values - Key-value pairs to interpolate into the template.
   * @returns The formatted string.
   * @remarks
   * This method allows you to create formatted SQL queries by interpolating key-value pairs into a template string.
   *
   * @example
   * ```typescript
   * const query = QueryBuilder.insert({ name: "John", age: 30 }).format("INSERT INTO users SET ?");
   * ```
   */
  public format(tpl: string, values: DataRow): string;
  /**
   * Formats a template string with an array of values.
   * @param tpl - The template string to format.
   * @param values - An array of values to interpolate into the template.
   * @returns The formatted string.
   * @remarks
   * This method allows you to create formatted SQL queries by interpolating an array of values into a template string.
   *
   * @example
   * ```typescript
   * const query = QueryBuilder.select("name").from("users").where("age > ?").format("?");
   * ```
   */
  public format(tpl: string, values: any[]): string;

  /**
   * @internal
   * Implementation of the format method with optional parameters.
   */
  public format(tpl: string, values?: DataRow | any[]): string {
    assert(typeof tpl === "string", `first parameter must be a string`);
    if (!values) {
      return tpl;
    }
    assert(
      Array.isArray(values) || typeof values === "object",
      "second parameter must be an array or object",
    );
    if (Array.isArray(values)) {
      return utils.sqlFormat(tpl, values);
    }
    return utils.sqlFormatObject(tpl, values);
  }

  //////////////////////////////////////////////////////////////////////////////

  /**
   * Set the table name for the query.
   *
   * @param tableName - The name of the table to be used in the query.
   * @returns This QueryBuilder instance for method chaining.
   * @throws Throws an error if attempting to change the table name after it's already been set.
   */
  public into(tableName: string): this {
    return this.table(tableName);
  }

  /**
   * Set the table name for the query.
   *
   * @param tableName - The name of the table to be used in the query.
   * @returns This QueryBuilder instance for method chaining.
   * @throws Throws an error if attempting to change the table name after it's already been set.
   */
  public from(tableName: string): this {
    return this.table(tableName);
  }

  /**
   * Set the table name for the query.
   *
   * @param tableName - The name of the table to be used in the query.
   * @returns This QueryBuilder instance for method chaining.
   * @throws Throws an error if attempting to change the table name after it's already been set.
   */
  public table(tableName: string): this {
    assert(
      !this._data.tableName,
      `Cannot change table name after it's set to "${this._data.tableName}"`,
    );
    this._data.tableName = tableName;
    this._data.tableNameEscaped = utils.sqlEscapeId(tableName);
    return this;
  }

  //////////////////////////////////////////////////////////////////////////////

  /**
   * Set an alias for a table name.
   *
   * @param tableName - The table name to be aliased.
   * @param aliasName - The alias to be associated with the table name.
   * @throws Throws an error if the alias name is already registered.
   * @internal
   */
  protected setTableAlias(tableName: string, aliasName: string) {
    assert(
      !(aliasName in this._data.mapAliasToTable),
      `Alias name "${aliasName}" is already registered.`,
    );
    this._data.mapAliasToTable[aliasName] = tableName;
    this._data.mapTableToAlias[tableName] = aliasName;
  }

  /**
   * Add a JOIN query to the query builder.
   *
   * @param tableName - The name of the table to be joined.
   * @param type - The type of JOIN (e.g., "JOIN," "LEFT JOIN," "RIGHT JOIN").
   * @param fields - An array of fields to be selected from the joined table.
   * @param alias - An optional alias for the joined table.
   * @returns This QueryBuilder instance for method chaining.
   * @throws Throws an error if the first parameter is not a string.
   */
  protected addJoinTable(
    tableName: string,
    type: "JOIN" | "LEFT JOIN" | "RIGHT JOIN",
    fields: string[],
    alias: string = "",
  ): this {
    assert(
      typeof tableName === "string",
      `The first parameter must be a string.`,
    );
    this._data.currentJoinTableName = tableName;
    if (fields.length < 1) {
      fields = [];
    }
    this._data.joinTables.push(
      { table: tableName, fields, type, on: "", alias },
    );
    return this;
  }

  /**
   * Set an alias for the current table.
   *
   * @param name - The alias name for the table.
   * @returns This QueryBuilder instance for method chaining.
   * @throws Throws an error if the first parameter is not a string.
   */
  public as(name: string): this {
    assert(typeof name === "string", `The first parameter must be a string.`);
    const tableName = this._data.currentJoinTableName || this._data.tableName!;
    this.setTableAlias(tableName, name);
    if (this._data.joinTables.length > 0) {
      this._data.joinTables[this._data.joinTables.length - 1].alias = name;
    }
    return this;
  }

  /**
   * Perform a JOIN operation on a table.
   *
   * @param tableName - The name of the table to join.
   * @param fields - An optional array of fields to select from the joined table.
   * @returns This QueryBuilder instance for method chaining.
   * @throws Throws an error if the first parameter is not a string.
   */
  public join(tableName: string, fields: string[] = []): this {
    return this.addJoinTable(tableName, "JOIN", fields);
  }

  /**
   * Perform a LEFT JOIN operation on a table.
   *
   * @param tableName - The name of the table to left join.
   * @param fields - An optional array of fields to select from the left joined table.
   * @returns This QueryBuilder instance for method chaining.
   * @throws Throws an error if the first parameter is not a string.
   */
  public leftJoin(tableName: string, fields: string[] = []): this {
    return this.addJoinTable(tableName, "LEFT JOIN", fields);
  }

  /**
   * Perform a RIGHT JOIN operation on a table.
   *
   * @param tableName - The name of the table to right join.
   * @param fields - An optional array of fields to select from the right joined table.
   * @returns This QueryBuilder instance for method chaining.
   * @throws Throws an error if the first parameter is not a string.
   */
  public rightJoin(tableName: string, fields: string[] = []): this {
    return this.addJoinTable(tableName, "RIGHT JOIN", fields);
  }

  /**
   * Set the ON condition for the JOIN operation.
   *
   * @param condition - The ON condition as a string.
   * @param values - An optional array of values to replace placeholders in the condition.
   * @returns This QueryBuilder instance for method chaining.
   * @throws Throws an error if a LEFT JOIN or RIGHT JOIN is missing.
   */
  public on(condition: string, values: DataRow | any[] = []): this {
    const last = this._data.joinTables[this._data.joinTables.length - 1];
    assert(last, `Missing leftJoin() or rightJoin().`);
    assert(
      !last.on,
      `Join condition already registered. Previous condition is "${last.on}".`,
    );
    last.on = this.format(condition, values);
    return this;
  }

  //////////////////////////////////////////////////////////////////////////////

  /**
   * Specify a WHERE condition for the query.
   *
   * @param condition - The condition to apply to the query.
   * @returns This QueryBuilder instance for method chaining.
   * @throws Throws an error if the condition is invalid.
   */
  public where(condition: Expression): this;

  /**
   * Specify a WHERE condition for the query using SQL.
   *
   * @param condition - The SQL condition to apply to the query.
   * @returns This QueryBuilder instance for method chaining.
   * @throws Throws an error if the condition is invalid.
   */
  public where(condition: string): this;

  /**
   * Specify a WHERE condition for the query using key-value pairs.
   *
   * @param condition - An object containing key-value pairs representing the condition.
   * @returns This QueryBuilder instance for method chaining.
   * @throws Throws an error if the condition is invalid or empty.
   */
  public where(
    condition:
      | Partial<Q>
      | Partial<Pick<AdvancedCondition, keyof Q>>
      | RawCondition,
  ): this;

  /**
   * Specify a WHERE condition for the query using a template string.
   *
   * @param condition - The template string representing the condition.
   * @param values - An optional array of values to replace placeholders in the condition.
   * @returns This QueryBuilder instance for method chaining.
   * @throws Throws an error if the condition is invalid or empty.
   */
  public where(condition: string, values: DataRow | any[]): this;

  /**
   * Specify a WHERE condition for the query.
   *
   * @param condition - The condition to apply to the query.
   * @returns This QueryBuilder instance for method chaining.
   * @throws Throws an error if the condition is invalid.
   */
  public where(
    condition:
      | Expression
      | string
      | Partial<Q>
      | Partial<Pick<AdvancedCondition, keyof Q>>
      | RawCondition,
    values?: DataRow | any[],
  ): this {
    if (typeof condition === "string") {
      if (values) {
        return this.and(condition, values);
      }
      return this.and(condition);
    } else if (condition instanceof Expression) {
      return this.and(condition);
    }
    return this.and(condition);
  }

  /**
   * Add an additional AND condition to the query.
   *
   * @param condition - The condition to apply to the query.
   * @returns This QueryBuilder instance for method chaining.
   * @throws Throws an error if the condition is invalid.
   */
  public and(condition: Expression): this;

  /**
   * Add an additional AND condition to the query using SQL.
   *
   * @param condition - The SQL condition to apply to the query.
   * @returns This QueryBuilder instance for method chaining.
   * @throws Throws an error if the condition is invalid.
   */
  public and(condition: string): this;

  /**
   * Add an additional AND condition to the query using key-value pairs.
   *
   * @param condition - An object containing key-value pairs representing the condition.
   * @returns This QueryBuilder instance for method chaining.
   * @throws Throws an error if the condition is invalid or empty.
   */
  public and(
    condition:
      | Partial<Q>
      | Partial<Pick<AdvancedCondition, keyof Q>>
      | RawCondition,
  ): this;

  /**
   * Add an additional AND condition to the query using a template string.
   *
   * @param condition - The template string representing the condition.
   * @param values - An array of values to replace placeholders in the condition.
   * @returns This QueryBuilder instance for method chaining.
   * @throws Throws an error if the condition is invalid or empty.
   */
  public and(condition: string, values: DataRow): this;

  /**
   * Add an additional AND condition to the query using a template string.
   *
   * @param condition - The template string representing the condition.
   * @param values - An array of values to replace placeholders in the condition.
   * @returns This QueryBuilder instance for method chaining.
   * @throws Throws an error if the condition is invalid or empty.
   */
  public and(condition: string, values: any[]): this;

  /**
   * Add an additional AND condition to the query.
   *
   * @param condition - The condition to apply to the query.
   * @returns This QueryBuilder instance for method chaining.
   * @throws Throws an error if the condition is invalid.
   */
  public and(
    condition:
      | Expression
      | string
      | Partial<Q>
      | Partial<Pick<AdvancedCondition, keyof Q>>
      | RawCondition,
    values?: DataRow | any[],
  ): this {
    const t = typeof condition;
    assert(condition, `Missing condition.`);
    assert(
      t === "string" || t === "object",
      `Condition must be a string or object.`,
    );
    if (typeof condition === "string") {
      if (this._data.type !== "SELECT") {
        // Check if the condition is empty for modification operations.
        assert(
          condition.trim(),
          Messages.conditionCannotBeEmpty,
        );
      }
      this._data.conditions.push(this.format(condition, values || []));
    } else if (condition instanceof Expression) {
      this._data.conditions.push(condition.build());
    } else {
      const keys = utils.findKeysForUndefinedValue(condition);
      assert(
        keys.length < 1,
        Messages.undefinedValueConditionalKeys(keys),
      );
      if (this._data.type !== "SELECT") {
        // Check if the condition is empty for modification operations.
        assert(
          Object.keys(condition).length > 0,
          Messages.conditionCannotBeEmpty,
        );
      }
      if (typeof condition === "object" && "$raw" in condition) {
        this._data.conditions.push(condition["$raw"] as string);
        delete condition["$raw"];
      }
      this._data.conditions = this._data.conditions.concat(
        utils.sqlConditionStrings(condition as any),
      );
    }
    return this;
  }

  /**
   * Specifies a SELECT query with optional fields to retrieve.
   *
   * @param fields - Optional fields to retrieve in the SELECT query.
   * @returns This QueryBuilder instance for method chaining.
   * @throws Throws an error if the query type has already been set.
   *
   * @example
   * ```typescript
   * queryBuilder.select("field1", "field2");
   * ```
   */
  public select(...fields: string[]): this {
    assert(
      this._data.type === "",
      `cannot change query type after it was set to "${this._data.type}"`,
    );
    this._data.type = "SELECT";
    if (fields.length < 1) return this;
    return this.fields(...fields);
  }

  /**
   * Sets the fields to retrieve in the SELECT query.
   *
   * @param fields - Fields to retrieve in the SELECT query.
   * @returns This QueryBuilder instance for method chaining.
   * @throws Throws an error if fields have already been set.
   *
   * @example
   * ```typescript
   * queryBuilder.fields("field1", "field2");
   * ```
   */
  public fields(...fields: string[]): this {
    assert(
      !(this._data.fields.length > 0),
      `cannot change fields after it has been set`,
    );
    this._data.fields = this._data.fields.concat(
      utils.formatFields("", fields),
    );
    return this;
  }

  /**
   * Specifies a SELECT DISTINCT query with fields to retrieve.
   *
   * @param fields - Fields to retrieve in the SELECT DISTINCT query.
   * @returns This QueryBuilder instance for method chaining.
   * @throws Throws an error if the query type has already been set or if no fields are provided.
   *
   * @example
   * ```typescript
   * queryBuilder.selectDistinct("field1", "field2");
   * ```
   */
  public selectDistinct(...fields: string[]): this {
    assert(
      this._data.type === "",
      `cannot change query type after it was set to "${this._data.type}"`,
    );
    this._data.type = "SELECT DISTINCT";
    assert(fields.length > 0, `distinct expected one or more fields`);
    return this.fields(...fields);
  }

  /**
   * Specifies a COUNT query to retrieve the count of records.
   *
   * @param name - The name to assign to the count result field (default: "count").
   * @param field - The field to count (default: "*").
   * @returns This QueryBuilder instance for method chaining.
   * @throws Throws an error if the query type has already been set.
   *
   * @example
   * ```typescript
   * queryBuilder.count("total");
   * ```
   */
  public count(name = "count", field = "*"): this {
    assert(
      this._data.type === "",
      `cannot change query type after it was set to "${this._data.type}"`,
    );
    this._data.type = "SELECT";
    this._data.fields.push(`COUNT(${field}) AS ${utils.sqlEscapeId(name)}`);
    return this;
  }

  /**
   * Specifies an UPDATE query.
   *
   * @returns This QueryBuilder instance for method chaining.
   * @throws Throws an error if the query type has already been set.
   *
   * @example
   * ```typescript
   * queryBuilder.update();
   * ```
   *
   * @example
   * ```typescript
   * queryBuilder.update("field1=:value", { value: 123 });
   * ```
   */
  public update(): this;
  /**
   * Specifies an UPDATE query with data to set.
   *
   * @param update - Data to set in the UPDATE query.
   * @returns This QueryBuilder instance for method chaining.
   * @throws Throws an error if the query type has already been set.
   *
   * @example
   * ```typescript
   * queryBuilder.update({ field1: 123, field2: 456 });
   * ```
   *
   * @example
   * ```typescript
   * queryBuilder.update("field1=:value", { value: 123 });
   * ```
   */
  public update(update: Partial<Q> | Pick<AdvancedUpdate, keyof Q>): this;
  /**
   * Specifies an UPDATE query with SQL data to set.
   *
   * @param update - SQL data to set in the UPDATE query.
   * @param values - Values to replace placeholders in the SQL data.
   * @returns This QueryBuilder instance for method chaining.
   * @throws Throws an error if the query type has already been set.
   *
   * @example
   * ```typescript
   * queryBuilder.update("field1=field1+1");
   * ```
   *
   * @example
   * ```typescript
   * queryBuilder.update("field1=:value", { value: 123 });
   * ```
   */
  public update(update: string): this;
  /**
   * Specifies an UPDATE query with SQL data to set.
   *
   * @param update - SQL data to set in the UPDATE query.
   * @param values - Values to replace placeholders in the SQL data.
   * @returns This QueryBuilder instance for method chaining.
   * @throws Throws an error if the query type has already been set.
   *
   * @example
   * ```typescript
   * queryBuilder.update("field1=field1+1");
   * ```
   *
   * @example
   * ```typescript
   * queryBuilder.update("field1=:value", { value: 123 });
   * ```
   */
  public update(update: string, values: DataRow): this;
  /**
   * Specifies an UPDATE query with SQL data to set.
   *
   * @param update - SQL data to set in the UPDATE query.
   * @param values - Values to replace placeholders in the SQL data.
   * @returns This QueryBuilder instance for method chaining.
   * @throws Throws an error if the query type has already been set.
   *
   * @example
   * ```typescript
   * queryBuilder.update("field1=field1+1");
   * ```
   *
   * @example
   * ```typescript
   * queryBuilder.update("field1=:value", { value: 123 });
   * ```
   */
  public update(update: string, values: any[]): this;

  /**
   * Specifies an UPDATE query with data to set.
   *
   * @param update - Data to set in the UPDATE query.
   * @param values - Values to replace placeholders in the data.
   * @returns This QueryBuilder instance for method chaining.
   * @throws Throws an error if the query type has already been set.
   *
   * @example
   * ```typescript
   * queryBuilder.update({ field1: 123, field2: 456 });
   * ```
   *
   * @example
   * ```typescript
   * queryBuilder.update("field1=:value", { value: 123 });
   * ```
   */
  public update(
    update?: Partial<Q> | Pick<AdvancedUpdate, keyof Q> | string,
    values?: DataRow | any[],
  ): this {
    assert(
      this._data.type === "",
      `cannot change query type after it was set to "${this._data.type}"`,
    );
    this._data.type = "UPDATE";
    this._data.update = [];
    if (update) {
      if (typeof update === "string") {
        if (values) {
          return this.set(update, values);
        }
        return this.set(update);
      }
      return this.set(update);
    }
    return this;
  }

  /**
   * Specifies data to be updated in an UPDATE query using a SQL update statement.
   *
   * @param update - The SQL update statement. For example, "a=a+1".
   * @returns This QueryBuilder instance for method chaining.
   * @throws Throws an error if the query type is not set to UPDATE or if the provided update data is invalid.
   *
   * @example
   * ```typescript
   * queryBuilder.set("a=a+1");
   * ```
   */
  public set(update: string): this;

  /**
   * Specifies data to be updated in an UPDATE query using a SQL template with named placeholders.
   *
   * @param update - The SQL update template with named placeholders, such as "a=:a".
   * @param values - An object containing parameter values that correspond to the named placeholders.
   * @returns This QueryBuilder instance for method chaining.
   * @throws Throws an error if the query type is not set to UPDATE or if the provided update data is invalid.
   *
   * @example
   * ```typescript
   * queryBuilder.set("a=:value", { value: 123 });
   * ```
   */
  public set(update: string, values: DataRow): this;

  /**
   * Specifies data to be updated in an UPDATE query using a SQL template with positional placeholders.
   *
   * @param update - The SQL update template with positional placeholders, such as "a=?".
   * @param values - An array of parameter values that correspond to the positional placeholders.
   * @returns This QueryBuilder instance for method chaining.
   * @throws Throws an error if the query type is not set to UPDATE or if the provided update data is invalid.
   *
   * @example
   * ```typescript
   * queryBuilder.set("a=?", [123]);
   * ```
   */
  public set(update: string, values: any[]): this;

  /**
   * Specifies data to be updated in an UPDATE query using a set of key-value pairs.
   *
   * @param update - An object containing key-value pairs to set in the UPDATE query. For example, { a: 123, b: 456 }.
   * @returns This QueryBuilder instance for method chaining.
   * @throws Throws an error if the query type is not set to UPDATE or if the provided update data is invalid.
   *
   * @example
   * ```typescript
   * queryBuilder.set({ a: 123, b: 456 });
   * ```
   */
  public set(
    update: Partial<Q> | Partial<Pick<AdvancedUpdate, keyof Q>>,
  ): this;

  /**
   * Specifies data to be updated in an UPDATE query using a SQL statement or key-value pairs.
   *
   * @param update - The update data, which can be a SQL update statement, a SQL template, or key-value pairs.
   * @param values - Optional. If `update` is a SQL template, this parameter provides the parameter values.
   * @returns This QueryBuilder instance for method chaining.
   * @throws Throws an error if the query type is not set to UPDATE or if the provided update data is invalid.
   *
   * @example
   * ```typescript
   * queryBuilder.set("a=a+1");
   * ```
   *
   * @example
   * ```typescript
   * queryBuilder.set("a=:value", { value: 123 });
   * ```
   *
   * @example
   * ```typescript
   * queryBuilder.set({ a: 123, b: 456 });
   * ```
   */
  public set(
    update: string | Partial<Q> | Partial<Pick<AdvancedUpdate, keyof Q>>,
    values?: DataRow | any[],
  ): this {
    const t = typeof update;
    assert(
      this._data.type === "UPDATE" ||
        this._data.type === "INSERT_OR_UPDATE",
      `query type must be UPDATE, please call .update() before`,
    );
    assert(update, `missing update data`);
    assert(
      t === "string" || t === "object",
      `first parameter must be a string or array`,
    );
    if (typeof update === "string") {
      this._data.update.push(this.format(update, values || []));
    } else {
      let update2 = update as Record<string, any>;
      const sql = utils.sqlUpdateString(update2);
      if (sql) {
        this._data.update.push(sql);
      }
    }
    return this;
  }

  /**
   * Specifies data to be inserted into the database table.
   *
   * @param data - Key-value pairs of data to insert.
   * @returns This QueryBuilder instance for method chaining.
   * @throws Throws an error if the query type is not set to INSERT or if the data parameter is missing or not of type object.
   *
   * @example
   * ```typescript
   * queryBuilder.insert({ name: 'John', age: 30 });
   * ```
   *
   * @example
   * ```typescript
   * queryBuilder.insert([
   *   { name: 'John', age: 30 },
   *   { name: 'Alice', age: 25 }
   * ]);
   * ```
   */
  public insert(data: Partial<Q>): this;

  /**
   * Specifies an array of data to be inserted into the database table.
   *
   * @param data - Array of key-value pairs of data to insert.
   * @returns This QueryBuilder instance for method chaining.
   * @throws Throws an error if the query type is not set to INSERT, if the data parameter is missing, or if it's not an array of objects.
   *
   * @example
   * ```typescript
   * queryBuilder.insert([
   *   { name: 'John', age: 30 },
   *   { name: 'Alice', age: 25 }
   * ]);
   * ```
   */
  public insert(data: Array<Partial<Q>>): this;

  /**
   * Specifies data to be inserted into the database table.
   *
   * @param data - Key-value pairs of data to insert or an array of key-value pairs.
   * @returns This QueryBuilder instance for method chaining.
   * @throws Throws an error if the query type is not set to INSERT, if the data parameter is missing, or if it's not an object or an array of objects.
   *
   * @example
   * ```typescript
   * queryBuilder.insert({ name: 'John', age: 30 });
   * ```
   */
  public insert(data: Partial<Q> | Array<Partial<Q>>): this {
    assert(
      this._data.type === "",
      `cannot change query type after it was set to "${this._data.type}"`,
    );
    this._data.type = "INSERT";
    assert(data, `missing data`);
    assert(typeof data === "object", `data must be an object or array`);
    if (Array.isArray(data)) {
      assert(data.length >= 1, `data array must have at least 1 item`);
    } else {
      data = [data];
    }

    const list: Array<DataRow> = data as Array<DataRow>;
    const originFields = Object.keys(list[0]);
    const fields = originFields.map((name) => utils.sqlEscapeId(name));
    const values: string[] = [];
    for (const item of list) {
      assert(
        item && typeof item === "object",
        `every item of data array must be an object`,
      );
      const line: string[] = [];
      for (const field of originFields) {
        assert(
          field in item,
          `every item of data array must have field "${field}"`,
        );
        line.push(utils.sqlEscape(item[field]));
      }
      values.push(`(${line.join(", ")})`);
    }
    this._data.insert = `(${fields.join(", ")}) VALUES ${values.join(",\n")}`;
    this._data.insertRows = list.length;
    return this;
  }

  /**
   * Specifies that a DELETE query should be executed to delete data from the database table.
   *
   * @returns This QueryBuilder instance for method chaining.
   * @throws Throws an error if the query type is not set to DELETE.
   *
   * @example
   * ```typescript
   * queryBuilder.delete();
   * ```
   */
  public delete(): this {
    assert(
      this._data.type === "",
      `cannot change query type after it was set to "${this._data.type}"`,
    );
    this._data.type = "DELETE";
    return this;
  }

  /**
   * Specifies that when inserting records, if there is a key conflict, it should be updated.
   * ON DUPLICATE KEY UPDATE
   * Usage: table("xx").insert(row).onDuplicateKeyUpdate().set(update)
   *
   * @returns This QueryBuilder instance for method chaining.
   * @throws Throws an error if onDuplicateKeyUpdate() is called before insert() or if insert() hasn't inserted a single row.
   *
   * @example
   * ```typescript
   * table("my_table").insert({ id: 1, name: 'John' }).onDuplicateKeyUpdate().set({ name: 'Alice' });
   * ```
   */
  public onDuplicateKeyUpdate(): this {
    assert(
      this._data.type === "INSERT",
      `onDuplicateKeyUpdate() must be called after insert()`,
    );
    assert(
      this._data.insertRows === 1,
      Messages.functionWithWrongRowCount(
        "onDuplicateKeyUpdate",
        this._data.insertRows,
      ),
    );
    this._data.type = "INSERT_OR_UPDATE";
    return this;
  }

  /**
   * Specifies a custom SQL query.
   *
   * @param sql - SQL query statement.
   * @returns This QueryBuilder instance for method chaining.
   * @throws Throws an error if the query type is not set to an empty string.
   *
   * @example
   * ```typescript
   * queryBuilder.sql('SELECT * FROM my_table');
   * ```
   *
   * @example
   * ```typescript
   * queryBuilder.sql('SELECT * FROM my_table WHERE id = :id', { id: 1 });
   * ```
   */
  public sql(sql: string): this;

  /**
   * Specifies a custom SQL query with template parameters.
   *
   * @param sql - SQL query statement with placeholders.
   * @param values - Template parameter values.
   * @returns This QueryBuilder instance for method chaining.
   * @throws Throws an error if the query type is not set to an empty string.
   *
   * @example
   * ```typescript
   * queryBuilder.sql('SELECT * FROM my_table WHERE id = :id', { id: 1 });
   * ```
   */
  public sql(sql: string, values: DataRow): this;

  /**
   * Specifies a custom SQL query with template parameters.
   *
   * @param sql - SQL query statement with placeholders.
   * @param values - Template parameter values.
   * @returns This QueryBuilder instance for method chaining.
   * @throws Throws an error if the query type is not set to an empty string.
   *
   * @example
   * ```typescript
   * queryBuilder.sql('SELECT * FROM my_table WHERE id = ?', [1]);
   * ```
   */
  public sql(sql: string, values: any[]): this;

  /**
   * Sets a custom SQL query statement for the query builder.
   *
   * @param sql - The custom SQL query statement.
   * @param values - (Optional) Template parameter values for the SQL query.
   * @returns This QueryBuilder instance for method chaining.
   * @throws Throws an error if the query type has already been set.
   *
   * @example
   * ```typescript
   * queryBuilder.sql('SELECT * FROM users WHERE age > :minAge', { minAge: 18 });
   * ```
   */
  public sql(sql: string, values?: DataRow | any[]): this {
    assert(
      this._data.type === "",
      `cannot change query type after it was set to "${this._data.type}"`,
    );
    this._data.type = "CUSTOM";
    this._data.sqlTpl = sql;
    this._data.sqlValues = Array.isArray(values) ? values : [];
    return this;
  }

  /**
   * Specifies a sorting method for the query result.
   *
   * @param tpl - SQL query statement for ordering.
   * @returns This QueryBuilder instance for method chaining.
   *
   * @example
   * ```typescript
   * queryBuilder.orderBy('name DESC');
   * ```
   */
  public orderBy(tpl: string): this;

  /**
   * Specifies a sorting method for the query result with template parameters.
   *
   * @param tpl - SQL query statement for ordering with placeholders.
   * @param values - Template parameter values.
   * @returns This QueryBuilder instance for method chaining.
   *
   * @example
   * ```typescript
   * queryBuilder.orderBy('name ASC, age DESC');
   * ```
   */
  public orderBy(tpl: string, values: DataRow): this;

  /**
   * Specifies a sorting method for the query result with template parameters.
   *
   * @param tpl - SQL query statement for ordering with placeholders.
   * @param values - Template parameter values.
   * @returns This QueryBuilder instance for method chaining.
   *
   * @example
   * ```typescript
   * queryBuilder.orderBy('name ASC', { name: 'Alice' });
   * ```
   */
  public orderBy(tpl: string, values: any[]): this;

  /**
   * Sets the sorting criteria for the query results.
   *
   * @param tpl - The SQL sorting template, e.g., "column_name DESC".
   * @param values - (Optional) Template parameter values for the sorting criteria.
   * @returns This QueryBuilder instance for method chaining.
   *
   * @example
   * ```typescript
   * queryBuilder.orderBy('column_name DESC');
   * ```
   */
  public orderBy(tpl: string, values?: DataRow | any[]): this {
    if (values) {
      this._data.orderFields = this.format(tpl, values);
    } else {
      this._data.orderFields = tpl;
    }
    this._data.orderBy = `ORDER BY ${this._data.orderFields}`;
    this._data.orderBy = this._data.orderBy.replace(/'DESC'/gi, "DESC").replace(
      /'ASC'/gi,
      "ASC",
    );
    return this;
  }

  /**
   * Specifies grouping fields for the query result.
   *
   * @param fields - Fields to group by.
   * @returns This QueryBuilder instance for method chaining.
   * @throws Throws an error if no fields are provided for grouping.
   *
   * @example
   * ```typescript
   * queryBuilder.groupBy('category');
   * ```
   *
   * @example
   * ```typescript
   * queryBuilder.groupBy('category', 'sub_category');
   * ```
   */
  public groupBy(...fields: string[]): this {
    assert(fields.length > 0, `groupBy expected one or more fields`);
    this._data.groupBy = `GROUP BY ${
      utils.formatFields("", fields).join(", ")
    }`;
    return this;
  }

  /**
   * Specifies a grouping condition for the query result.
   *
   * @param tpl - SQL query statement for grouping.
   * @returns This QueryBuilder instance for method chaining.
   * @throws Throws an error if groupBy() hasn't been called before using having().
   *
   * @example
   * ```typescript
   * queryBuilder.groupBy('category').having('SUM(quantity) > 10');
   * ```
   */
  public having(tpl: string): this;

  /**
   * Specifies a grouping condition for the query result with template parameters.
   *
   * @param tpl - SQL query statement for grouping with placeholders.
   * @param values - Template parameter values.
   * @returns This QueryBuilder instance for method chaining.
   * @throws Throws an error if groupBy() hasn't been called before using having().
   *
   * @example
   * ```typescript
   * queryBuilder.groupBy('category', 'sub_category').having('SUM(quantity) > :minQuantity', { minQuantity: 10 });
   * ```
   */
  public having(tpl: string, values: DataRow): this;

  /**
   * Specifies a grouping condition for the query result with template parameters.
   *
   * @param tpl - SQL query statement for grouping with placeholders.
   * @param values - Template parameter values.
   * @returns This QueryBuilder instance for method chaining.
   * @throws Throws an error if groupBy() hasn't been called before using having().
   *
   * @example
   * ```typescript
   * queryBuilder.groupBy('category', 'sub_category').having('SUM(quantity) > ?', [10]);
   * ```
   */
  public having(tpl: string, values: any[]): this;

  /**
   * Specifies a condition for grouping in the query.
   *
   * @param tpl - The SQL condition template, e.g., "column_name > 10".
   * @param values - (Optional) Template parameter values for the condition.
   * @returns This QueryBuilder instance for method chaining.
   *
   * @throws Error if `groupBy` has not been called before `having`.
   *
   * @example
   * ```typescript
   * queryBuilder.groupBy('column_name').having('COUNT(column_name) > 5');
   * ```
   */
  public having(tpl: string, values?: DataRow | any[]): this {
    assert(this._data.groupBy.length > 0, `please call groupBy() firstly`);
    if (values) {
      this._data.groupBy += " HAVING " + this.format(tpl, values);
    } else {
      this._data.groupBy += " HAVING " + tpl;
    }
    return this;
  }

  /**
   * Specifies the number of rows to skip in the query result.
   *
   * @param rows - The number of rows to skip.
   * @returns This QueryBuilder instance for method chaining.
   * @throws Throws an error if rows is less than 0.
   *
   * @example
   * ```typescript
   * queryBuilder.offset(10);
   * ```
   */
  public offset(rows: number): this {
    assert(rows >= 0, `rows must be >= 0`);
    this._data.offsetRows = Number(rows);
    this._data.limit = utils.sqlLimitString(
      this._data.offsetRows,
      this._data.limitRows,
    );
    return this;
  }

  /**
   * Specifies the number of rows to skip in the query result (alias for offset()).
   *
   * @param rows - The number of rows to skip.
   * @returns This QueryBuilder instance for method chaining.
   * @throws Throws an error if rows is less than 0.
   *
   * @example
   * ```typescript
   * queryBuilder.skip(10);
   * ```
   */
  public skip(rows: number): this {
    return this.offset(rows);
  }

  /**
   * Specifies the maximum number of rows to return in the query result.
   *
   * @param rows - The maximum number of rows to return.
   * @returns This QueryBuilder instance for method chaining.
   * @throws Throws an error if rows is less than 0.
   *
   * @example
   * ```typescript
   * queryBuilder.limit(50);
   * ```
   */
  public limit(rows: number): this {
    assert(rows >= 0, `rows must be >= 0`);
    this._data.limitRows = Number(rows);
    this._data.limit = utils.sqlLimitString(
      this._data.offsetRows,
      this._data.limitRows,
    );
    return this;
  }

  /**
   * Sets multiple query options at once.
   *
   * @param options - Options object containing { offset, limit, orderBy, groupBy, fields }.
   * @returns This QueryBuilder instance for method chaining.
   * @throws Throws an error if options is not an object.
   *
   * @example
   * ```typescript
   * queryBuilder.options({ offset: 10, limit: 50, orderBy: 'name ASC', groupBy: 'category', fields: ['name', 'age'] });
   * ```
   */
  public options(options: QueryOptionsParams): this {
    assert(options, `options must be an Object`);
    if (typeof options.skip !== "undefined") {
      this.offset(options.skip);
    }
    if (typeof options.offset !== "undefined") {
      this.offset(options.offset);
    }
    if (typeof options.limit !== "undefined") {
      this.limit(options.limit);
    }
    if (typeof options.orderBy !== "undefined") {
      this.orderBy(options.orderBy);
    }
    if (typeof options.groupBy !== "undefined") {
      this.groupBy(options.groupBy);
    }
    if (typeof options.fields !== "undefined") {
      this.fields(...options.fields);
    }
    return this;
  }

  /**
   * Generates the SQL query string based on the current query builder configuration.
   *
   * @returns The SQL query string.
   * @throws Throws an error if any required query builder configurations are missing.
   *
   * @example
   * ```typescript
   * const sqlQuery = queryBuilder.build();
   * ```
   */
  public build(): string {
    const data = this._data;
    const currentTableName = data.tableName!;
    const currentTableEscapedName = data.tableNameEscaped!;
    data.conditions = data.conditions.map((v) => v.trim()).filter((v) => v);
    const where = data.conditions.length > 0
      ? `WHERE ${data.conditions.join(" AND ")}`
      : "";
    let sql: string;

    assert(currentTableName && currentTableEscapedName, "missing table name");

    switch (data.type) {
      case "SELECT":
      case "SELECT DISTINCT": {
        const join: string[] = [];
        if (data.joinTables.length > 0) {
          // 设置 FROM table AS a 并且将 SELECT x 改为 SELECT a.x
          if (data.mapTableToAlias[currentTableName]) {
            const a = utils.sqlEscapeId(data.mapTableToAlias[currentTableName]);
            join.push(`AS ${a}`);
            data.fields = utils.formatFields(a, data.fields);
          } else {
            data.fields = utils.formatFields(
              currentTableEscapedName,
              data.fields,
            );
          }
          // 创建连表
          for (let i = 0; i < data.joinTables.length; i++) {
            const item = data.joinTables[i];
            const t = utils.sqlEscapeId(item.table);
            let str = `${item.type} ${t}`;
            let a = item.alias || data.mapTableToAlias[item.table] || "";
            if (a) {
              a = utils.sqlEscapeId(a);
              str += ` AS ${a}`;
            } else {
              a = t;
            }
            if (item.on) {
              str += ` ON ${item.on}`;
            }
            if (item.fields) {
              data.fields = data.fields.concat(
                utils.formatFields(a, item.fields),
              );
            }
            join.push(str);
          }
        } else {
          data.fields = utils.formatFields("", data.fields);
        }
        if (data.fields.length === 0) {
          data.fields = ["*"];
        }
        const tail = utils.joinMultiString(
          ...join,
          where,
          data.groupBy,
          data.orderBy,
          data.limit,
        );
        sql = `${data.type} ${
          data.fields.join(", ")
        } FROM ${currentTableEscapedName} ${tail}`;
        break;
      }
      case "INSERT": {
        sql = `INSERT INTO ${currentTableEscapedName} ${data.insert}`;
        break;
      }
      case "UPDATE": {
        assert(data.update.length > 0, `update data connot be empty`);
        const tail = utils.joinMultiString(where, data.orderBy, data.limit);
        sql = `UPDATE ${currentTableEscapedName} SET ${
          data.update.join(", ")
        } ${tail}`;
        break;
      }
      case "INSERT_OR_UPDATE":
        assert(data.update.length > 0, `update data connot be empty`);
        sql =
          `INSERT INTO ${currentTableEscapedName} ${data.insert} ON DUPLICATE KEY UPDATE ${
            data.update.join(", ")
          }`;
        break;
      case "DELETE": {
        const tail = utils.joinMultiString(where, data.orderBy, data.limit);
        sql = `DELETE FROM ${currentTableEscapedName} ${tail}`;
        break;
      }
      case "CUSTOM": {
        this._data.sql = this.format(
          utils.sqlFormatObject(
            data.sqlTpl,
            {
              $table: this._data.tableNameEscaped,
              $orderBy: this._data.orderBy,
              $limit: this._data.limit,
              $fields: this._data.fields.join(", "),
              $skipRows: this._data.offsetRows,
              $offsetRows: this._data.offsetRows,
              $limitRows: this._data.limitRows,
            },
            true,
          ),
          data.sqlValues,
        );
        sql = this._data.sql;
        break;
      }
      default:
        throw new Error(`invalid query type "${data.type}"`);
    }
    return sql.trim();
  }
}
