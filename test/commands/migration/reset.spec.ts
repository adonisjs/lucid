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
import { ListLoader } from '@adonisjs/core/ace'
import { AceFactory } from '@adonisjs/core/factories'

import Reset from '../../../commands/migration/reset.js'
import Migrate from '../../../commands/migration/run.js'
import Rollback from '../../../commands/migration/rollback.js'
import { setup, cleanup, getDb } from '../../../test-helpers/index.js'

test.group('migration:reset', (group) => {
  group.each.setup(async () => {
    await setup()

    return async () => {
      await cleanup()
      await cleanup(['adonis_schema', 'adonis_schema_versions', 'schema_users', 'schema_accounts'])
    }
  })

  test('rollback to batch 0', async ({ fs, assert }) => {
    await fs.create(
      'database/migrations/reset_cmd_users.ts',
      `
        import { Schema } from '../../../../src/schema/main.js'
        export default class User extends Schema {
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

    await fs.create(
      'database/migrations/reset_cmd_posts.ts',
      `
        import { Schema } from '../../../../src/Schema'
        export default class Account extends Schema {
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

    const db = getDb()
    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    await ace.app.init()
    ace.app.container.singleton('lucid.db', () => db)
    ace.ui.switchMode('raw')

    ace.addLoader(new ListLoader([Rollback]))

    const migrate = await ace.create(Migrate, [])
    await migrate.exec()

    const refresh = await ace.create(Reset, [])
    await refresh.exec()

    const migrated = await db.connection().from('adonis_schema').select('*')
    const hasUsersTable = await db.connection().schema.hasTable('schema_users')
    const hasAccountsTable = await db.connection().schema.hasTable('schema_accounts')

    assert.lengthOf(migrated, 0)
    assert.isFalse(hasUsersTable)
    assert.isFalse(hasAccountsTable)
  })
})
