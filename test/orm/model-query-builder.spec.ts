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
import { column } from '../../src/Orm/Decorators'
import { scope } from '../../src/Helpers/scope'
import { ModelQueryBuilder } from '../../src/Orm/QueryBuilder'
import {
	fs,
	getDb,
	setup,
	cleanup,
	ormAdapter,
	resetTables,
	getBaseModel,
	setupApplication,
} from '../../test-helpers'
import { ApplicationContract } from '@ioc:Adonis/Core/Application'

let db: ReturnType<typeof getDb>
let app: ApplicationContract
let BaseModel: ReturnType<typeof getBaseModel>

test.group('Model query builder', (group) => {
	group.before(async () => {
		app = await setupApplication()
		db = getDb(app)
		BaseModel = getBaseModel(ormAdapter(db), app)
		await setup()
	})

	group.after(async () => {
		await db.manager.closeAll()
		await cleanup()
		await fs.cleanup()
	})

	group.afterEach(async () => {
		await resetTables()
	})

	test('get instance of query builder for the given model', async (assert) => {
		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public username: string
		}

		User.boot()
		assert.instanceOf(User.query(), ModelQueryBuilder)
	})

	test('pre select the table for the query builder instance', async (assert) => {
		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public username: string
		}

		User.boot()
		assert.equal(User.query().knexQuery['_single'].table, 'users')
	})

	test('execute select queries', async (assert) => {
		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public username: string
		}

		User.boot()
		await db
			.insertQuery()
			.table('users')
			.insert([{ username: 'virk' }, { username: 'nikk' }])

		const users = await User.query().where('username', 'virk')
		assert.lengthOf(users, 1)
		assert.instanceOf(users[0], User)
		assert.deepEqual(users[0].$attributes, { id: 1, username: 'virk' })
	})

	test('pass custom connection to the model instance', async (assert) => {
		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public username: string
		}

		User.boot()
		await db
			.insertQuery()
			.table('users')
			.insert([{ username: 'virk' }, { username: 'nikk' }])

		const users = await User.query({ connection: 'secondary' }).where('username', 'virk')
		assert.lengthOf(users, 1)
		assert.instanceOf(users[0], User)
		assert.deepEqual(users[0].$attributes, { id: 1, username: 'virk' })
		assert.deepEqual(users[0].$options!.connection, 'secondary')
	})

	test('pass sideloaded attributes to the model instance', async (assert) => {
		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public username: string
		}

		User.boot()
		await db
			.insertQuery()
			.table('users')
			.insert([{ username: 'virk' }, { username: 'nikk' }])

		const users = await User.query({ connection: 'secondary' })
			.where('username', 'virk')
			.sideload({ loggedInUser: { id: 1 } })

		assert.lengthOf(users, 1)
		assert.instanceOf(users[0], User)
		assert.deepEqual(users[0].$attributes, { id: 1, username: 'virk' })
		assert.deepEqual(users[0].$sideloaded, { loggedInUser: { id: 1 } })
	})

	test('pass custom profiler to the model instance', async (assert) => {
		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public username: string
		}

		User.boot()
		await db
			.insertQuery()
			.table('users')
			.insert([{ username: 'virk' }, { username: 'nikk' }])

		const profiler = app.profiler
		const users = await User.query({ profiler }).where('username', 'virk')
		assert.lengthOf(users, 1)
		assert.instanceOf(users[0], User)
		assert.deepEqual(users[0].$attributes, { id: 1, username: 'virk' })
		assert.deepEqual(users[0].$options!.profiler, profiler)
	})

	test('perform update using model query builder', async (assert) => {
		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public username: string
		}

		User.boot()
		await db
			.insertQuery()
			.table('users')
			.insert([{ username: 'virk' }, { username: 'nikk' }])

		const rows = await User.query().where('username', 'virk').update({ username: 'hvirk' })
		assert.lengthOf(rows, 1)
		assert.deepEqual(rows, [1])

		const user = await db.from('users').where('username', 'hvirk').first()
		assert.equal(user!.username, 'hvirk')
	})

	test('perform increment using model query builder', async (assert) => {
		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public username: string
		}

		User.boot()
		await db
			.insertQuery()
			.table('users')
			.insert([{ username: 'virk', points: 1 }])

		const rows = await User.query().where('username', 'virk').increment('points', 1)
		assert.lengthOf(rows, 1)
		assert.deepEqual(rows, [1])

		const user = await db.from('users').where('username', 'virk').first()
		assert.equal(user!.points, 2)
	})

	test('perform decrement using model query builder', async (assert) => {
		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public username: string
		}

		User.boot()
		await db
			.insertQuery()
			.table('users')
			.insert([{ username: 'virk', points: 3 }])

		const rows = await User.query().where('username', 'virk').decrement('points', 1)
		assert.lengthOf(rows, 1)
		assert.deepEqual(rows, [1])

		const user = await db.from('users').where('username', 'virk').first()
		assert.equal(user!.points, 2)
	})

	test('delete in bulk', async (assert) => {
		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public username: string
		}

		User.boot()
		await db
			.insertQuery()
			.table('users')
			.insert([{ username: 'virk' }, { username: 'nikk' }])

		const rows = await User.query().where('username', 'virk').del()
		assert.lengthOf(rows, 1)
		assert.deepEqual(rows, [1])

		const user = await db.from('users').where('username', 'virk').first()
		assert.isNull(user)
	})

	test('clone query builder', async (assert) => {
		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public username: string
		}

		User.boot()

		const query = User.query()
		const clonedQuery = query.clone()
		assert.instanceOf(clonedQuery, ModelQueryBuilder)
	})

	test('clone query builder with internal flags', async (assert) => {
		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public username: string
		}

		User.boot()

		const query = User.query().groupBy('id')
		const clonedQuery = query.clone()
		assert.isTrue(clonedQuery.hasGroupBy)
	})

	test('pass sideloaded data to cloned query', async (assert) => {
		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public username: string
		}

		User.boot()
		await db
			.insertQuery()
			.table('users')
			.insert([{ username: 'virk', points: 3 }])

		const query = User.query().sideload({ username: 'virk' })
		const user = await query.clone().firstOrFail()
		assert.deepEqual(user.$sideloaded, { username: 'virk' })
	})

	test('apply scopes', async (assert) => {
		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public username: string

			public static active = scope((query) => {
				query.where('is_active', true)
			})
		}

		User.boot()
		const { sql, bindings } = User.query()
			.apply((scopes) => {
				scopes.active()
			})
			.toSQL()

		const { sql: knexSql, bindings: knexBindings } = db
			.connection()
			.getWriteClient()
			.from('users')
			.where('is_active', true)
			.toSQL()

		assert.equal(sql, knexSql)
		assert.deepEqual(bindings, knexBindings)
	})

	test('apply scopes inside a sub query', async (assert) => {
		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public username: string

			public static active = scope((query) => {
				query.where('is_active', true)
			})
		}

		User.boot()
		const { sql, bindings } = User.query()
			.where((builder) => {
				builder.apply((scopes) => scopes.active())
			})
			.toSQL()

		const { sql: knexSql, bindings: knexBindings } = db
			.connection()
			.getWriteClient()
			.from('users')
			.where((builder) => builder.where('is_active', true))
			.toSQL()

		assert.equal(sql, knexSql)
		assert.deepEqual(bindings, knexBindings)
	})

	test('make aggregate queries with the model query builder', async (assert) => {
		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public username: string
		}

		User.boot()
		await db
			.insertQuery()
			.table('users')
			.insert([{ username: 'virk' }, { username: 'nikk' }])

		const users = await User.query().count('* as total')
		assert.equal(Number(users[0].total), 2)
	})
})
