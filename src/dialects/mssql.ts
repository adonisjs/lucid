/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import {
  type DialectContract,
  type SharedConfigNode,
  type QueryClientContract,
} from '../types/database.js'

export class MssqlDialect implements DialectContract {
  readonly name = 'mssql'
  readonly supportsAdvisoryLocks = false
  readonly supportsViews = false
  readonly supportsTypes = false
  readonly supportsDomains = false
  readonly supportsReturningStatement = true

  /**
   * Reference to the database version. Knex.js fetches the version after
   * the first database query, so it will be set to undefined initially
   */
  readonly version: string

  /**
   * The default format for datetime column. The date formats is
   * valid for luxon date parsing library
   */
  readonly dateTimeFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSZZ"

  constructor(
    private client: QueryClientContract,
    private config: SharedConfigNode
  ) {
    this.version = (this.client.getReadClient() as any)['context']['client'].version
  }

  #compileGetAllTables() {
    const knex = this.client.getWriteClient()
    const query = this.client
      .getWriteClient()
      .from('sys.tables as t')
      .select('t.name', knex.raw('schema_name(t.schema_id) as [schema]'))
      .where('t.is_ms_shipped', 0)
      .whereNot('t.name', 'sysdiagrams')
      .orderByRaw('[schema]')
      .orderBy('t.name')

    return query
  }

  /**
   * Returns a filter function to omit tables, views and
   * types from the excludeList
   */
  #omitFromExcludeList(excludeList?: string[]) {
    if (!excludeList) {
      return () => true
    }
    return ({ name, schema }: { name: string; schema: string }): boolean => {
      return !(excludeList.includes(`${schema}.${name}`) || excludeList.includes(name))
    }
  }

  /**
   * Returns an array of table names
   */
  async getAllTables() {
    const tables: { name: string; schema: string }[] = await this.#compileGetAllTables()
    return tables.map(({ name }) => name)
  }

  /**
   * Truncate mssql table. Disabling foreign key constriants alone is
   * not enough for SQL server.
   *
   * One has to drop all FK constraints and then re-create them, and
   * this all is too much work
   */
  async truncate(table: string, _: boolean) {
    return this.client.knexQuery().table(table).truncate()
  }

  async truncateAllTables(excludeTables?: string[]): Promise<void> {
    const tables: { name: string; schema: string }[] = await this.#compileGetAllTables()
    const knex = this.client.getWriteClient()

    /**
     * Collecting the tables to be dropped. We ignore tables from the exclude
     * tables list.
     */
    const tablesToTrunacte = tables
      .filter(this.#omitFromExcludeList(excludeTables))
      .map((table) => knex.ref(`${table.schema}.${table.name}`).toSQL().sql)

    if (tablesToTrunacte.length) {
      const trx = await knex.transaction()
      try {
        await trx.schema.raw(`EXEC sp_msforeachtable 'ALTER TABLE \\? NOCHECK CONSTRAINT ALL';`)
        for (let table of tablesToTrunacte) {
          await trx.schema.raw(`DELETE FROM ${table};`)
          /**
           * Re-seeding is optional and will fail if the table does not
           * contain an identity column
           */
          try {
            await trx.schema.raw(`DBCC CHECKIDENT('${table}', RESEED, 0);`)
          } catch {}
        }
        await trx.schema.raw(
          `EXEC sp_msforeachtable 'ALTER TABLE \\? WITH CHECK CHECK CONSTRAINT ALL';`
        )
        await trx.commit()
      } catch (error) {
        await trx.rollback()
        throw error
      }
    }
  }

  /**
   * Drop all tables inside the database
   */
  async dropAllTables() {
    await this.client.rawQuery(`
			DECLARE @sql NVARCHAR(MAX) = N'';
      SELECT @sql += 'ALTER TABLE '
        + QUOTENAME(OBJECT_SCHEMA_NAME(parent_object_id)) + '.' + + QUOTENAME(OBJECT_NAME(parent_object_id))
        + ' DROP CONSTRAINT ' + QUOTENAME(name) + ';'
      FROM sys.foreign_keys;
      EXEC sp_executesql @sql;
		`)

    const ignoredTables = (this.config.wipe?.ignoreTables || [])
      .map((table) => `"${table}"`)
      .join(', ')

    await this.client.rawQuery(`
      EXEC sp_MSforeachtable 'DROP TABLE \\?',
      @whereand='AND o.Name NOT IN (${ignoredTables || '""'})'
    `)
  }

  async getAllViews(): Promise<string[]> {
    throw new Error(
      '"getAllViews" method not implemented is not implemented for mssql. Create a PR to add the feature'
    )
  }

  async getAllTypes(): Promise<string[]> {
    throw new Error(
      '"getAllTypes" method not implemented is not implemented for mssql. Create a PR to add the feature'
    )
  }

  async getAllDomains(): Promise<string[]> {
    throw new Error(
      '"getAllDomains" method not implemented is not implemented for mssql. Create a PR to add the feature'
    )
  }

  async dropAllViews(): Promise<void> {
    throw new Error(
      '"dropAllViews" method not implemented is not implemented for mssql. Create a PR to add the feature'
    )
  }

  async dropAllTypes(): Promise<void> {
    throw new Error(
      '"dropAllTypes" method not implemented is not implemented for mssql. Create a PR to add the feature'
    )
  }

  async dropAllDomains(): Promise<void> {
    throw new Error(
      '"dropAllDomains" method not implemented is not implemented for mssql. Create a PR to add the feature'
    )
  }

  getAdvisoryLock(): Promise<boolean> {
    throw new Error(
      'Support for advisory locks is not implemented for mssql. Create a PR to add the feature'
    )
  }

  releaseAdvisoryLock(): Promise<boolean> {
    throw new Error(
      'Support for advisory locks is not implemented for mssql. Create a PR to add the feature'
    )
  }
}
