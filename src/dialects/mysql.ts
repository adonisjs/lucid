/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { RawBuilder } from '../database/static_builder/raw.js'
import { DialectContract, SharedConfigNode, QueryClientContract } from '../types/database.js'

export class MysqlDialect implements DialectContract {
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

    return this.client.rawQuery(`DROP VIEW ${views.join(',')};`)
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
  async getAdvisoryLock(key: string, timeout: number = 0): Promise<boolean> {
    const response = await this.client.rawQuery(
      `SELECT GET_LOCK('${key}', ${timeout}) as lock_status;`
    )
    return response[0] && response[0][0] && response[0][0].lock_status === 1
  }

  /**
   * Releases the advisory lock
   */
  async releaseAdvisoryLock(key: string): Promise<boolean> {
    const response = await this.client.rawQuery(`SELECT RELEASE_LOCK('${key}') as lock_status;`)
    return response[0] && response[0][0] && response[0][0].lock_status === 1
  }
}
