/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { AssertionError } from 'node:assert'
import { type ApplicationService } from '@adonisjs/core/types'
import { type LucidRow, type LucidModel } from '../types/model.js'
import { type Database } from '../database/main.js'

/**
 * Provides database assertion methods for use inside test bodies.
 * Exposed on Japa's TestContext as `db`.
 */
export class DatabaseTestAssertions {
  constructor(
    protected app: ApplicationService,
    protected connectionName?: string
  ) {}

  /**
   * Returns the Database instance from the container
   */
  async #getDb(): Promise<Database> {
    return this.app.container.make('lucid.db')
  }

  /**
   * Returns a query client for the configured connection
   */
  async #getConnection() {
    const db = await this.#getDb()
    return db.connection(this.connectionName)
  }

  /**
   * Assert that the given table has rows matching the provided data.
   * When `count` is provided, asserts that exactly that many matching rows exist.
   */
  async assertHas(table: string, data: Record<string, any>, count?: number) {
    const connection = await this.#getConnection()
    const result: any = await connection.query().from(table).where(data).count('* as count')
    const actualCount = Number(result[0].count)

    if (count !== undefined && actualCount !== count) {
      throw new AssertionError({
        message: `Expected table '${table}' to have ${count} rows matching ${JSON.stringify(data)}, but found ${actualCount}`,
        actual: actualCount,
        expected: count,
        operator: 'assertHas',
      })
    }

    if (count === undefined && actualCount === 0) {
      throw new AssertionError({
        message: `Expected table '${table}' to have rows matching ${JSON.stringify(data)}, but none were found`,
        actual: 0,
        expected: '>= 1',
        operator: 'assertHas',
      })
    }
  }

  /**
   * Assert that the given table has no rows matching the provided data.
   */
  async assertMissing(table: string, data: Record<string, any>) {
    const connection = await this.#getConnection()
    const result: any = await connection.query().from(table).where(data).count('* as count')
    const actualCount = Number(result[0].count)

    if (actualCount > 0) {
      throw new AssertionError({
        message: `Expected table '${table}' to have no rows matching ${JSON.stringify(data)}, but found ${actualCount}`,
        actual: actualCount,
        expected: 0,
        operator: 'assertMissing',
      })
    }
  }

  /**
   * Assert that the given table has exactly the expected number of rows.
   */
  async assertCount(table: string, expectedCount: number) {
    const connection = await this.#getConnection()
    const result: any = await connection.query().from(table).count('* as count')
    const actualCount = Number(result[0].count)

    if (actualCount !== expectedCount) {
      throw new AssertionError({
        message: `Expected table '${table}' to have ${expectedCount} rows, but found ${actualCount}`,
        actual: actualCount,
        expected: expectedCount,
        operator: 'assertCount',
      })
    }
  }

  /**
   * Assert that the given table is empty (has no rows).
   */
  async assertEmpty(table: string) {
    return this.assertCount(table, 0)
  }

  /**
   * Assert that a model instance exists in the database.
   */
  async assertModelExists(model: LucidRow) {
    const Model = model.constructor as LucidModel
    const primaryKeyValue = model.$primaryKeyValue

    if (primaryKeyValue === undefined) {
      throw new Error(`Cannot assert model existence: primary key value is undefined`)
    }

    const connection = await this.#getConnection()
    const result: any = await connection
      .query()
      .from(Model.table)
      .where(Model.primaryKey, primaryKeyValue)
      .count('* as count')
    const actualCount = Number(result[0].count)

    if (actualCount === 0) {
      throw new AssertionError({
        message: `Expected '${Model.name}' model with primary key ${primaryKeyValue} to exist, but it was not found`,
        actual: 'missing',
        expected: 'exists',
        operator: 'assertModelExists',
      })
    }
  }

  /**
   * Assert that a model instance does not exist in the database.
   */
  async assertModelMissing(model: LucidRow) {
    const Model = model.constructor as LucidModel
    const primaryKeyValue = model.$primaryKeyValue

    if (primaryKeyValue === undefined) {
      throw new Error(`Cannot assert model absence: primary key value is undefined`)
    }

    const connection = await this.#getConnection()
    const result: any = await connection
      .query()
      .from(Model.table)
      .where(Model.primaryKey, primaryKeyValue)
      .count('* as count')
    const actualCount = Number(result[0].count)

    if (actualCount > 0) {
      throw new AssertionError({
        message: `Expected '${Model.name}' model with primary key ${primaryKeyValue} to not exist, but it was found`,
        actual: 'exists',
        expected: 'missing',
        operator: 'assertModelMissing',
      })
    }
  }
}
