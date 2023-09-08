
const ID_GLOBAL_REGEXP = /`/g;
const QUAL_GLOBAL_REGEXP = /\./g;
const CHARS_GLOBAL_REGEXP = /[\0\b\t\n\r\x1a\"\'\\]/g;
const CHARS_ESCAPE_MAP = {
  "\0": "\\0",
  "\b": "\\b",
  "\t": "\\t",
  "\n": "\\n",
  "\r": "\\r",
  "\x1a": "\\Z",
  '"': '\\"',
  "'": "\\'",
  "\\": "\\\\",
} as Record<string, string>;

/**
 * SqlString
 * Simple SQL escape and format for MySQL
 * @link https://github.com/mysqljs/sqlstring
 */
export default class SqlString {
  /**
   * Escapes an identifier for safe use in SQL queries.
   *
   * @param val - The identifier to be escaped.
   * @param forbidQualified - Optional. If true, forbids qualified identifiers (e.g., "table.column").
   * @returns The escaped identifier as a string.
   * @throws Throws an error if invalid input is provided.
   *
   * @example
   * ```typescript
   * SqlString.escapeId("column"); // Returns "`column`"
   * ```
   *
   * @example
   * ```typescript
   * SqlString.escapeId("table.column", true); // Returns "`table.column`"
   * ```
   */
  static escapeId(val: any, forbidQualified?: boolean): string {
    if (Array.isArray(val)) {
      let sql = "";

      for (let i = 0; i < val.length; i++) {
        sql += (i === 0 ? "" : ", ") + this.escapeId(val[i], forbidQualified);
      }

      return sql;
    } else if (forbidQualified) {
      return "`" + String(val).replace(ID_GLOBAL_REGEXP, "``") + "`";
    } else {
      return (
        "`" +
        String(val)
          .replace(ID_GLOBAL_REGEXP, "``")
          .replace(QUAL_GLOBAL_REGEXP, "`.`") +
        "`"
      );
    }
  }

  /**
   * Escapes a value for safe use in SQL queries.
   *
   * @param val - The value to be escaped.
   * @param stringifyObjects - Optional. If true, converts objects to their string representations.
   * @param timeZone - Optional. The time zone to use for date formatting.
   * @returns The escaped value as a string.
   *
   * @example
   * ```typescript
   * SqlString.escape("Hello, 'world'!"); // Returns "'Hello, \\'world\\'!'"
   * ```
   *
   * @example
   * ```typescript
   * SqlString.escape(new Date(), true, "UTC"); // Returns "'2023-09-07 12:34:56.789'"
   * ```
   */
  static escape(val: any, stringifyObjects?: boolean, timeZone?: string) {
    if (val === undefined || val === null) {
      return "NULL";
    }

    switch (typeof val) {
      case "boolean":
        return val ? "true" : "false";
      case "number":
        return val + "";
      case "object":
        if (val instanceof Date) {
          return this.dateToString(val, timeZone || "local");
        } else if (Array.isArray(val)) {
          return this.arrayToList(val, timeZone);
        } else if (typeof val.toSqlString === "function") {
          return String(val.toSqlString());
        } else if (stringifyObjects) {
          return escapeString(val.toString());
        } else {
          return this.objectToValues(val, timeZone);
        }
      default:
        return escapeString(val);
    }
  }

  /**
   * Converts an array to a list of escaped and formatted values for use in SQL queries.
   *
   * @param array - The array to be converted.
   * @param timeZone - Optional. Timezone for date conversion (default is "local").
   * @returns The array converted to a list of SQL values.
   *
   * @example
   * ```typescript
   * const values = [1, 'John', new Date()];
   * const sqlValues = SqlString.arrayToList(values);
   * console.log(sqlValues); // Outputs: `'1, 'John', '2023-09-07 12:34:56.789'`
   * ```
   */
  static arrayToList(array: any[], timeZone?: string) {
    let sql = "";

    for (let i = 0; i < array.length; i++) {
      const val = array[i];

      if (Array.isArray(val)) {
        sql += `${(sql.length === 0 ? "" : ", ")}(${
          this.arrayToList(val, timeZone)
        })`;
      } else {
        sql += (i === 0 ? "" : ", ") + this.escape(val, true, timeZone);
      }
    }

    return sql;
  }

  /**
   * Formats a SQL query string with provided values.
   *
   * @param sql - The SQL query string with placeholders.
   * @param vals - An object or an array of values to replace the placeholders.
   * @param stringifyObjects - Optional. If true, objects will be stringified (default is false).
   * @param timeZone - Optional. Timezone for date conversion (default is "local").
   * @returns The formatted SQL query as a string.
   *
   * @example
   * ```typescript
   * const sql = "SELECT * FROM users WHERE id = ?";
   * const values = [42];
   * const formattedSql = SqlString.format(sql, values);
   * console.log(formattedSql); // Outputs: `'SELECT * FROM users WHERE id = 42'`
   * ```
   */
  static format(
    sql: string,
    vals?: object | any[],
    stringifyObjects?: boolean,
    timeZone?: string,
  ) {
    if (vals == null) {
      return sql;
    }

    const values = Array.isArray(vals) ? vals : [vals];

    let chunkIndex = 0;
    const placeholdersRegex = /\?+/g;
    let result = "";
    let valuesIndex = 0;
    let match;

    while (
      valuesIndex < values.length &&
      (match = placeholdersRegex.exec(sql))
    ) {
      const len = match[0].length;

      if (len > 2) {
        continue;
      }

      const value = len === 2
        ? this.escapeId(values[valuesIndex])
        : this.escape(values[valuesIndex], stringifyObjects, timeZone);

      result += sql.slice(chunkIndex, match.index) + value;
      chunkIndex = placeholdersRegex.lastIndex;
      valuesIndex++;
    }

    if (chunkIndex === 0) {
      // Nothing was replaced
      return sql;
    }

    if (chunkIndex < sql.length) {
      return result + sql.slice(chunkIndex);
    }

    return result;
  }

  /**
   * Converts a JavaScript Date object to a formatted date string for SQL queries.
   *
   * @param date - The Date object to be converted.
   * @param timeZone - Optional. Timezone for date conversion (default is "local").
   * @returns The escaped date as a string.
   *
   * @example
   * ```typescript
   * const currentDate = new Date();
   * const escapedDate = SqlString.dateToString(currentDate);
   * console.log(escapedDate); // Outputs a formatted date string.
   * ```
   */
  static dateToString(date: string | number | Date, timeZone: string) {
    const dt = new Date(date);

    if (isNaN(dt.getTime())) {
      return "NULL";
    }

    let year;
    let month;
    let day;
    let hour;
    let minute;
    let second;
    let millisecond;

    if (timeZone === "local") {
      year = dt.getFullYear();
      month = dt.getMonth() + 1;
      day = dt.getDate();
      hour = dt.getHours();
      minute = dt.getMinutes();
      second = dt.getSeconds();
      millisecond = dt.getMilliseconds();
    } else {
      const tz = convertTimezone(timeZone);

      if (tz !== false && tz !== 0) {
        dt.setTime(dt.getTime() + tz * 60000);
      }

      year = dt.getUTCFullYear();
      month = dt.getUTCMonth() + 1;
      day = dt.getUTCDate();
      hour = dt.getUTCHours();
      minute = dt.getUTCMinutes();
      second = dt.getUTCSeconds();
      millisecond = dt.getUTCMilliseconds();
    }

    // YYYY-MM-DD HH:mm:ss.mmm
    const str = zeroPad(year, 4) +
      "-" +
      zeroPad(month, 2) +
      "-" +
      zeroPad(day, 2) +
      " " +
      zeroPad(hour, 2) +
      ":" +
      zeroPad(minute, 2) +
      ":" +
      zeroPad(second, 2) +
      "." +
      zeroPad(millisecond, 3);

    return escapeString(str);
  }

  /**
   * Converts an object to a list of key-value pairs for use in SQL queries.
   *
   * @param object - The object to be converted.
   * @param timeZone - Optional. Timezone for date conversion (default is "local").
   * @returns The object converted to a list of SQL key-value pairs.
   *
   * @example
   * ```typescript
   * const data = { name: "John", age: 30 };
   * const sqlValues = SqlString.objectToValues(data);
   * console.log(sqlValues); // Outputs: `'name = 'John', age = 30'`
   * ```
   */
  static objectToValues(object: Record<string, any>, timeZone?: string) {
    let sql = "";

    for (const key in object) {
      const val = object[key];

      if (typeof val === "function") {
        continue;
      }

      sql += `${(sql.length === 0 ? "" : ", ")}${this.escapeId(key)} = ${
        this.escape(val, true, timeZone)
      }`;
    }

    return sql;
  }

  /**
   * Creates a raw SQL string that won't be escaped.
   *
   * @param sql - The raw SQL query string.
   * @returns An object with a `toSqlString` method that returns the raw SQL string.
   *
   * @example
   * ```typescript
   * const rawSql = "SELECT * FROM users";
   * const rawQuery = SqlString.raw(rawSql);
   * console.log(rawQuery.toSqlString()); // Outputs the raw SQL string.
   * ```
   */
  static raw(sql: string) {
    if (typeof sql !== "string") {
      throw new TypeError("argument sql must be a string");
    }

    return {
      toSqlString: function toSqlString() {
        return sql;
      },
    };
  }
}

/**
 * Escapes special characters in a string to make it safe for use in SQL queries.
 *
 * @param val - The string to be escaped.
 * @returns The escaped string enclosed in single quotes.
 *
 * @example
 * ```typescript
 * const input = "John's data";
 * const escaped = escapeString(input);
 * console.log(escaped); // Outputs: `'John\\'s data'`
 * ```
 */
function escapeString(val: string) {
  let chunkIndex = (CHARS_GLOBAL_REGEXP.lastIndex = 0);
  let escapedVal = "";
  let match;

  while ((match = CHARS_GLOBAL_REGEXP.exec(val))) {
    escapedVal += val.slice(chunkIndex, match.index) +
      CHARS_ESCAPE_MAP[match[0]];
    chunkIndex = CHARS_GLOBAL_REGEXP.lastIndex;
  }

  if (chunkIndex === 0) {
    // Nothing was escaped
    return `'${val}'`;
  }

  if (chunkIndex < val.length) {
    return `'${escapedVal}${val.slice(chunkIndex)}'`;
  }

  return `'${escapedVal}'`;
}

/**
 * Pads a number with leading zeros to a specified length.
 *
 * @param num - The number to be padded.
 * @param length - The desired length of the padded number.
 * @returns The number as a string with leading zeros.
 *
 * @example
 * ```typescript
 * const number = 5;
 * const paddedNumber = zeroPad(number, 2);
 * console.log(paddedNumber); // Outputs: '05'
 * ```
 */
function zeroPad(num: number, length: number) {
  let number = num.toString();
  while (number.length < length) {
    number = "0" + number;
  }

  return number;
}

/**
 * Converts a timezone offset string to minutes.
 *
 * @param tz - The timezone offset string, e.g., '+02:30' or 'Z'.
 * @returns The timezone offset in minutes, or 0 for 'Z' (UTC).
 *
 * @example
 * ```typescript
 * const timezoneOffset = "+02:30";
 * const minutes = convertTimezone(timezoneOffset);
 * console.log(minutes); // Outputs: 150
 * ```
 */
function convertTimezone(tz: string) {
  if (tz === "Z") {
    return 0;
  }

  const m = tz.match(/([\+\-\s])(\d\d):?(\d\d)?/);
  if (m) {
    return (
      (m[1] === "-" ? -1 : 1) *
      (parseInt(m[2], 10) + (m[3] ? parseInt(m[3], 10) : 0) / 60) *
      60
    );
  }
  return false;
}
