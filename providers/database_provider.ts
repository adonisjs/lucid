/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { ApplicationService } from '@adonisjs/core/types'

import { Database } from '../src/database/main.js'
import { QueryClient } from '../src/query_client/index.js'
import { BaseModel } from '../src/orm/base_model/index.js'
import { Adapter } from '../src/orm/adapter/index.js'
import type { DatabaseConfig } from '../src/types/database.js'

declare module '@adonisjs/core/types' {
  export interface ContainerBindings {
    'lucid.db': Database
  }
}

/**
 * Database service provider
 */
export default class DatabaseServiceProvider {
  constructor(protected app: ApplicationService) {}

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

  async boot() {
    const db = await this.app.container.make('lucid.db')
    BaseModel.$adapter = new Adapter(db)
  }
}
