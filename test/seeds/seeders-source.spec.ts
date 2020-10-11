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

import { SeedersSource } from '../../src/SeedsRunner/SeedersSource'
import { getDb, setup, setupApplication, fs, cleanup } from '../../test-helpers'

test.group('Seeds Source', (group) => {
	group.beforeEach(async () => {
		await setup()
	})

	group.afterEach(async () => {
		await cleanup()
		await fs.cleanup()
	})

	test('get list of seed files recursively', async (assert) => {
		const app = await setupApplication()
		const db = getDb(app)

		const seedsSource = new SeedersSource(db.getRawConnection('primary')!.config, app)

		await fs.add('database/seeders/User.ts', '')
		await fs.add('database/seeders/Tenant/User.ts', '')
		await fs.add('database/seeders/Country/Post.ts', '')

		await db.manager.closeAll()

		const files = await seedsSource.getSeeders()
		assert.deepEqual(
			files.map((file) => {
				return { absPath: file.absPath, name: file.name }
			}),
			[
				{
					absPath: join(fs.basePath, 'database/seeders/Country/Post.ts'),
					name: 'database/seeders/Country/Post',
				},
				{
					absPath: join(fs.basePath, 'database/seeders/Tenant/User.ts'),
					name: 'database/seeders/Tenant/User',
				},
				{
					absPath: join(fs.basePath, 'database/seeders/User.ts'),
					name: 'database/seeders/User',
				},
			]
		)
	})

	test('only pick .ts/.js files', async (assert) => {
		const app = await setupApplication()
		const db = getDb(app)
		const seedsSource = new SeedersSource(db.getRawConnection('primary')!.config, app)

		await fs.add('database/seeders/User.ts', '')
		await fs.add('database/seeders/Tenant/User.ts', '')
		await fs.add('database/seeders/Country/Post.ts', '')
		await fs.add('database/seeders/foo.bar', '')
		await fs.add('database/seeders/foo.js', '')

		await db.manager.closeAll()

		const files = await seedsSource.getSeeders()
		assert.deepEqual(
			files.map((file) => {
				return { absPath: file.absPath, name: file.name }
			}),
			[
				{
					absPath: join(fs.basePath, 'database/seeders/Country/Post.ts'),
					name: 'database/seeders/Country/Post',
				},
				{
					absPath: join(fs.basePath, 'database/seeders/Tenant/User.ts'),
					name: 'database/seeders/Tenant/User',
				},
				{
					absPath: join(fs.basePath, 'database/seeders/User.ts'),
					name: 'database/seeders/User',
				},
				{
					absPath: join(fs.basePath, 'database/seeders/foo.js'),
					name: 'database/seeders/foo',
				},
			]
		)
	})

	test('sort multiple seeders directories seperately', async (assert) => {
		const app = await setupApplication()
		const db = getDb(app)

		const config = Object.assign({}, db.getRawConnection('primary')!.config, {
			seeders: {
				paths: ['./database/secondary', './database/primary'],
			},
		})

		const seedsSource = new SeedersSource(config, app)
		await fs.add('database/secondary/User.ts', '')
		await fs.add('database/secondary/Tenant/User.ts', '')

		await fs.add('database/primary/Account.ts', '')
		await fs.add('database/primary/Team.ts', '')
		await db.manager.closeAll()

		const files = await seedsSource.getSeeders()

		assert.deepEqual(
			files.map((file) => {
				return { absPath: file.absPath, name: file.name }
			}),
			[
				{
					absPath: join(fs.basePath, 'database/secondary/Tenant/User.ts'),
					name: 'database/secondary/Tenant/User',
				},
				{
					absPath: join(fs.basePath, 'database/secondary/User.ts'),
					name: 'database/secondary/User',
				},
				{
					absPath: join(fs.basePath, 'database/primary/Account.ts'),
					name: 'database/primary/Account',
				},
				{
					absPath: join(fs.basePath, 'database/primary/Team.ts'),
					name: 'database/primary/Team',
				},
			]
		)
	})
})
