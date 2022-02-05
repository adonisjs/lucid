/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference path="../../adonis-typings/index.ts" />

import test from 'japa'
import 'reflect-metadata'
import { join } from 'path'
import { Kernel } from '@adonisjs/core/build/standalone'
import { ApplicationContract } from '@ioc:Adonis/Core/Application'

import { Migrator } from '../../src/Migrator'
import Migrate from '../../commands/Migration/Run'
import Rollback from '../../commands/Migration/Rollback'
import Reset from '../../commands/Migration/Reset'
import Refresh from '../../commands/Migration/Refresh'
import { fs, setup, cleanup, getDb, setupApplication } from '../../test-helpers'

let db: ReturnType<typeof getDb>
let app: ApplicationContract

test.group('Migrate', (group) => {
  group.beforeEach(async () => {
    app = await setupApplication()
    db = getDb(app)
    app.container.bind('Adonis/Lucid/Database', () => db)
    app.container.bind('Adonis/Lucid/Migrator', () => Migrator)
    await setup()
  })

  group.afterEach(async () => {
    await cleanup()
    await cleanup(['adonis_schema', 'schema_users', 'schema_accounts'])
    await fs.cleanup()
  })

  test('run migrations from default directory', async (assert) => {
    await fs.add(
      'database/migrations/users.ts',
      `
      import { Schema } from '../../../../src/Schema'
      module.exports = class User extends Schema {
        public async up () {
          this.schema.createTable('schema_users', (table) => {
            table.increments()
          })
        }
      }
    `
    )

    const migrate = new Migrate(app, new Kernel(app))
    await migrate.run()

    /**
     * Migrate command closes the db connection. So we need to re-instantiate
     * it
     */
    db = getDb(app)

    const migrated = await db.connection().from('adonis_schema').select('*')
    const hasUsersTable = await db.connection().schema.hasTable('schema_users')

    assert.lengthOf(migrated, 1)
    assert.isTrue(hasUsersTable)
    assert.equal(migrated[0].name.replaceAll('\\', '/'), 'database/migrations/users')
    assert.equal(migrated[0].batch, 1)
  })

  test('skip migrations when already up to date', async (assert) => {
    await fs.fsExtra.ensureDir(join(fs.basePath, 'database/migrations'))

    const migrate = new Migrate(app, new Kernel(app))
    await migrate.run()

    /**
     * Migrate command closes the db connection. So we need to re-instantiate
     * it
     */
    db = getDb(app)
    const migrated = await db.connection().from('adonis_schema').select('*')
    assert.lengthOf(migrated, 0)
  })

  test('print sql queries in dryRun', async (assert) => {
    await fs.add(
      'database/migrations/users.ts',
      `
      import { Schema } from '../../../../src/Schema'
      module.exports = class User extends Schema {
        public async up () {
          this.schema.createTable('schema_users', (table) => {
            table.increments()
          })
        }
      }
    `
    )

    const migrate = new Migrate(app, new Kernel(app))
    migrate.dryRun = true

    await migrate.run()

    /**
     * Migrate command closes the db connection. So we need to re-instantiate
     * it
     */
    db = getDb(app)
    const migrated = await db.connection().from('adonis_schema').select('*')
    assert.lengthOf(migrated, 0)
  })

  test('prompt during migrations in production without force flag', async (assert) => {
    assert.plan(1)
    app.nodeEnvironment = 'production'

    await fs.add(
      'database/migrations/users.ts',
      `
      import { Schema } from '../../../../src/Schema'
      module.exports = class User extends Schema {
        public async up () {
          this.schema.createTable('schema_users', (table) => {
            table.increments()
          })
        }
      }
    `
    )

    const migrate = new Migrate(app, new Kernel(app))

    migrate.prompt.on('prompt', (prompt) => {
      assert.equal(
        prompt.message,
        'You are in production environment. Want to continue running migrations?'
      )
      prompt.accept()
    })

    await migrate.run()
    delete process.env.NODE_ENV
  })

  test('do not prompt during migration when force flag is defined', async () => {
    app.nodeEnvironment = 'production'

    await fs.add(
      'database/migrations/users.ts',
      `
      import { Schema } from '../../../../src/Schema'
      module.exports = class User extends Schema {
        public async up () {
          this.schema.createTable('schema_users', (table) => {
            table.increments()
          })
        }
      }
    `
    )

    const migrate = new Migrate(app, new Kernel(app))
    migrate.force = true
    migrate.prompt.on('prompt', () => {
      throw new Error('Never expected to be here')
    })

    await migrate.run()
    delete process.env.NODE_ENV
  })

  test('prompt during rollback in production without force flag', async (assert) => {
    assert.plan(1)
    app.nodeEnvironment = 'production'

    await fs.add(
      'database/migrations/users.ts',
      `
      import { Schema } from '../../../../src/Schema'
      module.exports = class User extends Schema {
        public async down () {
        }
      }
    `
    )

    const rollback = new Rollback(app, new Kernel(app))
    rollback.prompt.on('prompt', (prompt) => {
      assert.equal(
        prompt.message,
        'You are in production environment. Want to continue running migrations?'
      )
      prompt.accept()
    })

    await rollback.run()
    delete process.env.NODE_ENV
  })

  test('do not prompt during rollback in production when force flag is defined', async () => {
    app.nodeEnvironment = 'production'

    await fs.add(
      'database/migrations/users.ts',
      `
      import { Schema } from '../../../../src/Schema'
      module.exports = class User extends Schema {
        public async down () {
        }
      }
    `
    )

    const rollback = new Rollback(app, new Kernel(app))
    rollback.force = true
    rollback.prompt.on('prompt', () => {
      throw new Error('Never expected to be here')
    })

    await rollback.run()
    delete process.env.NODE_ENV
  })

  test('migration:reset should rollback to batch 0', async (assert) => {
    await fs.add(
      'database/migrations/users.ts',
      `
        import { Schema } from '../../../../src/Schema'
        module.exports = class User extends Schema {
          public async up () {
            this.schema.createTable('schema_users', (table) => {
              table.increments()
            })
          }

          public async down() {
            this.schema.dropTable('schema_users')
          }
        }
      `
    )

    await fs.add(
      'database/migrations/posts.ts',
      `
        import { Schema } from '../../../../src/Schema'
        module.exports = class Account extends Schema {
          public async up () {
            this.schema.createTable('schema_accounts', (table) => {
              table.increments()
            })
          }

          public async down() {
            this.schema.dropTable('schema_accounts')
          }
        }
      `
    )

    const migrate = new Migrate(app, new Kernel(app))
    await migrate.run()

    db = getDb(app)

    const reset = new Reset(app, new Kernel(app))
    await reset.run()

    db = getDb(app)

    let migrated = await db.connection().from('adonis_schema').select('*')
    let hasUsersTable = await db.connection().schema.hasTable('schema_users')
    let hasAccountsTable = await db.connection().schema.hasTable('schema_accounts')

    assert.lengthOf(migrated, 0)
    assert.isFalse(hasUsersTable)
    assert.isFalse(hasAccountsTable)
  })

  test('migration:refresh should rollback to batch 0 then run all migrations', async (assert) => {
    await fs.add(
      'database/migrations/users.ts',
      `
        import { Schema } from '../../../../src/Schema'
        module.exports = class User extends Schema {
          public async up () {
            this.schema.createTable('schema_users', (table) => {
              table.increments()
            })
          }

          public async down() {
            this.schema.dropTable('schema_users')
          }
        }
      `
    )

    await fs.add(
      'database/migrations/posts.ts',
      `
        import { Schema } from '../../../../src/Schema'
        module.exports = class Account extends Schema {
          public async up () {
            this.schema.createTable('schema_accounts', (table) => {
              table.increments()
            })
          }

          public async down() {
            this.schema.dropTable('schema_accounts')
          }
        }
      `
    )

    const migrate = new Migrate(app, new Kernel(app))
    await migrate.run()

    db = getDb(app)

    const refresh = new Refresh(app, new Kernel(app))
    await refresh.run()

    db = getDb(app)

    let migrated = await db.connection().from('adonis_schema').select('*')
    let hasUsersTable = await db.connection().schema.hasTable('schema_users')
    let hasAccountsTable = await db.connection().schema.hasTable('schema_accounts')

    assert.lengthOf(migrated, 2)
    assert.isTrue(hasUsersTable)
    assert.isTrue(hasAccountsTable)
  })

  test('migration:refresh --seed should rollback to batch 0, run all migrations then run seeders', async (assert) => {
    await fs.add(
      'database/seeders/user.ts',
      `export default class UserSeeder {
				public async run () {
					process.env.EXEC_USER_SEEDER = 'true'
				}
			}`
    )

    await fs.add(
      'database/migrations/users.ts',
      `
        import { Schema } from '../../../../src/Schema'
        module.exports = class User extends Schema {
          public async up () {
            this.schema.createTable('schema_users', (table) => {
              table.increments()
            })
          }

          public async down() {
            this.schema.dropTable('schema_users')
          }
        }
      `
    )

    await fs.add(
      'database/migrations/posts.ts',
      `
        import { Schema } from '../../../../src/Schema'
        module.exports = class Account extends Schema {
          public async up () {
            this.schema.createTable('schema_accounts', (table) => {
              table.increments()
            })
          }

          public async down() {
            this.schema.dropTable('schema_accounts')
          }
        }
      `
    )

    const migrate = new Migrate(app, new Kernel(app))
    await migrate.run()

    db = getDb(app)

    const reset = new Refresh(app, new Kernel(app))
    reset.seed = true
    await reset.run()

    db = getDb(app)

    assert.equal(process.env.EXEC_USER_SEEDER, 'true')
    delete process.env.EXEC_USER_SEEDER
  })
})
