/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference path="../../adonis-typings/index.ts" />

import { DialectContract, QueryClientContract } from '@ioc:Adonis/Lucid/Database'

export class PgDialect implements DialectContract {
	public readonly name = 'postgres'
	public readonly supportsAdvisoryLocks = true

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
	 * Returns an array of table names for one or many schemas.
	 */
	public async getAllTables(schemas: string[]) {
		const tables = await this.client
			.query()
			.from('pg_catalog.pg_tables')
			.select('tablename as table_name')
			.whereIn('schemaname', schemas)
			.orderBy('tablename', 'asc')

		return tables.map(({ table_name }) => table_name)
	}

	/**
	 * Truncate pg table with option to cascade and restart identity
	 */
	public async truncate(table: string, cascade: boolean = false) {
		return cascade
			? this.client.rawQuery(`TRUNCATE ${table} RESTART IDENTITY CASCADE;`)
			: this.client.rawQuery(`TRUNCATE ${table};`)
	}

	/**
	 * Drop all tables inside the database
	 */
	public async dropAllTables(schemas: string[]) {
		const tables = await this.getAllTables(schemas)
		await this.client.rawQuery(`DROP table ${tables.join(',')} CASCADE;`)
	}

	/**
	 * Attempts to add advisory lock to the database and
	 * returns it's status.
	 */
	public async getAdvisoryLock(key: string): Promise<boolean> {
		const response = await this.client.rawQuery(
			`SELECT PG_TRY_ADVISORY_LOCK('${key}') as lock_status;`
		)
		return response.rows[0] && response.rows[0].lock_status === true
	}

	/**
	 * Releases the advisory lock
	 */
	public async releaseAdvisoryLock(key: string): Promise<boolean> {
		const response = await this.client.rawQuery(
			`SELECT PG_ADVISORY_UNLOCK('${key}') as lock_status;`
		)
		return response.rows[0] && response.rows[0].lock_status === true
	}
}
