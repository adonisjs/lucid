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

import Migrate from '../../../commands/migration/run.js'
import Rollback from '../../../commands/migration/rollback.js'
import SchemaGenerate from '../../../commands/schema_generate.js'
import { setup, cleanup, getDb } from '../../../test-helpers/index.js'

test.group('migration:rollback', (group) => {
  group.each.setup(async () => {
    await setup()

    return async () => {
      await cleanup()
      await cleanup(['adonis_schema', 'adonis_schema_versions', 'schema_users'])
    }
  })

  test('rollback migrations and generate schema', async ({ fs, assert }) => {
    await fs.create(
      'database/migrations/rollback_cmd_users.ts',
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

    const db = getDb()
    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    await ace.app.init()
    ace.app.container.singleton('lucid.db', () => db)
    ace.ui.switchMode('raw')

    ace.addLoader(new ListLoader([SchemaGenerate]))

    const migrate = await ace.create(Migrate, [])
    await migrate.exec()

    const rollback = await ace.create(Rollback, [])
    await rollback.exec()

    const migrated = await db.connection().from('adonis_schema').select('*')
    const hasUsersTable = await db.connection().schema.hasTable('schema_users')
    const schemaFileExists = await fs.exists('database/schema.ts')

    assert.lengthOf(migrated, 0)
    assert.isFalse(hasUsersTable)
    assert.isTrue(schemaFileExists)
  })

  test('skip schema generation when --no-schema-generate flag is passed', async ({
    fs,
    assert,
  }) => {
    await fs.create(
      'database/migrations/rollback_cmd_users_v2.ts',
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

    const db = getDb()
    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    await ace.app.init()
    ace.app.container.singleton('lucid.db', () => db)
    ace.ui.switchMode('raw')

    ace.addLoader(new ListLoader([SchemaGenerate]))

    const migrate = await ace.create(Migrate, ['--no-schema-generate'])
    await migrate.exec()

    const rollback = await ace.create(Rollback, ['--no-schema-generate'])
    await rollback.exec()

    const schemaFileExists = await fs.exists('database/schema.ts')
    assert.isFalse(schemaFileExists)
  })
})
