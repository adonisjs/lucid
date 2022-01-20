/// <reference path="../../adonis-typings/index.ts" />

import test from 'japa'
import 'reflect-metadata'
import { Kernel } from '@adonisjs/core/build/standalone'
import { ApplicationContract } from '@ioc:Adonis/Core/Application'
import Migrate from '../../commands/Migration/Run'
import { fs, setup, cleanup, getDb, setupApplication } from '../../test-helpers'
import { Migrator } from '../../src/Migrator'
import DbWipe from '../../commands/DbWipe'

let app: ApplicationContract
let db: ReturnType<typeof getDb>

test.group('db:wipe and migrate:fresh', (group) => {
  group.beforeEach(async () => {
    app = await setupApplication()
    db = getDb(app)
    app.container.bind('Adonis/Lucid/Database', () => db)
    app.container.bind('Adonis/Lucid/Migrator', () => Migrator)
    await setup()
  })

  group.afterEach(async () => {
    await cleanup()
    await cleanup(['adonis_schema', 'schema_users'])
    await fs.cleanup()
  })

  test('db:wipe should drop all tables', async (assert) => {
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

    const kernel = new Kernel(app)
    const migrate = new Migrate(app, kernel)
    await migrate.run()

    db = getDb(app)

    const wipe = new DbWipe(app, kernel)
    await wipe.run()

    db = getDb(app)
    const tables = await db.connection().getAllTables(['public'])
    assert.lengthOf(tables, 0)
  })
})
