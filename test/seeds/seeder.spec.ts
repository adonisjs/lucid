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
import { SeedsRunner } from '../../src/SeedsRunner'
import { getDb, setup, cleanup } from '../../test-helpers'

const fs = new Filesystem(join(__dirname, 'app'))
let db: ReturnType<typeof getDb>

test.group('Seeder', (group) => {
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

	test('get list of seed files recursively', async (assert) => {
		const runner = new SeedsRunner(fs.basePath, false)
		await fs.add('User.ts', '')
		await fs.add('Tenant/User.ts', '')
		await fs.add('Country/Post.ts', '')

		const files = await runner.listSeeders()
		assert.deepEqual(files, [
			{
				absPath: join(fs.basePath, 'Country/Post.ts'),
				name: 'Country/Post',
				source: {} as any,
				status: 'pending',
			},
			{
				absPath: join(fs.basePath, 'Tenant/User.ts'),
				name: 'Tenant/User',
				source: {} as any,
				status: 'pending',
			},
			{
				absPath: join(fs.basePath, 'User.ts'),
				name: 'User',
				source: {} as any,
				status: 'pending',
			},
		])
	})

	test('only pick .ts/.js files', async (assert) => {
		const runner = new SeedsRunner(fs.basePath, false)
		await fs.add('User.ts', '')
		await fs.add('Tenant/User.ts', '')
		await fs.add('Country/Post.ts', '')
		await fs.add('foo.bar', '')
		await fs.add('foo.js', '')

		const files = await runner.listSeeders()
		assert.deepEqual(files, [
			{
				absPath: join(fs.basePath, 'Country/Post.ts'),
				name: 'Country/Post',
				source: {} as any,
				status: 'pending',
			},
			{
				absPath: join(fs.basePath, 'Tenant/User.ts'),
				name: 'Tenant/User',
				source: {} as any,
				status: 'pending',
			},
			{
				absPath: join(fs.basePath, 'User.ts'),
				name: 'User',
				source: {} as any,
				status: 'pending',
			},
			{
				absPath: join(fs.basePath, 'foo.js'),
				name: 'foo',
				source: {} as any,
				status: 'pending',
			},
		])
	})

	test('run a seeder file', async (assert) => {
		const runner = new SeedsRunner(fs.basePath, false)
		await fs.add(
			'User.ts',
			`export default class FooSeeder {
      public static invoked = false

      run () {
        (this.constructor as any).invoked = true
      }
    }`
		)

		const files = await runner.listSeeders()
		const report = await runner.run(files[0], db.connection())
		assert.equal(report.source['invoked'], true)
		assert.equal(report.status, 'completed')
	})

	test('catch and return seeder errors', async (assert) => {
		const runner = new SeedsRunner(fs.basePath, false)
		await fs.add(
			'User.ts',
			`export default class FooSeeder {
      run () {
        throw new Error('Failed')
      }
    }`
		)

		const files = await runner.listSeeders()
		const report = await runner.run(files[0], db.connection())
		assert.equal(report.status, 'failed')
		assert.exists(report.error)
	})

	test('mark file as ignored when "developmentOnly = true" and not running in development mode', async (assert) => {
		const runner = new SeedsRunner(fs.basePath, false)
		await fs.add(
			'User.ts',
			`export default class FooSeeder {
      public static invoked = false
      public static developmentOnly = true

      run () {
        (this.constructor as any).invoked = true
      }
    }`
		)

		const files = await runner.listSeeders()
		assert.equal(files[0].status, 'ignored')
	})
})
