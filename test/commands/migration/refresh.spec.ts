/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference path="../../../adonis-typings/index.ts" />

import 'reflect-metadata'
import { test } from '@japa/runner'
import { Kernel } from '@adonisjs/core/build/standalone'
import { ApplicationContract } from '@ioc:Adonis/Core/Application'

import DbSeed from '../../../commands/DbSeed'
import { Migrator } from '../../../src/Migrator'
import Reset from '../../../commands/Migration/Reset'
import Migrate from '../../../commands/Migration/Run'
import Refresh from '../../../commands/Migration/Refresh'
import Rollback from '../../../commands/Migration/Rollback'
import { fs, setup, cleanup, getDb, setupApplication } from '../../../test-helpers'

let db: ReturnType<typeof getDb>
let app: ApplicationContract

test.group('migration:refresh', (group) => {
  group.each.setup(async () => {
    app = await setupApplication()
    await setup()
    return () => fs.cleanup()
  })

  group.each.setup(async () => {
    db = getDb(app)
    app.container.bind('Adonis/Lucid/Database', () => db)
    app.container.bind('Adonis/Lucid/Migrator', () => Migrator)
    return async () => {
      await cleanup()
      await cleanup(['adonis_schema', 'adonis_schema_versions', 'schema_users', 'schema_accounts'])
      await db.manager.closeAll(true)
    }
  })

  test('rollback to batch 0 and migrate database', async ({ assert }) => {
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

    const kernel = new Kernel(app).mockConsoleOutput()
    kernel.register([Migrate, Rollback, Reset, Refresh])

    await kernel.exec('migration:run', [])
    await kernel.exec('migration:refresh', [])

    const migrated = await db.connection().from('adonis_schema').select('*')
    const hasUsersTable = await db.connection().schema.hasTable('schema_users')
    const hasAccountsTable = await db.connection().schema.hasTable('schema_accounts')

    assert.lengthOf(migrated, 2)
    assert.isTrue(hasUsersTable)
    assert.isTrue(hasAccountsTable)
  })

  test('run seeders when --seed flag is passed', async ({ assert }) => {
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

    const kernel = new Kernel(app).mockConsoleOutput()
    kernel.register([Migrate, Rollback, Reset, Refresh, DbSeed])

    await kernel.exec('migration:run', [])
    await kernel.exec('migration:refresh', ['--seed'])

    assert.equal(process.env.EXEC_USER_SEEDER, 'true')
    delete process.env.EXEC_USER_SEEDER
  })
})
