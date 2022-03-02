/// <reference path="../../adonis-typings/index.ts" />

import test from 'japa'
import 'reflect-metadata'
import { Kernel } from '@adonisjs/core/build/standalone'
import { ApplicationContract } from '@ioc:Adonis/Core/Application'
import Migrate from '../../commands/Migration/Run'
import { fs, setup, cleanup, getDb, setupApplication } from '../../test-helpers'
import { Migrator } from '../../src/Migrator'
import DbWipe from '../../commands/DbWipe'
import Fresh from '../../commands/Migration/Fresh'

let app: ApplicationContract
let db: ReturnType<typeof getDb>

test.group('db:wipe and migrate:fresh', (group) => {
  group.beforeEach(async () => {
    app = await setupApplication()
    db = getDb(app)
    app.container.bind('Adonis/Lucid/Database', () => db)
    app.container.bind('Adonis/Lucid/Migrator', () => Migrator)
    await setup()
  })

  group.afterEach(async () => {
    await cleanup()
    await cleanup(['adonis_schema', 'adonis_schema_versions', 'schema_users'])
    await fs.cleanup()
  })

  test('db:wipe should drop all tables', async (assert) => {
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

    const kernel = new Kernel(app)
    const migrate = new Migrate(app, kernel)
    await migrate.run()

    db = getDb(app)

    const wipe = new DbWipe(app, kernel)
    await wipe.run()

    db = getDb(app)
    const tables = await db.connection().getAllTables(['public'])
    assert.lengthOf(tables, 0)
  })

  test('migration:fresh should drop all tables and run migrations', async (assert) => {
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

    const kernel = new Kernel(app)
    const migrate = new Migrate(app, kernel)
    await migrate.run()

    db = getDb(app)

    const fresh = new Fresh(app, kernel)
    await fresh.run()

    db = getDb(app)

    const migrated = await db.connection().from('adonis_schema').select('*')
    const hasUsersTable = await db.connection().schema.hasTable('schema_users')

    assert.lengthOf(migrated, 1)
    assert.isTrue(hasUsersTable)
    assert.equal(migrated[0].name, 'database/migrations/users')
    assert.equal(migrated[0].batch, 1)
  })

  test('migration:fresh --seed should run seeders', async (assert) => {
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
      }
    `
    )

    const kernel = new Kernel(app)
    const migrate = new Migrate(app, kernel)
    await migrate.run()

    db = getDb(app)

    const fresh = new Fresh(app, kernel)
    fresh.seed = true
    await fresh.run()

    db = getDb(app)

    assert.equal(process.env.EXEC_USER_SEEDER, 'true')
    delete process.env.EXEC_USER_SEEDER
  })
})
