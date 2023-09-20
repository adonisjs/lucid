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
import { setup, cleanup as cleanupTables, getDb } from '../../../test-helpers/index.js'

test.group('migration:run', (group) => {
  group.each.setup(async () => {
    await setup()
    return async () => {
      await cleanupTables()
      await cleanupTables([
        'adonis_schema',
        'adonis_schema_versions',
        'schema_users',
        'schema_accounts',
        'schema_clients',
      ])
    }
  })

  test('run migrations from default directory', async ({ fs, assert }) => {
    await fs.create(
      'database/migrations/run_cmd_users.ts',
      `
      import { BaseSchema as Schema } from '../../../../src/schema/main.js'
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

    const migrate = await ace.create(Migrate, [])
    await migrate.exec()

    const migrated = await db.connection().from('adonis_schema').select('*')
    const hasUsersTable = await db.connection().schema.hasTable('schema_users')

    assert.lengthOf(migrated, 1)
    assert.isTrue(hasUsersTable)
    assert.equal(migrated[0].name, 'database/migrations/run_cmd_users')
    assert.equal(migrated[0].batch, 1)
  })

  test('skip migrations when already up to date', async ({ fs, assert }) => {
    const db = getDb()
    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    await ace.app.init()
    ace.app.container.singleton('lucid.db', () => db)
    ace.ui.switchMode('raw')

    const migrate = await ace.create(Migrate, [])
    await migrate.exec()

    const migrated = await db.connection().from('adonis_schema').select('*')
    assert.lengthOf(migrated, 0)
  })

  test('do not execute migrations in dry-run', async ({ fs, assert }) => {
    await fs.create(
      'database/migrations/run_cmd_users_v1.ts',
      `
      import { BaseSchema as Schema } from '../../../../src/schema/main.js'
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

    const migrate = await ace.create(Migrate, ['--dry-run'])
    await migrate.exec()

    const migrated = await db.connection().from('adonis_schema').select('*')
    assert.lengthOf(migrated, 0)
  })

  test('do not run migrations in production', async ({ fs, assert, cleanup }) => {
    assert.plan(1)
    process.env.NODE_ENV = 'production'
    cleanup(() => {
      delete process.env.NODE_ENV
    })

    await fs.create(
      'database/migrations/run_cmd_users_v2.ts',
      `
      import { BaseSchema as Schema } from '../../../../src/schema/main.js'
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
    const ace = await new AceFactory().make(fs.baseUrl, {
      importer: (filePath) => {
        return import(filePath)
      },
    })

    await ace.app.init()
    await ace.app.boot()
    ace.app.container.singleton('lucid.db', () => db)
    ace.ui.switchMode('raw')

    const migrate = await ace.create(Migrate, [])
    migrate.prompt
      .trap('You are in production environment. Want to continue running migrations?')
      .reject()

    await migrate.exec()

    assert.isFalse(await db.connection().schema.hasTable('adonis_schema'))
  })

  test('run migrations in production when --force flag is passed', async ({
    fs,
    assert,
    cleanup,
  }) => {
    process.env.NODE_ENV = 'production'
    cleanup(() => {
      delete process.env.NODE_ENV
    })

    await fs.create(
      'database/migrations/run_cmd_users_v3.ts',
      `
      import { BaseSchema as Schema } from '../../../../src/schema/main.js'
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

    const ace = await new AceFactory().make(fs.baseUrl, {
      importer: (filePath) => {
        return import(filePath)
      },
    })
    await ace.app.init()
    ace.app.container.singleton('lucid.db', () => db)
    ace.ui.switchMode('raw')

    const migrate = await ace.create(Migrate, ['--force'])
    await migrate.exec()

    const migrated = await db.connection().from('adonis_schema').select('*')
    const hasUsersTable = await db.connection().schema.hasTable('schema_users')

    assert.lengthOf(migrated, 1)
    assert.isTrue(hasUsersTable)
    assert.equal(migrated[0].name, 'database/migrations/run_cmd_users_v3')
    assert.equal(migrated[0].batch, 1)
  })

  test('run migrations with compact output should display one line', async ({ fs }) => {
    await fs.create(
      'database/migrations/run_cmd_users_v4.ts',
      `
      import { BaseSchema as Schema } from '../../../../src/schema/main.js'

      export default class User extends Schema {
        public async up () {
          this.schema.createTable('schema_users', (table) => {
            table.increments()
          })
        }
      }
    `
    )

    await fs.create(
      'database/migrations/run_cmd_clients_v4.ts',
      `
      import { BaseSchema as Schema } from '../../../../src/schema/main.js'

      export default class Client extends Schema {
        public async up () {
          this.schema.createTable('schema_clients', (table) => {
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

    const migrate = await ace.create(Migrate, ['--compact-output'])
    await migrate.exec()

    migrate.assertLogMatches(/grey\(❯ Executed 2 migrations/)
  })

  test('run already migrated migrations with compact output should display one line', async ({
    fs,
  }) => {
    await fs.create(
      'database/migrations/run_cmd_users_v5.ts',
      `
      import { BaseSchema as Schema } from '../../../../src/schema/main.js'

      export default class User extends Schema {
        public async up () {
          this.schema.createTable('schema_users', (table) => {
            table.increments()
          })
        }
      }
    `
    )

    await fs.create(
      'database/migrations/run_cmd_clients_v5.ts',
      `
      import { BaseSchema as Schema } from '../../../../src/schema/main.js'

      export default class Client extends Schema {
        public async up () {
          this.schema.createTable('schema_clients', (table) => {
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

    const migrate = await ace.create(Migrate, ['--compact-output'])
    await migrate.exec()
    await migrate.exec()

    migrate.assertLogMatches(/grey\(❯ Already up to date/)
  })
})
