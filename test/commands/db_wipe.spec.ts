/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import 'reflect-metadata'
import { test } from '@japa/runner'
import { AceFactory } from '@adonisjs/core/factories'

import DbWipe from '../../commands/db_wipe.js'
import Migrate from '../../commands/migration/run.js'
import { setup, cleanup, getDb } from '../../test-helpers/index.js'

test.group('db:wipe and migrate:fresh', (group) => {
  group.each.setup(async () => {
    await setup()

    return async () => {
      await cleanup()
      await cleanup(['adonis_schema', 'adonis_schema_versions', 'schema_users'])
    }
  })

  test('db:wipe should drop all tables', async ({ fs, assert }) => {
    await fs.create(
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

    const db = getDb()
    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    await ace.app.init()
    ace.app.container.singleton('lucid.db', () => db)
    ace.ui.switchMode('raw')

    const migrate = await ace.create(Migrate, [])
    await migrate.exec()

    const tables = await db.connection().getAllTables(['public'])
    assert.isAbove(tables.length, 0)

    const dbWipe = await ace.create(DbWipe, [])
    await dbWipe.exec()

    assert.lengthOf(await db.connection().getAllTables(['public']), 0)
  })
})
