/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference path="../../../adonis-typings/index.ts" />

import 'reflect-metadata'
import { join } from 'path'
import { test } from '@japa/runner'
import { Kernel } from '@adonisjs/core/build/standalone'
import { ApplicationContract } from '@ioc:Adonis/Core/Application'

import { Migrator } from '../../../src/Migrator'
import Migrate from '../../../commands/Migration/Run'
import { fs, setup, cleanup, getDb, setupApplication } from '../../../test-helpers'

let db: ReturnType<typeof getDb>
let app: ApplicationContract

test.group('migration:run', (group) => {
  group.each.setup(async () => {
    app = await setupApplication()
    await setup()
    return () => fs.cleanup()
  })

  group.each.setup(async () => {
    db = getDb(app)
    app.container.bind('Adonis/Lucid/Database', () => db)
    app.container.bind('Adonis/Lucid/Migrator', () => Migrator)
    return async () => {
      await cleanup()
      await cleanup(['adonis_schema', 'adonis_schema_versions', 'schema_users', 'schema_accounts'])
      await db.manager.closeAll(true)
    }
  })

  test('run migrations from default directory', async ({ assert }) => {
    await fs.add(
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

    const kernel = new Kernel(app).mockConsoleOutput()
    kernel.register([Migrate])
    await kernel.exec('migration:run', [])

    const migrated = await db.connection().from('adonis_schema').select('*')
    const hasUsersTable = await db.connection().schema.hasTable('schema_users')

    assert.lengthOf(migrated, 1)
    assert.isTrue(hasUsersTable)
    assert.equal(migrated[0].name, 'database/migrations/users')
    assert.equal(migrated[0].batch, 1)
  })

  test('skip migrations when already up to date', async ({ assert }) => {
    await fs.fsExtra.ensureDir(join(fs.basePath, 'database/migrations'))

    const kernel = new Kernel(app).mockConsoleOutput()
    kernel.register([Migrate])
    await kernel.exec('migration:run', [])

    const migrated = await db.connection().from('adonis_schema').select('*')
    assert.lengthOf(migrated, 0)
  })

  test('do not execute migrations in dry-run', async ({ assert }) => {
    await fs.add(
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

    const kernel = new Kernel(app).mockConsoleOutput()
    kernel.register([Migrate])
    await kernel.exec('migration:run', ['--dry-run'])

    const migrated = await db.connection().from('adonis_schema').select('*')
    assert.lengthOf(migrated, 0)
  })

  test('do not run migrations in production', async ({ assert }) => {
    assert.plan(1)
    app.nodeEnvironment = 'production'

    await fs.add(
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

    const kernel = new Kernel(app).mockConsoleOutput()
    kernel.register([Migrate]).interactive(false)
    await kernel.exec('migration:run', [])

    assert.isFalse(await db.connection().schema.hasTable('adonis_schema'))
  })

  test('run migrations in production when --force flag is passed', async ({ assert }) => {
    app.nodeEnvironment = 'production'

    await fs.add(
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

    const kernel = new Kernel(app).mockConsoleOutput()
    kernel.register([Migrate]).interactive(false)
    await kernel.exec('migration:run', ['--force'])

    const migrated = await db.connection().from('adonis_schema').select('*')
    const hasUsersTable = await db.connection().schema.hasTable('schema_users')

    assert.lengthOf(migrated, 1)
    assert.isTrue(hasUsersTable)
    assert.equal(migrated[0].name, 'database/migrations/users')
    assert.equal(migrated[0].batch, 1)
  })
})
