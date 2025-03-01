/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { RuntimeException } from '@poppinss/exception'

import type { ColumnInfo } from '../types/common.js'
import type { DialectContract } from '../types/dialect.js'
import type { ConnectionConfig, SupportedDialectNames } from '../types/connection.js'

export abstract class AbstractDialect implements DialectContract {
  abstract name: SupportedDialectNames
  abstract dateFormat: string
  abstract dateTimeFormat: string
  abstract getAllTables(_?: string[]): Promise<{ name: string }[]>
  abstract getAllColumns(table: string): Promise<ColumnInfo[]>
  abstract hasTable(tableName: string, searchPath?: string[]): Promise<boolean>
  abstract dropAllTables(excludeTables?: string[], searchPath?: string[]): Promise<void>
  abstract truncate(table: string): Promise<void>
  abstract truncateAllTables(excludeTables?: string[], searchPath?: string[]): Promise<void>

  /**
   * Not supported by the database
   */
  supportsAdvisoryLocks: boolean = false

  /**
   * Not supported by the database
   */
  supportsViews: boolean = false

  /**
   * Not supported by the database
   */
  supportsTypes: boolean = false

  /**
   * Not supported by the database
   */
  supportsReturningStatement: boolean = false

  constructor(protected config: ConnectionConfig) {}

  /**
   * Returns an array of table names configured to store
   * migrations metadata.
   */
  getMigrationsTables(): string[] {
    const migrationTable = this.config.migrations?.tableName ?? 'adonis_schema'
    return [migrationTable, `${migrationTable}_versions`]
  }

  /**
   * Not supported by the database.
   * @throws RuntimeException
   */
  getAllTypes(_: unknown): Promise<{ name: string }[]> | Promise<{ name: string }[]> {
    throw new RuntimeException('Database does not support listing types')
  }

  /**
   * Not supported by the database
   * @throws RuntimeException
   */
  getAllViews(_?: string[]): Promise<{ name: string }[]> {
    throw new RuntimeException('Database does not support listing views')
  }

  /**
   * Not supported by the database
   * @throws RuntimeException
   */
  hasView(_: string, __?: string[]): Promise<boolean> {
    throw new RuntimeException('Database does not support searching for views')
  }

  /**
   * Not supported by the database
   * @throws RuntimeException
   */
  dropAllViews(_?: string[], __?: string[]): Promise<void> {
    throw new RuntimeException('Database does not support dropping views')
  }

  /**
   * Not supported by the database
   * @throws RuntimeException
   */
  dropAllTypes(_?: string[], __?: string[]): Promise<void> {
    throw new RuntimeException('Database does not support dropping types')
  }

  /**
   * Not supported by the database
   * @throws RuntimeException
   */
  getAdvisoryLock(_: string | number, __?: number): Promise<boolean> {
    throw new RuntimeException('Database does not support advisory locks')
  }

  /**
   * Not supported by the database
   * @throws RuntimeException
   */
  releaseAdvisoryLock(_: string | number): Promise<boolean> {
    throw new RuntimeException('Database does not support advisory locks')
  }
}
