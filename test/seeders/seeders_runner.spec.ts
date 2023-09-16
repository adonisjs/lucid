/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { AppFactory } from '@adonisjs/core/factories/app'

import { SeedsRunner } from '../../src/seeders_runner/index.js'
import { getDb, setup, cleanup as cleanupTables } from '../../test-helpers/index.js'

test.group('Seeds Runner', (group) => {
  group.each.setup(async () => {
    await setup()
  })

  group.each.teardown(async () => {
    await cleanupTables()
  })

  test('run a seeder file', async ({ fs, assert, cleanup }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    cleanup(() => db.manager.closeAll())

    const runner = new SeedsRunner(db, app)

    await fs.create(
      'database/seeders/User.ts',
      `export default class FooSeeder {
      static invoked = false

      run () {
        (this.constructor as any).invoked = true
      }
    }`
    )

    const files = await runner.getList()
    const report = await runner.run(files[0])
    const fileSource = await report.file.getSource()

    assert.equal((fileSource as any)['invoked'], true)
    assert.equal(report.status, 'completed')
  })

  test('catch and return seeder errors', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const runner = new SeedsRunner(db, app)

    await fs.create(
      'database/seeders/User_v1.ts',
      `export default class FooSeeder {
      run () {
        throw new Error('Failed')
      }
    }`
    )

    const files = await runner.getList()
    const report = await runner.run(files[0])
    assert.equal(report.status, 'failed')
    assert.exists(report.error)

    await db.manager.closeAll()
  })
  test('mark file as ignored when "environment = production" and not running in production mode', async ({
    assert,
    fs,
  }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()

    const runner = new SeedsRunner(db, app)
    runner.nodeEnvironment = 'development'

    await fs.create(
      'database/seeders/User_v2.ts',
      `export default class FooSeeder {
      public static invoked = false
      public static environment = ['production']

      run () {
        (this.constructor as any).invoked = true
      }
    }`
    )

    const files = await runner.getList()
    const report = await runner.run(files[0])
    assert.equal(report.status, 'ignored')

    delete process.env.NODE_ENV
    await db.manager.closeAll()
  })

  test('mark file as ignored when "environment = development" and not running in development mode', async ({
    assert,
    fs,
  }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()

    const runner = new SeedsRunner(db, app)
    runner.nodeEnvironment = 'production'

    await fs.create(
      'database/seeders/User_v3.ts',
      `export default class FooSeeder {
      public static invoked = false
      public static environment = ['development']

      run () {
        (this.constructor as any).invoked = true
      }
    }`
    )

    const files = await runner.getList()
    const report = await runner.run(files[0])
    assert.equal(report.status, 'ignored')

    delete process.env.NODE_ENV
    await db.manager.closeAll()
  })
})
