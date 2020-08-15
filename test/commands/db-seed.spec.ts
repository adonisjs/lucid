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
import { Kernel } from '@adonisjs/ace'
import { Filesystem } from '@poppinss/dev-utils'
import { Application } from '@adonisjs/application/build/standalone'

import DbSeed from '../../commands/DbSeed'
import { setup, cleanup, getDb } from '../../test-helpers'

let db: ReturnType<typeof getDb>
const fs = new Filesystem(join(__dirname, 'app'))

test.group('DbSeed', (group) => {
	group.beforeEach(async () => {
		db = getDb()
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

		const app = new Application(fs.basePath, {} as any, {} as any, {})
		const seed = new DbSeed(app, new Kernel(app), db)
		await seed.handle()

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

		const app = new Application(fs.basePath, {} as any, {} as any, {})
		const seed = new DbSeed(app, new Kernel(app), db)
		seed.files = ['./database/seeders/post.ts']
		await seed.handle()

		assert.isUndefined(process.env.EXEC_USER_SEEDER)
		assert.equal(process.env.EXEC_POST_SEEDER, 'true')
		delete process.env.EXEC_POST_SEEDER
	})
})
