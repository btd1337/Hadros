import * as utils from "./utils.ts";
import { AdvancedCondition, DataRow } from "./common.ts";
import { assert } from "./deps.ts";
import Messages from "./messages.ts";

/**
 * Represents an expression builder for constructing SQL-like expressions.
 */
export class Expression {
  protected _type: string = "";
  protected _data: string = "";

  /**
   * Formats a template string with optional values.
   * @param tpl - The template string to format.
   * @param values - Optional values to insert into the template.
   * @returns The formatted string.
   */
  public format(tpl: string, values?: DataRow | any[]): string {
    assert(typeof tpl === "string", "The first parameter must be a string");
    if (!values) {
      return tpl;
    }
    assert(
      Array.isArray(values) || typeof values === "object",
      "The second parameter must be an array or object",
    );
    if (Array.isArray(values)) {
      return utils.sqlFormat(tpl, values);
    }
    return utils.sqlFormatObject(tpl, values);
  }

  /**
   * Combines a condition using the specified connector (AND or OR).
   * @param connector - The logical connector ('AND' or 'OR').
   * @param condition - The condition to add.
   * @param values - Optional values to insert into the condition.
   * @returns The updated Expression instance.
   */
  protected combineCondition(
    connector: string,
    condition: string | AdvancedCondition,
    values?: DataRow | any[],
  ): this {
    const t = typeof condition;
    assert(
      this._type === "" || this._type === "condition",
      `Cannot change expression type: ${this._type}`,
    );
    assert(condition, "Missing condition");
    assert(
      t === "string" || t === "object",
      "Condition must be a string or object",
    );
    if (typeof condition === "string") {
      this._data += ` ${connector} ${this.format(condition, values || [])}`;
    } else {
      const keys = utils.findKeysForUndefinedValue(condition);
      assert(
        keys.length < 1,
        Messages.undefinedValueConditionalKeys(keys),
      );
      this._data += ` ${connector} ${
        utils.sqlConditionStrings(
          condition as any,
        )
      }`;
    }
    this._type = "condition";
    return this;
  }

  /**
   * Adds an 'AND' condition to the expression.
   * @param condition - The condition to add.
   * @param values - Optional values to insert into the condition.
   * @returns The updated Expression instance.
   */
  public and(
    condition: string | AdvancedCondition,
    values?: DataRow | any[],
  ): this {
    return this.combineCondition("AND", condition, values);
  }

  /**
   * Adds an 'OR' condition to the expression.
   * @param condition - The condition to add.
   * @param values - Optional values to insert into the condition.
   * @returns The updated Expression instance.
   */
  public or(
    condition: string | AdvancedCondition,
    values?: DataRow | any[],
  ): this {
    return this.combineCondition("OR", condition, values);
  }

  /**
   * Builds the final SQL-like expression string.
   * @returns The constructed expression as a string.
   */
  public build(): string {
    let str = this._data.trim();
    assert(str, "Expression cannot be empty");
    if (str.indexOf("AND ") === 0) str = str.slice(4);
    if (str.indexOf("OR ") === 0) str = str.slice(3);
    return "(" + str + ")";
  }
}
