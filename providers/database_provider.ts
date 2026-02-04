/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { BaseTransformer } from '@adonisjs/core/transformers'
import type { ApplicationService } from '@adonisjs/core/types'

import { Database } from '../src/database/main.ts'
import { type LucidRow } from '../src/types/model.ts'
import { Adapter } from '../src/orm/adapter/index.ts'
import { BaseModel } from '../src/orm/base_model/index.ts'
import { QueryClient } from '../src/query_client/index.ts'
import { DatabaseTestUtils } from '../src/test_utils/database.js'
import { type ExtractModelRelations } from '../src/types/relations.ts'
import { defineTransformerBindings } from '../src/bindings/transformer.ts'
import { type VineDbSearchCallback, type VineDbSearchOptions } from '../src/types/vine.ts'
import type { ConnectionContract, DatabaseConfig, DbQueryEventNode } from '../src/types/database.ts'

/**
 * Extending AdonisJS types
 */
declare module '@adonisjs/core/types' {
  /**
   * Registers Lucid's IoC container bindings so that `app.container.make()`
   * and the `@inject()` decorator can resolve them by name.
   */
  export interface ContainerBindings {
    /**
     * The singleton {@link Database} instance that manages all configured
     * database connections for the current application.
     *
     * @example
     * const db = await app.container.make('lucid.db')
     * const users = await db.query().from('users')
     */
    'lucid.db': Database
  }

  /**
   * Registers the database-related events that Lucid emits through the
   * application's event emitter so that listeners are fully typed.
   */
  export interface EventsList {
    /**
     * Emitted after every database query is executed. The payload contains
     * the raw SQL, duration, connection name, and optional model context.
     *
     * @example
     * emitter.on('db:query', (event) => {
     *   console.log(event.sql, event.duration)
     * })
     */
    'db:query': DbQueryEventNode

    /**
     * Emitted when a database connection is successfully established.
     * The payload is the {@link ConnectionContract} instance that connected.
     *
     * @example
     * emitter.on('db:connection:connect', (connection) => {
     *   console.log(`Connected: ${connection.name}`)
     * })
     */
    'db:connection:connect': ConnectionContract

    /**
     * Emitted when a database connection is gracefully closed.
     * The payload is the {@link ConnectionContract} instance that disconnected.
     *
     * @example
     * emitter.on('db:connection:disconnect', (connection) => {
     *   console.log(`Disconnected: ${connection.name}`)
     * })
     */
    'db:connection:disconnect': ConnectionContract

    /**
     * Emitted when a database connection encounters an error. The first
     * element of the tuple is the `Error` that was thrown; the second is
     * the {@link ConnectionContract} on which it occurred.
     *
     * @example
     * emitter.on('db:connection:error', ([error, connection]) => {
     *   console.error(`Error on ${connection.name}:`, error.message)
     * })
     */
    'db:connection:error': [Error, ConnectionContract]
  }
}

declare module '@adonisjs/core/transformers' {
  /**
   * Augments {@link BaseTransformer} with helper methods for reading
   * relationship counts and custom aggregates that were eagerly loaded
   * via the Lucid query builder's `.withCount()` / `.withAggregate()`
   * methods.
   *
   * When `T` is a Lucid model the `relationship` parameter is
   * narrowed to only the declared relation names on that model;
   * otherwise it falls back to a plain `string`.
   */
  export interface BaseTransformer<T> {
    /**
     * Retrieve the count for a previously loaded relationship.
     * Throws if the count was not loaded on the model — use
     * {@link whenCounted} for a non-throwing alternative.
     *
     * @param {string} relationship - The relationship name that was
     *   passed to `query().withCount(relationship)`.
     *
     * @return {number} The relationship count as a number.
     *
     * @example
     * class UserTransformer extends BaseTransformer<User> {
     *   toObject() {
     *     return {
     *       postsCount: this.withCount('posts'),
     *     }
     *   }
     * }
     */
    withCount(relationship: T extends LucidRow ? ExtractModelRelations<T> : string): number

    /**
     * Safely retrieve the count for a previously loaded relationship.
     * Returns `undefined` when the count was not loaded instead of
     * throwing — use {@link withCount} for the strict variant.
     *
     * @param {string} relationship - The relationship name that was
     *   passed to `query().withCount(relationship)`.
     *
     * @return {number | undefined} The relationship count, or
     *   `undefined` if the count was not loaded.
     *
     * @example
     * class UserTransformer extends BaseTransformer<User> {
     *   toObject() {
     *     return {
     *       postsCount: this.whenCounted('posts'),
     *     }
     *   }
     * }
     */
    whenCounted(
      relationship: T extends LucidRow ? ExtractModelRelations<T> : string
    ): number | undefined

    /**
     * Retrieve a custom aggregate value by the alias it was stored
     * under in `$extras`. Throws if the aggregate was not loaded —
     * use {@link whenAggregated} for a non-throwing alternative.
     *
     * @param {string} alias - The alias provided via `.as(alias)` in
     *   the aggregate callback (e.g. `'totalPosts'`).
     *
     * @return {number} The aggregate value as a number.
     *
     * @example
     * class UserTransformer extends BaseTransformer<User> {
     *   toObject() {
     *     return {
     *       totalPosts: this.withAggregate('totalPosts'),
     *     }
     *   }
     * }
     */
    withAggregate(alias: string): number

    /**
     * Safely retrieve a custom aggregate value by the alias it was
     * stored under in `$extras`. Returns `undefined` when the
     * aggregate was not loaded instead of throwing — use
     * {@link withAggregate} for the strict variant.
     *
     * @param {string} alias - The alias provided via `.as(alias)` in
     *   the aggregate callback (e.g. `'totalPosts'`).
     *
     * @return {number | undefined} The aggregate value, or
     *   `undefined` if the aggregate was not loaded.
     *
     * @example
     * class UserTransformer extends BaseTransformer<User> {
     *   toObject() {
     *     return {
     *       totalPosts: this.whenAggregated('totalPosts'),
     *     }
     *   }
     * }
     */
    whenAggregated(alias: string): number | undefined
  }
}

declare module '@adonisjs/core/test_utils' {
  /**
   * Augments the core {@link TestUtils} class with a `db` macro that
   * exposes database-specific test helpers (migrate, rollback, refresh,
   * seed, truncate, etc.).
   */
  export interface TestUtils {
    /**
     * Returns a {@link DatabaseTestUtils} instance scoped to the given
     * connection. When no connection name is provided the default
     * connection from your `database.ts` config file is used.
     *
     * @param {string} [connectionName] - An optional connection name
     *   defined in your `database.ts` configuration.
     *
     * @return {DatabaseTestUtils} A helper bound to the chosen connection.
     *
     * @example
     * const { db } = await TestUtils.create(app)
     *
     * // Use the default connection
     * await db.migrate()
     *
     * // Use a specific connection
     * await db('sqlite').migrate()
     */
    db(connectionName?: string): DatabaseTestUtils
  }
}

/**
 * Extending VineJS schema types
 */
declare module '@vinejs/vine' {
  /**
   * Shared database-backed validation rules mixed into both
   * {@link VineNumber} and {@link VineString} schema types.
   *
   * `ValueType` is the raw JavaScript type of the field being
   * validated (`number` or `string`).
   */
  interface VineLucidBindings<ValueType> {
    /**
     * Ensure the value is unique inside the database by table and column name.
     * Optionally, you can define a filter to narrow down the query.
     *
     * @param {VineDbSearchOptions<ValueType>} options - Table, column, and
     *   optional filter configuration.
     *
     * @return {this} The current schema instance for chaining.
     *
     * @example
     * vine.string().unique({ table: 'users', column: 'email' })
     */
    unique(options: VineDbSearchOptions<ValueType>): this

    /**
     * Ensure the value is unique inside the database by self
     * executing a query.
     *
     * - The callback must return `true` if the value is unique (does not exist).
     * - The callback must return `false` if the value is not unique (already exists).
     *
     * @param {VineDbSearchCallback<ValueType>} callback - An async callback
     *   that receives `(db, value, field)` and must resolve to a boolean.
     *
     * @return {this} The current schema instance for chaining.
     *
     * @example
     * vine.string().unique(async (db, value) => {
     *   const row = await db.query().from('users').where('email', value).first()
     *   return !row
     * })
     */
    unique(callback: VineDbSearchCallback<ValueType>): this

    /**
     * Ensure the value exists inside the database by table and column name.
     * Optionally, you can define a filter to narrow down the query.
     *
     * @param {VineDbSearchOptions<ValueType>} options - Table, column, and
     *   optional filter configuration.
     *
     * @return {this} The current schema instance for chaining.
     *
     * @example
     * vine.number().exists({ table: 'roles', column: 'id' })
     */
    exists(options: VineDbSearchOptions<ValueType>): this

    /**
     * Ensure the value exists inside the database by self
     * executing a query.
     *
     * - The callback must return `true` if the value exists.
     * - The callback must return `false` if the value does not exist.
     *
     * @param {VineDbSearchCallback<ValueType>} callback - An async callback
     *   that receives `(db, value, field)` and must resolve to a boolean.
     *
     * @return {this} The current schema instance for chaining.
     *
     * @example
     * vine.number().exists(async (db, value) => {
     *   const row = await db.query().from('roles').where('id', value).first()
     *   return !!row
     * })
     */
    exists(callback: VineDbSearchCallback<ValueType>): this
  }

  /**
   * Extends the VineJS `number` schema type with the database-backed
   * `unique` and `exists` validation rules from {@link VineLucidBindings}.
   */
  interface VineNumber extends VineLucidBindings<number> {}

  /**
   * Extends the VineJS `string` schema type with the database-backed
   * `unique` and `exists` validation rules from {@link VineLucidBindings}.
   */
  interface VineString extends VineLucidBindings<string> {}
}

/**
 * AdonisJS service provider that wires up the entire Lucid ORM layer.
 *
 * Responsibilities:
 * - Registers the {@link Database} singleton and the default
 *   {@link QueryClient} in the IoC container.
 * - Attaches the ORM {@link Adapter} to {@link BaseModel}.
 * - Registers the `db` macro on {@link TestUtils} for test helpers.
 * - Binds REPL helpers when running in the `repl` environment.
 * - Registers the `unique` / `exists` VineJS validation rules when
 *   VineJS is present.
 * - Optionally enables pretty-printed debug query logging.
 *
 * @example
 * // providers/database_provider.ts is auto-discovered by AdonisJS.
 * // No manual instantiation is required.
 */
export default class DatabaseServiceProvider {
  /**
   * @param {ApplicationService} app - The AdonisJS application instance
   *   used to access the IoC container, configuration, and environment
   *   information.
   */
  constructor(protected app: ApplicationService) {}

  /**
   * Registers REPL bindings so that interactive database helpers
   * (e.g. `db`, `User`) are available when the application is
   * started with `node ace repl`.
   *
   * This is a no-op in any environment other than `repl`.
   */
  protected async registerReplBindings() {
    if (this.app.getEnvironment() === 'repl') {
      const { defineReplBindings } = await import('../src/bindings/repl.js')
      defineReplBindings(this.app, await this.app.container.make('repl'))
    }
  }

  /**
   * Registers the database-backed `unique` and `exists` validation
   * rules on VineJS when the application is using VineJS as its
   * validation engine.
   *
   * This is a no-op when VineJS is not installed or configured.
   *
   * @param {Database} db - The resolved {@link Database} singleton
   *   that will be passed into the validation rule implementations.
   */
  protected async registerVineJSRules(db: Database) {
    if (this.app.usingVineJS) {
      const { defineValidationRules } = await import('../src/bindings/vinejs.js')
      defineValidationRules(db)
    }
    defineTransformerBindings(BaseTransformer)
  }

  /**
   * Registers a `db` macro on the core {@link TestUtils} class.
   * The macro is lazily set up via `container.resolving('testUtils')`
   * so it is only wired when tests actually request the `testUtils`
   * binding.
   *
   * @example
   * // Inside a test file
   * const { db } = await TestUtils.create(app)
   * await db.migrate()
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
   * Attaches a listener to the `db:query` event that pretty-prints
   * every executed query to the console. Only active when the
   * `prettyPrintDebugQueries` flag is enabled in the `database.ts`
   * configuration file.
   *
   * @param {Database} db - The resolved {@link Database} singleton
   *   whose config is checked and whose `prettyPrint` handler is used.
   */
  protected async prettyPrintDebugQueries(db: Database) {
    if (db.config.prettyPrintDebugQueries) {
      const emitter = await this.app.container.make('emitter')
      emitter.on('db:query', db.prettyPrint)
    }
  }

  /**
   * Lifecycle hook invoked by AdonisJS during the **register** phase.
   *
   * Registers the following singletons in the IoC container:
   * - `Database` (also aliased as `lucid.db`) — the central connection
   *   manager, built from the `database` config key.
   * - `QueryClient` — a query client bound to the **default**
   *   connection, convenient for simple queries without explicitly
   *   choosing a connection.
   */
  register() {
    this.app.container.singleton(Database, async (resolver) => {
      const config = this.app.config.get<DatabaseConfig>('database')
      const emitter = await resolver.make('emitter')
      const logger = await resolver.make('logger')
      const db = new Database(config, logger, emitter)
      return db
    })

    this.app.container.singleton(QueryClient, async (resolver) => {
      const db = await resolver.make('lucid.db')
      return db.connection() as QueryClient
    })

    this.app.container.alias('lucid.db', Database)
  }

  /**
   * Lifecycle hook invoked by AdonisJS during the **boot** phase,
   * after all providers have registered their bindings.
   *
   * - Sets the ORM {@link Adapter} on {@link BaseModel} so that all
   *   model classes share a single, application-scoped adapter.
   * - Calls the remaining setup helpers: debug query logging, test
   *   utilities, REPL bindings, and VineJS rules.
   */
  async boot() {
    const db = await this.app.container.make('lucid.db')
    BaseModel.$adapter = new Adapter(db)

    await this.prettyPrintDebugQueries(db)
    await this.registerTestUtils()
    await this.registerReplBindings()
    await this.registerVineJSRules(db)
  }

  /**
   * Lifecycle hook invoked by AdonisJS during application shutdown.
   *
   * Gracefully closes **all** open database connections managed by the
   * {@link Database} connection manager so that no sockets or pools
   * are left dangling.
   */
  async shutdown() {
    const db = await this.app.container.make('lucid.db')
    await db.manager.closeAll()
  }
}
