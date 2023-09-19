/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { sep } from 'node:path'
import { test } from '@japa/runner'
import { AppFactory } from '@adonisjs/core/factories/app'

import {
  setup,
  getDb,
  resetTables,
  getMigrator,
  cleanup as cleanupTables,
} from '../../test-helpers/index.js'

test.group('Migrator', (group) => {
  group.each.setup(async () => {
    await setup()
  })

  group.each.teardown(async () => {
    await resetTables()
    await cleanupTables()
    await cleanupTables([
      'adonis_schema',
      'adonis_schema_versions',
      'schema_users',
      'schema_accounts',
    ])
  })

  test('create the schema table when there are no migrations', async ({ fs, assert, cleanup }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    cleanup(() => db.manager.closeAll())

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

  test('migrate database using schema files', async ({ fs, assert, cleanup }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    cleanup(() => db.manager.closeAll())

    await fs.create(
      'database/migrations/users_v1.ts',
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
    assert.equal(migrated[0].name, 'database/migrations/users_v1')
    assert.equal(migrated[0].batch, 1)
    assert.isTrue(hasUsersTable)
    assert.deepEqual(migratedFiles, [
      {
        status: 'completed',
        file: 'database/migrations/users_v1',
        queries: [],
      },
    ])
    assert.equal(migrator.status, 'completed')
  })

  test('do not migrate when schema up action fails', async ({ fs, assert, cleanup }) => {
    assert.plan(8)

    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    cleanup(() => db.manager.closeAll())

    await fs.create(
      'database/migrations/users_v2.ts',
      `
      import { Schema } from '../../../../src/schema/main.js'
      export default class User extends Schema {
        public async up () {
          this.schema.createTable('schema_users', (table) => {
            table.increments()
            table['badMethod']('account_id')
          })
        }
      }
    `
    )

    await fs.create(
      'database/migrations/accounts_v2.ts',
      `
      import { Schema } from '../../../../src/schema/main.js'
      export default class extends Schema {
        public async up () {
          this.schema.createTable('schema_accounts', (table) => {
            table.increments()
          })
        }
      }
    `
    )

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
    assert.equal(migrated[0].name, 'database/migrations/accounts_v2')
    assert.equal(migrated[0].batch, 1)
    assert.isFalse(hasUsersTable, 'Has users table')
    assert.isTrue(hasAccountsTable, 'Has accounts table')
    assert.deepEqual(migratedFiles, [
      {
        status: 'completed',
        file: 'database/migrations/accounts_v2',
        queries: [],
      },
      {
        status: 'error',
        file: 'database/migrations/users_v2',
        queries: [],
      },
    ])

    assert.equal(migrator.status, 'error')
    assert.equal(migrator.error!.message, 'table.badMethod is not a function')
  })

  test('do not migrate when dryRun is true', async ({ fs, assert, cleanup }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    cleanup(() => db.manager.closeAll())

    await fs.create(
      'database/migrations/users_v3.ts',
      `
      import { Schema } from '../../../../src/schema/main.js'
      export default class extends Schema {
        public async up () {
          this.schema.createTable('schema_users', (table) => {
            table.increments()
          })
        }
      }
    `
    )

    await fs.create(
      'database/migrations/accounts_v3.ts',
      `
      import { Schema } from '../../../../src/schema/main.js'
      export default class extends Schema {
        public async up () {
          this.schema.createTable('schema_accounts', (table) => {
            table.increments()
          })
        }
      }
    `
    )

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
        file: 'database/migrations/accounts_v3',
        queries: [
          db
            .connection()
            .schema.createTable('schema_accounts', (table) => {
              table.increments()
            })
            .toQuery(),
        ],
      },
      {
        status: 'completed',
        file: 'database/migrations/users_v3',
        queries: [
          db
            .connection()
            .schema.createTable('schema_users', (table) => {
              table.increments()
            })
            .toQuery(),
        ],
      },
    ])

    assert.equal(migrator.status, 'completed')
  })

  test('catch and report errors in dryRun', async ({ fs, assert, cleanup }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    cleanup(() => db.manager.closeAll())

    await fs.create(
      'database/migrations/users_v4.ts',
      `
      import { Schema } from '../../../../src/schema/main.js'
      export default class extends Schema {
        public async up () {
          this.schema.createTable('schema_users', (table) => {
            table.increments()
          })
        }
      }
    `
    )

    await fs.create(
      'database/migrations/accounts_v4.ts',
      `
      import { Schema } from '../../../../src/schema/main.js'
      export default class extends Schema {
        public async up () {
          this.schema.createTable('schema_accounts', (table) => {
            table.increments()
            table['badMethod']('account_id')
          })
        }
      }
    `
    )

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
        file: 'database/migrations/accounts_v4',
        queries: [],
      },
      {
        status: 'pending',
        file: 'database/migrations/users_v4',
        queries: [],
      },
    ])

    assert.equal(migrator.status, 'error')
  })

  test('do not migrate a schema file twice', async ({ fs, assert, cleanup }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    cleanup(() => db.manager.closeAll())

    await fs.create(
      'database/migrations/accounts_v5.ts',
      `
      import { Schema } from '../../../../src/schema/main.js'
      export default class extends Schema {
        public async up () {
          this.schema.createTable('schema_accounts', (table) => {
            table.increments()
          })
        }
      }
    `
    )

    const migrator = getMigrator(db, app, { direction: 'up', connectionName: 'primary' })
    await migrator.run()

    await fs.create(
      'database/migrations/users_v5.ts',
      `
      import { Schema } from '../../../../src/schema/main.js'
      export default class extends Schema {
        public async up () {
          this.schema.createTable('schema_users', (table) => {
            table.increments()
          })
        }
      }
    `
    )

    const migrator1 = getMigrator(db, app, { direction: 'up', connectionName: 'primary' })
    await migrator1.run()

    const migrator2 = getMigrator(db, app, { direction: 'up', connectionName: 'primary' })
    await migrator2.run()

    assert.equal(migrator2.status, 'skipped')

    const migrated = await db.connection().from('adonis_schema').select('*')
    const hasUsersTable = await db.connection().schema.hasTable('schema_users')
    const hasAccountsTable = await db.connection().schema.hasTable('schema_accounts')

    assert.lengthOf(migrated, 2)
    assert.equal(migrated[0].name, 'database/migrations/accounts_v5')
    assert.equal(migrated[0].batch, 1)

    assert.equal(migrated[1].name, 'database/migrations/users_v5')
    assert.equal(migrated[1].batch, 2)

    assert.isTrue(hasAccountsTable, 'Has accounts table')
    assert.isTrue(hasUsersTable, 'Has users table')
  })

  test('rollback database using schema files to a given batch', async ({ fs, assert, cleanup }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    cleanup(() => db.manager.closeAll())

    await fs.create(
      'database/migrations/users_v6.ts',
      `
      import { Schema } from '../../../../src/schema/main.js'
      export default class extends Schema {
        public async up () {
          this.schema.createTable('schema_users', (table) => {
            table.increments()
          })
        }

        public async down () {
          this.schema.dropTable('schema_users')
        }
      }
    `
    )

    const migrator = getMigrator(db, app, { direction: 'up', connectionName: 'primary' })
    await migrator.run()

    await fs.create(
      'database/migrations/accounts_v6.ts',
      `
      import { Schema } from '../../../../src/schema/main.js'
      export default class extends Schema {
        public async up () {
          this.schema.createTable('schema_accounts', (table) => {
            table.increments()
          })
        }

        public async down () {
          this.schema.dropTable('schema_accounts')
        }
      }
    `
    )

    const migrator1 = getMigrator(db, app, { direction: 'up', connectionName: 'primary' })
    await migrator1.run()

    const migrator2 = getMigrator(db, app, {
      direction: 'down',
      batch: 1,
      connectionName: 'primary',
    })
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
    assert.deepEqual(migratedFiles, [
      {
        status: 'completed',
        file: 'database/migrations/accounts_v6',
        queries: [],
      },
    ])
  })

  test('rollback database to the latest batch', async ({ fs, assert, cleanup }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    cleanup(() => db.manager.closeAll())

    await fs.create(
      'database/migrations/users_v7.ts',
      `
      import { Schema } from '../../../../src/schema/main.js'
      export default class extends Schema {
        public async up () {
          this.schema.createTable('schema_users', (table) => {
            table.increments()
          })
        }

        public async down () {
          this.schema.dropTable('schema_users')
        }
      }
    `
    )

    const migrator = getMigrator(db, app, { direction: 'up', connectionName: 'primary' })
    await migrator.run()

    await fs.create(
      'database/migrations/accounts_v7.ts',
      `
      import { Schema } from '../../../../src/schema/main.js'
      export default class extends Schema {
        public async up () {
          this.schema.createTable('schema_accounts', (table) => {
            table.increments()
          })
        }

        public async down () {
          this.schema.dropTable('schema_accounts')
        }
      }
    `
    )

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
    assert.deepEqual(migratedFiles, [
      {
        status: 'completed',
        file: 'database/migrations/accounts_v7',
        queries: [],
      },
    ])
  })

  test('rollback all down to batch 0', async ({ fs, assert, cleanup }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    cleanup(() => db.manager.closeAll())

    await fs.create(
      'database/migrations/users_v8.ts',
      `
      import { Schema } from '../../../../src/schema/main.js'
      export default class extends Schema {
        public async up () {
          this.schema.createTable('schema_users', (table) => {
            table.increments()
          })
        }

        public async down () {
          this.schema.dropTable('schema_users')
        }
      }
    `
    )

    const migrator = getMigrator(db, app, { direction: 'up', connectionName: 'primary' })
    await migrator.run()

    await fs.create(
      'database/migrations/accounts_v8.ts',
      `
      import { Schema } from '../../../../src/schema/main.js'
      export default class extends Schema {
        public async up () {
          this.schema.createTable('schema_accounts', (table) => {
            table.increments()
          })
        }

        public async down () {
          this.schema.dropTable('schema_accounts')
        }
      }
    `
    )

    const migrator1 = getMigrator(db, app, { direction: 'up', connectionName: 'primary' })
    await migrator1.run()

    const migrator2 = getMigrator(db, app, {
      direction: 'down',
      batch: 0,
      connectionName: 'primary',
    })
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
        file: 'database/migrations/accounts_v8',
        queries: [],
      },
      {
        status: 'completed',
        file: 'database/migrations/users_v8',
        queries: [],
      },
    ])
  })

  test('rollback multiple times must be a noop', async ({ fs, assert, cleanup }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    cleanup(() => db.manager.closeAll())

    await fs.create(
      'database/migrations/users_v9.ts',
      `
      import { Schema } from '../../../../src/schema/main.js'
      export default class extends Schema {
        public async up () {
          this.schema.createTable('schema_users', (table) => {
            table.increments()
          })
        }

        public async down () {
          this.schema.dropTable('schema_users')
        }
      }
    `
    )

    const migrator = getMigrator(db, app, { direction: 'up', connectionName: 'primary' })
    await migrator.run()

    await fs.create(
      'database/migrations/accounts_v9.ts',
      `
      import { Schema } from '../../../../src/schema/main.js'
      export default class extends Schema {
        public async up () {
          this.schema.createTable('schema_accounts', (table) => {
            table.increments()
          })
        }

        public async down () {
          this.schema.dropTable('schema_accounts')
        }
      }
    `
    )

    const migrator1 = getMigrator(db, app, { direction: 'up', connectionName: 'primary' })
    await migrator1.run()

    const migrator2 = getMigrator(db, app, {
      direction: 'down',
      batch: 0,
      connectionName: 'primary',
    })
    await migrator2.run()

    const migrator3 = getMigrator(db, app, {
      direction: 'down',
      batch: 0,
      connectionName: 'primary',
    })
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
        file: 'database/migrations/accounts_v9',
        queries: [],
      },
      {
        status: 'completed',
        file: 'database/migrations/users_v9',
        queries: [],
      },
    ])
    assert.deepEqual(migrator3Files, [])
  })

  test('do not rollback in dryRun', async ({ fs, assert, cleanup }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    cleanup(() => db.manager.closeAll())

    await fs.create(
      'database/migrations/users_v10.ts',
      `
      import { Schema } from '../../../../src/schema/main.js'
      export default class extends Schema {
        public async up () {
          this.schema.createTable('schema_users', (table) => {
            table.increments()
          })
        }

        public async down () {
          this.schema.dropTable('schema_users')
        }
      }
    `
    )

    const migrator = getMigrator(db, app, { direction: 'up', connectionName: 'primary' })
    await migrator.run()

    await fs.create(
      'database/migrations/accounts_v10.ts',
      `
      import { Schema } from '../../../../src/schema/main.js'
      export default class extends Schema {
        public async up () {
          this.schema.createTable('schema_accounts', (table) => {
            table.increments()
          })
        }

        public async down () {
          this.schema.dropTable('schema_accounts')
        }
      }
    `
    )

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
        file: 'database/migrations/accounts_v10',
        queries: [db.connection().schema.dropTable('schema_accounts').toQuery()],
      },
      {
        status: 'completed',
        file: 'database/migrations/users_v10',
        queries: [db.connection().schema.dropTable('schema_users').toQuery()],
      },
    ])
  })

  test('do not rollback when a schema file goes missing', async ({ fs, assert, cleanup }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    cleanup(() => db.manager.closeAll())

    assert.plan(4)

    await fs.create(
      'database/migrations/users_v11.ts',
      `
      import { Schema } from '../../../../src/schema/main.js'
      export default class extends Schema {
        public async up () {
          this.schema.createTable('schema_users', (table) => {
            table.increments()
          })
        }

        public async down () {
          this.schema.dropTable('schema_users')
        }
      }
    `
    )

    await fs.create(
      'database/migrations/accounts_v11.ts',
      `
      import { Schema } from '../../../../src/schema/main.js'
      export default class extends Schema {
        public async up () {
          this.schema.createTable('schema_accounts', (table) => {
            table.increments()
          })
        }

        public async down () {
          this.schema.dropTable('schema_accounts')
        }
      }
    `
    )

    const migrator = getMigrator(db, app, { direction: 'up', connectionName: 'primary' })
    await migrator.run()

    await fs.remove('database/migrations/accounts_v11.ts')

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
      'Cannot perform rollback. Schema file {database/migrations/accounts_v11} is missing'
    )
  })

  test('get list of migrated files', async ({ fs, assert, cleanup }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    cleanup(() => db.manager.closeAll())

    await fs.create(
      'database/migrations/users_v12.ts',
      `
      import { Schema } from '../../../../src/schema/main.js'
      export default class extends Schema {
        public async up () {
          this.schema.createTable('schema_users', (table) => {
            table.increments()
          })
        }

        public async down () {
          this.schema.dropTable('schema_users')
        }
      }
    `
    )

    await fs.create(
      'database/migrations/accounts_v12.ts',
      `
      import { Schema } from '../../../../src/schema/main.js'
      export default class extends Schema {
        public async up () {
          this.schema.createTable('schema_accounts', (table) => {
            table.increments()
          })
        }

        public async down () {
          this.schema.dropTable('schema_accounts')
        }
      }
    `
    )

    const migrator = getMigrator(db, app, { direction: 'up', connectionName: 'primary' })
    await migrator.run()
    const files = await migrator.getList()

    assert.lengthOf(files, 2)
    assert.equal(files[0].name, 'database/migrations/accounts_v12')
    assert.equal(files[0].batch, 1)

    assert.equal(files[1].name, 'database/migrations/users_v12')
    assert.equal(files[1].batch, 1)
  })

  test('skip upcoming migrations after failure', async ({ fs, assert, cleanup }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    cleanup(() => db.manager.closeAll())

    await fs.create(
      'database/migrations/users_v13.ts',
      `
      import { Schema } from '../../../../src/schema/main.js'
      export default class extends Schema {
        public async up () {
          this.schema.createTable('schema_users', (table) => {
            table.increments()
          })
        }
      }
    `
    )

    await fs.create(
      'database/migrations/accounts_v13.ts',
      `
      import { Schema } from '../../../../src/schema/main.js'
      export default class extends Schema {
        public async up () {
          this.schema.createTable('schema_accounts', (table) => {
            table.increments()
            table['badMethod']('account_id')
          })
        }
      }
    `
    )

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
        file: 'database/migrations/accounts_v13',
        queries: [],
      },
      {
        status: 'pending',
        file: 'database/migrations/users_v13',
        queries: [],
      },
    ])

    assert.equal(migrator.status, 'error')
  })

  test('use a natural sort to order files when configured', async ({ fs, assert, cleanup }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    cleanup(() => db.manager.closeAll())

    const originalConfig = Object.assign({}, db.getRawConnection('primary')!.config)

    db.getRawConnection('primary')!.config.migrations = {
      naturalSort: true,
    }

    await fs.create(
      'database/migrations/12_users.ts',
      `
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
    `
    )

    await fs.create(
      'database/migrations/1_accounts.ts',
      `
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
    `
    )

    const migrator = getMigrator(db, app, { direction: 'up', connectionName: 'primary' })
    await migrator.run()
    const files = await migrator.getList()

    db.getRawConnection('primary')!.config = originalConfig

    assert.lengthOf(files, 2)
    assert.equal(files[0].name, `database${sep}migrations${sep}1_accounts`)
    assert.equal(files[1].name, `database${sep}migrations${sep}12_users`)
  })

  test('use a natural sort to order nested files when configured', async ({
    fs,
    assert,
    cleanup,
  }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    cleanup(() => db.manager.closeAll())

    const originalConfig = Object.assign({}, db.getRawConnection('primary')!.config)

    db.getRawConnection('primary')!.config.migrations = {
      naturalSort: true,
    }

    await fs.create(
      'database/migrations/1/12_users.ts',
      `
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
    `
    )

    await fs.create(
      'database/migrations/12/1_accounts.ts',
      `
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
    `
    )

    const migrator = getMigrator(db, app, { direction: 'up', connectionName: 'primary' })
    await migrator.run()
    const files = await migrator.getList()

    db.getRawConnection('primary')!.config = originalConfig

    assert.lengthOf(files, 2)
    assert.equal(files[0].name, `database${sep}migrations${sep}1${sep}12_users`)
    assert.equal(files[1].name, `database${sep}migrations${sep}12${sep}1_accounts`)
  })

  test('raise exception when rollbacks in production are disabled', async ({
    fs,
    assert,
    cleanup,
  }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    cleanup(() => db.manager.closeAll())

    const originalConfig = Object.assign({}, db.getRawConnection('primary')!.config)

    db.getRawConnection('primary')!.config.migrations = {
      disableRollbacksInProduction: true,
    }

    await fs.create(
      'database/migrations/users_v14.ts',
      `
      import { Schema } from '../../../../src/schema/main.js'
      export default class extends Schema {
        public async up () {
          this.schema.createTable('schema_users', (table) => {
            table.increments()
          })
        }

        public async down () {
          this.schema.dropTable('schema_users')
        }
      }
    `
    )

    const migrator = getMigrator(db, app, { direction: 'up', connectionName: 'primary' })
    migrator.isInProduction = true
    await migrator.run()

    await fs.create(
      'database/migrations/accounts_v14.ts',
      `
      import { Schema } from '../../../../src/schema/main.js'
      export default class extends Schema {
        public async up () {
          this.schema.createTable('schema_accounts', (table) => {
            table.increments()
          })
        }

        public async down () {
          this.schema.dropTable('schema_accounts')
        }
      }
    `
    )

    const migrator1 = getMigrator(db, app, { direction: 'up', connectionName: 'primary' })
    migrator1.isInProduction = true
    await migrator1.run()

    const migrator2 = getMigrator(db, app, { direction: 'down', connectionName: 'primary' })
    migrator2.isInProduction = true
    await migrator2.run()

    assert.equal(
      migrator2.error!.message,
      'Rollback in production environment is disabled. Check "config/database" file for options.'
    )

    const migrated = await db.connection().from('adonis_schema').select('*')
    const hasUsersTable = await db.connection().schema.hasTable('schema_users')
    const hasAccountsTable = await db.connection().schema.hasTable('schema_accounts')

    assert.lengthOf(migrated, 2)
    assert.isTrue(hasUsersTable)
    assert.isTrue(hasAccountsTable)
    db.getRawConnection('primary')!.config = originalConfig

    delete process.env.NODE_ENV
  })

  test('upgrade old migration file name to new', async ({ fs, assert, cleanup }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    cleanup(() => db.manager.closeAll())

    await fs.create(
      'database/migrations/users_v15.ts',
      `
      import { Schema } from '../../../../src/schema/main.js'
      export default class extends Schema {
        public async up () {
          this.schema.createTable('schema_users', (table) => {
            table.increments()
          })
        }
      }
    `
    )

    const migrator = getMigrator(db, app, {
      direction: 'up',
      connectionName: 'primary',
    })

    if (!(await db.connection().schema.hasTable('adonis_schema'))) {
      await db.connection().schema.createTable('adonis_schema', (table) => {
        table.increments().notNullable()
        table.string('name').notNullable()
        table.integer('batch').notNullable()
        table.timestamp('migration_time').defaultTo(db.connection().getWriteClient().fn.now())
      })
    }

    await db.connection().table('adonis_schema').insert({
      name: 'database\\migrations\\users_v15',
      batch: 1,
    })

    assert.isFalse(await db.connection().schema.hasTable('adonis_schema_versions'))

    await migrator.run()

    const migrated = await db.connection().from('adonis_schema').select('*')
    const latestVersion = await db.connection().from('adonis_schema_versions').select('*')
    const hasUsersTable = await db.connection().schema.hasTable('schema_users')
    const migratedFiles = Object.keys(migrator.migratedFiles).map((file) => {
      return {
        status: migrator.migratedFiles[file].status,
        file: file,
        queries: migrator.migratedFiles[file].queries,
      }
    })

    assert.lengthOf(migrated, 1)
    assert.deepEqual(latestVersion, [{ version: 2 }])
    assert.equal(migrated[0].name, 'database/migrations/users_v15')
    assert.equal(migrated[0].batch, 1)
    assert.isFalse(hasUsersTable)
    assert.deepEqual(migratedFiles, [])
    assert.equal(migrator.status, 'skipped')
  })

  test('upgrade file names also in dryRun', async ({ fs, assert, cleanup }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    cleanup(() => db.manager.closeAll())

    await fs.create(
      'database/migrations/users_v16.ts',
      `
      import { Schema } from '../../../../src/schema/main.js'
      export default class extends Schema {
        public async up () {
          this.schema.createTable('schema_users', (table) => {
            table.increments()
          })
        }
      }
    `
    )

    const migrator = getMigrator(db, app, {
      direction: 'up',
      dryRun: true,
      connectionName: 'primary',
    })

    if (!(await db.connection().schema.hasTable('adonis_schema'))) {
      await db.connection().schema.createTable('adonis_schema', (table) => {
        table.increments().notNullable()
        table.string('name').notNullable()
        table.integer('batch').notNullable()
        table.timestamp('migration_time').defaultTo(db.connection().getWriteClient().fn.now())
      })
    }

    await db.connection().table('adonis_schema').insert({
      name: 'database\\migrations\\users_v16',
      batch: 1,
    })

    assert.isFalse(await db.connection().schema.hasTable('adonis_schema_versions'))

    await migrator.run()

    const migrated = await db.connection().from('adonis_schema').select('*')
    const latestVersion = await db.connection().from('adonis_schema_versions').select('*')
    const hasUsersTable = await db.connection().schema.hasTable('schema_users')
    const migratedFiles = Object.keys(migrator.migratedFiles).map((file) => {
      return {
        status: migrator.migratedFiles[file].status,
        file: file,
        queries: migrator.migratedFiles[file].queries,
      }
    })

    assert.lengthOf(migrated, 1)
    assert.deepEqual(latestVersion, [{ version: 2 }])
    assert.equal(migrated[0].name, 'database/migrations/users_v16')
    assert.equal(migrated[0].batch, 1)
    assert.isFalse(hasUsersTable)
    assert.deepEqual(migratedFiles, [])
    assert.equal(migrator.status, 'skipped')
  })
})
