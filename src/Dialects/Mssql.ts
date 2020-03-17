/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/// <reference path="../../adonis-typings/index.ts" />

import { RawBuilder } from '../Database/StaticBuilder/Raw'
import { DialectContract, QueryClientContract } from '@ioc:Adonis/Lucid/Database'

export class MssqlDialect implements DialectContract {
  public readonly name = 'mssql'
  public readonly supportsAdvisoryLocks = false

  /**
   * The default format for datetime column. The date formats is
   * valid for luxon date parsing library
   */
  public readonly dateTimeFormat = 'yyyy-MM-dd\'T\'HH:mm:ss.SSSZZ'

  constructor (private client: QueryClientContract) {
  }

  /**
   * Returns an array of table names
   */
  public async getAllTables () {
    const tables = await this.client
      .query()
      .from('information_schema.tables')
      .select('table_name')
      .where('TABLE_TYPE', 'BASE TABLE')
      .debug(true)
      .where('table_catalog', new RawBuilder('database()'))
      .orderBy('table_name', 'asc')

    return tables.map(({ table_name }) => table_name)
  }

  /**
   * Truncate mssql table
   */
  public async truncate (table: string, _: boolean) {
    return this.client.knexQuery().table(table).truncate()
  }

  public getAdvisoryLock (): Promise<boolean> {
    throw new Error('Support for advisory locks is not implemented for mssql. Create a PR to add the feature')
  }

  public releaseAdvisoryLock (): Promise<boolean> {
    throw new Error('Support for advisory locks is not implemented for mssql. Create a PR to add the feature')
  }
}
