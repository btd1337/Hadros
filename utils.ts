import { assertStrictEquals } from "assert";
import SqlString from "./sqlString.ts";
import Messages from "./messages.ts";

/**
 * Checks if an object is an instance of QueryBuilder.
 *
 * @param query - The object to be checked.
 * @returns `true` if the object is an instance of QueryBuilder, otherwise `false`.
 *
 * @example
 * ```typescript
 * const query = createQueryBuilder();
 * const result = isQueryBuilder(query); // true
 * ```
 */
export function isQueryBuilder(query: any): boolean {
  return query && typeof query.build === "function";
}

/**
 * Formats an SQL string with values replaced by placeholders.
 *
 * @param tpl - The SQL string with placeholders, e.g., "SELECT * FROM ?? WHERE id = ?".
 * @param values - The values to be inserted into the placeholders.
 * @returns The formatted SQL string with the values inserted.
 *
 * @example
 * ```typescript
 * const sql = "SELECT * FROM ?? WHERE id = ?";
 * const formattedSql = sqlFormat(sql, ["table", 123]);
 * console.log(formattedSql); // Outputs: "SELECT * FROM `table` WHERE id = 123"
 * ```
 */
export function sqlFormat(tpl: string, values: any[] = []): string {
  values = values.slice();
  let index = -1;
  tpl = tpl.replace(/\?+/g, (text, pos) => {
    index++;
    const v = values[index];
    if (text !== "???") return text;

    if (typeof v === "string") {
      values.splice(index, 1);
      index--;
      return v;
    }
    if (isQueryBuilder(v)) {
      const sql = v.build();
      assertStrictEquals(
        typeof sql,
        "string",
        `sqlFormat: values[${index}].build() must return a string`,
      );
      values.splice(index, 1);
      index--;
      return `(${sql})`;
    }
    throw new Error(
      `sqlFormat: values[${index}] for ??? must be a string or QueryBuilder instance but got ${v}`,
    );
  });
  return SqlString.format(tpl, values);
}

/**
 * Formats an SQL string with values from an object replaced by placeholders.
 *
 * @param sql - The SQL string with placeholders, e.g., "SELECT * FROM ::table WHERE `title`=:title".
 * @param values - The object containing the values to be inserted into the placeholders.
 * @param disable$ - Defines whether placeholders without "$" prefix should be disabled.
 * @returns The formatted SQL string with the object values inserted into the placeholders.
 *
 * @example
 * ```typescript
 * const sql = "SELECT * FROM ::table WHERE `title`=:title AND `id` IN :::ids";
 * const values = { table: "my_table", title: "example", ids: [1, 2, 3] };
 * const formattedSql = sqlFormatObject(sql, values);
 * console.log(formattedSql); // Outputs: "SELECT * FROM `my_table` WHERE `title`='example' AND `id` IN (1, 2, 3)"
 * ```
 */
export function sqlFormatObject(
  sql: string,
  values: Record<string, any> = {},
  disable$: boolean = false,
): string {
  return sql.replace(/:((:){0,2}[\w$]+)/g, (txt, key) => {
    let type = "value";
    let name = key;
    if (key.slice(0, 2) === "::") {
      type = "raw";
      name = key.slice(2);
    } else if (key.slice(0, 1) === ":") {
      type = "id";
      name = key.slice(1);
    }
    if (values.hasOwnProperty(name)) {
      if (disable$) {
        return values[name];
      }
      switch (type) {
        case "id":
          return sqlEscapeId(values[name]);
        case "raw":
          if (typeof values[name] === "string") return values[name];
          if (isQueryBuilder(values[name])) {
            const sql = values[name].build();
            assertStrictEquals(
              typeof sql,
              "string",
              `sqlFormatObject: values["${name}"].build() must return a string`,
            );
            return `(${sql})`;
          }
          throw new Error(
            `sqlFormatObject: value for :::${name} must be a string or QueryBuilder instance but got ${
              values[name]
            }`,
          );
        default:
          return sqlEscape(values[name]);
      }
    }
    return txt;
  });
}

/**
 * Escapes a value for safe use in an SQL string.
 *
 * @param value - The value to be escaped.
 * @returns The escaped value as an SQL string.
 *
 * @example
 * ```typescript
 * const input = "John's data";
 * const escapedValue = sqlEscape(input);
 * console.log(escapedValue); // Outputs: "'John\\'s data'"
 * ```
 */
export function sqlEscape(value: string): string {
  return SqlString.escape(value);
}

/**
 * Escapes an SQL identifier (e.g., a column or table name) for safe use in an SQL string.
 *
 * @param value - The identifier to be escaped.
 * @returns The escaped identifier as an SQL string.
 *
 * @example
 * ```typescript
 * const identifier = "column_name";
 * const escapedIdentifier = sqlEscapeId(identifier);
 * console.log(escapedIdentifier); // Outputs: "`column_name`"
 * ```
 */
export function sqlEscapeId(value: string): string {
  return SqlString.escapeId(value);
}

/**
 * Finds keys in an object with undefined values.
 *
 * @param data - The object to be checked.
 * @returns An array of keys with undefined values.
 *
 * @example
 * ```typescript
 * const data = { name: "John", age: undefined, city: undefined };
 * const undefinedKeys = findKeysForUndefinedValue(data);
 * console.log(undefinedKeys); // Outputs: ["age", "city"]
 * ```
 */
export function findKeysForUndefinedValue(data: Record<string, any>): string[] {
  return Object.keys(data).filter((k) => typeof data[k] === "undefined");
}

/**
 * Returns an SQL UPDATE string generated based on an object.
 *
 * @param data - The object containing the values to be updated.
 * @returns The generated SQL UPDATE string.
 *
 * @example
 * ```typescript
 * const data = { name: "John", age: 30 };
 * const updateSql = sqlUpdateString(data);
 * console.log(updateSql); // Outputs: "`name`='John', `age`=30"
 * ```
 */
export function sqlUpdateString(data: Record<string, any>): string {
  return Object.keys(data)
    .map((name) => {
      const info = data[name];
      const escapedName = sqlEscapeId(name);
      if (info && typeof info === "object" && Object.keys(info).length === 1) {
        const op = Object.keys(info)[0];
        switch (op) {
          case "$incr":
            return `${escapedName}=${escapedName}+(${sqlEscape(info.$incr)})`;
          case "$decr":
            return `${escapedName}=${escapedName}-(${sqlEscape(info.$decr)})`;
          case "$raw":
            return `${escapedName}=${info.$raw}`;
          default:
            throw new Error(`update type ${op} does not supported`);
        }
      } else {
        return `${escapedName}=${sqlEscape(data[name])}`;
      }
    })
    .join(", ");
}

/**
 * Returns an array of SQL condition strings generated based on a condition object.
 *
 * @param condition - The condition object containing query rules.
 * @returns An array of SQL condition strings.
 *
 * @example
 * ```typescript
 * const condition = { name: { $eq: "John" }, age: { $gt: 25 } };
 * const conditionSql = sqlConditionStrings(condition);
 * console.log(conditionSql); // Outputs: ["`name`='John'", "`age`>25"]
 * ```
 */
export function sqlConditionStrings(condition: Record<string, any>): string[] {
  const ret: string[] = [];
  const isPureConditionObject = (info: any) => {
    if (info && typeof info === "object") {
      const keys = Object.keys(info);
      return (
        keys.length > 0 &&
        keys.filter((v) => v[0] === "$").length === keys.length
      );
    }
    return false;
  };

  for (const name in condition as any) {
    const info = (condition as any)[name];
    const escapedName = sqlEscapeId(name);
    if (isPureConditionObject(info)) {
      Object.keys(info).forEach((op) => {
        switch (op) {
          case "$isNull":
            assertStrictEquals(
              true,
              info.$isNull,
              `value of $isNull property must be true`,
            );
            ret.push(`${escapedName} IS NULL`);
            break;
          case "$isNotNull":
            assertStrictEquals(
              true,
              info.$isNotNull,
              `value of $isNotNull property must be true`,
            );
            ret.push(`${escapedName} IS NOT NULL`);
            break;
          case "$lt":
            ret.push(`${escapedName}<${sqlEscape(info.$lt)}`);
            break;
          case "$lte":
            ret.push(`${escapedName}<=${sqlEscape(info.$lte)}`);
            break;
          case "$gt":
            ret.push(`${escapedName}>${sqlEscape(info.$gt)}`);
            break;
          case "$gte":
            ret.push(`${escapedName}>=${sqlEscape(info.$gte)}`);
            break;
          case "$eq":
            ret.push(`${escapedName}=${sqlEscape(info.$eq)}`);
            break;
          case "$ne":
            ret.push(`${escapedName}<>${sqlEscape(info.$ne)}`);
            break;
          case "$in":
            if (isQueryBuilder(info.$in)) {
              const sql = info.$in.build();
              assertStrictEquals(
                typeof sql,
                "string",
                Messages.methodMustReturnString(
                  "sqlConditionStrings",
                  name,
                  "in",
                ),
              );
              ret.push(`${escapedName} IN (${sql})`);
            } else if (Array.isArray(info.$in)) {
              const line = `${escapedName} IN (${
                info.$in
                  .map((v: any) => sqlEscape(v))
                  .join(", ")
              })`;
              if (info.$in.length > 0) {
                ret.push(line);
              } else {
                ret.push(`0 /* empty list warn: ${line} */`);
              }
            } else {
              throw new Error(
                `value for condition type $in in field ${name} must be an array`,
              );
            }
            break;
          case "$notIn":
            if (isQueryBuilder(info.$notIn)) {
              const sql = info.$notIn.build();
              assertStrictEquals(
                typeof sql,
                "string",
                Messages.methodMustReturnString(
                  "sqlConditionStrings",
                  name,
                  "notIn",
                ),
              );
              ret.push(`${escapedName} NOT IN (${sql})`);
            } else if (Array.isArray(info.$notIn)) {
              const line = `${escapedName} NOT IN (${
                info.$notIn
                  .map((v: any) => sqlEscape(v))
                  .join(", ")
              })`;
              if (info.$notIn.length > 0) {
                ret.push(line);
              } else {
                ret.push(`1 /* empty list warn: ${line} */`);
              }
            } else {
              throw new Error(
                `value for condition type $notIn in field ${name} must be an array`,
              );
            }
            break;
          case "$like":
            assertStrictEquals(
              typeof info.$like,
              "string",
              `value for condition type $like in ${name} must be a string`,
            );
            ret.push(`${escapedName} LIKE ${sqlEscape(info.$like)}`);
            break;
          case "$notLike":
            assertStrictEquals(
              typeof info.$notLike,
              "string",
              `value for condition type $notLike in ${name} must be a string`,
            );
            ret.push(`${escapedName} NOT LIKE ${sqlEscape(info.$notLike)}`);
            break;
          case "$raw":
            ret.push(`${escapedName}=${info.$raw}`);
            break;
          default:
            throw new Error(`condition type ${op} does not supported`);
        }
      });
    } else {
      ret.push(`${escapedName}=${sqlEscape((condition as any)[name])}`);
    }
  }
  return ret;
}

/**
 * Returns an SQL LIMIT string generated based on offset and limit values.
 *
 * @param offset - The number of rows to skip.
 * @param limit - The maximum number of rows to return.
 * @returns The generated SQL LIMIT string.
 *
 * @example
 * ```typescript
 * const offset = 10;
 * const limit = 5;
 * const limitSql = sqlLimitString(offset, limit);
 * console.log(limitSql); // Outputs: "LIMIT 10,5"
 * ```
 */
export function sqlLimitString(offset: number, limit: number): string {
  offset = Number(offset);
  limit = Number(limit);
  if (limit > 0) {
    if (offset > 0) {
      return `LIMIT ${offset},${limit}`;
    }
    return `LIMIT ${limit}`;
  }
  return `LIMIT ${offset},18446744073709551615`;
}

/**
 * Concatenates multiple strings, removing unnecessary whitespace.
 *
 * @param strs - The strings to be concatenated.
 * @returns A single concatenated string without unnecessary whitespace.
 *
 * @example
 * ```typescript
 * const str1 = "SELECT *";
 * const str2 = "FROM table";
 * const concatenatedStr = joinMultiString(str1, str2);
 * console.log(concatenatedStr); // Outputs: "SELECT * FROM table"
 * ```
 */
export function joinMultiString(...strs: string[]): string {
  return strs
    .map((v) => v.trim())
    .filter((v) => v)
    .join(" ");
}

/**
 * Performs a deep copy of an object.
 *
 * @param data - The object to be copied.
 * @returns A deep copy of the object.
 *
 * @example
 * ```typescript
 * const original = { name: "John", age: 30 };
 * const copy = deepCopy(original);
 * console.log(copy); // Outputs: { name: "John", age: 30 }
 * ```
 */
export function deepCopy<T = any>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

/**
 * Formats a list of fields with or without a table name.
 *
 * @param table - The table name (optional).
 * @param fields - The list of fields.
 * @returns A formatted list of fields with or without the table name.
 *
 * @example
 * ```typescript
 * const table = "users";
 * const fields = ["id", "name"];
 * const formattedFields = formatFields(table, fields);
 * console.log(formattedFields); // Outputs: ["users.id", "users.name"]
 * ```
 */
export function formatFields(table: string, fields: string[]) {
  const prefix = table ? `${table}.` : "";
  return fields.map((n) => {
    if (n === "*") return `${prefix}*`;
    if (n.toLowerCase().indexOf(" as ") !== -1) return n;
    if (n[0] === "`") return `${prefix}${n}`;
    return `${prefix}${sqlEscapeId(n)}`;
  });
}
