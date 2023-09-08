/**
 * Re-exports from various modules for easier import convenience.
 */
export * from "./query.ts";     // Re-export items from 'query.ts'
export * from "./utils.ts";     // Re-export items from 'utils.ts'
export * from "./common.ts";    // Re-export items from 'common.ts'
export * from "./expr.ts";      // Re-export items from 'expr.ts'

import { QueryBuilder } from "./query.ts";

/**
 * Default export for the QueryBuilder class.
 */
export default QueryBuilder;

/**
 * Represents a connection interface for executing queries.
 */
export interface IConnection {
  /**
   * Executes a SQL query with optional parameters.
   * @param sql - The SQL query string.
   * @param params - Optional parameters to bind to the query.
   * @returns A promise that resolves with the query result.
   */
  query(sql: string, params?: any[]): Promise<any>;
}

/**
 * Executes a query using the provided connection.
 * @param conn - An instance of the database connection.
 * @param q - The query to execute, which can be a QueryBuilder instance or a raw SQL string.
 * @returns A promise that resolves with the query result.
 */
function query<T = any>(
  conn: IConnection,
  q: QueryBuilder | string,
): Promise<T> {
  return conn.query(typeof q === "string" ? q : q.build());
}

/**
 * Provides access to the 'table' and 'expr' functions from the QueryBuilder class.
 */
const table = QueryBuilder.table;
const expr = QueryBuilder.expr;

export { table, expr, query };
