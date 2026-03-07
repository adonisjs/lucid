/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import 'reflect-metadata'
import { join } from 'node:path'
import { readdir, readFile } from 'node:fs/promises'
import { test } from '@japa/runner'
import { AceFactory } from '@adonisjs/core/factories'

import SchemaDump from '../../commands/schema_dump.js'
import {
  setup,
  cleanupTestDatabase,
  getConfig,
  getDb,
  supportsSchemaDump,
} from '../../test-helpers/index.js'

test.group('schema:dump', (group) => {
  group.each.setup(async () => {
    await cleanupTestDatabase(['adonis_schema', 'adonis_schema_versions', 'schema_users'])
    await setup()
    return async () => {
      await cleanupTestDatabase(['adonis_schema', 'adonis_schema_versions', 'schema_users'])
    }
  })

  test('dump schema to default path and write schema manifest', async ({ fs, assert }) => {
    const db = getDb()
    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    await ace.app.init()
    ace.app.container.singleton('lucid.db', () => db)
    ace.ui.switchMode('raw')

    await db.connection().schema.createTable('schema_users', (table) => {
      table.increments()
      table.string('email')
    })
    await db.connection().table('schema_users').insert({ email: 'jul@adonisjs.com' })

    await db.connection().schema.createTable('adonis_schema', (table) => {
      table.increments()
      table.string('name').notNullable()
      table.integer('batch').notNullable()
      table.timestamp('migration_time').defaultTo(db.connection().getWriteClient().fn.now())
    })

    await db.connection().schema.createTable('adonis_schema_versions', (table) => {
      table.integer('version').unsigned().primary()
    })

    await db.connection().table('adonis_schema').insert({
      name: 'database/migrations/1_create_users',
      batch: 1,
    })
    await db.connection().table('adonis_schema_versions').insert({ version: 2 })

    const command = await ace.create(SchemaDump, [])
    await command.exec()

    const dumpPath = join(fs.basePath, 'database/schema/primary-schema.sql')
    const metaPath = join(fs.basePath, 'database/schema/primary-schema.meta.json')
    const dumpContents = await readFile(dumpPath, 'utf-8')
    const manifest = JSON.parse(await readFile(metaPath, 'utf-8'))

    assert.equal(command.exitCode, 0)
    assert.include(dumpContents, 'schema_users')
    assert.include(dumpContents, 'adonis_schema')
    assert.include(dumpContents, 'database/migrations/1_create_users')
    assert.notInclude(dumpContents, 'jul@adonisjs.com')
    assert.equal(manifest.connection, 'primary')
    assert.equal(manifest.dumpPath, 'database/schema/primary-schema.sql')
    assert.equal(manifest.schemaTableName, 'adonis_schema')
    assert.equal(manifest.schemaVersionsTableName, 'adonis_schema_versions')
    assert.deepEqual(manifest.squashedMigrationNames, ['database/migrations/1_create_users'])
  }).skip(!supportsSchemaDump, 'Schema dumps are not supported for the current database dialect')

  test('use custom dump path when provided', async ({ fs, assert }) => {
    const db = getDb()
    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    await ace.app.init()
    ace.app.container.singleton('lucid.db', () => db)
    ace.ui.switchMode('raw')

    await db.connection().schema.createTable('schema_users', (table) => {
      table.increments()
    })

    const command = await ace.create(SchemaDump, ['--path=tmp/schema/custom.sql'])
    await command.exec()

    assert.equal(command.exitCode, 0)
    assert.isTrue(await fs.exists('tmp/schema/custom.sql'))
    assert.isTrue(await fs.exists('tmp/schema/custom.meta.json'))
  }).skip(!supportsSchemaDump, 'Schema dumps are not supported for the current database dialect')

  test('prune configured migration paths after dumping schema', async ({ fs, assert }) => {
    const baseConfig = getConfig()
    const db = getDb(undefined, {
      connection: 'primary',
      connections: {
        primary: {
          ...baseConfig,
          migrations: {
            ...(baseConfig.migrations || {}),
            paths: ['./database/primary', './database/secondary'],
          },
        },
        secondary: getConfig(),
      },
    })

    await fs.create('database/primary/1_create_users.ts', 'export default class {}')
    await fs.create('database/secondary/2_create_posts.ts', 'export default class {}')

    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    await ace.app.init()
    ace.app.container.singleton('lucid.db', () => db)
    ace.ui.switchMode('raw')

    const command = await ace.create(SchemaDump, ['--prune'])
    await command.exec()

    assert.equal(command.exitCode, 0)
    assert.deepEqual(await readdir(join(fs.basePath, 'database/primary')), [])
    assert.deepEqual(await readdir(join(fs.basePath, 'database/secondary')), [])
  }).skip(!supportsSchemaDump, 'Schema dumps are not supported for the current database dialect')

  test('error on invalid connection', async ({ fs, assert }) => {
    const db = getDb()
    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    await ace.app.init()
    ace.app.container.singleton('lucid.db', () => db)
    ace.ui.switchMode('raw')

    const command = await ace.create(SchemaDump, ['--connection=unknown'])
    await command.exec()

    assert.equal(command.exitCode, 1)
    command.assertLogMatches(/is not a valid connection name/)
  })

  test('display the underlying dump error for unsupported clients', async ({ fs, assert }) => {
    const baseConfig = getConfig()
    const db = getDb(undefined, {
      connection: 'primary',
      connections: {
        primary: {
          ...baseConfig,
          client: 'mssql',
        } as typeof baseConfig,
        secondary: getConfig(),
      },
    })

    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    await ace.app.init()
    ace.app.container.singleton('lucid.db', () => db)
    ace.ui.switchMode('raw')

    const command = await ace.create(SchemaDump, [])
    await command.exec()

    assert.equal(command.exitCode, 1)
    command.assertLogMatches(/Unable to dump database schema/)
    command.assertLogMatches(/Schema dumps are not supported for "mssql" yet/)
  })

  if (['sqlite', 'better_sqlite'].includes(process.env.DB || '')) {
    test('display the underlying dump error for invalid sqlite dump targets', async ({
      fs,
      assert,
    }) => {
      const baseConfig = getConfig()
      const db = getDb(undefined, {
        connection: 'primary',
        connections: {
          primary: {
            ...baseConfig,
            connection: {
              ...(baseConfig.connection as Record<string, any>),
              filename: ':memory:',
            },
          } as typeof baseConfig,
          secondary: getConfig(),
        },
      })

      const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
      await ace.app.init()
      ace.app.container.singleton('lucid.db', () => db)
      ace.ui.switchMode('raw')

      const command = await ace.create(SchemaDump, [])
      await command.exec()

      assert.equal(command.exitCode, 1)
      command.assertLogMatches(/Unable to dump database schema/)
      command.assertLogMatches(/Cannot create a schema dump from an in-memory SQLite database/)
    })
  }

  if (process.env.DB === 'mysql') {
    test('strip auto increment state from mysql dumps', async ({ fs, assert }) => {
      const db = getDb()
      const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
      await ace.app.init()
      ace.app.container.singleton('lucid.db', () => db)
      ace.ui.switchMode('raw')

      await db.connection().schema.createTable('schema_users', (table) => {
        table.increments()
        table.string('email')
      })

      await db
        .connection()
        .table('schema_users')
        .insert([
          { email: 'one@example.com' },
          { email: 'two@example.com' },
          { email: 'three@example.com' },
        ])

      const command = await ace.create(SchemaDump, [])
      await command.exec()

      const dumpPath = join(fs.basePath, 'database/schema/primary-schema.sql')
      const dumpContents = await readFile(dumpPath, 'utf-8')

      assert.equal(command.exitCode, 0)
      assert.notMatch(dumpContents, /AUTO_INCREMENT=\d+/)
    })
  }

  if (process.env.DB === 'pg') {
    test('accept postgres connectionString config when dumping schema', async ({ fs, assert }) => {
      const baseConfig = getConfig()
      const configConnection = baseConfig.connection as Record<string, string | number | undefined>
      const db = getDb(undefined, {
        connection: 'primary',
        connections: {
          primary: {
            ...baseConfig,
            connection: {
              connectionString: `postgres://${encodeURIComponent(String(configConnection.user))}:${encodeURIComponent(String(configConnection.password || ''))}@${configConnection.host}:${configConnection.port}/${configConnection.database}`,
            },
          } as typeof baseConfig,
          secondary: getConfig(),
        },
      })

      const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
      await ace.app.init()
      ace.app.container.singleton('lucid.db', () => db)
      ace.ui.switchMode('raw')

      const command = await ace.create(SchemaDump, [])
      await command.exec()

      assert.equal(command.exitCode, 0)
      assert.isTrue(await fs.exists('database/schema/primary-schema.sql'))
    })
  }
})
