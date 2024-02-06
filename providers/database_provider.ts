/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { FieldContext } from '@vinejs/vine/types'
import type { ApplicationService } from '@adonisjs/core/types'

import { Database } from '../src/database/main.js'
import { Adapter } from '../src/orm/adapter/index.js'
import { QueryClient } from '../src/query_client/index.js'
import { BaseModel } from '../src/orm/base_model/index.js'
import { DatabaseTestUtils } from '../src/test_utils/database.js'
import type { DatabaseConfig, DbQueryEventNode } from '../src/types/database.js'

/**
 * Extending AdonisJS types
 */
declare module '@adonisjs/core/types' {
  export interface ContainerBindings {
    'lucid.db': Database
  }
  export interface EventsList {
    'db:query': DbQueryEventNode
  }
}

declare module '@adonisjs/core/test_utils' {
  export interface TestUtils {
    db(connectionName?: string): DatabaseTestUtils
  }
}

/**
 * Extending VineJS schema types
 */
declare module '@vinejs/vine' {
  interface VineLucidBindings {
    /**
     * Ensure the value is unique inside the database by self
     * executing a query.
     *
     * - The callback must return "true", if the value is unique (does not exist).
     * - The callback must return "false", if the value is not unique (already exists).
     */
    unique(callback: (db: Database, value: string, field: FieldContext) => Promise<boolean>): this

    /**
     * Ensure the value is exists inside the database by self
     * executing a query.
     *
     * - The callback must return "true", if the value exists.
     * - The callback must return "false", if the value does not exist.
     */
    exists(callback: (db: Database, value: string, field: FieldContext) => Promise<boolean>): this
  }

  interface VineNumber extends VineLucidBindings {}

  interface VineString extends VineLucidBindings {}
}

/**
 * Database service provider
 */
export default class DatabaseServiceProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Registers repl bindings when running the application
   * in the REPL environment
   */
  protected async registerReplBindings() {
    if (this.app.getEnvironment() === 'repl') {
      const { defineReplBindings } = await import('../src/bindings/repl.js')
      defineReplBindings(this.app, await this.app.container.make('repl'))
    }
  }

  /**
   * Registers validation rules for VineJS
   */
  protected async registerVineJSRules(db: Database) {
    if (this.app.usingVineJS) {
      const { defineValidationRules } = await import('../src/bindings/vinejs.js')
      defineValidationRules(db)
    }
  }

  /**
   * Register TestUtils database macro
   */
  protected async registerTestUtils() {
    this.app.container.resolving('testUtils', async () => {
      const { TestUtils } = await import('@adonisjs/core/test_utils')

      TestUtils.macro('db', (connectionName?: string) => {
        return new DatabaseTestUtils(this.app, connectionName)
      })
    })
  }

  /**
   * Invoked by AdonisJS to register container bindings
   */
  register() {
    this.app.container.singleton(Database, async (resolver) => {
      const config = this.app.config.get<DatabaseConfig>('database')
      const emitter = await resolver.make('emitter')
      const logger = await resolver.make('logger')
      return new Database(config, logger, emitter)
    })

    this.app.container.singleton(QueryClient, async (resolver) => {
      const db = await resolver.make('lucid.db')
      return db.connection() as QueryClient
    })

    this.app.container.alias('lucid.db', Database)
  }

  /**
   * Invoked by AdonisJS to extend the framework or pre-configure
   * objects
   */
  async boot() {
    const db = await this.app.container.make('lucid.db')
    BaseModel.$adapter = new Adapter(db)

    await this.registerTestUtils()
    await this.registerReplBindings()
    await this.registerVineJSRules(db)
  }

  /**
   * Gracefully close connections during shutdown
   */
  async shutdown() {
    const db = await this.app.container.make('lucid.db')
    await db.manager.closeAll()
  }
}
