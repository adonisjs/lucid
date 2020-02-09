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
    assert.deepEqual(migrator.migratedFiles, {})
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
    const migratedFiles = Object.keys(migrator.migratedFiles).map((file) => {
      return {
        status: migrator.migratedFiles[file].status,
        file: file,
        queries: migrator.migratedFiles[file].queries,
      }
    })

    assert.lengthOf(migrated, 1)
    assert.equal(migrated[0].name, 'database/migrations/users')
    assert.equal(migrated[0].batch, 1)
    assert.isTrue(hasUsersTable)
    assert.deepEqual(migratedFiles, [{
      status: 'completed',
      file: 'database/migrations/users',
      queries: [],
    }])
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

    await migrator.run()

    const migrated = await db.connection().from('adonis_schema').select('*')
    const hasUsersTable = await db.connection().schema.hasTable('schema_users')
    const hasAccountsTable = await db.connection().schema.hasTable('schema_accounts')
    const migratedFiles = Object.keys(migrator.migratedFiles).map((file) => {
      return {
        status: migrator.migratedFiles[file].status,
        file: file,
        queries: migrator.migratedFiles[file].queries,
      }
    })

    assert.lengthOf(migrated, 1)
    assert.equal(migrated[0].name, 'database/migrations/accounts')
    assert.equal(migrated[0].batch, 1)
    assert.isFalse(hasUsersTable, 'Has users table')
    assert.isTrue(hasAccountsTable, 'Has accounts table')
    assert.deepEqual(migratedFiles, [
      {
        status: 'completed',
        file: 'database/migrations/accounts',
        queries: [],
      },
      {
        status: 'error',
        file: 'database/migrations/users',
        queries: [],
      },
    ])

    assert.equal(migrator.status, 'error')
    assert.equal(migrator.error!.message, 'table.badMethod is not a function')
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
    const migratedFiles = Object.keys(migrator.migratedFiles).map((file) => {
      return {
        status: migrator.migratedFiles[file].status,
        file: file,
        queries: migrator.migratedFiles[file].queries,
      }
    })

    assert.lengthOf(migrated, 0)
    assert.isFalse(hasUsersTable, 'Has users table')
    assert.isFalse(hasAccountsTable, 'Has accounts table')

    assert.deepEqual(migratedFiles, [
      {
        status: 'completed',
        file: 'database/migrations/accounts',
        queries: [
          db.connection().schema.createTable('schema_accounts', (table) => {
            table.increments()
          }).toQuery(),
        ],
      },
      {
        status: 'completed',
        file: 'database/migrations/users',
        queries: [
          db.connection().schema.createTable('schema_users', (table) => {
            table.increments()
          }).toQuery(),
        ],
      },
    ])

    assert.equal(migrator.status, 'completed')
  })

  test('catch and report errors in dryRun', async (assert) => {
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
            table['badMethod']('account_id')
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
    const migratedFiles = Object.keys(migrator.migratedFiles).map((file) => {
      return {
        status: migrator.migratedFiles[file].status,
        file: file,
        queries: migrator.migratedFiles[file].queries,
      }
    })

    assert.lengthOf(migrated, 0)
    assert.isFalse(hasUsersTable, 'Has users table')
    assert.isFalse(hasAccountsTable, 'Has accounts table')

    assert.deepEqual(migratedFiles, [
      {
        status: 'error',
        file: 'database/migrations/accounts',
        queries: [],
      },
      {
        status: 'pending',
        file: 'database/migrations/users',
        queries: [],
      },
    ])

    assert.equal(migrator.status, 'error')
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
    const migratedFiles = Object.keys(migrator2.migratedFiles).map((file) => {
      return {
        status: migrator2.migratedFiles[file].status,
        file: file,
        queries: migrator2.migratedFiles[file].queries,
      }
    })

    assert.lengthOf(migrated, 1)
    assert.isTrue(hasUsersTable)
    assert.isFalse(hasAccountsTable)
    assert.deepEqual(migratedFiles, [{
      status: 'completed',
      file: 'database/migrations/accounts',
      queries: [],
    }])
  })

  test('rollback database to the latest batch', async (assert) => {
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

    const migrator2 = getMigrator(db, app, { direction: 'down', connectionName: 'primary' })
    await migrator2.run()

    const migrated = await db.connection().from('adonis_schema').select('*')
    const hasUsersTable = await db.connection().schema.hasTable('schema_users')
    const hasAccountsTable = await db.connection().schema.hasTable('schema_accounts')
    const migratedFiles = Object.keys(migrator2.migratedFiles).map((file) => {
      return {
        status: migrator2.migratedFiles[file].status,
        file: file,
        queries: migrator2.migratedFiles[file].queries,
      }
    })

    assert.lengthOf(migrated, 1)
    assert.isTrue(hasUsersTable)
    assert.isFalse(hasAccountsTable)
    assert.deepEqual(migratedFiles, [{
      status: 'completed',
      file: 'database/migrations/accounts',
      queries: [],
    }])
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
    const migratedFiles = Object.keys(migrator2.migratedFiles).map((file) => {
      return {
        status: migrator2.migratedFiles[file].status,
        file: file,
        queries: migrator2.migratedFiles[file].queries,
      }
    })

    assert.lengthOf(migrated, 0)
    assert.isFalse(hasUsersTable)
    assert.isFalse(hasAccountsTable)

    assert.equal(migrator2.status, 'completed')
    assert.deepEqual(migratedFiles, [
      {
        status: 'completed',
        file: 'database/migrations/accounts',
        queries: [],
      },
      {
        status: 'completed',
        file: 'database/migrations/users',
        queries: [],
      },
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

    const migrator2Files = Object.keys(migrator2.migratedFiles).map((file) => {
      return {
        status: migrator2.migratedFiles[file].status,
        file: file,
        queries: migrator2.migratedFiles[file].queries,
      }
    })

    const migrator3Files = Object.keys(migrator3.migratedFiles).map((file) => {
      return {
        status: migrator3.migratedFiles[file].status,
        file: file,
        queries: migrator3.migratedFiles[file].queries,
      }
    })

    assert.lengthOf(migrated, 0)
    assert.isFalse(hasUsersTable)
    assert.isFalse(hasAccountsTable)

    assert.equal(migrator2.status, 'completed')
    assert.equal(migrator3.status, 'skipped')
    assert.deepEqual(migrator2Files, [
      {
        status: 'completed',
        file: 'database/migrations/accounts',
        queries: [],
      },
      {
        status: 'completed',
        file: 'database/migrations/users',
        queries: [],
      },
    ])
    assert.deepEqual(migrator3Files, [])
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
    const migrator2Files = Object.keys(migrator2.migratedFiles).map((file) => {
      return {
        status: migrator2.migratedFiles[file].status,
        file: file,
        queries: migrator2.migratedFiles[file].queries,
      }
    })

    assert.lengthOf(migrated, 2)
    assert.isTrue(hasUsersTable)
    assert.isTrue(hasAccountsTable)

    assert.equal(migrator2.status, 'completed')
    assert.deepEqual(migrator2Files, [
      {
        status: 'completed',
        file: 'database/migrations/accounts',
        queries: [
          db.connection().schema.dropTable('schema_accounts').toQuery(),
        ],
      },
      {
        status: 'completed',
        file: 'database/migrations/users',
        queries: [
          db.connection().schema.dropTable('schema_users').toQuery(),
        ],
      },
    ])
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

    await migrator1.run()

    const migrated = await db.connection().from('adonis_schema').select('*')
    const hasUsersTable = await db.connection().schema.hasTable('schema_users')
    const hasAccountsTable = await db.connection().schema.hasTable('schema_accounts')

    assert.lengthOf(migrated, 2)
    assert.isTrue(hasUsersTable)
    assert.isTrue(hasAccountsTable)
    assert.equal(
      migrator1.error!.message,
      'E_MISSING_SCHEMA_FILES: Cannot perform rollback. Schema file {database/migrations/accounts} is missing',
    )
  })

  test('get list of migrated files', async (assert) => {
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
    const files = await migrator.getList()

    assert.lengthOf(files, 2)
    assert.equal(files[0].name, 'database/migrations/accounts')
    assert.equal(files[0].batch, 1)

    assert.equal(files[1].name, 'database/migrations/users')
    assert.equal(files[1].batch, 1)
  })

  test('skip upcoming migrations after failure', async (assert) => {
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
            table['badMethod']('account_id')
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
    const migratedFiles = Object.keys(migrator.migratedFiles).map((file) => {
      return {
        status: migrator.migratedFiles[file].status,
        file: file,
        queries: migrator.migratedFiles[file].queries,
      }
    })

    assert.lengthOf(migrated, 0)
    assert.isFalse(hasUsersTable, 'Has users table')
    assert.isFalse(hasAccountsTable, 'Has accounts table')
    assert.deepEqual(migratedFiles, [
      {
        status: 'error',
        file: 'database/migrations/accounts',
        queries: [],
      },
      {
        status: 'pending',
        file: 'database/migrations/users',
        queries: [],
      },
    ])

    assert.equal(migrator.status, 'error')
  })

  test('raise exception when rollbacks in production are disabled', async (assert) => {
    const app = new Application(fs.basePath, {} as any, {} as any, {})
    app.inProduction = true
    const originalConfig = Object.assign({}, db.getRawConnection('primary')!.config)

    db.getRawConnection('primary')!.config.migrations = {
      disableRollbacksInProduction: true,
    }

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

    const migrator2 = getMigrator(db, app, { direction: 'down', connectionName: 'primary' })
    await migrator2.run()

    assert.equal(
      migrator2.error!.message,
      'Rollback in production environment is disabled. Check "config/database" file for options.',
    )

    const migrated = await db.connection().from('adonis_schema').select('*')
    const hasUsersTable = await db.connection().schema.hasTable('schema_users')
    const hasAccountsTable = await db.connection().schema.hasTable('schema_accounts')

    assert.lengthOf(migrated, 2)
    assert.isTrue(hasUsersTable)
    assert.isTrue(hasAccountsTable)
    db.getRawConnection('primary')!.config = originalConfig
  })
})
