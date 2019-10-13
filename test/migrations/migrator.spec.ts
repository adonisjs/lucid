/*
* @adonisjs/lucid
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

/// <reference path="../../adonis-typings/index.ts" />

import test from 'japa'
import { join } from 'path'
import { Filesystem } from '@poppinss/dev-utils'
import { Application } from '@adonisjs/application/build/standalone'

import { setup, cleanup, getDb, resetTables, getMigrator } from '../../test-helpers'

let db: ReturnType<typeof getDb>
const fs = new Filesystem(join(__dirname, 'app'))

test.group('Migrator', (group) => {
  group.before(async () => {
    db = getDb()
    await setup()
  })

  group.after(async () => {
    await cleanup()
    await db.manager.closeAll()
  })

  group.afterEach(async () => {
    await resetTables()
    await cleanup(['adonis_schema', 'schema_users', 'schema_accounts'])
    await fs.cleanup()
  })

  test('create the schema table when there are no migrations', async (assert) => {
    const app = new Application(fs.basePath, {} as any, {} as any, {})
    await fs.fsExtra.ensureDir(join(fs.basePath, 'database/migrations'))

    const migrator = getMigrator(db, app, {
      direction: 'up',
      connectionName: 'primary',
    })

    await migrator.run()
    const hasSchemaTable = await db.connection().schema.hasTable('adonis_schema')
    assert.isTrue(hasSchemaTable)
    assert.deepEqual(migrator.migratedFiles, [])
    assert.equal(migrator.status, 'skipped')
  })

  test('migrate database using schema files', async (assert) => {
    const app = new Application(fs.basePath, {} as any, {} as any, {})

    await fs.add('database/migrations/users.ts', `
      import { Schema } from '../../../../../src/Schema'
      module.exports = class User extends Schema {
        public async up () {
          this.schema.createTable('schema_users', (table) => {
            table.increments()
          })
        }
      }
    `)

    const migrator = getMigrator(db, app, {
      direction: 'up',
      connectionName: 'primary',
    })

    await migrator.run()

    const migrated = await db.connection().from('adonis_schema').select('*')
    const hasUsersTable = await db.connection().schema.hasTable('schema_users')

    assert.lengthOf(migrated, 1)
    assert.equal(migrated[0].name, 'database/migrations/users')
    assert.equal(migrated[0].batch, 1)
    assert.isTrue(hasUsersTable)
    assert.deepEqual(migrator.migratedFiles, ['database/migrations/users'])
    assert.equal(migrator.status, 'completed')
  })

  test('do not migrate when schema up action fails', async (assert) => {
    assert.plan(8)
    const app = new Application(fs.basePath, {} as any, {} as any, {})

    await fs.add('database/migrations/users.ts', `
      import { Schema } from '../../../../../src/Schema'
      module.exports = class User extends Schema {
        public async up () {
          this.schema.createTable('schema_users', (table) => {
            table.increments()
            table['badMethod']('account_id')
          })
        }
      }
    `)

    await fs.add('database/migrations/accounts.ts', `
      import { Schema } from '../../../../../src/Schema'
      module.exports = class Accounts extends Schema {
        public async up () {
          this.schema.createTable('schema_accounts', (table) => {
            table.increments()
          })
        }
      }
    `)

    const migrator = getMigrator(db, app, {
      direction: 'up',
      connectionName: 'primary',
    })

    try {
      await migrator.run()
    } catch (error) {
      assert.exists(error)
    }

    const migrated = await db.connection().from('adonis_schema').select('*')
    const hasUsersTable = await db.connection().schema.hasTable('schema_users')
    const hasAccountsTable = await db.connection().schema.hasTable('schema_accounts')

    assert.lengthOf(migrated, 1)
    assert.equal(migrated[0].name, 'database/migrations/accounts')
    assert.equal(migrated[0].batch, 1)
    assert.isFalse(hasUsersTable, 'Has users table')
    assert.isTrue(hasAccountsTable, 'Has accounts table')
    assert.deepEqual(migrator.migratedFiles, ['database/migrations/accounts'])
    assert.equal(migrator.status, 'completed')
  })

  test('do not migrate when dryRun is true', async (assert) => {
    const app = new Application(fs.basePath, {} as any, {} as any, {})

    await fs.add('database/migrations/users.ts', `
      import { Schema } from '../../../../../src/Schema'
      module.exports = class User extends Schema {
        public async up () {
          this.schema.createTable('schema_users', (table) => {
            table.increments()
          })
        }
      }
    `)

    await fs.add('database/migrations/accounts.ts', `
      import { Schema } from '../../../../../src/Schema'
      module.exports = class Accounts extends Schema {
        public async up () {
          this.schema.createTable('schema_accounts', (table) => {
            table.increments()
          })
        }
      }
    `)

    const migrator = getMigrator(db, app, {
      direction: 'up',
      connectionName: 'primary',
      dryRun: true,
    })

    await migrator.run()

    const migrated = await db.connection().from('adonis_schema').select('*')
    const hasUsersTable = await db.connection().schema.hasTable('schema_users')
    const hasAccountsTable = await db.connection().schema.hasTable('schema_accounts')

    assert.lengthOf(migrated, 0)
    assert.isFalse(hasUsersTable, 'Has users table')
    assert.isFalse(hasAccountsTable, 'Has accounts table')

    assert.deepEqual(migrator.migratedFiles, [
      'database/migrations/accounts',
      'database/migrations/users',
    ])

    assert.deepEqual(migrator.migratedQueries, {
      'database/migrations/accounts': [
         db.connection().schema.createTable('schema_accounts', (table) => {
           table.increments()
         }).toQuery(),
      ],
      'database/migrations/users': [
         db.connection().schema.createTable('schema_users', (table) => {
           table.increments()
         }).toQuery(),
      ],
    })

    assert.equal(migrator.status, 'completed')
  })

  test('do not migrate a schema file twice', async (assert) => {
    const app = new Application(fs.basePath, {} as any, {} as any, {})

    await fs.add('database/migrations/accounts.ts', `
      import { Schema } from '../../../../../src/Schema'
      module.exports = class Accounts extends Schema {
        public async up () {
          this.schema.createTable('schema_accounts', (table) => {
            table.increments()
          })
        }
      }
    `)

    const migrator = getMigrator(db, app, { direction: 'up', connectionName: 'primary' })
    await migrator.run()

    await fs.add('database/migrations/users.ts', `
      import { Schema } from '../../../../../src/Schema'
      module.exports = class User extends Schema {
        public async up () {
          this.schema.createTable('schema_users', (table) => {
            table.increments()
          })
        }
      }
    `)

    const migrator1 = getMigrator(db, app, { direction: 'up', connectionName: 'primary' })
    await migrator1.run()

    const migrator2 = getMigrator(db, app, { direction: 'up', connectionName: 'primary' })
    await migrator2.run()

    assert.equal(migrator2.status, 'skipped')

    const migrated = await db.connection().from('adonis_schema').select('*')
    const hasUsersTable = await db.connection().schema.hasTable('schema_users')
    const hasAccountsTable = await db.connection().schema.hasTable('schema_accounts')

    assert.lengthOf(migrated, 2)
    assert.equal(migrated[0].name, 'database/migrations/accounts')
    assert.equal(migrated[0].batch, 1)

    assert.equal(migrated[1].name, 'database/migrations/users')
    assert.equal(migrated[1].batch, 2)

    assert.isTrue(hasAccountsTable, 'Has accounts table')
    assert.isTrue(hasUsersTable, 'Has users table')
  })

  test('rollback database using schema files to a given batch', async (assert) => {
    const app = new Application(fs.basePath, {} as any, {} as any, {})

    await fs.add('database/migrations/users.ts', `
      import { Schema } from '../../../../../src/Schema'
      module.exports = class User extends Schema {
        public async up () {
          this.schema.createTable('schema_users', (table) => {
            table.increments()
          })
        }

        public async down () {
          this.schema.dropTable('schema_users')
        }
      }
    `)

    const migrator = getMigrator(db, app, { direction: 'up', connectionName: 'primary' })
    await migrator.run()

    await fs.add('database/migrations/accounts.ts', `
      import { Schema } from '../../../../../src/Schema'
      module.exports = class User extends Schema {
        public async up () {
          this.schema.createTable('schema_accounts', (table) => {
            table.increments()
          })
        }

        public async down () {
          this.schema.dropTable('schema_accounts')
        }
      }
    `)

    const migrator1 = getMigrator(db, app, { direction: 'up', connectionName: 'primary' })
    await migrator1.run()

    const migrator2 = getMigrator(db, app, { direction: 'down', batch: 1, connectionName: 'primary' })
    await migrator2.run()

    const migrated = await db.connection().from('adonis_schema').select('*')
    const hasUsersTable = await db.connection().schema.hasTable('schema_users')
    const hasAccountsTable = await db.connection().schema.hasTable('schema_accounts')

    assert.lengthOf(migrated, 1)
    assert.isTrue(hasUsersTable)
    assert.isFalse(hasAccountsTable)
    assert.deepEqual(migrator2.migratedFiles, ['database/migrations/accounts'])
  })

  test('rollback all down to batch 0', async (assert) => {
    const app = new Application(fs.basePath, {} as any, {} as any, {})

    await fs.add('database/migrations/users.ts', `
      import { Schema } from '../../../../../src/Schema'
      module.exports = class User extends Schema {
        public async up () {
          this.schema.createTable('schema_users', (table) => {
            table.increments()
          })
        }

        public async down () {
          this.schema.dropTable('schema_users')
        }
      }
    `)

    const migrator = getMigrator(db, app, { direction: 'up', connectionName: 'primary' })
    await migrator.run()

    await fs.add('database/migrations/accounts.ts', `
      import { Schema } from '../../../../../src/Schema'
      module.exports = class User extends Schema {
        public async up () {
          this.schema.createTable('schema_accounts', (table) => {
            table.increments()
          })
        }

        public async down () {
          this.schema.dropTable('schema_accounts')
        }
      }
    `)

    const migrator1 = getMigrator(db, app, { direction: 'up', connectionName: 'primary' })
    await migrator1.run()

    const migrator2 = getMigrator(db, app, { direction: 'down', batch: 0, connectionName: 'primary' })
    await migrator2.run()

    const migrated = await db.connection().from('adonis_schema').select('*')
    const hasUsersTable = await db.connection().schema.hasTable('schema_users')
    const hasAccountsTable = await db.connection().schema.hasTable('schema_accounts')

    assert.lengthOf(migrated, 0)
    assert.isFalse(hasUsersTable)
    assert.isFalse(hasAccountsTable)

    assert.equal(migrator2.status, 'completed')
    assert.deepEqual(migrator2.migratedFiles, [
      'database/migrations/accounts',
      'database/migrations/users',
    ])
  })

  test('rollback multiple times must be a noop', async (assert) => {
    const app = new Application(fs.basePath, {} as any, {} as any, {})

    await fs.add('database/migrations/users.ts', `
      import { Schema } from '../../../../../src/Schema'
      module.exports = class User extends Schema {
        public async up () {
          this.schema.createTable('schema_users', (table) => {
            table.increments()
          })
        }

        public async down () {
          this.schema.dropTable('schema_users')
        }
      }
    `)

    const migrator = getMigrator(db, app, { direction: 'up', connectionName: 'primary' })
    await migrator.run()

    await fs.add('database/migrations/accounts.ts', `
      import { Schema } from '../../../../../src/Schema'
      module.exports = class User extends Schema {
        public async up () {
          this.schema.createTable('schema_accounts', (table) => {
            table.increments()
          })
        }

        public async down () {
          this.schema.dropTable('schema_accounts')
        }
      }
    `)

    const migrator1 = getMigrator(db, app, { direction: 'up', connectionName: 'primary' })
    await migrator1.run()

    const migrator2 = getMigrator(db, app, { direction: 'down', batch: 0, connectionName: 'primary' })
    await migrator2.run()

    const migrator3 = getMigrator(db, app, { direction: 'down', batch: 0, connectionName: 'primary' })
    await migrator3.run()

    const migrated = await db.connection().from('adonis_schema').select('*')
    const hasUsersTable = await db.connection().schema.hasTable('schema_users')
    const hasAccountsTable = await db.connection().schema.hasTable('schema_accounts')

    assert.lengthOf(migrated, 0)
    assert.isFalse(hasUsersTable)
    assert.isFalse(hasAccountsTable)

    assert.equal(migrator2.status, 'completed')
    assert.equal(migrator3.status, 'skipped')
    assert.deepEqual(migrator2.migratedFiles, [
      'database/migrations/accounts',
      'database/migrations/users',
    ])
    assert.deepEqual(migrator3.migratedFiles, [])
  })

  test('do not rollback in dryRun', async (assert) => {
    const app = new Application(fs.basePath, {} as any, {} as any, {})

    await fs.add('database/migrations/users.ts', `
      import { Schema } from '../../../../../src/Schema'
      module.exports = class User extends Schema {
        public async up () {
          this.schema.createTable('schema_users', (table) => {
            table.increments()
          })
        }

        public async down () {
          this.schema.dropTable('schema_users')
        }
      }
    `)

    const migrator = getMigrator(db, app, { direction: 'up', connectionName: 'primary' })
    await migrator.run()

    await fs.add('database/migrations/accounts.ts', `
      import { Schema } from '../../../../../src/Schema'
      module.exports = class User extends Schema {
        public async up () {
          this.schema.createTable('schema_accounts', (table) => {
            table.increments()
          })
        }

        public async down () {
          this.schema.dropTable('schema_accounts')
        }
      }
    `)

    const migrator1 = getMigrator(db, app, { direction: 'up', connectionName: 'primary' })
    await migrator1.run()

    const migrator2 = getMigrator(db, app, {
      batch: 0,
      dryRun: true,
      direction: 'down',
      connectionName: 'primary',
    })
    await migrator2.run()

    const migrated = await db.connection().from('adonis_schema').select('*')
    const hasUsersTable = await db.connection().schema.hasTable('schema_users')
    const hasAccountsTable = await db.connection().schema.hasTable('schema_accounts')

    assert.lengthOf(migrated, 2)
    assert.isTrue(hasUsersTable)
    assert.isTrue(hasAccountsTable)

    assert.equal(migrator2.status, 'completed')
    assert.deepEqual(migrator2.migratedFiles, [
      'database/migrations/accounts',
      'database/migrations/users',
    ])

    assert.deepEqual(migrator2.migratedQueries, {
      'database/migrations/accounts': [
        db.connection().schema.dropTable('schema_accounts').toQuery(),
      ],
      'database/migrations/users': [
        db.connection().schema.dropTable('schema_users').toQuery(),
      ],
    })
  })

  test('do not rollback when a schema file goes missing', async (assert) => {
    assert.plan(4)
    const app = new Application(fs.basePath, {} as any, {} as any, {})

    await fs.add('database/migrations/users.ts', `
      import { Schema } from '../../../../../src/Schema'
      module.exports = class User extends Schema {
        public async up () {
          this.schema.createTable('schema_users', (table) => {
            table.increments()
          })
        }

        public async down () {
          this.schema.dropTable('schema_users')
        }
      }
    `)

    await fs.add('database/migrations/accounts.ts', `
      import { Schema } from '../../../../../src/Schema'
      module.exports = class User extends Schema {
        public async up () {
          this.schema.createTable('schema_accounts', (table) => {
            table.increments()
          })
        }

        public async down () {
          this.schema.dropTable('schema_accounts')
        }
      }
    `)

    const migrator = getMigrator(db, app, { direction: 'up', connectionName: 'primary' })
    await migrator.run()

    await fs.remove('database/migrations/accounts.ts')

    const migrator1 = getMigrator(db, app, {
      batch: 0,
      direction: 'down',
      connectionName: 'primary',
    })

    try {
      await migrator1.run()
    } catch ({ message }) {
      assert.equal(message, 'E_MISSING_SCHEMA_FILES: Cannot perform rollback. Schema file {database/migrations/accounts} is missing')
    }

    const migrated = await db.connection().from('adonis_schema').select('*')
    const hasUsersTable = await db.connection().schema.hasTable('schema_users')
    const hasAccountsTable = await db.connection().schema.hasTable('schema_accounts')

    assert.lengthOf(migrated, 2)
    assert.isTrue(hasUsersTable)
    assert.isTrue(hasAccountsTable)
  })
})
