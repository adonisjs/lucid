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
   * Reference to the database version. Knex.js fetches the version after
   * the first database query, so it will be set to undefined initially
   */
  public readonly version = this.client.getReadClient()['context']['client'].version

  /**
   * The default format for datetime column. The date formats is
   * valid for luxon date parsing library
   */
  public readonly dateTimeFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSZZ"

  constructor(private client: QueryClientContract) {}

  /**
   * Returns an array of table names
   */
  public async getAllTables() {
    const tables = await this.client
      .query()
      .from('information_schema.tables')
      .select('table_name as table_name')
      .where('table_type', 'BASE TABLE')
      .where('table_catalog', new RawBuilder('DB_NAME()'))
      .whereNot('table_name', 'like', 'spt_%')
      .andWhereNot('table_name', 'MSreplication_options')
      .orderBy('table_name', 'asc')

    return tables.map(({ table_name }) => table_name)
  }

  /**
   * Truncate mssql table. Disabling foreign key constriants alone is
   * not enough for SQL server.
   *
   * One has to drop all FK constraints and then re-create them, and
   * this all is too much work
   */
  public async truncate(table: string, _: boolean) {
    return this.client.knexQuery().table(table).truncate()
  }

  /**
   * Drop all tables inside the database
   */
  public async dropAllTables() {
    await this.client.rawQuery(`
			DECLARE @sql NVARCHAR(MAX) = N'';
				SELECT @sql += 'ALTER TABLE '
					+ QUOTENAME(OBJECT_SCHEMA_NAME(parent_object_id)) + '.' + + QUOTENAME(OBJECT_NAME(parent_object_id))
					+ ' DROP CONSTRAINT ' + QUOTENAME(name) + ';'
				FROM sys.foreign_keys;
				EXEC sp_executesql @sql;
		`)

    await this.client.rawQuery(`EXEC sp_MSforeachtable 'DROP TABLE \\?';`)
  }

  public async getAllViews(): Promise<string[]> {
    throw new Error(
      '"getAllViews" method not implemented is not implemented for mssql. Create a PR to add the feature'
    )
  }

  public async getAllTypes(): Promise<string[]> {
    throw new Error(
      '"getAllTypes" method not implemented is not implemented for mssql. Create a PR to add the feature'
    )
  }

  public async dropAllViews(): Promise<void> {
    throw new Error(
      '"dropAllViews" method not implemented is not implemented for mssql. Create a PR to add the feature'
    )
  }

  public async dropAllTypes(): Promise<void> {
    throw new Error(
      '"dropAllTypes" method not implemented is not implemented for mssql. Create a PR to add the feature'
    )
  }

  public getAdvisoryLock(): Promise<boolean> {
    throw new Error(
      'Support for advisory locks is not implemented for mssql. Create a PR to add the feature'
    )
  }

  public releaseAdvisoryLock(): Promise<boolean> {
    throw new Error(
      'Support for advisory locks is not implemented for mssql. Create a PR to add the feature'
    )
  }
}
