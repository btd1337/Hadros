import { AssertionError, assertStrictEquals, assertThrows } from "assert";
import Q from "./mod.ts";
import Messages from "./messages.ts";

Deno.test("query format - simple", () => {
  assertStrictEquals(Q.table("test1").format('"a"'), '"a"');
});
Deno.test("query format - ?", () => {
  assertStrictEquals(Q.table("test1").format("a=?", [0]), "a=0");
});
Deno.test("query format - :", () => {
  assertStrictEquals(Q.table("test1").format("a=:v", { v: 0 }), "a=0");
});

Deno.test("query select - with filed", () => {
  const sql = Q.table("test1").select("name", "age").build();
  // utils.debug(sql);
  assertStrictEquals(sql, "SELECT `name`, `age` FROM `test1`");
});
Deno.test("query select - where object", () => {
  const sql = Q.table("test1")
    .select("name", "age")
    .where({
      a: 123,
      b: 456,
    })
    .build();
  // utils.debug(sql);
  assertStrictEquals(
    sql,
    "SELECT `name`, `age` FROM `test1` WHERE `a`=123 AND `b`=456",
  );
});
Deno.test("query select - where object with params", () => {
  const sql = Q.table("test1")
    .select("name", "age")
    .where("`a`=:a AND `b`=:b", {
      a: 123,
      b: 456,
    })
    .build();
  // utils.debug(sql);
  assertStrictEquals(
    sql,
    "SELECT `name`, `age` FROM `test1` WHERE `a`=123 AND `b`=456",
  );
});
Deno.test("query select - where and", () => {
  const sql = Q.table("test1")
    .select("name", "age")
    .where({
      a: 123,
    })
    .where({
      b: 456,
    })
    .build();
  // utils.debug(sql);
  assertStrictEquals(
    sql,
    "SELECT `name`, `age` FROM `test1` WHERE `a`=123 AND `b`=456",
  );
});
Deno.test("query select - where with array", () => {
  const sql = Q.table("test1")
    .select("name", "age")
    .where("`a`=? AND `b`=?", [123, 456])
    .build();
  // utils.debug(sql);
  assertStrictEquals(
    sql,
    "SELECT `name`, `age` FROM `test1` WHERE `a`=123 AND `b`=456",
  );
});
Deno.test("query select - limit", () => {
  const sql = Q.table("test1")
    .select("name", "age")
    .where({
      a: 123,
      b: 456,
    })
    .limit(10)
    .build();
  // utils.debug(sql);
  assertStrictEquals(
    sql,
    "SELECT `name`, `age` FROM `test1` WHERE `a`=123 AND `b`=456 LIMIT 10",
  );
});
Deno.test("query select - skip", () => {
  const sql = Q.table("test1")
    .select("name", "age")
    .where({
      a: 123,
      b: 456,
    })
    .skip(10)
    .build();
  // utils.debug(sql);
  assertStrictEquals(
    sql,
    "SELECT `name`, `age` FROM `test1` WHERE `a`=123 AND `b`=456 LIMIT 10,18446744073709551615",
  );
});
Deno.test("query select - skip and limit", () => {
  const sql = Q.table("test1")
    .select("name", "age")
    .where({
      a: 123,
      b: 456,
    })
    .skip(10)
    .limit(20)
    .build();
  // utils.debug(sql);
  assertStrictEquals(
    sql,
    "SELECT `name`, `age` FROM `test1` WHERE `a`=123 AND `b`=456 LIMIT 10,20",
  );
});
Deno.test("query select - orderBy", () => {
  const sql = Q.table("test1")
    .select("name", "age")
    .where({
      a: 123,
      b: 456,
    })
    .offset(10)
    .limit(20)
    .orderBy("`a` DESC, `b` ASC")
    .build();
  // utils.debug(sql);
  assertStrictEquals(
    sql,
    "SELECT `name`, `age` FROM `test1` WHERE `a`=123 AND `b`=456 ORDER BY `a` DESC, `b` ASC LIMIT 10,20",
  );
});
Deno.test("query select - multi-orderBy", () => {
  const sql = Q.table("test1")
    .select("name", "age")
    .where({
      a: 123,
      b: 456,
    })
    .offset(10)
    .limit(20)
    .orderBy("`a` ?, `b` ?", ["DESC", "ASC"])
    .build();
  // utils.debug(sql);
  assertStrictEquals(
    sql,
    "SELECT `name`, `age` FROM `test1` WHERE `a`=123 AND `b`=456 ORDER BY `a` DESC, `b` ASC LIMIT 10,20",
  );
});
Deno.test("query select - and", () => {
  const sql = Q.table("test1")
    .select("name", "age")
    .where({
      a: 123,
    })
    .and({
      b: 456,
    })
    .offset(10)
    .limit(20)
    .orderBy("`a` ?, `b` ?", ["DESC", "ASC"])
    .build();
  // utils.debug(sql);
  assertStrictEquals(
    sql,
    "SELECT `name`, `age` FROM `test1` WHERE `a`=123 AND `b`=456 ORDER BY `a` DESC, `b` ASC LIMIT 10,20",
  );
});
Deno.test("query select - selectDistinct", () => {
  const sql = Q.table("test1")
    .selectDistinct("name", "age")
    .where({
      a: 123,
    })
    .and({
      b: 456,
    })
    .offset(10)
    .limit(20)
    .orderBy("`a` ?, `b` ?", ["DESC", "ASC"])
    .build();
  // utils.debug(sql);
  assertStrictEquals(
    sql,
    "SELECT DISTINCT `name`, `age` FROM `test1` WHERE `a`=123 AND `b`=456 ORDER BY `a` DESC, `b` ASC LIMIT 10,20",
  );
});

Deno.test("query groupBy - filed", () => {
  const sql = Q.table("test1")
    .select("name", "age")
    .where({
      a: 123,
    })
    .offset(10)
    .limit(20)
    .groupBy("name")
    .build();
  // utils.debug(sql);
  assertStrictEquals(
    sql,
    "SELECT `name`, `age` FROM `test1` WHERE `a`=123 GROUP BY `name` LIMIT 10,20",
  );
});
Deno.test("query groupBy - having", () => {
  const sql = Q.table("test1")
    .select("name", "age")
    .where({
      a: 123,
    })
    .offset(10)
    .limit(20)
    .groupBy("a", "b")
    .having("COUNT(`a`)>?", [789])
    .build();
  // utils.debug(sql);
  assertStrictEquals(
    sql,
    "SELECT `name`, `age` FROM `test1` WHERE `a`=123 GROUP BY `a`, `b` HAVING COUNT(`a`)>789 LIMIT 10,20",
  );
});

Deno.test("query count - as", () => {
  const sql = Q.table("test1")
    .count("c")
    .where({
      a: 456,
      b: 789,
    })
    .build();
  // utils.debug(sql);
  assertStrictEquals(
    sql,
    "SELECT COUNT(*) AS `c` FROM `test1` WHERE `a`=456 AND `b`=789",
  );
});
Deno.test("query count - limit", () => {
  const sql = Q.table("test1")
    .count("c")
    .where({
      a: 456,
      b: 789,
    })
    .limit(1)
    .build();
  // utils.debug(sql);
  assertStrictEquals(
    sql,
    "SELECT COUNT(*) AS `c` FROM `test1` WHERE `a`=456 AND `b`=789 LIMIT 1",
  );
});
Deno.test("query count - count()", () => {
  const sql = Q.table("test1")
    .count()
    .where({
      a: 456,
      b: 789,
    })
    .limit(1)
    .build();
  // utils.debug(sql);
  assertStrictEquals(
    sql,
    "SELECT COUNT(*) AS `count` FROM `test1` WHERE `a`=456 AND `b`=789 LIMIT 1",
  );
});
Deno.test("query count - DISTINCT", () => {
  const sql = Q.table("test1")
    .count("c", "DISTINCT `openid`")
    .where({
      a: 456,
      b: 789,
    })
    .limit(1)
    .build();
  // utils.debug(sql);
  assertStrictEquals(
    sql,
    "SELECT COUNT(DISTINCT `openid`) AS `c` FROM `test1` WHERE `a`=456 AND `b`=789 LIMIT 1",
  );
});

Deno.test("query insert - object", () => {
  const sql = Q.table("test1")
    .insert({
      a: 123,
      b: 456,
    })
    .build();
  // utils.debug(sql);
  assertStrictEquals(sql, "INSERT INTO `test1` (`a`, `b`) VALUES (123, 456)");
});
Deno.test("query insert - array", () => {
  const sql = Q.table("test1")
    .insert([
      {
        a: 123,
        b: 456,
      },
      {
        a: 789,
        b: 110,
      },
    ])
    .build();
  // utils.debug(sql);
  assertStrictEquals(
    sql,
    "INSERT INTO `test1` (`a`, `b`) VALUES (123, 456),\n(789, 110)",
  );
});

Deno.test("query update - object", () => {
  const sql = Q.table("test1")
    .update({
      a: 123,
      b: 456,
    })
    .orderBy("a ASC")
    .build();
  // utils.debug(sql);
  assertStrictEquals(sql, "UPDATE `test1` SET `a`=123, `b`=456 ORDER BY a ASC");
});
Deno.test("query update - paramas array", () => {
  const sql = Q.table("test1").update("a=?, b=?", [123, 456]).build();
  // utils.debug(sql);
  assertStrictEquals(sql, "UPDATE `test1` SET a=123, b=456");
});
Deno.test("query update - paramas object", () => {
  const sql = Q.table("test1").update("a=:a, b=:b", { a: 123, b: 456 }).build();
  // utils.debug(sql);
  assertStrictEquals(sql, "UPDATE `test1` SET a=123, b=456");
});
Deno.test("query update - string", () => {
  const sql = Q.table("test1").update("`a`=123, b=456").build();
  // utils.debug(sql);
  assertStrictEquals(sql, "UPDATE `test1` SET `a`=123, b=456");
});
Deno.test("query update - limit", () => {
  const sql = Q.table("test1")
    .update({
      a: 123,
      b: 456,
    })
    .limit(12)
    .build();
  // utils.debug(sql);
  assertStrictEquals(sql, "UPDATE `test1` SET `a`=123, `b`=456 LIMIT 12");
});
Deno.test("query update - where", () => {
  const sql = Q.table("test1")
    .update({
      a: 123,
      b: 456,
    })
    .where({
      b: 777,
    })
    .limit(12)
    .build();
  // utils.debug(sql);
  assertStrictEquals(
    sql,
    "UPDATE `test1` SET `a`=123, `b`=456 WHERE `b`=777 LIMIT 12",
  );
});
Deno.test("query update - set", () => {
  const sql = Q.table("test1")
    .update({
      a: 123,
    })
    .set({
      b: 456,
    })
    .where({
      b: 777,
    })
    .limit(12)
    .build();
  // utils.debug(sql);
  assertStrictEquals(
    sql,
    "UPDATE `test1` SET `a`=123, `b`=456 WHERE `b`=777 LIMIT 12",
  );
});
Deno.test("query update - set", () => {
  const sql = Q.table("test1")
    .update()
    .set({
      a: 123,
      b: 456,
    })
    .where({
      b: 777,
    })
    .limit(12)
    .build();
  // utils.debug(sql);
  assertStrictEquals(
    sql,
    "UPDATE `test1` SET `a`=123, `b`=456 WHERE `b`=777 LIMIT 12",
  );
});
Deno.test("query update - query type error", () => {
  assertThrows(
    () => {
      Q.table("test1").set({ a: 1 }).build();
    },
    AssertionError,
    "query type must be UPDATE, please call .update() before",
  );
});
Deno.test("query update - connot be empty", () => {
  assertThrows(
    () => {
      Q.table("test1").update().build();
    },
    AssertionError,
    "update data connot be empty",
  );
});
Deno.test("query update - empty object", () => {
  assertThrows(
    () => {
      Q.table("table")
        .update({})
        .where({
          a: 123,
        })
        .limit(456)
        .build();
    },
    AssertionError,
    "update data connot be empty",
  );
});
Deno.test("query update - empty object and set", () => {
  const sql = Q.table("test1")
    .update({})
    .set({ a: 456 })
    .where({
      a: 123,
    })
    .limit(456)
    .build();
  // utils.debug(sql);
  assertStrictEquals(sql, "UPDATE `test1` SET `a`=456 WHERE `a`=123 LIMIT 456");
});

Deno.test("query insert or update - onDuplicateKeyUpdate", () => {
  const sql = Q.table("test1")
    .insert({ a: 123, b: 456 })
    .onDuplicateKeyUpdate()
    .set({ a: "xxx" })
    .build();
  // utils.debug(sql);
  assertStrictEquals(
    sql,
    "INSERT INTO `test1` (`a`, `b`) VALUES (123, 456) ON DUPLICATE KEY UPDATE `a`='xxx'",
  );
});
Deno.test("query insert or update - onDuplicateKeyUpdate error", () => {
  assertThrows(
    () =>
      Q.table("test1")
        .insert([
          { a: 123, b: 456 },
          { a: 111, b: 222 },
        ])
        .onDuplicateKeyUpdate()
        .set({ a: "xxx" })
        .build(),
    AssertionError,
    Messages.functionWithWrongRowCount("onDuplicateKeyUpdate", 2),
  );
});
Deno.test("query insert or update - onDuplicateKeyUpdate insert only", () => {
  assertThrows(
    () =>
      Q.table("test1")
        .select("*")
        .onDuplicateKeyUpdate()
        .set({ a: "xxx" })
        .build(),
    AssertionError,
    "onDuplicateKeyUpdate() must be called after insert()",
  );
});

Deno.test("query delete - all", () => {
  const sql = Q.table("test1").delete().build();
  // utils.debug(sql);
  assertStrictEquals(sql, "DELETE FROM `test1`");
});
Deno.test("query delete - where", () => {
  const sql = Q.table("test1").delete().where("`a`=2").build();
  // utils.debug(sql);
  assertStrictEquals(sql, "DELETE FROM `test1` WHERE `a`=2");
});
Deno.test("query delete - limit", () => {
  const sql = Q.table("test1").delete().where("`a`=2").limit(1).build();
  // utils.debug(sql);
  assertStrictEquals(sql, "DELETE FROM `test1` WHERE `a`=2 LIMIT 1");
});

Deno.test("query sql - string build", () => {
  const sql = Q.table("test1")
    .sql(
      'SELECT JSON_OBJECT("key1", 1, "key2", "abc", "key1", "def") as `data`',
    )
    .build();
  // utils.debug(sql);
  assertStrictEquals(
    sql,
    'SELECT JSON_OBJECT("key1", 1, "key2", "abc", "key1", "def") as `data`',
  );
});
Deno.test("query sql - limit", () => {
  const sql = Q.table("test1")
    .sql(
      'SELECT JSON_OBJECT("key1", 1, "key2", "abc", "key1", "def") as `data` :$limit',
    )
    .limit(10)
    .build();
  // utils.debug(sql);
  assertStrictEquals(
    sql,
    'SELECT JSON_OBJECT("key1", 1, "key2", "abc", "key1", "def") as `data` LIMIT 10',
  );
});
Deno.test("query sql - offset", () => {
  const sql = Q.table("test1")
    .sql(
      'SELECT JSON_OBJECT("key1", 1, "key2", "abc", "key1", "def") as `data` :$limit',
    )
    .limit(10)
    .offset(5)
    .build();
  // utils.debug(sql);
  assertStrictEquals(
    sql,
    'SELECT JSON_OBJECT("key1", 1, "key2", "abc", "key1", "def") as `data` LIMIT 5,10',
  );
});
Deno.test("query sql - order", () => {
  const sql = Q.table("test1")
    .sql(
      'SELECT JSON_OBJECT("key1", 1, "key2", "abc", "key1", "def") as `data` :$orderBy :$limit',
    )
    .limit(10)
    .offset(5)
    .orderBy("`id` ASC")
    .build();
  // utils.debug(sql);
  assertStrictEquals(
    sql,
    'SELECT JSON_OBJECT("key1", 1, "key2", "abc", "key1", "def") as `data` ORDER BY `id` ASC LIMIT 5,10',
  );
});
Deno.test("query sql - fields", () => {
  const sql = Q.table("test1")
    .sql("SELECT :$fields FROM `test1`")
    .fields("a", "b", "c")
    .limit(10)
    .offset(5)
    .orderBy("`id` ASC")
    .build();
  // utils.debug(sql);
  assertStrictEquals(sql, "SELECT `a`, `b`, `c` FROM `test1`");
});

Deno.test("query options - offset limit", () => {
  const sql = Q.table("test1")
    .select()
    .options({
      offset: 1,
      limit: 2,
      orderBy: "`id` DESC",
      groupBy: "`name`",
      fields: ["id", "name"],
    })
    .build();
  // utils.debug(sql);
  assertStrictEquals(
    sql,
    "SELECT `id`, `name` FROM `test1` GROUP BY `name` ORDER BY `id` DESC LIMIT 1,2",
  );
});
Deno.test("query options - skip limit", () => {
  const sql = Q.table("test1")
    .select()
    .options({
      skip: 1,
      limit: 2,
      orderBy: "`id` DESC",
      groupBy: "`name`",
      fields: ["id", "name"],
    })
    .build();
  // utils.debug(sql);
  assertStrictEquals(
    sql,
    "SELECT `id`, `name` FROM `test1` GROUP BY `name` ORDER BY `id` DESC LIMIT 1,2",
  );
});

Deno.test(`query where(condition): ${Messages.conditionCannotBeEmpty}`, () => {
  // SELECT 操作可以为空
  const sql = Q.table("test1").select("name", "age").where({}).build();
  // utils.debug(sql);
  assertStrictEquals(sql, "SELECT `name`, `age` FROM `test1`");
});
Deno.test(`query where(condition): ${Messages.conditionCannotBeEmpty}`, () => {
  const sql = Q.table("test1").select("name", "age").where("   ").build();
  // utils.debug(sql);
  assertStrictEquals(sql, "SELECT `name`, `age` FROM `test1`");
});
// 其他操作不能为空
Deno.test(`query where(condition): ${Messages.conditionCannotBeEmpty}`, () => {
  assertThrows(
    () => {
      const sql = Q.table("test1").update({ a: 123 }).where({}).build();
      //   utils.debug(sql);
    },
    AssertionError,
    Messages.conditionCannotBeEmpty,
  );
});
Deno.test(`query where(condition): ${Messages.conditionCannotBeEmpty}`, () => {
  assertThrows(
    () => {
      const sql = Q.table("test1").delete().where("   ").build();
      //   utils.debug(sql);
    },
    AssertionError,
    Messages.conditionCannotBeEmpty,
  );
});

Deno.test("query where(condition): condition key cannot be undefined", () => {
  assertThrows(
    () => {
      const sql = Q.table("test1")
        .update({ a: 123 })
        .where({ a: 123, b: undefined })
        .build();
      //   utils.debug(sql);
    },
    AssertionError,
    Messages.undefinedValueConditionalKeys(["b"]),
  );
});
Deno.test("query where(condition): condition key cannot be undefined", () => {
  assertThrows(
    () => {
      const sql = Q.table("test1")
        .select("name", "age")
        .where({ a: 123, b: 456, c: undefined, d: undefined })
        .build();
      //   utils.debug(sql);
    },
    AssertionError,
    Messages.undefinedValueConditionalKeys(["c", "d"]),
  );
});

Deno.test("query where(condition): support for $in & $like", () => {
  const sql = Q.table("test1")
    .select("name", "age")
    .where({
      a: { $in: [1, 2, 3] },
      b: { $like: "%hello%" },
    })
    .offset(10)
    .limit(20)
    .orderBy("`a` DESC, `b` ASC")
    .build();
  // utils.debug(sql);
  assertStrictEquals(
    sql,
    "SELECT `name`, `age` FROM `test1` WHERE `a` IN (1, 2, 3) AND `b` LIKE '%hello%' ORDER BY `a` DESC, `b` ASC LIMIT 10,20",
  );
});
Deno.test("query where(condition): support for $in & $like", () => {
  assertThrows(
    () => {
      const sql = Q.table("test1")
        .update({ a: 123 })
        .where({ a: { $in: 123 } })
        .build();
      //   utils.debug(sql);
    },
    Error,
    "value for condition type $in in field a must be an array",
  );
});
Deno.test("query where(condition): support for $in & $like", () => {
  assertThrows(
    () => {
      const sql = Q.table("test1")
        .update({ a: 123 })
        .where({ a: { $like: 123 } })
        .build();
      //   utils.debug(sql);
    },
    AssertionError,
    "value for condition type $like in a must be a string",
  );
});
Deno.test("query where(condition): support for $in & $like", () => {
  const sql = Q.table("test1")
    .select()
    .where({
      a: { $eq: 1 },
      b: { $gt: 2 },
      c: { $gte: 3 },
      d: { $lt: 4 },
      e: { $lte: 5 },
      f: { $isNull: true },
      g: { $isNotNull: true },
      h: { $like: "a" },
      i: { $notLike: "b" },
      j: { $in: ["c"] },
      k: { $notIn: ["d"] },
      l: { $ne: "x" },
      m: { $raw: "CURRENT_TIMESTAMP" },
    })
    .build();
  // utils.debug(sql);
  assertStrictEquals(
    sql,
    "SELECT * FROM `test1` WHERE `a`=1 AND `b`>2 AND `c`>=3 AND `d`<4 AND `e`<=5 AND `f` IS NULL AND `g` IS NOT NULL AND `h` LIKE 'a' AND `i` NOT LIKE 'b' AND `j` IN ('c') AND `k` NOT IN ('d') AND `l`<>'x' AND `m`=CURRENT_TIMESTAMP",
  );
});

Deno.test("query update(data): support for $incr", () => {
  const sql = Q.table("test1")
    .update({
      a: { $incr: 1 },
      b: { $decr: 2 },
      c: { $raw: "CURRENT_TIMESTAMP" },
    })
    .where({ a: 2 })
    .build();
  // utils.debug(sql);
  assertStrictEquals(
    sql,
    "UPDATE `test1` SET `a`=`a`+(1), `b`=`b`-(2), `c`=CURRENT_TIMESTAMP WHERE `a`=2",
  );
});

Deno.test("query build()", () => {
  assertThrows(() => Q.table("test1").build(), Error, 'invalid query type ""');
});
