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
import { rules } from '@adonisjs/validator/build/src/Rules'
import { schema } from '@adonisjs/validator/build/src/Schema'
import { extendValidator } from '../../src/Bindings/Validator'
import { validator } from '@adonisjs/validator/build/src/Validator'

import { getDb, setup, cleanup, resetTables } from '../../test-helpers'

let db: ReturnType<typeof getDb>

test.group('Validator | exists', (group) => {
	group.before(async () => {
		db = getDb()
		await setup()
		extendValidator(validator, db)
	})

	group.after(async () => {
		await cleanup()
		await db.manager.closeAll()
	})

	group.afterEach(async () => {
		await resetTables()
		db.connection().getReadClient().removeAllListeners()
	})

	test("must fail when row doesn't exists in the table", async (assert) => {
		assert.plan(1)

		try {
			await validator.validate({
				schema: schema.create({
					id: schema.number([
						rules.exists({
							table: 'users',
							column: 'id',
						}),
					]),
				}),
				data: { id: 1 },
			})
		} catch (error) {
			assert.deepEqual(error.messages, {
				id: ['exists validation failure'],
			})
		}
	})

	test('work fine when row exists', async (assert) => {
		assert.plan(2)

		const [userId] = await db
			.table('users')
			.returning('id')
			.insert({ email: 'virk@adonisjs.com', username: 'virk' })

		db.connection()
			.getReadClient()
			.on('query', ({ sql, bindings }) => {
				const { sql: knexSql, bindings: knexBindings } = db
					.connection()
					.getReadClient()
					.from('users')
					.where('id', userId)
					.limit(1)
					.toSQL()

				assert.equal(sql, knexSql)
				assert.deepEqual(bindings, knexBindings)
			})

		await validator.validate({
			schema: schema.create({
				id: schema.number([
					rules.exists({
						table: 'users',
						column: 'id',
					}),
				]),
			}),
			data: { id: userId },
		})
	})

	test('add where contraints', async (assert) => {
		assert.plan(3)

		const [userId] = await db
			.table('users')
			.returning('id')
			.insert({ email: 'virk@adonisjs.com', username: 'virk' })

		db.connection()
			.getReadClient()
			.on('query', ({ sql, bindings }) => {
				const { sql: knexSql, bindings: knexBindings } = db
					.connection()
					.getReadClient()
					.from('users')
					.where('id', userId)
					.where('username', 'nikk')
					.limit(1)
					.toSQL()

				assert.equal(sql, knexSql)
				assert.deepEqual(bindings, knexBindings)
			})

		try {
			await validator.validate({
				schema: schema.create({
					id: schema.number([
						rules.exists({
							table: 'users',
							column: 'id',
							where: {
								username: 'nikk',
							},
						}),
					]),
				}),
				data: { id: userId },
			})
		} catch (error) {
			assert.deepEqual(error.messages, {
				id: ['exists validation failure'],
			})
		}
	})

	test('add wherein contraints', async (assert) => {
		assert.plan(3)

		const [userId] = await db
			.table('users')
			.returning('id')
			.insert({ email: 'virk@adonisjs.com', username: 'virk' })

		db.connection()
			.getReadClient()
			.on('query', ({ sql, bindings }) => {
				const { sql: knexSql, bindings: knexBindings } = db
					.connection()
					.getReadClient()
					.from('users')
					.where('id', userId)
					.whereIn('username', ['nikk', 'romain'])
					.limit(1)
					.toSQL()

				assert.equal(sql, knexSql)
				assert.deepEqual(bindings, knexBindings)
			})

		try {
			await validator.validate({
				schema: schema.create({
					id: schema.number([
						rules.exists({
							table: 'users',
							column: 'id',
							where: {
								username: ['nikk', 'romain'],
							},
						}),
					]),
				}),
				data: { id: userId },
			})
		} catch (error) {
			assert.deepEqual(error.messages, {
				id: ['exists validation failure'],
			})
		}
	})

	test('add where not constraints', async (assert) => {
		assert.plan(3)

		const [userId] = await db
			.table('users')
			.returning('id')
			.insert({ email: 'virk@adonisjs.com', username: 'virk' })

		db.connection()
			.getReadClient()
			.on('query', ({ sql, bindings }) => {
				const { sql: knexSql, bindings: knexBindings } = db
					.connection()
					.getReadClient()
					.from('users')
					.where('id', userId)
					.whereNot('username', 'virk')
					.limit(1)
					.toSQL()

				assert.equal(sql, knexSql)
				assert.deepEqual(bindings, knexBindings)
			})

		try {
			await validator.validate({
				schema: schema.create({
					id: schema.number([
						rules.exists({
							table: 'users',
							column: 'id',
							whereNot: {
								username: 'virk',
							},
						}),
					]),
				}),
				data: { id: userId },
			})
		} catch (error) {
			assert.deepEqual(error.messages, {
				id: ['exists validation failure'],
			})
		}
	})

	test('add where not in constraints', async (assert) => {
		assert.plan(3)

		const [userId] = await db
			.table('users')
			.returning('id')
			.insert({ email: 'virk@adonisjs.com', username: 'virk' })

		db.connection()
			.getReadClient()
			.on('query', ({ sql, bindings }) => {
				const { sql: knexSql, bindings: knexBindings } = db
					.connection()
					.getReadClient()
					.from('users')
					.where('id', userId)
					.whereNotIn('username', ['virk', 'nikk'])
					.limit(1)
					.toSQL()

				assert.equal(sql, knexSql)
				assert.deepEqual(bindings, knexBindings)
			})

		try {
			await validator.validate({
				schema: schema.create({
					id: schema.number([
						rules.exists({
							table: 'users',
							column: 'id',
							whereNot: {
								username: ['virk', 'nikk'],
							},
						}),
					]),
				}),
				data: { id: userId },
			})
		} catch (error) {
			assert.deepEqual(error.messages, {
				id: ['exists validation failure'],
			})
		}
	})

	test('perform case-insensitive query', async (assert) => {
		assert.plan(2)

		await db.table('users').returning('id').insert({ email: 'virk@adonisjs.com', username: 'virk' })

		db.connection()
			.getReadClient()
			.on('query', ({ sql, bindings }) => {
				const { sql: knexSql, bindings: knexBindings } = db
					.connection()
					.getReadClient()
					.from('users')
					.whereRaw(`lower(username) = ?`, [db.connection().knexRawQuery('lower("VIRK")')])
					.limit(1)
					.toSQL()

				assert.equal(sql, knexSql)
				assert.deepEqual(bindings, knexBindings)
			})

		await validator.validate({
			schema: schema.create({
				username: schema.string({}, [
					rules.exists({
						table: 'users',
						caseInsensitive: true,
						column: 'username',
					}),
				]),
			}),
			data: { username: 'VIRK' },
		})
	})
})

test.group('Validator | unique', (group) => {
	group.before(async () => {
		db = getDb()
		await setup()
		extendValidator(validator, db)
	})

	group.after(async () => {
		await cleanup()
		await db.manager.closeAll()
	})

	group.afterEach(async () => {
		await resetTables()
		db.connection().getReadClient().removeAllListeners()
	})

	test('must fail when row already exists in the table', async (assert) => {
		assert.plan(1)

		const [userId] = await db
			.table('users')
			.returning('id')
			.insert({ email: 'virk@adonisjs.com', username: 'virk' })

		try {
			await validator.validate({
				schema: schema.create({
					id: schema.number([
						rules.unique({
							table: 'users',
							column: 'id',
						}),
					]),
				}),
				data: { id: userId },
			})
		} catch (error) {
			assert.deepEqual(error.messages, {
				id: ['unique validation failure'],
			})
		}
	})

	test('work fine when row is missing', async () => {
		await validator.validate({
			schema: schema.create({
				id: schema.number([
					rules.unique({
						table: 'users',
						column: 'id',
					}),
				]),
			}),
			data: { id: 1 },
		})
	})

	test('add where contraints', async (assert) => {
		assert.plan(3)

		const [userId] = await db
			.table('users')
			.returning('id')
			.insert({ email: 'virk@adonisjs.com', username: 'virk' })

		db.connection()
			.getReadClient()
			.on('query', ({ sql, bindings }) => {
				const { sql: knexSql, bindings: knexBindings } = db
					.connection()
					.getReadClient()
					.from('users')
					.where('id', userId)
					.where('username', 'virk')
					.limit(1)
					.toSQL()

				assert.equal(sql, knexSql)
				assert.deepEqual(bindings, knexBindings)
			})

		try {
			await validator.validate({
				schema: schema.create({
					id: schema.number([
						rules.unique({
							table: 'users',
							column: 'id',
							where: {
								username: 'virk',
							},
						}),
					]),
				}),
				data: { id: userId },
			})
		} catch (error) {
			assert.deepEqual(error.messages, {
				id: ['unique validation failure'],
			})
		}
	})

	test('add where in contraints', async (assert) => {
		assert.plan(3)

		const [userId] = await db
			.table('users')
			.returning('id')
			.insert({ email: 'virk@adonisjs.com', username: 'virk' })

		db.connection()
			.getReadClient()
			.on('query', ({ sql, bindings }) => {
				const { sql: knexSql, bindings: knexBindings } = db
					.connection()
					.getReadClient()
					.from('users')
					.where('id', userId)
					.whereIn('username', ['virk', 'nikk'])
					.limit(1)
					.toSQL()

				assert.equal(sql, knexSql)
				assert.deepEqual(bindings, knexBindings)
			})

		try {
			await validator.validate({
				schema: schema.create({
					id: schema.number([
						rules.unique({
							table: 'users',
							column: 'id',
							where: {
								username: ['virk', 'nikk'],
							},
						}),
					]),
				}),
				data: { id: userId },
			})
		} catch (error) {
			assert.deepEqual(error.messages, {
				id: ['unique validation failure'],
			})
		}
	})

	test('add whereNot contraints', async (assert) => {
		assert.plan(3)

		const [userId] = await db
			.table('users')
			.returning('id')
			.insert({ email: 'virk@adonisjs.com', username: 'virk' })

		db.connection()
			.getReadClient()
			.on('query', ({ sql, bindings }) => {
				const { sql: knexSql, bindings: knexBindings } = db
					.connection()
					.getReadClient()
					.from('users')
					.where('id', userId)
					.whereNot('username', 'nikk')
					.limit(1)
					.toSQL()

				assert.equal(sql, knexSql)
				assert.deepEqual(bindings, knexBindings)
			})

		try {
			await validator.validate({
				schema: schema.create({
					id: schema.number([
						rules.unique({
							table: 'users',
							column: 'id',
							whereNot: {
								username: 'nikk',
							},
						}),
					]),
				}),
				data: { id: userId },
			})
		} catch (error) {
			assert.deepEqual(error.messages, {
				id: ['unique validation failure'],
			})
		}
	})

	test('add whereNot in contraints', async (assert) => {
		assert.plan(3)

		const [userId] = await db
			.table('users')
			.returning('id')
			.insert({ email: 'virk@adonisjs.com', username: 'virk', country_id: 4 })

		db.connection()
			.getReadClient()
			.on('query', ({ sql, bindings }) => {
				const { sql: knexSql, bindings: knexBindings } = db
					.connection()
					.getReadClient()
					.from('users')
					.where('id', userId)
					.whereNotIn('country_id', [1, 2])
					.limit(1)
					.toSQL()

				assert.equal(sql, knexSql)
				assert.deepEqual(bindings, knexBindings)
			})

		try {
			await validator.validate({
				schema: schema.create({
					id: schema.number([
						rules.unique({
							table: 'users',
							column: 'id',
							whereNot: {
								country_id: [1, 2],
							},
						}),
					]),
				}),
				data: { id: userId },
			})
		} catch (error) {
			assert.deepEqual(error.messages, {
				id: ['unique validation failure'],
			})
		}
	})

	test('perform case-insensitive check', async (assert) => {
		assert.plan(3)

		await db.table('users').returning('id').insert({ email: 'virk@adonisjs.com', username: 'virk' })
		db.connection()
			.getReadClient()
			.on('query', ({ sql, bindings }) => {
				const { sql: knexSql, bindings: knexBindings } = db
					.connection()
					.getReadClient()
					.from('users')
					.whereRaw(`lower(username) = ?`, [db.connection().knexRawQuery('lower("VIRK")')])
					.limit(1)
					.toSQL()

				assert.equal(sql, knexSql)
				assert.deepEqual(bindings, knexBindings)
			})

		try {
			await validator.validate({
				schema: schema.create({
					username: schema.string({}, [
						rules.unique({
							table: 'users',
							column: 'username',
							caseInsensitive: true,
						}),
					]),
				}),
				data: { username: 'VIRK' },
			})
		} catch (error) {
			assert.deepEqual(error.messages, {
				username: ['unique validation failure'],
			})
		}
	})
})
