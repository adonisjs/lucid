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
import { Kernel } from '@adonisjs/core/build/standalone'
import { Filesystem } from '@poppinss/dev-utils'

import { Database } from '../../src/Database'
import MakeMigration from '../../commands/MakeMigration'
import {
  fs,
  setup,
  getDb,
  cleanup,
  getConfig,
  resetTables,
  setupApplication,
  toNewlineArray,
} from '../../test-helpers'
import { ApplicationContract } from '@ioc:Adonis/Core/Application'

let db: ReturnType<typeof getDb>
let app: ApplicationContract
const templatesFs = new Filesystem(join(__dirname, '..', '..', 'templates'))

test.group('MakeMigration', (group) => {
  group.before(async () => {
    app = await setupApplication()
    db = getDb(app)
    await setup()
  })

  group.beforeEach(() => {
    app.container.bind('Adonis/Lucid/Database', () => db)
  })

  group.after(async () => {
    await cleanup()
    await cleanup(['adonis_schema', 'schema_users', 'schema_accounts'])
    await fs.cleanup()
  })

  group.afterEach(async () => {
    await resetTables()
  })

  test('create migration in the default migrations directory', async (assert) => {
    const makeMigration = new MakeMigration(app, new Kernel(app))
    makeMigration.name = 'users'
    await makeMigration.run()

    assert.lengthOf(makeMigration.ui.testingRenderer.logs, 1)
    const successLog = makeMigration.ui.testingRenderer.logs[0]

    console.log(makeMigration.logger.colors)
    console.log(makeMigration.logger.colors.green('foo'))

    const userSchema = await fs.get(successLog.message.replace('green(CREATE:)', '').trim())
    const schemaTemplate = await templatesFs.get('migration-make.txt')

    assert.deepEqual(
      toNewlineArray(userSchema),
      toNewlineArray(
        schemaTemplate
          .replace('{{#toClassName}}{{ filename }}{{/toClassName}}', 'Users')
          .replace('{{#toTableName}}{{ filename }}{{/toTableName}}', 'users')
      )
    )
  })

  test('create migration for alter table', async (assert) => {
    const makeMigration = new MakeMigration(app, new Kernel(app))
    makeMigration.name = 'users'
    makeMigration.table = 'my_users'

    await makeMigration.run()

    assert.lengthOf(makeMigration.ui.testingRenderer.logs, 1)
    const successLog = makeMigration.ui.testingRenderer.logs[0]

    const userSchema = await fs.get(successLog.message.replace('green(CREATE:)', '').trim())
    const schemaTemplate = await templatesFs.get('migration-alter.txt')

    assert.deepEqual(
      toNewlineArray(userSchema),
      toNewlineArray(
        schemaTemplate
          .replace('{{#toClassName}}{{ filename }}{{/toClassName}}', 'MyUsers')
          .replace('{{#toTableName}}{{ filename }}{{/toTableName}}', 'my_users')
      )
    )
  })

  test('create migration for make table with custom table name', async (assert) => {
    const makeMigration = new MakeMigration(app, new Kernel(app))
    makeMigration.name = 'users'
    makeMigration.create = 'my_users'

    await makeMigration.run()

    assert.lengthOf(makeMigration.ui.testingRenderer.logs, 1)
    const successLog = makeMigration.ui.testingRenderer.logs[0]

    const userSchema = await fs.get(successLog.message.replace('green(CREATE:)', '').trim())
    const schemaTemplate = await templatesFs.get('migration-make.txt')

    assert.deepEqual(
      toNewlineArray(userSchema),
      toNewlineArray(
        schemaTemplate
          .replace('{{#toClassName}}{{ filename }}{{/toClassName}}', 'MyUsers')
          .replace('{{#toTableName}}{{ filename }}{{/toTableName}}', 'my_users')
      )
    )
  })

  test('create nested migration file', async (assert) => {
    const makeMigration = new MakeMigration(app, new Kernel(app))
    makeMigration.name = 'profile/users'

    await makeMigration.run()

    assert.lengthOf(makeMigration.ui.testingRenderer.logs, 1)
    const successLog = makeMigration.ui.testingRenderer.logs[0]

    const userSchema = await fs.get(successLog.message.replace('green(CREATE:)', '').trim())
    const schemaTemplate = await templatesFs.get('migration-make.txt')

    assert.deepEqual(
      toNewlineArray(userSchema),
      toNewlineArray(
        schemaTemplate
          .replace('{{#toClassName}}{{ filename }}{{/toClassName}}', 'Users')
          .replace('{{#toTableName}}{{ filename }}{{/toTableName}}', 'users')
      )
    )
  })

  test('raise error when defined connection is invalid', async (assert) => {
    const makeMigration = new MakeMigration(app, new Kernel(app))
    makeMigration.name = 'profile/users'
    makeMigration.connection = 'foo'

    await makeMigration.run()
    assert.deepEqual(makeMigration.ui.testingRenderer.logs, [
      {
        stream: 'stderr',
        message:
          '[ red(error) ]  foo is not a valid connection name. Double check config/database file',
      },
    ])
  })

  test('prompt for migration paths when multiple paths are defined', async (assert) => {
    const config = {
      connection: 'primary',
      connections: {
        primary: Object.assign(
          {
            migrations: {
              paths: ['database/a', 'database/b'],
            },
          },
          getConfig()
        ),
      },
    }

    const customDb = new Database(
      config,
      app.logger,
      app.profiler,
      app.container.use('Adonis/Core/Event')
    )

    app.container.bind('Adonis/Lucid/Database', () => customDb)
    const makeMigration = new MakeMigration(app, new Kernel(app))
    makeMigration.name = 'users'

    makeMigration.prompt.on('prompt', (prompt) => {
      prompt.select(1)
    })

    await makeMigration.run()
    const successLog = makeMigration.ui.testingRenderer.logs[0]
    const userSchema = await fs.get(successLog.message.replace('green(CREATE:)', '').trim())

    const schemaTemplate = await templatesFs.get('migration-make.txt')
    assert.isTrue(successLog.message.startsWith('green(CREATE:) database/b'))

    assert.deepEqual(
      toNewlineArray(userSchema),
      toNewlineArray(
        schemaTemplate
          .replace('{{#toClassName}}{{ filename }}{{/toClassName}}', 'Users')
          .replace('{{#toTableName}}{{ filename }}{{/toTableName}}', 'users')
      )
    )
    await customDb.manager.closeAll()
  })

  test('use custom directory when defined', async (assert) => {
    const config = {
      connection: 'primary',
      connections: {
        primary: Object.assign(
          {
            migrations: {
              paths: ['database/a', 'database/b'],
            },
          },
          getConfig()
        ),
      },
    }

    const customDb = new Database(
      config,
      app.logger,
      app.profiler,
      app.container.use('Adonis/Core/Event')
    )

    app.container.bind('Adonis/Lucid/Database', () => customDb)
    const makeMigration = new MakeMigration(app, new Kernel(app))
    makeMigration.name = 'users'
    makeMigration.folder = 'database/c'

    await makeMigration.run()
    const successLog = makeMigration.ui.testingRenderer.logs[0].message
    const userSchema = await fs.get(successLog.replace('green(CREATE:)', '').trim())
    const schemaTemplate = await templatesFs.get('migration-make.txt')

    assert.isTrue(successLog.startsWith('green(CREATE:) database/c'))

    assert.deepEqual(
      toNewlineArray(userSchema),
      toNewlineArray(
        schemaTemplate
          .replace('{{#toClassName}}{{ filename }}{{/toClassName}}', 'Users')
          .replace('{{#toTableName}}{{ filename }}{{/toTableName}}', 'users')
      )
    )
    await customDb.manager.closeAll()
  })
})
