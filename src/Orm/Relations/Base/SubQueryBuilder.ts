/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import knex from 'knex'
import { LucidModel } from '@ioc:Adonis/Lucid/Model'
import { QueryClientContract } from '@ioc:Adonis/Lucid/Database'
import { DBQueryCallback } from '@ioc:Adonis/Lucid/DatabaseQueryBuilder'
import { RelationshipsContract, RelationSubQueryBuilderContract } from '@ioc:Adonis/Lucid/Relations'

import { ModelQueryBuilder } from '../../QueryBuilder'

/**
 * Base query builder for ORM Relationships
 */
export abstract class BaseSubQueryBuilder extends ModelQueryBuilder
	implements RelationSubQueryBuilderContract<LucidModel> {
	/**
	 * The counter for the self join alias. Usually will be set by
	 * the consumer
	 */
	public selfJoinCounter: number = 0

	/**
	 * Alias for the self join table
	 */
	public get selfJoinAlias(): string {
		return `adonis_temp_${this.selfJoinCounter}`
	}

	/**
	 * Is query a relationship query obtained using `related('relation').query()`
	 */
	public get isRelatedQuery(): false {
		return false
	}

	/**
	 * Is query a relationship query obtained using `related('relation').subQuery()`
	 */
	public get isRelatedSubQuery(): true {
		return true
	}

	/**
	 * Is query a relationship query obtained using one of the preload methods.
	 */
	public get isRelatedPreloadQuery(): false {
		return false
	}

	constructor(
		builder: knex.QueryBuilder,
		client: QueryClientContract,
		relation: RelationshipsContract,
		dbCallback: DBQueryCallback
	) {
		super(builder, relation.relatedModel(), client, dbCallback)
	}

	/**
	 * Returns the selected columns
	 */
	protected getSelectedColumns(): undefined | { grouping: 'columns'; value: any[] } {
		return this.knexQuery['_statements'].find(({ grouping }) => grouping === 'columns')
	}

	/**
	 * Returns the sql query keys for the join query
	 */
	protected abstract getRelationKeys(): string[]

	/**
	 * The relationship query builder must implement this method
	 * to apply relationship related constraints
	 */
	protected abstract applyConstraints(): void

	/**
	 * Selects the relation keys. Invoked by the preloader
	 */
	public selectRelationKeys(): this {
		const columns = this.getSelectedColumns()

		/**
		 * No columns have been defined, we will let knex do it's job by
		 * adding `select *`
		 */
		if (!columns) {
			return this
		}

		/**
		 * Finally push relation columns to existing selected columns
		 */
		this.getRelationKeys().forEach((key) => {
			key = this.resolveKey(key)
			if (!columns.value.includes(key)) {
				columns.value.push(key)
			}
		})

		return this
	}

	/**
	 * Get query sql
	 */
	public toSQL() {
		this.prepare()
		return super.toSQL()
	}

	/**
	 * prepare
	 */
	public prepare() {
		this.applyConstraints()
		return this
	}

	/**
	 * Executing subqueries is not allowed. It is disabled in static types, but
	 * in case someone by-pass typescript checks to invoke it
	 */
	public exec(): any {
		throw new Error('Cannot execute relationship subqueries')
	}

	public paginate(): any {
		throw new Error('Cannot execute relationship subqueries')
	}

	public update(): any {
		throw new Error('Cannot execute relationship subqueries')
	}

	public del(): any {
		throw new Error('Cannot execute relationship subqueries')
	}

	public first(): any {
		throw new Error('Cannot execute relationship subqueries')
	}

	public firstOrFail(): any {
		throw new Error('Cannot execute relationship subqueries')
	}
}
