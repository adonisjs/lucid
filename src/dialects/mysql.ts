/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { RawBuilder } from '../database/static_builder/raw.js'
import {
  type DialectContract,
  type SharedConfigNode,
  type QueryClientContract,
  type DialectAdministrationContract,
} from '../types/database.js'

export class MysqlDialect implements DialectContract {
  /**
   * Database level administration operations for the dialect.
   * MySQL accepts connections without a selected database,
   * hence no maintenance database is needed
   */
  static administration: DialectAdministrationContract = {
    maintenanceDatabase: null,
    async databaseExists(client, databaseName) {
      const rows = await client
        .from('information_schema.schemata')
        .where('schema_name', databaseName)
      return rows.length > 0
    },
  }

  readonly name = 'mysql'
  readonly supportsAdvisoryLocks = true
  readonly supportsViews = true
  readonly supportsTypes = false
  readonly supportsDomains = false
  readonly supportsReturningStatement = false

  /**
   * Reference to the database version. Knex.js fetches the version after
   * the first database query, so it will be set to undefined initially
   */
  readonly version: string

  /**
   * The default format for datetime column. The date formats is
   * valid for luxon date parsing library
   */
  readonly dateTimeFormat = 'yyyy-MM-dd HH:mm:ss'

  constructor(
    private client: QueryClientContract,
    private config: SharedConfigNode
  ) {
    this.version = (this.client.getReadClient() as any)['context']['client'].version
  }

  /**
   * Returns a filter function to omit tables, views and
   * types from the excludeList
   */
  #omitFromExcludeList(excludeList?: string[]) {
    if (!excludeList) {
      return () => true
    }
    return (name: string): boolean => {
      return !excludeList.includes(name)
    }
  }

  /**
   * Truncate mysql table with option to cascade
   */
  async truncate(table: string, cascade: boolean = false) {
    if (!cascade) {
      return this.client.knexQuery().table(table).truncate()
    }

    /**
     * Cascade and truncate
     */
    const trx = await this.client.transaction()
    try {
      await trx.rawQuery('SET FOREIGN_KEY_CHECKS=0;')
      await trx.knexQuery().table(table).truncate()
      await trx.rawQuery('SET FOREIGN_KEY_CHECKS=1;')
      await trx.commit()
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  /**
   * Truncates all the tables that are in the database.
   *
   * You may exclude certain tables from getting truncated by providing them
   * under the "excludeTables" list.
   *
   * @example
   * ```ts
   * // Truncate all tables
   * await dialect.truncateAllTables()
   *
   * // Exclude the users table
   * await dialect.truncateAllTables(['users'])
   * ```
   */
  async truncateAllTables(excludeTables?: string[]): Promise<void> {
    const tables = await this.getAllTables()
    const knex = this.client.getWriteClient()

    /**
     * Collecting the tables to be dropped. We ignore tables from the exclude
     * tables list.
     */
    const tablesToTrunacte = tables.filter(this.#omitFromExcludeList(excludeTables))

    if (tablesToTrunacte.length) {
      const trx = await knex.transaction()
      try {
        await trx.schema.raw('SET FOREIGN_KEY_CHECKS=0;')
        for (let table of tablesToTrunacte) {
          await trx.table(table).truncate()
        }
        await trx.schema.raw('SET FOREIGN_KEY_CHECKS=1;')
        await trx.commit()
      } catch (error) {
        await trx.rollback()
        throw error
      }
    }
  }

  /**
   * Returns the primary key column names for a given table
   */
  async getPrimaryKeys(tableName: string): Promise<string[]> {
    const result = await this.client
      .query()
      .from('information_schema.KEY_COLUMN_USAGE')
      .select('COLUMN_NAME as column_name')
      .where('TABLE_NAME', tableName)
      .where('CONSTRAINT_NAME', 'PRIMARY')
      .where('TABLE_SCHEMA', new RawBuilder('database()'))
      .orderBy('ORDINAL_POSITION', 'asc')

    return result.map(({ column_name }: any) => column_name)
  }

  /**
   * Returns an array of table names
   */
  async getAllTables(): Promise<string[]> {
    const tables = await this.client
      .query()
      .from('information_schema.tables')
      .select('table_name as table_name')
      .where('TABLE_TYPE', 'BASE TABLE')
      .where('table_schema', new RawBuilder('database()'))
      .orderBy('table_name', 'asc')

    return tables.map(({ table_name }) => table_name)
  }

  async getAllTablesWithSchema(): Promise<{ name: string; schema?: string }[]> {
    const tables = await this.getAllTables()
    return tables.map((name) => ({ name }))
  }

  /**
   * Returns an array of all views names
   */
  async getAllViews(): Promise<string[]> {
    const tables = await this.client
      .query()
      .from('information_schema.tables')
      .select('table_name as table_name')
      .where('TABLE_TYPE', 'VIEW')
      .where('table_schema', new RawBuilder('database()'))
      .orderBy('table_name', 'asc')

    return tables.map(({ table_name }) => table_name)
  }

  /**
   * Returns an array of all types names
   */
  async getAllTypes(): Promise<string[]> {
    throw new Error("MySQL doesn't support types")
  }

  /**
   * Returns an array of all domain names
   */
  async getAllDomains(): Promise<string[]> {
    throw new Error("MySQL doesn't support domains")
  }

  /**
   * Drop all tables inside the database
   */
  async dropAllTables() {
    let tables = await this.getAllTables()

    /**
     * Filter out tables that are not allowed to be dropped
     */
    tables = tables.filter((table) => !(this.config.wipe?.ignoreTables || []).includes(table))

    /**
     * Add backquote around table names to avoid syntax errors
     * in case of a table name with a reserved keyword
     */
    tables = tables.map((table) => '`' + table + '`')

    if (!tables.length) {
      return
    }

    /**
     * Cascade and truncate
     */
    const trx = await this.client.transaction()

    try {
      await trx.rawQuery('SET FOREIGN_KEY_CHECKS=0;')
      await trx.rawQuery(`DROP TABLE ${tables.join(',')};`)
      await trx.rawQuery('SET FOREIGN_KEY_CHECKS=1;')
      await trx.commit()
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  /**
   * Drop all views inside the database
   */
  async dropAllViews(): Promise<void> {
    const views = await this.getAllViews()

    const knex = this.client.getWriteClient()
    const quotedViews = views.map((v) => knex.ref(v).toSQL().sql)
    return this.client.rawQuery(`DROP VIEW ${quotedViews.join(', ')};`)
  }

  /**
   * Drop all custom types inside the database
   */
  async dropAllTypes(): Promise<void> {
    throw new Error("MySQL doesn't support types")
  }

  /**
   * Drop all domains inside the database
   */
  async dropAllDomains(): Promise<void> {
    throw new Error("MySQL doesn't support domains")
  }

  /**
   * Attempts to add advisory lock to the database and
   * returns it's status.
   */
  async getAdvisoryLock(key: string, timeout: number = 0, connection?: any): Promise<boolean> {
    const query = this.client
      .getWriteClient()
      .raw(`SELECT GET_LOCK('${key}', ${timeout}) as lock_status;`)

    if (connection) {
      query.connection(connection)
    }

    const response = await query
    return response[0] && response[0][0] && response[0][0].lock_status === 1
  }

  /**
   * Releases the advisory lock
   */
  async releaseAdvisoryLock(key: string, connection?: any): Promise<boolean> {
    const query = this.client.getWriteClient().raw(`SELECT RELEASE_LOCK('${key}') as lock_status;`)

    if (connection) {
      query.connection(connection)
    }

    const response = await query
    return response[0] && response[0][0] && response[0][0].lock_status === 1
  }
}
