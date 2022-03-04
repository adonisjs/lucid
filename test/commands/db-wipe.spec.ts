/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference path="../../adonis-typings/index.ts" />

import 'reflect-metadata'
import { test } from '@japa/runner'
import Migrate from '../../commands/Migration/Run'
import { Kernel } from '@adonisjs/core/build/standalone'
import { ApplicationContract } from '@ioc:Adonis/Core/Application'

import DbWipe from '../../commands/DbWipe'
import { Migrator } from '../../src/Migrator'
import { fs, setup, cleanup, getDb, setupApplication } from '../../test-helpers'

let app: ApplicationContract
let db: ReturnType<typeof getDb>

test.group('db:wipe and migrate:fresh', (group) => {
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

  test('db:wipe should drop all tables', async ({ assert }) => {
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
    kernel.register([Migrate, DbWipe])

    await kernel.exec('migration:run', [])
    assert.isAbove((await db.connection().getAllTables(['public'])).length, 0)

    await kernel.exec('db:wipe', [])
    assert.lengthOf(await db.connection().getAllTables(['public']), 0)
  })
})
