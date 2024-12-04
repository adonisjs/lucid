/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { BaseCheck, Result } from '@adonisjs/core/health'
import type { HealthCheckResult } from '@adonisjs/core/types/health'
import type { QueryClientContract } from '../../types/database.js'

/**
 * The DbCheck attempts to establish the database connection by
 * executing a sample query.
 */
export class DbCheck extends BaseCheck {
  #client: QueryClientContract

  /**
   * Health check public name
   */
  name: string

  constructor(client: QueryClientContract) {
    super()
    this.#client = client
    this.name = `Database health check (${client.connectionName})`
  }

  /**
   * Returns connection metadata to be shared in the health checks
   * report
   */
  #getConnectionMetadata() {
    return {
      connection: {
        name: this.#client.connectionName,
        dialect: this.#client.dialect.name,
      },
    }
  }

  /**
   * Internal method to ping the database server
   */
  async #ping() {
    if (this.#client.dialect.name === 'oracledb') {
      await this.#client.rawQuery('SELECT 1 + 1 AS result FROM dual')
    } else {
      await this.#client!.rawQuery('SELECT 1 + 1 AS result')
    }
  }

  /**
   * Executes the health check
   */
  async run(): Promise<HealthCheckResult> {
    try {
      await this.#ping()
      return Result.ok('Successfully connected to the database server').mergeMetaData(
        this.#getConnectionMetadata()
      )
    } catch (error) {
      return Result.failed(error.message || 'Connection failed', error).mergeMetaData(
        this.#getConnectionMetadata()
      )
    }
  }
}
