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

import Migrate from '../../../commands/migration/run.js'
import Fresh from '../../../commands/migration/fresh.js'
import { setup, cleanup, getDb } from '../../../test-helpers/index.js'
import { ListLoader } from '@adonisjs/core/ace'
import DbWipe from '../../../commands/db_wipe.js'
import DbSeed from '../../../commands/db_seed.js'

test.group('migrate:fresh', (group) => {
  group.each.setup(async () => {
    await setup()

    return async () => {
      await cleanup()
      await cleanup(['adonis_schema', 'adonis_schema_versions', 'schema_users'])
    }
  })

  test('migration:fresh should drop all tables and run migrations', async ({ fs, assert }) => {
    await fs.create(
      'database/migrations/fresh_cmd_users.ts',
      `
      import { Schema } from '../../../../src/schema/main.js'
      export default class User extends Schema {
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

    ace.addLoader(new ListLoader([DbWipe, DbSeed, Migrate]))

    const migrate = await ace.create(Migrate, [])
    await migrate.exec()

    const migrated = await db.connection().from('adonis_schema').select('*')
    const hasUsersTable = await db.connection().schema.hasTable('schema_users')

    assert.lengthOf(migrated, 1)
    assert.isTrue(hasUsersTable)
    assert.equal(migrated[0].name, 'database/migrations/fresh_cmd_users')
    assert.equal(migrated[0].batch, 1)

    const fresh = await ace.create(Fresh, [])
    await fresh.exec()

    const migrated1 = await db.connection().from('adonis_schema').select('*')
    const hasUsersTable1 = await db.connection().schema.hasTable('schema_users')

    assert.lengthOf(migrated1, 1)
    assert.isTrue(hasUsersTable1)
    assert.equal(migrated1[0].name, 'database/migrations/fresh_cmd_users')
    assert.equal(migrated1[0].batch, 1)
  })

  test('migration:fresh --seed should run seeders', async ({ fs, assert }) => {
    await fs.create(
      'database/seeders/fresh_cmd_user.ts',
      `export default class UserSeeder {
        public async run () {
          process.env.EXEC_USER_SEEDER = 'true'
        }
      }`
    )

    await fs.create(
      'database/migrations/fresh_cmd_users_v1.ts',
      `
      import { Schema } from '../../../../src/schema/main.js'
      export default class User extends Schema {
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

    ace.addLoader(new ListLoader([DbWipe, DbSeed, Migrate]))

    const migrate = await ace.create(Migrate, [])
    await migrate.exec()

    const fresh = await ace.create(Fresh, ['--seed'])
    await fresh.exec()

    assert.equal(process.env.EXEC_USER_SEEDER, 'true')
    delete process.env.EXEC_USER_SEEDER
  })
})
