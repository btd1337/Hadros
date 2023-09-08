import { assertStrictEquals, assertThrows } from "assert";
import SqlString from "./sqlString.ts";

Deno.test("SqlString escapeId - value is quoted", () => {
  assertStrictEquals(SqlString.escapeId("id"), "`id`");
});

Deno.test("SqlString escapeId - value can be a number", () => {
  assertStrictEquals(SqlString.escapeId(42), "`42`");
});

Deno.test("SqlString escapeId - value can be an object", () => {
  assertStrictEquals(SqlString.escapeId({}), "`[object Object]`");
});

Deno.test("SqlString escapeId - value toString is called", () => {
  assertStrictEquals(
    SqlString.escapeId({
      toString: () => "foo",
    }),
    "`foo`",
  );
});

Deno.test("SqlString escapeId - value toString is quoted", () => {
  assertStrictEquals(
    SqlString.escapeId({
      toString: () => "f`oo",
    }),
    "`f``oo`",
  );
});

Deno.test("SqlString escapeId - value containing escapes is quoted", () => {
  assertStrictEquals(SqlString.escapeId("i`d"), "`i``d`");
});

Deno.test("SqlString escapeId - value containing separator is quoted", () => {
  assertStrictEquals(SqlString.escapeId("id1.id2"), "`id1`.`id2`");
});

Deno.test("SqlString escapeId - value containing separator and escapes is quoted", () => {
  assertStrictEquals(SqlString.escapeId("id`1.i`d2"), "`id``1`.`i``d2`");
});

Deno.test("SqlString escapeId - value containing separator is fully escaped when forbidQualified", () => {
  assertStrictEquals(SqlString.escapeId("id1.id2", true), "`id1.id2`");
});

Deno.test("SqlString escapeId - arrays are turned into lists", () => {
  assertStrictEquals(
    SqlString.escapeId(["a", "b", "t.c"]),
    "`a`, `b`, `t`.`c`",
  );
});

Deno.test("SqlString escapeId - nested arrays are flattened", () => {
  assertStrictEquals(
    SqlString.escapeId(["a", ["b", ["t.c"]]]),
    "`a`, `b`, `t`.`c`",
  );
});

Deno.test("SqlString escape - undefined -> NULL", () => {
  assertStrictEquals(SqlString.escape(undefined), "NULL");
});

Deno.test("SqlString escape - null -> NULL", () => {
  assertStrictEquals(SqlString.escape(null), "NULL");
});

Deno.test("SqlString escape - booleans convert to strings", () => {
  assertStrictEquals(SqlString.escape(false), "false");
  assertStrictEquals(SqlString.escape(true), "true");
});

Deno.test("SqlString escape - numbers convert to strings", () => {
  assertStrictEquals(SqlString.escape(5), "5");
});

Deno.test("SqlString escape - raw not escaped", () => {
  assertStrictEquals(SqlString.escape(SqlString.raw("NOW()")), "NOW()");
});

Deno.test("SqlString escape - objects are turned into key value pairs", () => {
  assertStrictEquals(
    SqlString.escape({ a: "b", c: "d" }),
    "`a` = 'b', `c` = 'd'",
  );
});

Deno.test("SqlString escape - objects function properties are ignored", () => {
  assertStrictEquals(SqlString.escape({ a: "b", c: () => {} }), "`a` = 'b'");
});

Deno.test("SqlString escape - object values toSqlString is called", () => {
  assertStrictEquals(
    SqlString.escape({
      id: {
        toSqlString: () => "LAST_INSERT_ID()",
      },
    }),
    "`id` = LAST_INSERT_ID()",
  );
});

Deno.test("SqlString escape - objects toSqlString is called", () => {
  assertStrictEquals(
    SqlString.escape({
      toSqlString: () => "@foo_id",
    }),
    "@foo_id",
  );
});

Deno.test("SqlString escape - objects toSqlString is not quoted", () => {
  assertStrictEquals(
    SqlString.escape({
      toSqlString: () => "CURRENT_TIMESTAMP()",
    }),
    "CURRENT_TIMESTAMP()",
  );
});

Deno.test("SqlString escape - nested objects are cast to strings", () => {
  assertStrictEquals(
    SqlString.escape({ a: { nested: true } }),
    "`a` = '[object Object]'",
  );
});

Deno.test("SqlString escape - nested objects use toString", () => {
  assertStrictEquals(
    SqlString.escape({
      a: {
        toString: () => "foo",
      },
    }),
    "`a` = 'foo'",
  );
});

Deno.test("SqlString escape - nested objects use toString is quoted", () => {
  assertStrictEquals(
    SqlString.escape({
      a: {
        toString: () => "f'oo",
      },
    }),
    "`a` = 'f\\'oo'",
  );
});

Deno.test("SqlString escape - arrays are turned into lists", () => {
  assertStrictEquals(SqlString.escape([1, 2, "c"]), "1, 2, 'c'");
});

Deno.test("SqlString escape - nested arrays are turned into grouped lists", () => {
  assertStrictEquals(
    SqlString.escape([
      [1, 2, 3],
      [4, 5, 6],
      ["a", "b", { nested: true }],
    ]),
    "(1, 2, 3), (4, 5, 6), ('a', 'b', '[object Object]')",
  );
});

Deno.test("SqlString escape - nested objects inside arrays are cast to strings", () => {
  assertStrictEquals(
    SqlString.escape([1, { nested: true }, 2]),
    "1, '[object Object]', 2",
  );
});

Deno.test("SqlString escape - nested objects inside arrays use toString", () => {
  assertStrictEquals(
    SqlString.escape([
      1,
      { toString: () => "foo" },
      2,
    ]),
    "1, 'foo', 2",
  );
});

Deno.test("SqlString escape - strings are quoted", () => {
  assertStrictEquals(SqlString.escape("Super"), "'Super'");
});

Deno.test("SqlString escape - \\0 gets escaped", () => {
  assertStrictEquals(SqlString.escape("Sup\0er"), "'Sup\\0er'");
  assertStrictEquals(SqlString.escape("Super\0"), "'Super\\0'");
});

Deno.test("SqlString escape - \\b gets escaped", () => {
  assertStrictEquals(SqlString.escape("Sup\ber"), "'Sup\\ber'");
  assertStrictEquals(SqlString.escape("Super\b"), "'Super\\b'");
});

Deno.test("SqlString escape - \\n gets escaped", () => {
  assertStrictEquals(SqlString.escape("Sup\ner"), "'Sup\\ner'");
  assertStrictEquals(SqlString.escape("Super\n"), "'Super\\n'");
});

Deno.test("SqlString escape - \\r gets escaped", () => {
  assertStrictEquals(SqlString.escape("Sup\rer"), "'Sup\\rer'");
  assertStrictEquals(SqlString.escape("Super\r"), "'Super\\r'");
});

Deno.test("SqlString escape - \\t gets escaped", () => {
  assertStrictEquals(SqlString.escape("Sup\ter"), "'Sup\\ter'");
  assertStrictEquals(SqlString.escape("Super\t"), "'Super\\t'");
});

Deno.test("SqlString escape - \\ gets escaped", () => {
  assertStrictEquals(SqlString.escape("Sup\\er"), "'Sup\\\\er'");
  assertStrictEquals(SqlString.escape("Super\\"), "'Super\\\\'");
});

Deno.test("SqlString escape - \\u001a (ascii 26) gets replaced with \\Z", () => {
  assertStrictEquals(SqlString.escape("Sup\u001aer"), "'Sup\\Zer'");
  assertStrictEquals(SqlString.escape("Super\u001a"), "'Super\\Z'");
});

Deno.test("SqlString escape - single quotes get escaped", () => {
  assertStrictEquals(SqlString.escape("Sup'er"), "'Sup\\'er'");
  assertStrictEquals(SqlString.escape("Super'"), "'Super\\''");
});

Deno.test("SqlString escape - double quotes get escaped", () => {
  assertStrictEquals(SqlString.escape('Sup"er'), "'Sup\\\"er'");
  assertStrictEquals(SqlString.escape('Super"'), "'Super\\\"'");
});

Deno.test("SqlString escape - dates are converted to YYYY-MM-DD HH:II:SS.sss", () => {
  var expected = "2012-05-07 11:42:03.002";
  var date = new Date(2012, 4, 7, 11, 42, 3, 2);
  var string = SqlString.escape(date);

  assertStrictEquals(string, "'" + expected + "'");
});

Deno.test('SqlString escape - dates are converted to specified time zone "Z"', () => {
  var expected = "2012-05-07 11:42:03.002";
  var date = new Date(Date.UTC(2012, 4, 7, 11, 42, 3, 2));
  var string = SqlString.escape(date, false, "Z");

  assertStrictEquals(string, "'" + expected + "'");
});

Deno.test('SqlString escape - dates are converted to specified time zone "+01"', () => {
  var expected = "2012-05-07 12:42:03.002";
  var date = new Date(Date.UTC(2012, 4, 7, 11, 42, 3, 2));
  var string = SqlString.escape(date, false, "+01");

  assertStrictEquals(string, "'" + expected + "'");
});

Deno.test('SqlString escape - dates are converted to specified time zone "+0200"', () => {
  var expected = "2012-05-07 13:42:03.002";
  var date = new Date(Date.UTC(2012, 4, 7, 11, 42, 3, 2));
  var string = SqlString.escape(date, false, "+0200");

  assertStrictEquals(string, "'" + expected + "'");
});

Deno.test('SqlString escape - dates are converted to specified time zone "-05:00"', () => {
  var expected = "2012-05-07 06:42:03.002";
  var date = new Date(Date.UTC(2012, 4, 7, 11, 42, 3, 2));
  var string = SqlString.escape(date, false, "-05:00");

  assertStrictEquals(string, "'" + expected + "'");
});

Deno.test("SqlString escape - dates are converted to UTC for unknown time zone", () => {
  var date = new Date(Date.UTC(2012, 4, 7, 11, 42, 3, 2));
  var expected = SqlString.escape(date, false, "Z");
  var string = SqlString.escape(date, false, "foo");

  assertStrictEquals(string, expected);
});

Deno.test("SqlString escape - invalid dates are converted to null", () => {
  var date = new Date(NaN);
  var string = SqlString.escape(date);

  assertStrictEquals(string, "NULL");
});

Deno.test("SqlString escape - NaN -> NaN", () => {
  assertStrictEquals(SqlString.escape(NaN), "NaN");
});

Deno.test("SqlString escape - Infinity -> Infinity", () => {
  assertStrictEquals(SqlString.escape(Infinity), "Infinity");
});

// Deno.test('SqlString.format', {
Deno.test("SqlString format - question marks are replaced with escaped array values", () => {
  var sql = SqlString.format("? and ?", ["a", "b"]);
  assertStrictEquals(sql, "'a' and 'b'");
});

Deno.test("SqlString format - double quest marks are replaced with escaped id", () => {
  var sql = SqlString.format("SELECT * FROM ?? WHERE id = ?", ["table", 42]);
  assertStrictEquals(sql, "SELECT * FROM `table` WHERE id = 42");
});

Deno.test("SqlString format - triple question marks are ignored", () => {
  var sql = SqlString.format("? or ??? and ?", ["foo", "bar", "fizz", "buzz"]);
  assertStrictEquals(sql, "'foo' or ??? and 'bar'");
});

Deno.test("SqlString format - extra question marks are left untouched", () => {
  var sql = SqlString.format("? and ?", ["a"]);
  assertStrictEquals(sql, "'a' and ?");
});

Deno.test("SqlString format - extra arguments are not used", () => {
  var sql = SqlString.format("? and ?", ["a", "b", "c"]);
  assertStrictEquals(sql, "'a' and 'b'");
});

Deno.test("SqlString format - question marks within values do not cause issues", () => {
  var sql = SqlString.format("? and ?", ["hello?", "b"]);
  assertStrictEquals(sql, "'hello?' and 'b'");
});

Deno.test("SqlString format - undefined is ignored", () => {
  var sql = SqlString.format("?", undefined, false);
  assertStrictEquals(sql, "?");
});

Deno.test("SqlString format - objects is converted to values", () => {
  var sql = SqlString.format("?", { hello: "world" }, false);
  assertStrictEquals(sql, "`hello` = 'world'");
});

Deno.test("SqlString format - objects is not converted to values", () => {
  var sql = SqlString.format("?", { hello: "world" }, true);
  assertStrictEquals(sql, "'[object Object]'");

  var sql = SqlString.format(
    "?",
    {
      toString: () => "hello",
    },
    true,
  );
  assertStrictEquals(sql, "'hello'");

  var sql = SqlString.format(
    "?",
    {
      toSqlString: () => "@foo",
    },
    true,
  );
  assertStrictEquals(sql, "@foo");
});

Deno.test("SqlString format - sql is untouched if no values are provided", () => {
  var sql = SqlString.format("SELECT ??");
  assertStrictEquals(sql, "SELECT ??");
});

Deno.test("SqlString format - sql is untouched if values are provided but there are no placeholders", () => {
  var sql = SqlString.format("SELECT COUNT(*) FROM table", ["a", "b"]);
  assertStrictEquals(sql, "SELECT COUNT(*) FROM table");
});

Deno.test("SqlString raw - creates object", () => {
  assertStrictEquals(typeof SqlString.raw("NOW()"), "object");
});

Deno.test("SqlString raw - rejects number", () => {
  assertThrows(() => {
    SqlString.raw(42 as any);
  });
});

Deno.test("SqlString raw - rejects undefined", () => {
  assertThrows(() => {
    (SqlString as any).raw();
  });
});

Deno.test("SqlString raw - object has toSqlString", () => {
  assertStrictEquals(typeof SqlString.raw("NOW()").toSqlString, "function");
});

Deno.test("SqlString raw - toSqlString returns sql as-is", () => {
  assertStrictEquals(
    SqlString.raw("NOW() AS 'current_time'").toSqlString(),
    "NOW() AS 'current_time'",
  );
});
