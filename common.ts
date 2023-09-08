/**
 * Represents a set of query options that can be used to customize data retrieval.
 */
export interface QueryOptionsParams {
  /**
   * The number of rows to skip in the result set.
   * @remarks This option is used to implement pagination.
   * @example
   * To skip the first 10 rows: { skip: 10 }
   */
  skip?: number;

  /**
   * An alias for 'skip'. The number of rows to offset in the result set.
   * @remarks This option can be used interchangeably with 'skip'.
   * @example
   * To offset the result by 5 rows: { offset: 5 }
   */
  offset?: number;

  /**
   * The maximum number of rows to return in the result set.
   * @remarks This option controls the page size when implementing pagination.
   * @example
   * To limit the result to 20 rows: { limit: 20 }
   */
  limit?: number;

  /**
   * The column or property by which to order the result set.
   * @example
   * To order by 'createdDate' in ascending order: { orderBy: 'createdDate' }
   */
  orderBy?: string;

  /**
   * The column or property by which to group the result set.
   * @example
   * To group by 'category': { groupBy: 'category' }
   */
  groupBy?: string;

  /**
   * A list of specific fields to include in the query result.
   * @example
   * To select 'name' and 'email' fields: { fields: ['name', 'email'] }
   */
  fields?: string[];
}

/**
 * Represents the basic types that can be used in query conditions and updates.
 */
export type BaseFieldType = number | string | boolean | Date | null;

/**
 * Represents an advanced query condition for filtering data.
 */
export type AdvancedCondition = Record<
  string | number | symbol,
  AdvancedConditionField
>;

/**
 * Represents a raw condition that allows using raw SQL or query expressions.
 */
export type RawCondition = { $raw?: string };

/**
 * Represents an advanced field within an advanced query condition.
 */
export type AdvancedConditionField =
  | BaseFieldType
  | {
    /**
     * Specifies an 'IN' condition to match values in an array.
     *
     * @example
     * To find records where 'age' is in [25, 30, 35]: { $in: [25, 30, 35] }
     *
     * @typeparam T - The type of elements in the array.
     */
    $in?: any[];

    /**
     * Specifies a 'NOT IN' condition to exclude values in an array.
     *
     * @example
     * To find records where 'status' is not in ['active', 'pending']: { $notIn: ['active', 'pending'] }
     *
     * @typeparam T - The type of elements in the array.
     */
    $notIn?: any[];

    /**
     * x LIKE y.
     *
     * @remarks
     * This operator is used for pattern matching on strings.
     *
     * @typeparam T - The data type of the string.
     */
    $like?: string;

    /**
     * x NOT LIKE y.
     *
     * @remarks
     * This operator is used for pattern matching on strings.
     *
     * @typeparam T - The data type of the string.
     */
    $notLike?: string;

    /**
     * x = y.
     *
     * @typeparam T - The type of values to be compared.
     */
    $eq?: any;

    /**
     * x <> y.
     *
     * @typeparam T - The type of values to be compared.
     */
    $ne?: any;

    /**
     * x < y.
     *
     * @typeparam T - The type of values to be compared.
     */
    $lt?: any;

    /**
     * x <= y.
     *
     * @typeparam T - The type of values to be compared.
     */
    $lte?: any;

    /**
     * x > y.
     *
     * @typeparam T - The type of values to be compared.
     */
    $gt?: any;

    /**
     * x >= y.
     *
     * @typeparam T - The type of values to be compared.
     */
    $gte?: any;

    /**
     * x IS NULL.
     */
    $isNull?: true;

    /**
     * x IS NOT NULL.
     */
    $isNotNull?: true;

    /**
     * x = y (y does not undergo any transformation).
     *
     * @typeparam T - The type of values to be compared.
     */
    $raw?: string;
  };

/**
 * Represents an advanced update operation for modifying data.
 */
export type AdvancedUpdate = Record<
  string | number | symbol,
  AdvancedUpdateField
>;

/**
 * Represents an advanced field within an advanced update operation.
 */
export type AdvancedUpdateField =
  | BaseFieldType
  | {
    /**
     * Specifies an 'INCREMENT' operation for numeric fields.
     * @example
     * To increment 'score' by 5: { $incr: 5 }
     */
    $incr?: number;

    /**
     * Specifies a 'DECREMENT' operation for numeric fields.
     * @example
     * To decrement 'quantity' by 1: { $decr: 1 }
     */
    $decr?: number;

    /**
     * Specifies a raw SQL expression to be used in the update operation.
     * @remarks This allows for custom SQL expressions.
     * @example
     * To set a custom value: { $raw: "column_name = NOW()" }
     */
    $raw?: string;
  };

/**
 * Represents a single data row with dynamic properties.
 * @example
 * {
 *   id: 1,
 *   name: 'John Doe',
 *   age: 30,
 *   createdDate: new Date('2023-01-15'),
 *   isActive: true
 * }
 */
export type DataRow = Record<string, any>;
