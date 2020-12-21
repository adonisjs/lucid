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
import { Kernel } from '@adonisjs/core/build/standalone'
import { ApplicationContract } from '@ioc:Adonis/Core/Application'

import DbSeed from '../../commands/DbSeed'
import { fs, setup, cleanup, getDb, setupApplication } from '../../test-helpers'

let app: ApplicationContract
let db: ReturnType<typeof getDb>

test.group('DbSeed', (group) => {
	group.beforeEach(async () => {
		app = await setupApplication()
		db = getDb(app)
		app.container.bind('Adonis/Lucid/Database', () => db)
		await setup()
	})

	group.afterEach(async () => {
		await cleanup()
		await cleanup(['adonis_schema', 'schema_users', 'schema_accounts'])
		await fs.cleanup()
	})

	test('run seeds', async (assert) => {
		await fs.add(
			'database/seeders/user.ts',
			`export default class UserSeeder {
				public async run () {
					process.env.EXEC_USER_SEEDER = 'true'
				}
			}`
		)

		const seed = new DbSeed(app, new Kernel(app))
		await seed.run()

		assert.equal(process.env.EXEC_USER_SEEDER, 'true')
		delete process.env.EXEC_USER_SEEDER
	})

	test('run custom files', async (assert) => {
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

		const seed = new DbSeed(app, new Kernel(app))
		seed.files = ['./database/seeders/post.ts']
		await seed.run()

		assert.isUndefined(process.env.EXEC_USER_SEEDER)
		assert.equal(process.env.EXEC_POST_SEEDER, 'true')
		delete process.env.EXEC_POST_SEEDER
	})
})
