/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import 'reflect-metadata'
import { test } from '@japa/runner'
import { AceFactory } from '@adonisjs/core/factories'

import DbSeed from '../../commands/db_seed.js'
import { setup, cleanup, getDb } from '../../test-helpers/index.js'

test.group('DbSeed', (group) => {
  group.each.setup(async () => {
    await setup()

    return async () => {
      await cleanup()
      await cleanup(['adonis_schema', 'adonis_schema_versions', 'schema_users', 'schema_accounts'])
    }
  })

  test('run seeders', async ({ fs, assert }) => {
    await fs.create(
      'database/seeders/user.ts',
      `export default class UserSeeder {
        async run () {
          process.env.EXEC_USER_SEEDER = 'true'
        }
      }`
    )

    const ace = await new AceFactory().make(fs.baseUrl, {
      importer: () => {},
    })
    await ace.app.init()
    ace.app.container.singleton('lucid.db', () => getDb())
    ace.ui.switchMode('raw')

    const command = await ace.create(DbSeed, [])
    await command.exec()

    command.assertLog('green(❯) green(completed) database/seeders/user')
    assert.equal(process.env.EXEC_USER_SEEDER, 'true')
    delete process.env.EXEC_USER_SEEDER
  })

  test('cherry pick files using the --files flag', async ({ fs, assert }) => {
    await fs.create(
      'database/seeders/user.ts',
      `export default class UserSeeder {
        public async run () {
          process.env.EXEC_USER_SEEDER = 'true'
        }
      }`
    )

    await fs.create(
      'database/seeders/post.ts',
      `export default class PostSeeder {
        public async run () {
          process.env.EXEC_POST_SEEDER = 'true'
        }
      }`
    )

    const ace = await new AceFactory().make(fs.baseUrl, {
      importer: () => {},
    })
    await ace.app.init()
    ace.app.container.singleton('lucid.db', () => getDb())
    ace.ui.switchMode('raw')

    const command = await ace.create(DbSeed, ['--files', './database/seeders/post.ts'])
    await command.exec()

    assert.deepEqual(command.logger.getLogs(), [
      {
        message: 'green(❯) green(completed) database/seeders/post',
        stream: 'stdout',
      },
    ])

    assert.isUndefined(process.env.EXEC_USER_SEEDER)
    assert.equal(process.env.EXEC_POST_SEEDER, 'true')
    delete process.env.EXEC_POST_SEEDER
  })

  test('run seeders with compact output', async ({ fs }) => {
    await fs.create(
      'database/seeders/user.ts',
      `export default class UserSeeder {
        public async run () {}
      }`
    )

    await fs.create(
      'database/seeders/client.ts',
      `export default class ClientSeeder {
        public async run () {}
      }`
    )

    await fs.create(
      'database/seeders/post.ts',
      `export default class PostSeeder {
        public static developmentOnly = true

        public async run () {}
      }`
    )

    const ace = await new AceFactory().make(fs.baseUrl, {
      importer: () => {},
    })
    await ace.app.init()
    ace.app.container.singleton('lucid.db', () => getDb())
    ace.ui.switchMode('raw')

    const command = await ace.create(DbSeed, ['--compact-output'])
    await command.exec()

    command.assertLog('grey(❯ Executed 3 seeders)')
  })
})
