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

import { Database } from '../../src/Database'
import MakeMigration from '../../commands/MakeMigration'
import {
	setup,
	getDb,
	cleanup,
	getLogger,
	getEmitter,
	getConfig,
	getProfiler,
	resetTables,
	toNewlineArray,
} from '../../test-helpers'

let db: ReturnType<typeof getDb>
const fs = new Filesystem(join(__dirname, 'app'))
const templatesFs = new Filesystem(join(__dirname, '..', '..', 'templates'))

test.group('MakeMigration', (group) => {
	group.before(async () => {
		db = getDb()
		await setup()
	})

	group.after(async () => {
		await cleanup()
		await db.manager.closeAll()
	})

	group.afterEach(async () => {
		await resetTables()
		await fs.cleanup()
	})

	test('create migration in the default migrations directory', async (assert) => {
		const app = new Application(fs.basePath, {} as any, {} as any, {})
		app.environment = 'test'

		const makeMigration = new MakeMigration(app, new Kernel(app), db)
		makeMigration.name = 'users'
		await makeMigration.handle()

		assert.lengthOf(makeMigration.logger.logs, 1)
		const successLog = makeMigration.logger.logs[0]

		const userSchema = await fs.get(successLog.replace('underline(green(create))', '').trim())
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
		const app = new Application(fs.basePath, {} as any, {} as any, {})
		app.environment = 'test'

		const makeMigration = new MakeMigration(app, new Kernel(app), db)
		makeMigration.name = 'users'
		makeMigration.table = 'my_users'

		await makeMigration.handle()

		assert.lengthOf(makeMigration.logger.logs, 1)
		const successLog = makeMigration.logger.logs[0]

		const userSchema = await fs.get(successLog.replace('underline(green(create))', '').trim())
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
		const app = new Application(fs.basePath, {} as any, {} as any, {})
		app.environment = 'test'

		const makeMigration = new MakeMigration(app, new Kernel(app), db)
		makeMigration.name = 'users'
		makeMigration.create = 'my_users'

		await makeMigration.handle()

		assert.lengthOf(makeMigration.logger.logs, 1)
		const successLog = makeMigration.logger.logs[0]

		const userSchema = await fs.get(successLog.replace('underline(green(create))', '').trim())
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
		const app = new Application(fs.basePath, {} as any, {} as any, {})
		app.environment = 'test'

		const makeMigration = new MakeMigration(app, new Kernel(app), db)
		makeMigration.name = 'profile/users'

		await makeMigration.handle()

		assert.lengthOf(makeMigration.logger.logs, 1)
		const successLog = makeMigration.logger.logs[0]

		const userSchema = await fs.get(successLog.replace('underline(green(create))', '').trim())
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
		const app = new Application(fs.basePath, {} as any, {} as any, {})
		app.environment = 'test'

		const makeMigration = new MakeMigration(app, new Kernel(app), db)
		makeMigration.name = 'profile/users'
		makeMigration.connection = 'foo'

		await makeMigration.handle()

		assert.deepEqual(makeMigration.logger.logs, [
			'underline(red(error)) foo is not a valid connection name. Double check config/database file',
		])
	})

	test('prompt for migration paths when multiple paths are defined', async (assert) => {
		const app = new Application(fs.basePath, {} as any, {} as any, {})
		app.environment = 'test'

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

		const customDb = new Database(config, getLogger(), getProfiler(), getEmitter())

		const makeMigration = new MakeMigration(app, new Kernel(app), customDb)
		makeMigration.name = 'users'

		makeMigration.prompt.on('prompt', (prompt) => {
			prompt.select(1)
		})

		await makeMigration.handle()
		const successLog = makeMigration.logger.logs[0]
		const userSchema = await fs.get(successLog.replace('underline(green(create))', '').trim())
		const schemaTemplate = await templatesFs.get('migration-make.txt')

		assert.isTrue(successLog.startsWith('underline(green(create)) database/b'))

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
		const app = new Application(fs.basePath, {} as any, {} as any, {})
		app.environment = 'test'

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

		const customDb = new Database(config, getLogger(), getProfiler(), getEmitter())

		const makeMigration = new MakeMigration(app, new Kernel(app), customDb)
		makeMigration.name = 'users'
		makeMigration.folder = 'database/c'

		await makeMigration.handle()
		const successLog = makeMigration.logger.logs[0]
		const userSchema = await fs.get(successLog.replace('underline(green(create))', '').trim())
		const schemaTemplate = await templatesFs.get('migration-make.txt')

		assert.isTrue(successLog.startsWith('underline(green(create)) database/c'))

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
