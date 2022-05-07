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
import { test } from '@japa/runner'
import { Kernel } from '@adonisjs/core/build/standalone'
import { ApplicationContract } from '@ioc:Adonis/Core/Application'

import DbSeed from '../../commands/DbSeed'
import { fs, setup, cleanup, getDb, setupApplication } from '../../test-helpers'

let app: ApplicationContract
let db: ReturnType<typeof getDb>

test.group('DbSeed', (group) => {
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

  test('run seeders', async ({ assert }) => {
    await fs.add(
      'database/seeders/user.ts',
      `export default class UserSeeder {
        public async run () {
          process.env.EXEC_USER_SEEDER = 'true'
        }
      }`
    )

    const kernel = new Kernel(app).mockConsoleOutput()
    kernel.register([DbSeed])
    await kernel.exec('db:seed', [])

    assert.equal(process.env.EXEC_USER_SEEDER, 'true')
    delete process.env.EXEC_USER_SEEDER
  })

  test('cherry pick files', async ({ assert }) => {
    await fs.add(
      'database/seeders/user.ts',
      `export default class UserSeeder {
        public async run () {
          process.env.EXEC_USER_SEEDER = 'true'
        }
      }`
    )

    await fs.add(
      'database/seeders/post.ts',
      `export default class PostSeeder {
        public async run () {
          process.env.EXEC_POST_SEEDER = 'true'
        }
      }`
    )

    const kernel = new Kernel(app).mockConsoleOutput()
    kernel.register([DbSeed])
    await kernel.exec('db:seed', ['--files', './database/seeders/post.ts'])

    assert.isUndefined(process.env.EXEC_USER_SEEDER)
    assert.equal(process.env.EXEC_POST_SEEDER, 'true')
    delete process.env.EXEC_POST_SEEDER
  })

  test('run seeders with compact output', async ({ assert }) => {
    await fs.add(
      'database/seeders/user.ts',
      `export default class UserSeeder {
        public async run () {}
      }`
    )

    await fs.add(
      'database/seeders/client.ts',
      `export default class ClientSeeder {
        public async run () {}
      }`
    )

    await fs.add(
      'database/seeders/post.ts',
      `export default class PostSeeder {
        public static developmentOnly = true

        public async run () {}
      }`
    )

    const kernel = new Kernel(app).mockConsoleOutput()
    kernel.register([DbSeed])

    app.nodeEnvironment = 'production'
    const command = await kernel.exec('db:seed', ['--compact-output'])
    app.nodeEnvironment = 'test'

    assert.deepEqual(command.ui.testingRenderer.logs.length, 1)
    assert.deepInclude(command.ui.testingRenderer.logs[0].message, 'Executed 2 seeders, 1 ignored')
  })
})
