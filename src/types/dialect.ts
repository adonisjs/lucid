/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { ColumnInfo } from './common.js'

/**
 * Interface to be implemented by Dialects implementation.
 */
export interface DialectContract {
  /**
   * The unique name for the dialect. Lucid internals might rely on
   * this name for conditionally enabling/disabling features
   */
  readonly name: string

  /**
   * The format in which the date should be stored in the database
   */
  readonly dateFormat: string

  /**
   * The format in which the date time should be stored in the database
   */
  readonly dateTimeFormat: string

  /**
   * Set to true if dialect supports advisory locks
   */
  readonly supportsAdvisoryLocks: boolean

  /**
   * Set to true if dialect supports views
   */
  readonly supportsViews: boolean

  /**
   * Set to true if dialect supports custom types
   */
  readonly supportsTypes: boolean

  /**
   * Set to true if dialect supports returning statement
   */
  readonly supportsReturningStatement: boolean

  /**
   * Should return an array of tables configured for managing
   * migrations
   */
  getMigrationsTables(): string[]

  /**
   * Should return a list of all the tables that must be visible
   * by the user application.
   *
   * If database supports multiple schemas (like PostgreSQL), then
   * the searchPath must be used to limit the results within the
   * provided schemas.
   *
   * @example
   * ```ts
   * dialect.getAllTables()
   *
   * // Search within provided schemas
   * dialect.getAllTables(['public', 'reports'])
   * ```
   */
  getAllTables(searchPath?: string[]): Promise<
    {
      name: string
    }[]
  >

  /**
   * Should return a list of all the views that must be visible
   * by the user application.
   *
   * If database supports multiple schemas (like PostgreSQL), then
   * the searchPath must be used to limit the results within the
   * provided schemas.
   *
   * @example
   * ```ts
   * dialect.getAllViews()
   *
   * // Search within provided schemas
   * dialect.getAllViews(['public', 'reports'])
   * ```
   */
  getAllViews(searchPath?: string[]): Promise<
    {
      name: string
    }[]
  >

  /**
   * Should return a list of custom types that must be visible
   * by the user application.
   *
   * If database supports multiple schemas (like PostgreSQL), then
   * the searchPath must be used to limit the results within the
   * provided schemas.
   *
   * @example
   * ```ts
   * dialect.getAllTypes()
   *
   * // Search within provided schemas
   * dialect.getAllTypes(['public', 'reports'])
   * ```
   */
  getAllTypes(searchPath?: string[]): Promise<
    {
      name: string
    }[]
  >

  /**
   * Should return an array of columns for a given table.
   *
   * @example
   * ```ts
   * dialect.getAllColumns('users')
   * ```
   */
  getAllColumns(table: string): Promise<ColumnInfo[]>

  /**
   * Should return true if a view exists.
   *
   * If database supports multiple schemas (like PostgreSQL), then
   * the searchPath must be used for filtering the within the
   * provided schemas.
   *
   * @example
   * ```ts
   * dialect.hasView('voters')
   *
   * // Search within provided schemas
   * dialect.hasView('voters', ['public'])
   *
   * // Prefix view with the schema name
   * dialect.hasView('public.voters')
   * ```
   */
  hasView(viewName: string, searchPath?: string[]): Promise<boolean>

  /**
   * Should return true if a table exists.
   *
   * If database supports multiple schemas (like PostgreSQL), then
   * the searchPath must be used for filtering the within the
   * provided schemas.
   *
   * @example
   * ```ts
   * dialect.hasTable('users')
   *
   * // Search within provided schemas
   * dialect.hasTable('users', ['public'])
   *
   * // Prefix table name with the schema name
   * dialect.hasTable('public.users')
   * ```
   */
  hasTable(tableName: string, searchPath?: string[]): Promise<boolean>

  /**
   * Drop all database tables.
   *
   * If database supports multiple schemas (like PostgreSQL), then
   * the searchPath must be used to limit the results within the
   * provided schemas.
   *
   * If "excludeTables" array is provided, then the mentioned tables
   * must not be dropped.
   *
   * @example
   * ```ts
   * // drop all tables
   * dialect.dropAllTables()
   *
   * // drop all tables within provided schemas
   * dialect.dropAllTables([], ['public', 'reports'])
   *
   * // drop all tables except the excluded ones
   * dialect.dropAllTables(['api_tokens'])
   * ```
   */
  dropAllTables(excludeTables?: string[], searchPath?: string[]): Promise<void>

  /**
   * Drop all database views.
   *
   * If database supports multiple schemas (like PostgreSQL), then
   * the searchPath must be used to limit the results within the
   * provided schemas.
   *
   * If "excludeViews" array is provided, then the mentioned views
   * must not be dropped.
   *
   * @example
   * ```ts
   * // drop all views
   * dialect.dropAllViews()
   *
   * // drop all views within provided schemas
   * dialect.dropAllViews([], ['public', 'reports'])
   *
   * // drop all views except the excluded ones
   * dialect.dropAllViews(['fy_24_reports'])
   * ```
   */
  dropAllViews(excludeViews?: string[], searchPath?: string[]): Promise<void>

  /**
   * Drop all custom types.
   *
   * If database supports multiple schemas (like PostgreSQL), then
   * the searchPath must be used to limit the results within the
   * provided schemas.
   *
   * If "excludeTypes" array is provided, then the mentioned types
   * must not be dropped.
   *
   * @example
   * ```ts
   * // drop all types
   * dialect.dropAllTypes()
   *
   * // drop all types within provided schemas
   * dialect.dropAllTypes([], ['public', 'reports'])
   *
   * // drop all types except the excluded ones
   * dialect.dropAllTypes(['user_role_enum'])
   * ```
   */
  dropAllTypes(excludeTypes?: string[], searchPath?: string[]): Promise<void>

  /**
   * Truncate a given database table.
   *
   * @example
   * ```ts
   * await dialect.truncate('users')
   * ```
   */
  truncate(table: string): Promise<void>

  /**
   * Truncate all the database tables.
   *
   * If database supports multiple schemas (like PostgreSQL), then
   * the searchPath must be used to limit the results within the
   * provided schemas.
   *
   * If "excludeTypes" array is provided, then the mentioned types
   * must not be dropped.
   *
   * @example
   * ```ts
   * // truncate all tables
   * dialect.truncateAllTables()
   *
   * // truncate all tables within provided schemas
   * dialect.truncateAllTables([], ['public', 'reports'])
   *
   * // truncate all tables except the excluded ones
   * dialect.truncateAllTables(['users'])
   * ```
   */
  truncateAllTables(excludeTables?: string[], searchPath?: string[]): Promise<void>

  /**
   * Acquire an advisory lock. Throw an error if the dialect does
   * not support advisory locks
   */
  getAdvisoryLock(key: string | number, timeout?: number): Promise<boolean>

  /**
   * Release an advisory lock. Throw an error if the dialect does
   * not support advisory locks
   */
  releaseAdvisoryLock(key: string | number): Promise<boolean>
}
