/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference path="../../adonis-typings/index.ts" />

import knex from 'knex'
import { Exception } from '@poppinss/utils'
import { EmitterContract } from '@ioc:Adonis/Core/Event'
import { resolveClientNameWithAliases } from 'knex/lib/helpers'
import { ProfilerRowContract, ProfilerContract } from '@ioc:Adonis/Core/Profiler'

import {
	DialectContract,
	ConnectionContract,
	QueryClientContract,
	TransactionClientContract,
} from '@ioc:Adonis/Lucid/Database'

import { dialects } from '../Dialects'
import { ModelQueryBuilder } from '../Orm/QueryBuilder'
import { TransactionClient } from '../TransactionClient'
import { RawBuilder } from '../Database/StaticBuilder/Raw'
import { RawQueryBuilder } from '../Database/QueryBuilder/Raw'
import { InsertQueryBuilder } from '../Database/QueryBuilder/Insert'
import { ReferenceBuilder } from '../Database/StaticBuilder/Reference'
import { DatabaseQueryBuilder } from '../Database/QueryBuilder/Database'
import { ModelQueryBuilderContract } from '@ioc:Adonis/Lucid/Orm'
import {
	DatabaseQueryBuilderContract,
	InsertQueryBuilderContract,
	RawQueryBuilderContract,
} from '@ioc:Adonis/Lucid/DatabaseQueryBuilder'

/**
 * Query client exposes the API to fetch instance of different query builders
 * to perform queries on a selecte connection.
 */
export class QueryClient implements QueryClientContract {
	/**
	 * Not a transaction client
	 */
	public readonly isTransaction = false

	/**
	 * The dialect in use
	 */
	public dialect: DialectContract = new dialects[
		resolveClientNameWithAliases(this.connection.config.client)
	](this)

	/**
	 * The profiler to be used for profiling queries
	 */
	public profiler?: ProfilerRowContract | ProfilerContract

	/**
	 * Name of the connection in use
	 */
	public readonly connectionName = this.connection.name

	/**
	 * Is debugging enabled
	 */
	public debug = !!this.connection.config.debug

	constructor(
		public readonly mode: 'dual' | 'write' | 'read',
		private connection: ConnectionContract,
		public emitter: EmitterContract
	) {}

	/**
	 * Returns schema instance for the write client
	 */
	public get schema() {
		return this.getWriteClient().schema
	}

	/**
	 * Returns the read client. The readClient is optional, since we can get
	 * an instance of [[QueryClient]] with a sticky write client.
	 */
	public getReadClient(): knex {
		if (this.mode === 'read' || this.mode === 'dual') {
			return this.connection.readClient!
		}

		return this.connection.client!
	}

	/**
	 * Returns the write client
	 */
	public getWriteClient(): knex {
		if (this.mode === 'write' || this.mode === 'dual') {
			return this.connection.client!
		}

		throw new Exception(
			'Write client is not available for query client instantiated in read mode',
			500,
			'E_RUNTIME_EXCEPTION'
		)
	}

	/**
	 * Truncate table
	 */
	public async truncate(table: string, cascade: boolean = false): Promise<void> {
		await this.dialect.truncate(table, cascade)
	}

	/**
	 * Get information for a table columns
	 */
	public async columnsInfo(table: string, column?: string): Promise<any> {
		const result = await this.getWriteClient()
			.table(table)
			.columnInfo(column ? (column as any) : undefined)

		return result
	}

	/**
	 * Returns an array of table names
	 */
	public async getAllTables(schemas?: string[]): Promise<string[]> {
		return this.dialect.getAllTables(schemas)
	}

	/**
	 * Returns an instance of a transaction. Each transaction will
	 * query and hold a single connection for all queries.
	 */
	public async transaction(
		callback?: (trx: TransactionClientContract) => Promise<any>
	): Promise<any> {
		const trx = await this.getWriteClient().transaction()
		const transaction = new TransactionClient(
			trx,
			this.dialect,
			this.connectionName,
			this.debug,
			this.emitter
		)

		/**
		 * Always make sure to pass the profiler and emitter down to the transaction
		 * client as well
		 */
		transaction.profiler = this.profiler?.create('trx:begin', { state: 'begin' })

		/**
		 * Self managed transaction
		 */
		if (typeof callback === 'function') {
			try {
				const response = await callback(transaction)
				!transaction.isCompleted && (await transaction.commit())
				return response
			} catch (error) {
				await transaction.rollback()
				throw error
			}
		}

		return transaction
	}

	/**
	 * Returns the knex query builder instance. The query builder is always
	 * created from the `write` client, so before executing the query, you
	 * may want to decide which client to use.
	 */
	public knexQuery(): knex.QueryBuilder {
		return this.connection.client!.queryBuilder()
	}

	/**
	 * Returns the knex raw query builder instance. The query builder is always
	 * created from the `write` client, so before executing the query, you
	 * may want to decide which client to use.
	 */
	public knexRawQuery(sql: string, bindings?: any): knex.Raw {
		return bindings ? this.connection.client!.raw(sql, bindings) : this.connection.client!.raw(sql)
	}

	/**
	 * Returns a query builder instance for a given model.
	 */
	public modelQuery(model: any): ModelQueryBuilderContract<any, any> {
		return new ModelQueryBuilder(this.knexQuery(), model, this)
	}

	/**
	 * Returns instance of a query builder for selecting, updating
	 * or deleting rows
	 */
	public query(): DatabaseQueryBuilderContract<any> {
		return new DatabaseQueryBuilder(this.knexQuery(), this)
	}

	/**
	 * Returns instance of a query builder for inserting rows
	 */
	public insertQuery(): InsertQueryBuilderContract {
		return new InsertQueryBuilder(this.getWriteClient().queryBuilder(), this)
	}

	/**
	 * Returns instance of raw query builder
	 */
	public rawQuery(sql: any, bindings?: any): RawQueryBuilderContract {
		return new RawQueryBuilder(this.connection.client!.raw(sql, bindings), this)
	}

	/**
	 * Returns an instance of raw builder. This raw builder queries
	 * cannot be executed. Use `rawQuery`, if you want to execute
	 * queries raw queries.
	 */
	public raw(sql: string, bindings?: any) {
		return new RawBuilder(sql, bindings)
	}

	/**
	 * Returns reference builder.
	 */
	public ref(reference: string) {
		return new ReferenceBuilder(reference)
	}

	/**
	 * Returns instance of a query builder and selects the table
	 */
	public from(table: any): any {
		return this.query().from(table)
	}

	/**
	 * Returns instance of a query builder and selects the table
	 * for an insert query
	 */
	public table(table: any): any {
		return this.insertQuery().table(table)
	}

	/**
	 * Get advisory lock on the selected connection
	 */
	public getAdvisoryLock(key: string, timeout?: number): any {
		return this.dialect.getAdvisoryLock(key, timeout)
	}

	/**
	 * Release advisory lock
	 */
	public releaseAdvisoryLock(key: string): any {
		return this.dialect.releaseAdvisoryLock(key)
	}
}
