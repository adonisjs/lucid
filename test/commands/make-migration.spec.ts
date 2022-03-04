/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference path="../../adonis-typings/index.ts" />

import 'reflect-metadata'
import { join } from 'path'
import { test } from '@japa/runner'
import { Filesystem } from '@poppinss/dev-utils'
import { Kernel } from '@adonisjs/core/build/standalone'
import { ApplicationContract } from '@ioc:Adonis/Core/Application'

import { Database } from '../../src/Database'
import MakeMigration from '../../commands/MakeMigration'
import {
  fs,
  setup,
  getDb,
  cleanup,
  getConfig,
  toNewlineArray,
  setupApplication,
} from '../../test-helpers'

let db: ReturnType<typeof getDb>
let app: ApplicationContract
const templatesFs = new Filesystem(join(__dirname, '..', '..', 'templates'))

test.group('MakeMigration', (group) => {
  group.each.setup(async () => {
    app = await setupApplication()
    return () => fs.cleanup()
  })

  group.each.setup(async () => {
    db = getDb(app)
    app.container.bind('Adonis/Lucid/Database', () => db)
    await setup()

    return async () => {
      await cleanup()
      await cleanup(['adonis_schema', 'adonis_schema_versions', 'schema_users', 'schema_accounts'])
      await db.manager.closeAll(true)
    }
  })

  test('create migration in the default migrations directory', async ({ assert }) => {
    const kernel = new Kernel(app)
    kernel.register([MakeMigration])
    const makeMigration = await kernel.exec('make:migration', ['user'])

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

  test('create migration for alter table', async ({ assert }) => {
    const kernel = new Kernel(app)
    kernel.register([MakeMigration])
    const makeMigration = await kernel.exec('make:migration', ['user', '--table=my_users'])

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

  test('create migration for make table with custom table name', async ({ assert }) => {
    const kernel = new Kernel(app)
    kernel.register([MakeMigration])
    const makeMigration = await kernel.exec('make:migration', ['user', '--create=my_users'])

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

  test('create migration file inside a sub-folder', async ({ assert }) => {
    const kernel = new Kernel(app)
    kernel.register([MakeMigration])
    const makeMigration = await kernel.exec('make:migration', ['profile/users', '--create=users'])

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

  test('raise error when defined connection is invalid', async ({ assert }) => {
    const kernel = new Kernel(app)
    kernel.register([MakeMigration])
    const makeMigration = await kernel.exec('make:migration', ['profile/users', '--connection=foo'])

    assert.equal(makeMigration.exitCode, 1)
    assert.deepEqual(makeMigration.ui.testingRenderer.logs, [
      {
        stream: 'stderr',
        message:
          '[ red(error) ]  "foo" is not a valid connection name. Double check "config/database" file',
      },
    ])
  })

  test('use custom directory when defined')
    .setup(() => {
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
      return () => customDb.manager.closeAll()
    })
    .run(async ({ assert }) => {
      const kernel = new Kernel(app)
      kernel.register([MakeMigration])
      const makeMigration = await kernel.exec('make:migration', ['users', '--folder=database/c'])

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
    })
})
