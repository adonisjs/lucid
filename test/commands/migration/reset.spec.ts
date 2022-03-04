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

import { Migrator } from '../../../src/Migrator'
import Reset from '../../../commands/Migration/Reset'
import Migrate from '../../../commands/Migration/Run'
import Rollback from '../../../commands/Migration/Rollback'
import { fs, setup, cleanup, getDb, setupApplication } from '../../../test-helpers'

let db: ReturnType<typeof getDb>
let app: ApplicationContract

test.group('migration:reset', (group) => {
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

  test('rollback to batch 0', async ({ assert }) => {
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

    const kernel = new Kernel(app)
    kernel.register([Migrate, Rollback, Reset])

    await kernel.exec('migration:run', [])
    await kernel.exec('migration:reset', [])

    const migrated = await db.connection().from('adonis_schema').select('*')
    const hasUsersTable = await db.connection().schema.hasTable('schema_users')
    const hasAccountsTable = await db.connection().schema.hasTable('schema_accounts')

    assert.lengthOf(migrated, 0)
    assert.isFalse(hasUsersTable)
    assert.isFalse(hasAccountsTable)
  })
})
