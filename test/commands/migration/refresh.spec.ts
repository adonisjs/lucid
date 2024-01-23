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

import DbSeed from '../../../commands/db_seed.js'
import Reset from '../../../commands/migration/reset.js'
import Migrate from '../../../commands/migration/run.js'
import Refresh from '../../../commands/migration/refresh.js'
import Rollback from '../../../commands/migration/rollback.js'
import { cleanup, getDb } from '../../../test-helpers/index.js'

test.group('migration:refresh', (group) => {
  group.each.setup(async () => {
    return async () => {
      await cleanup()
      await cleanup(['adonis_schema', 'adonis_schema_versions', 'schema_users', 'schema_accounts'])
    }
  })

  test('rollback to batch 0 and migrate database', async ({ fs, assert }) => {
    await fs.create(
      'database/migrations/refresh_cmd_users.ts',
      `
        import { BaseSchema as Schema } from '../../../../src/schema/main.js'
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
      'database/migrations/refresh_cmd_posts.ts',
      `
        import { BaseSchema as Schema } from '../../../../src/schema/main.js'
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

    ace.addLoader(new ListLoader([Reset, DbSeed, Migrate, Rollback]))

    const migrate = await ace.create(Migrate, [])
    await migrate.exec()

    const refresh = await ace.create(Refresh, [])
    await refresh.exec()

    const migrated = await db.connection().from('adonis_schema').select('*')
    const hasUsersTable = await db.connection().schema.hasTable('schema_users')
    const hasAccountsTable = await db.connection().schema.hasTable('schema_accounts')

    assert.lengthOf(migrated, 2)
    assert.isTrue(hasUsersTable)
    assert.isTrue(hasAccountsTable)
  })

  test('run seeders when --seed flag is passed', async ({ fs, assert }) => {
    await fs.create(
      'database/seeders/refres_cmd_user.ts',
      `export default class UserSeeder {
        public async run () {
          process.env.EXEC_USER_SEEDER = 'true'
        }
      }`
    )

    await fs.create(
      'database/migrations/refres_cmd_users_v1.ts',
      `
        import { BaseSchema as Schema } from '../../../../src/schema/main.js'
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
      'database/migrations/posts.ts',
      `
        import { BaseSchema as Schema } from '../../../../src/schema/main.js'
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

    ace.addLoader(new ListLoader([Reset, DbSeed, Migrate, Rollback]))

    const migrate = await ace.create(Migrate, [])
    await migrate.exec()

    const refresh = await ace.create(Refresh, ['--seed'])
    await refresh.exec()

    assert.equal(process.env.EXEC_USER_SEEDER, 'true')
    delete process.env.EXEC_USER_SEEDER
  })
})
