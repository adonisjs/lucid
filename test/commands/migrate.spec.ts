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
import 'reflect-metadata'
import { join } from 'path'
import { Kernel } from '@adonisjs/ace'
import { Filesystem } from '@poppinss/dev-utils'
import { Application } from '@adonisjs/application/build/standalone'

import Migrate from '../../commands/Migrate'
import { setup, cleanup, getDb } from '../../test-helpers'

let db: ReturnType<typeof getDb>
const fs = new Filesystem(join(__dirname, 'app'))

test.group('MakeMigration', (group) => {
  group.beforeEach(async () => {
    db = getDb()
    await setup()
  })

  group.afterEach(async () => {
    await cleanup()
    await cleanup(['adonis_schema', 'schema_users', 'schema_accounts'])
    await fs.cleanup()
  })

  test('run migrations from default directory', async (assert) => {
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

    const app = new Application(fs.basePath, {} as any, {} as any, {})
    const migrate = new Migrate(app, new Kernel(app), db)

    await migrate.handle()
    db = getDb()

    const migrated = await db.connection().from('adonis_schema').select('*')
    const hasUsersTable = await db.connection().schema.hasTable('schema_users')

    assert.lengthOf(migrated, 1)
    assert.isTrue(hasUsersTable)
    assert.equal(migrated[0].name, 'database/migrations/users')
    assert.equal(migrated[0].batch, 1)
  })

  test('skip migrations when already upto date', async (assert) => {
    await fs.fsExtra.ensureDir(join(fs.basePath, 'database/migrations'))

    const app = new Application(fs.basePath, {} as any, {} as any, {})
    const migrate = new Migrate(app, new Kernel(app), db)

    await migrate.handle()

    db = getDb()
    const migrated = await db.connection().from('adonis_schema').select('*')
    assert.lengthOf(migrated, 0)
  })

  test('print sql queries in dryRun', async (assert) => {
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

    const app = new Application(fs.basePath, {} as any, {} as any, {})
    const migrate = new Migrate(app, new Kernel(app), db)
    migrate.dryRun = true

    await migrate.handle()

    db = getDb()
    const migrated = await db.connection().from('adonis_schema').select('*')
    assert.lengthOf(migrated, 0)
  })
})
