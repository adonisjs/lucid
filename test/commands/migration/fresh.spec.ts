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
import Migrate from '../../../commands/Migration/Run'
import { Kernel } from '@adonisjs/core/build/standalone'
import { ApplicationContract } from '@ioc:Adonis/Core/Application'

import DbSeed from '../../../commands/DbSeed'
import DbWipe from '../../../commands/DbWipe'
import { Migrator } from '../../../src/Migrator'
import Fresh from '../../../commands/Migration/Fresh'
import { fs, setup, cleanup, getDb, setupApplication } from '../../../test-helpers'

let app: ApplicationContract
let db: ReturnType<typeof getDb>

test.group('migrate:fresh', (group) => {
  group.each.setup(async () => {
    app = await setupApplication()
    return () => fs.cleanup()
  })

  group.each.setup(async () => {
    db = getDb(app)
    app.container.bind('Adonis/Lucid/Database', () => db)
    app.container.bind('Adonis/Lucid/Migrator', () => Migrator)
    await setup()

    return async () => {
      await cleanup()
      await cleanup(['adonis_schema', 'adonis_schema_versions', 'schema_users'])
      await db.manager.closeAll()
    }
  })

  test('migration:fresh should drop all tables and run migrations', async ({ assert }) => {
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
    kernel.register([Migrate, Fresh, DbWipe])

    await kernel.exec('migration:run', [])
    await kernel.exec('migration:fresh', [])

    const migrated = await db.connection().from('adonis_schema').select('*')
    const hasUsersTable = await db.connection().schema.hasTable('schema_users')

    assert.lengthOf(migrated, 1)
    assert.isTrue(hasUsersTable)
    assert.equal(migrated[0].name, 'database/migrations/users')
    assert.equal(migrated[0].batch, 1)
  })

  test('migration:fresh --seed should run seeders', async ({ assert }) => {
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
    kernel.register([Migrate, Fresh, DbSeed, DbWipe])

    await kernel.exec('migration:run', [])
    await kernel.exec('migration:fresh', ['--seed'])

    assert.equal(process.env.EXEC_USER_SEEDER, 'true')
    delete process.env.EXEC_USER_SEEDER
  })
})
