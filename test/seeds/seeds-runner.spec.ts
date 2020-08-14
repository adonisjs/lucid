/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import test from 'japa'
import { join } from 'path'
import { Filesystem } from '@poppinss/dev-utils'
import { Application } from '@adonisjs/application/build/standalone'

import { SeedsRunner } from '../../src/SeedsRunner'
import { getDb, setup, cleanup } from '../../test-helpers'

const fs = new Filesystem(join(__dirname, 'app'))
let db: ReturnType<typeof getDb>

test.group('Seeds Runner', (group) => {
	group.before(async () => {
		db = getDb()
		await setup()
	})

	group.after(async () => {
		await cleanup()
		await db.manager.closeAll()
	})

	group.afterEach(async () => {
		await fs.cleanup()
	})

	test('run a seeder file', async (assert) => {
		const app = new Application(fs.basePath, {} as any, {} as any, {})
		const runner = new SeedsRunner(db, app)

		await fs.add(
			'database/seeders/User.ts',
			`export default class FooSeeder {
      public static invoked = false

      run () {
        (this.constructor as any).invoked = true
      }
    }`
		)

		const files = await runner.getList()
		const report = await runner.run(files[0])
		assert.equal((report.file.getSource() as any)['invoked'], true)
		assert.equal(report.status, 'completed')
	})

	test('catch and return seeder errors', async (assert) => {
		const app = new Application(fs.basePath, {} as any, {} as any, {})
		const runner = new SeedsRunner(db, app)

		await fs.add(
			'database/seeders/User.ts',
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
	})

	test('mark file as ignored when "developmentOnly = true" and not running in development mode', async (assert) => {
		process.env.NODE_ENV = 'production'

		const app = new Application(fs.basePath, {} as any, {} as any, {})
		const runner = new SeedsRunner(db, app)

		await fs.add(
			'database/seeders/User.ts',
			`export default class FooSeeder {
      public static invoked = false
      public static developmentOnly = true

      run () {
        (this.constructor as any).invoked = true
      }
    }`
		)

		const files = await runner.getList()
		const report = await runner.run(files[0])
		assert.equal(report.status, 'ignored')

		delete process.env.NODE_ENV
	})
})
