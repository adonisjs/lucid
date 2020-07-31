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
import { ManyToMany } from '@ioc:Adonis/Lucid/Orm'

import { scope } from '../../src/Helpers/scope'
import { manyToMany, column } from '../../src/Orm/Decorators'
import { ManyToManyQueryBuilder } from '../../src/Orm/Relations/ManyToMany/QueryBuilder'
import {
	getDb,
	getBaseModel,
	ormAdapter,
	setup,
	resetTables,
	cleanup,
	getProfiler,
} from '../../test-helpers'

let db: ReturnType<typeof getDb>
let BaseModel: ReturnType<typeof getBaseModel>

test.group('Model | ManyToMany | Options', (group) => {
	group.before(async () => {
		db = getDb()
		BaseModel = getBaseModel(ormAdapter(db))
	})

	test('raise error when localKey is missing', (assert) => {
		assert.plan(1)

		try {
			class Skill extends BaseModel {}

			class User extends BaseModel {
				@manyToMany(() => Skill)
				public skills: ManyToMany<typeof Skill>
			}

			User.boot()
			User.$getRelation('skills')!.boot()
		} catch ({ message }) {
			assert.equal(
				message,
				'E_MISSING_MODEL_ATTRIBUTE: "User.skills" expects "id" to exist on "User" model, but is missing'
			)
		}
	})

	test('use primary key as the local key', (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		User.$getRelation('skills')!.boot()

		assert.equal(User.$getRelation('skills')!['localKey'], 'id')
		assert.equal(User.$getRelation('skills')!['localKeyColumnName'], 'id')
	})

	test('use custom defined local key', (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public uid: number

			@manyToMany(() => Skill, { localKey: 'uid' })
			public skills: ManyToMany<typeof Skill>
		}

		User.boot()
		User.$getRelation('skills')!.boot()

		assert.equal(User.$getRelation('skills')!['localKey'], 'uid')
		assert.equal(User.$getRelation('skills')!['localKeyColumnName'], 'uid')
	})

	test('raise error when relatedKey is missing', (assert) => {
		assert.plan(1)

		try {
			class Skill extends BaseModel {}
			Skill.boot()

			class User extends BaseModel {
				@column({ isPrimary: true })
				public id: number

				@manyToMany(() => Skill)
				public skills: ManyToMany<typeof Skill>
			}

			User.boot()
			User.$getRelation('skills')!.boot()
		} catch ({ message }) {
			assert.equal(
				message,
				'E_MISSING_MODEL_ATTRIBUTE: "User.skills" expects "id" to exist on "Skill" model, but is missing'
			)
		}
	})

	test('use related model primary key as the related key', (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		User.$getRelation('skills')!.boot()

		assert.equal(User.$getRelation('skills')!['relatedKey'], 'id')
		assert.equal(User.$getRelation('skills')!['relatedKeyColumnName'], 'id')
	})

	test('use custom defined related key', (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public uid: number
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill, { relatedKey: 'uid' })
			public skills: ManyToMany<typeof Skill>
		}

		User.$getRelation('skills')!.boot()

		assert.equal(User.$getRelation('skills')!['relatedKey'], 'uid')
		assert.equal(User.$getRelation('skills')!['relatedKeyColumnName'], 'uid')
	})

	test('compute pivotForeignKey from table name + primary key', (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		User.$getRelation('skills')!.boot()

		assert.equal(User.$getRelation('skills')!['pivotForeignKey'], 'user_id')
	})

	test('use custom defined pivotForeignKey', (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill, { pivotForeignKey: 'user_uid' })
			public skills: ManyToMany<typeof Skill>
		}

		User.$getRelation('skills')!.boot()

		assert.equal(User.$getRelation('skills')!['pivotForeignKey'], 'user_uid')
	})

	test('compute relatedPivotForeignKey from related model name + primary key', (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		User.boot()
		User.$getRelation('skills')!.boot()

		assert.equal(User.$getRelation('skills')!['pivotRelatedForeignKey'], 'skill_id')
	})

	test('use custom defined relatedPivotForeignKey', (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill, { pivotRelatedForeignKey: 'skill_uid' })
			public skills: ManyToMany<typeof Skill>
		}

		User.boot()
		User.$getRelation('skills')!.boot()

		assert.equal(User.$getRelation('skills')!['pivotRelatedForeignKey'], 'skill_uid')
	})
})

test.group('Model | ManyToMany | Set Relations', (group) => {
	group.before(async () => {
		db = getDb()
		BaseModel = getBaseModel(ormAdapter(db))
	})

	test('set related model instance', (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		User.$getRelation('skills')!.boot()

		const user = new User()
		const skill = new Skill()
		User.$getRelation('skills')!.setRelated(user, [skill])
		assert.deepEqual(user.skills, [skill])
	})

	test('push related model instance', (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		User.$getRelation('skills')!.boot()

		const user = new User()
		const skill = new Skill()
		const skill1 = new Skill()

		User.$getRelation('skills')!.setRelated(user, [skill])
		User.$getRelation('skills')!.pushRelated(user, [skill1])
		assert.deepEqual(user.skills, [skill, skill1])
	})

	test('set many of related instances', (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => User)
			public users: ManyToMany<typeof User>
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		User.$getRelation('skills')!.boot()
		Skill.$getRelation('users')!.boot()

		const user = new User()
		user.fill({ id: 1 })

		const user1 = new User()
		user1.fill({ id: 2 })

		const user2 = new User()
		user2.fill({ id: 3 })

		const skill = new Skill()
		skill.$extras = {
			pivot_user_id: 1,
		}

		const skill1 = new Skill()
		skill1.$extras = {
			pivot_user_id: 2,
		}

		const skill2 = new Skill()
		skill2.$extras = {
			pivot_user_id: 1,
		}

		User.$getRelation('skills')!.setRelatedForMany([user, user1, user2], [skill, skill1, skill2])
		assert.deepEqual(user.skills, [skill, skill2])
		assert.deepEqual(user1.skills, [skill1])
		assert.deepEqual(user2.skills, [] as any)
	})
})

test.group('Model | ManyToMany | bulk operations', (group) => {
	group.before(async () => {
		db = getDb()
		BaseModel = getBaseModel(ormAdapter(db))
		await setup()
	})

	group.after(async () => {
		await cleanup()
		await db.manager.closeAll()
	})

	group.afterEach(async () => {
		await resetTables()
	})

	test('generate correct sql for selecting related rows', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		await db.table('users').insert({ username: 'virk' })

		const user = await User.find(1)
		const { sql, bindings } = user!.related('skills').query().toSQL()

		const { sql: knexSql, bindings: knexBindings } = db
			.connection()
			.getWriteClient()
			.from('skills')
			.select(
				'skills.*',
				'skill_user.user_id as pivot_user_id',
				'skill_user.skill_id as pivot_skill_id'
			)
			.innerJoin('skill_user', 'skills.id', 'skill_user.skill_id')
			.where('skill_user.user_id', 1)
			.toSQL()

		assert.equal(sql, knexSql)
		assert.deepEqual(bindings, knexBindings)
	})

	test('generate correct sql for selecting related for many rows', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		await db.table('users').multiInsert([{ username: 'virk' }, { username: 'nikk' }])

		const users = await User.all()
		User.$getRelation('skills')!.boot()

		const related = User.$getRelation('skills')!.eagerQuery(users, db.connection())
		const { sql, bindings } = related.toSQL()

		const { sql: knexSql, bindings: knexBindings } = db
			.connection()
			.getWriteClient()
			.from('skills')
			.select(
				'skills.*',
				'skill_user.user_id as pivot_user_id',
				'skill_user.skill_id as pivot_skill_id'
			)
			.innerJoin('skill_user', 'skills.id', 'skill_user.skill_id')
			.whereIn('skill_user.user_id', [2, 1])
			.toSQL()

		assert.equal(sql, knexSql)
		assert.deepEqual(bindings, knexBindings)
	})

	test('select extra columns', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill, {
				pivotColumns: ['score'],
			})
			public skills: ManyToMany<typeof Skill>
		}

		await db.table('users').insert({ username: 'virk' })

		const user = await User.find(1)
		const { sql, bindings } = user!.related('skills').query().toSQL()

		const { sql: knexSql, bindings: knexBindings } = db
			.connection()
			.getWriteClient()
			.from('skills')
			.select(
				'skills.*',
				'skill_user.user_id as pivot_user_id',
				'skill_user.skill_id as pivot_skill_id',
				'skill_user.score as pivot_score'
			)
			.innerJoin('skill_user', 'skills.id', 'skill_user.skill_id')
			.where('skill_user.user_id', 1)
			.toSQL()

		assert.equal(sql, knexSql)
		assert.deepEqual(bindings, knexBindings)
	})

	test('select extra columns at runtime', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		await db.table('users').insert({ username: 'virk' })

		const user = await User.find(1)
		const { sql, bindings } = user!.related('skills').query().pivotColumns(['score']).toSQL()

		const { sql: knexSql, bindings: knexBindings } = db
			.connection()
			.getWriteClient()
			.from('skills')
			.select(
				'skill_user.score as pivot_score',
				'skills.*',
				'skill_user.user_id as pivot_user_id',
				'skill_user.skill_id as pivot_skill_id'
			)
			.innerJoin('skill_user', 'skills.id', 'skill_user.skill_id')
			.where('skill_user.user_id', 1)
			.toSQL()

		assert.equal(sql, knexSql)
		assert.deepEqual(bindings, knexBindings)
	})

	test('generate correct sql for updating rows', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		await db.table('users').insert({ username: 'virk' })

		const user = await User.find(1)

		const now = new Date()
		const { sql, bindings } = user!.related('skills').query().update({ updated_at: now }).toSQL()

		const { sql: knexSql, bindings: knexBindings } = db
			.connection()
			.getWriteClient()
			.from('skill_user')
			.where('skill_user.user_id', 1)
			.update({ updated_at: now })
			.toSQL()

		assert.equal(sql, knexSql)
		assert.deepEqual(bindings, knexBindings)
	})

	test('generate correct sql for deleting rows', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		await db.table('users').insert({ username: 'virk' })

		const user = await User.find(1)

		const { sql, bindings } = user!.related('skills').query().del().toSQL()
		const { sql: knexSql, bindings: knexBindings } = db
			.connection()
			.getWriteClient()
			.from('skill_user')
			.where('skill_user.user_id', 1)
			.del()
			.toSQL()

		assert.equal(sql, knexSql)
		assert.deepEqual(bindings, knexBindings)
	})
})

test.group('Model | ManyToMany | sub queries', (group) => {
	group.before(async () => {
		db = getDb()
		BaseModel = getBaseModel(ormAdapter(db))
		await setup()
	})

	group.after(async () => {
		await cleanup()
		await db.manager.closeAll()
	})

	group.afterEach(async () => {
		await resetTables()
	})

	test('generate correct sub query for selecting rows', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		User.boot()
		User.$getRelation('skills')!.boot()

		const { sql, bindings } = User.$getRelation('skills')!.subQuery(db.connection()).toSQL()
		const { sql: knexSql, bindings: knexBindings } = db
			.connection()
			.knexQuery()
			.from('skills')
			.innerJoin('skill_user', 'skills.id', 'skill_user.skill_id')
			.where('users.id', '=', db.connection().getReadClient().ref('skill_user.user_id'))
			.toSQL()

		assert.deepEqual(sql, knexSql)
		assert.deepEqual(bindings, knexBindings)
	})

	test('create aggregate query', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		User.boot()
		User.$getRelation('skills')!.boot()

		const { sql, bindings } = User.$getRelation('skills')!
			.subQuery(db.connection())
			.count('* as total')
			.toSQL()

		const { sql: knexSql, bindings: knexBindings } = db
			.connection()
			.knexQuery()
			.count('* as total')
			.from('skills')
			.innerJoin('skill_user', 'skills.id', 'skill_user.skill_id')
			.where('users.id', '=', db.connection().getReadClient().ref('skill_user.user_id'))
			.toSQL()

		assert.deepEqual(sql, knexSql)
		assert.deepEqual(bindings, knexBindings)
	})

	test('allow selecting custom columns', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		User.boot()
		User.$getRelation('skills')!.boot()

		const { sql, bindings } = User.$getRelation('skills')!
			.subQuery(db.connection())
			.select('name')
			.toSQL()

		const { sql: knexSql, bindings: knexBindings } = db
			.connection()
			.knexQuery()
			.from('skills')
			.select('skills.name')
			.innerJoin('skill_user', 'skills.id', 'skill_user.skill_id')
			.where('users.id', '=', db.connection().getReadClient().ref('skill_user.user_id'))
			.toSQL()

		assert.deepEqual(sql, knexSql)
		assert.deepEqual(bindings, knexBindings)
	})

	test('generate correct self relationship subquery', async (assert) => {
		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => User, {
				pivotTable: 'follows',
				pivotForeignKey: 'user_id',
				pivotRelatedForeignKey: 'following_user_id',
			})
			public follows: ManyToMany<typeof User>
		}

		User.boot()
		User.$getRelation('follows')!.boot()

		const { sql, bindings } = User.$getRelation('follows')!.subQuery(db.connection()).toSQL()

		const { sql: knexSql, bindings: knexBindings } = db
			.connection()
			.knexQuery()
			.from('users as adonis_temp_0')
			.innerJoin('follows', 'adonis_temp_0.id', 'follows.following_user_id')
			.where('users.id', '=', db.connection().getReadClient().ref('follows.user_id'))
			.toSQL()

		assert.deepEqual(sql, knexSql)
		assert.deepEqual(bindings, knexBindings)
	})

	test('add where pivot clause when self relationship subQuery', async (assert) => {
		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => User, {
				pivotTable: 'follows',
				pivotForeignKey: 'user_id',
				pivotRelatedForeignKey: 'following_user_id',
			})
			public follows: ManyToMany<typeof User>
		}

		User.boot()
		User.$getRelation('follows')!.boot()

		const { sql, bindings } = User.$getRelation('follows')!
			.subQuery(db.connection())
			.select('name')
			.wherePivot('following_user_id', 10)
			.toSQL()

		const { sql: knexSql, bindings: knexBindings } = db
			.connection()
			.knexQuery()
			.from('users as adonis_temp_0')
			.select('adonis_temp_0.name')
			.innerJoin('follows', 'adonis_temp_0.id', 'follows.following_user_id')
			.where('follows.following_user_id', 10)
			.where('users.id', '=', db.connection().getReadClient().ref('follows.user_id'))
			.toSQL()

		assert.deepEqual(sql, knexSql)
		assert.deepEqual(bindings, knexBindings)
	})

	test('allow selecting custom pivot columns', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		User.boot()
		User.$getRelation('skills')!.boot()

		const { sql, bindings } = User.$getRelation('skills')!
			.subQuery(db.connection())
			.pivotColumns(['proficiency'])
			.toSQL()

		const { sql: knexSql, bindings: knexBindings } = db
			.connection()
			.knexQuery()
			.from('skills')
			.select('skill_user.proficiency')
			.innerJoin('skill_user', 'skills.id', 'skill_user.skill_id')
			.where('users.id', '=', db.connection().getReadClient().ref('skill_user.user_id'))
			.toSQL()

		assert.deepEqual(sql, knexSql)
		assert.deepEqual(bindings, knexBindings)
	})
})

test.group('Model | Many To Many | aggregates', (group) => {
	group.before(async () => {
		db = getDb()
		BaseModel = getBaseModel(ormAdapter(db))
		await setup()
	})

	group.after(async () => {
		await cleanup()
		await db.manager.closeAll()
	})

	group.afterEach(async () => {
		await resetTables()
	})

	test('get total of all related rows', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		await db.table('users').insert({ username: 'virk' })
		await db
			.table('skills')
			.multiInsert([{ name: 'Programming' }, { name: 'Cooking' }, { name: 'Dancing' }])
		await db.table('skill_user').multiInsert([
			{ user_id: 1, skill_id: 1 },
			{ user_id: 1, skill_id: 2 },
			{ user_id: 2, skill_id: 2 },
		])

		const user = await User.find(1)
		const total = await user!.related('skills').query().count('* as total')

		assert.deepEqual(Number(total[0].total), 2)
	})

	test('select extra columns with count', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		await db.table('users').insert({ username: 'virk' })
		await db
			.table('skills')
			.multiInsert([{ name: 'Programming' }, { name: 'Cooking' }, { name: 'Dancing' }])
		await db.table('skill_user').multiInsert([
			{ user_id: 1, skill_id: 1 },
			{ user_id: 1, skill_id: 2 },
			{ user_id: 2, skill_id: 2 },
		])

		const user = await User.find(1)
		const total = await user!
			.related('skills')
			.query()
			.select('name', 'id')
			.groupBy('skills.name', 'skills.id')
			.count('* as total')
			.orderBy('skills.id', 'desc')

		assert.lengthOf(total, 2)
		assert.equal(total[0].name, 'Cooking')
		assert.equal(Number(total[0].total), 1)

		assert.equal(total[1].name, 'Programming')
		assert.equal(Number(total[1].total), 1)
	})

	test('select extra pivot columns with count', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		await db.table('users').insert({ username: 'virk' })
		await db
			.table('skills')
			.multiInsert([{ name: 'Programming' }, { name: 'Cooking' }, { name: 'Dancing' }])
		await db.table('skill_user').multiInsert([
			{ user_id: 1, skill_id: 1, proficiency: 'Beginner' },
			{ user_id: 1, skill_id: 2, proficiency: 'Advanced' },
			{ user_id: 2, skill_id: 2, proficiency: 'Beginner' },
		])

		const user = await User.find(1)
		const total = await user!
			.related('skills')
			.query()
			.pivotColumns(['proficiency'])
			.select('id')
			.groupBy('skill_user.proficiency', 'skills.id')
			.count('* as total')
			.orderBy('skills.id', 'desc')

		assert.lengthOf(total, 2)
		assert.equal(total[0].pivot_proficiency, 'Advanced')
		assert.equal(Number(total[0].total), 1)

		assert.equal(total[1].pivot_proficiency, 'Beginner')
		assert.equal(Number(total[1].total), 1)
	})
})

test.group('Model | ManyToMany | preload', (group) => {
	group.before(async () => {
		db = getDb()
		BaseModel = getBaseModel(ormAdapter(db))
		await setup()
	})

	group.after(async () => {
		await cleanup()
		await db.manager.closeAll()
	})

	group.afterEach(async () => {
		await resetTables()
	})

	test('preload relation', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public name: string
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		User.boot()
		await db
			.insertQuery()
			.table('users')
			.insert([{ username: 'virk' }])
		await db
			.insertQuery()
			.table('skills')
			.insert([{ name: 'Programming' }, { name: 'Dancing' }])
		await db
			.insertQuery()
			.table('skill_user')
			.insert([
				{
					user_id: 1,
					skill_id: 1,
				},
			])

		const users = await User.query().preload('skills')
		assert.lengthOf(users, 1)
		assert.lengthOf(users[0].skills, 1)
		assert.equal(users[0].skills[0].name, 'Programming')
		assert.equal(users[0].skills[0].$extras.pivot_user_id, 1)
		assert.equal(users[0].skills[0].$extras.pivot_skill_id, 1)
	})

	test('preload relation for many', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public name: string
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		User.boot()

		await db
			.insertQuery()
			.table('users')
			.insert([{ username: 'virk' }, { username: 'nikk' }])
		await db
			.insertQuery()
			.table('skills')
			.insert([{ name: 'Programming' }, { name: 'Dancing' }])
		await db
			.insertQuery()
			.table('skill_user')
			.insert([
				{
					user_id: 1,
					skill_id: 1,
				},
				{
					user_id: 1,
					skill_id: 2,
				},
				{
					user_id: 2,
					skill_id: 2,
				},
			])

		const users = await User.query().preload('skills')
		assert.lengthOf(users, 2)
		assert.lengthOf(users[0].skills, 2)
		assert.lengthOf(users[1].skills, 1)

		assert.equal(users[0].skills[0].name, 'Programming')
		assert.equal(users[0].skills[0].$extras.pivot_user_id, 1)
		assert.equal(users[0].skills[0].$extras.pivot_skill_id, 1)

		assert.equal(users[0].skills[1].name, 'Dancing')
		assert.equal(users[0].skills[1].$extras.pivot_user_id, 1)
		assert.equal(users[0].skills[1].$extras.pivot_skill_id, 2)

		assert.equal(users[1].skills[0].name, 'Dancing')
		assert.equal(users[1].skills[0].$extras.pivot_user_id, 2)
		assert.equal(users[1].skills[0].$extras.pivot_skill_id, 2)
	})

	test('preload relation using model instance', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public name: string
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		User.boot()

		await db
			.insertQuery()
			.table('users')
			.insert([{ username: 'virk' }, { username: 'nikk' }])
		await db
			.insertQuery()
			.table('skills')
			.insert([{ name: 'Programming' }, { name: 'Dancing' }])
		await db
			.insertQuery()
			.table('skill_user')
			.insert([
				{
					user_id: 1,
					skill_id: 1,
				},
				{
					user_id: 1,
					skill_id: 2,
				},
				{
					user_id: 2,
					skill_id: 2,
				},
			])

		const users = await User.query().orderBy('id', 'asc')
		assert.lengthOf(users, 2)

		await users[0].preload('skills')
		await users[1].preload('skills')

		assert.lengthOf(users[0].skills, 2)
		assert.lengthOf(users[1].skills, 1)

		assert.equal(users[0].skills[0].name, 'Programming')
		assert.equal(users[0].skills[0].$extras.pivot_user_id, 1)
		assert.equal(users[0].skills[0].$extras.pivot_skill_id, 1)

		assert.equal(users[0].skills[1].name, 'Dancing')
		assert.equal(users[0].skills[1].$extras.pivot_user_id, 1)
		assert.equal(users[0].skills[1].$extras.pivot_skill_id, 2)

		assert.equal(users[1].skills[0].name, 'Dancing')
		assert.equal(users[1].skills[0].$extras.pivot_user_id, 2)
		assert.equal(users[1].skills[0].$extras.pivot_skill_id, 2)
	})

	test('select extra pivot columns', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public name: string

			@column()
			public proficiency: string
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill, { pivotColumns: ['proficiency'] })
			public skills: ManyToMany<typeof Skill>
		}

		User.boot()

		await db
			.insertQuery()
			.table('users')
			.insert([{ username: 'virk' }, { username: 'nikk' }])
		await db
			.insertQuery()
			.table('skills')
			.insert([{ name: 'Programming' }, { name: 'Dancing' }])
		await db
			.insertQuery()
			.table('skill_user')
			.insert([
				{
					user_id: 1,
					skill_id: 1,
					proficiency: 'expert',
				},
				{
					user_id: 1,
					skill_id: 2,
					proficiency: 'beginner',
				},
				{
					user_id: 2,
					skill_id: 2,
					proficiency: 'beginner',
				},
			])

		const users = await User.query().preload('skills')
		assert.lengthOf(users, 2)
		assert.lengthOf(users[0].skills, 2)
		assert.lengthOf(users[1].skills, 1)

		assert.equal(users[0].skills[0].name, 'Programming')
		assert.equal(users[0].skills[0].$extras.pivot_user_id, 1)
		assert.equal(users[0].skills[0].$extras.pivot_skill_id, 1)
		assert.equal(users[0].skills[0].$extras.pivot_proficiency, 'expert')

		assert.equal(users[0].skills[1].name, 'Dancing')
		assert.equal(users[0].skills[1].$extras.pivot_user_id, 1)
		assert.equal(users[0].skills[1].$extras.pivot_skill_id, 2)
		assert.equal(users[0].skills[1].$extras.pivot_proficiency, 'beginner')

		assert.equal(users[1].skills[0].name, 'Dancing')
		assert.equal(users[1].skills[0].$extras.pivot_user_id, 2)
		assert.equal(users[1].skills[0].$extras.pivot_skill_id, 2)
		assert.equal(users[1].skills[0].$extras.pivot_proficiency, 'beginner')
	})

	test('select extra pivot columns at runtime', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public name: string

			@column()
			public proficiency: string
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		User.boot()

		await db
			.insertQuery()
			.table('users')
			.insert([{ username: 'virk' }, { username: 'nikk' }])
		await db
			.insertQuery()
			.table('skills')
			.insert([{ name: 'Programming' }, { name: 'Dancing' }])
		await db
			.insertQuery()
			.table('skill_user')
			.insert([
				{
					user_id: 1,
					skill_id: 1,
					proficiency: 'expert',
				},
				{
					user_id: 1,
					skill_id: 2,
					proficiency: 'beginner',
				},
				{
					user_id: 2,
					skill_id: 2,
					proficiency: 'beginner',
				},
			])

		const users = await User.query().preload('skills', (builder) => {
			builder.pivotColumns(['proficiency'])
		})

		assert.lengthOf(users, 2)
		assert.lengthOf(users[0].skills, 2)
		assert.lengthOf(users[1].skills, 1)

		assert.equal(users[0].skills[0].name, 'Programming')
		assert.equal(users[0].skills[0].$extras.pivot_user_id, 1)
		assert.equal(users[0].skills[0].$extras.pivot_skill_id, 1)
		assert.equal(users[0].skills[0].$extras.pivot_proficiency, 'expert')

		assert.equal(users[0].skills[1].name, 'Dancing')
		assert.equal(users[0].skills[1].$extras.pivot_user_id, 1)
		assert.equal(users[0].skills[1].$extras.pivot_skill_id, 2)
		assert.equal(users[0].skills[1].$extras.pivot_proficiency, 'beginner')

		assert.equal(users[1].skills[0].name, 'Dancing')
		assert.equal(users[1].skills[0].$extras.pivot_user_id, 2)
		assert.equal(users[1].skills[0].$extras.pivot_skill_id, 2)
		assert.equal(users[1].skills[0].$extras.pivot_proficiency, 'beginner')
	})

	test('cherry pick columns during preload', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public name: string
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		User.boot()
		await db
			.insertQuery()
			.table('users')
			.insert([{ username: 'virk' }])
		await db
			.insertQuery()
			.table('skills')
			.insert([{ name: 'Programming' }, { name: 'Dancing' }])
		await db
			.insertQuery()
			.table('skill_user')
			.insert([
				{
					user_id: 1,
					skill_id: 1,
				},
			])

		const users = await User.query().preload('skills', (builder) => {
			return builder.select('name')
		})

		assert.lengthOf(users, 1)
		assert.lengthOf(users[0].skills, 1)
		assert.equal(users[0].skills[0].name, 'Programming')
		assert.deepEqual(users[0].skills[0].$extras, { pivot_user_id: 1, pivot_skill_id: 1 })
	})

	test('raise error when local key is not selected', async (assert) => {
		assert.plan(1)

		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public name: string
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		User.boot()

		await db
			.insertQuery()
			.table('users')
			.insert([{ username: 'virk' }, { username: 'nikk' }])
		await db
			.insertQuery()
			.table('skills')
			.insert([{ name: 'Programming' }, { name: 'Dancing' }])
		await db
			.insertQuery()
			.table('skill_user')
			.insert([
				{
					user_id: 1,
					skill_id: 1,
				},
				{
					user_id: 1,
					skill_id: 2,
				},
				{
					user_id: 2,
					skill_id: 2,
				},
			])

		try {
			await User.query().select('username').preload('skills')
		} catch ({ message }) {
			assert.equal(message, 'Cannot preload "skills", value of "User.id" is undefined')
		}
	})

	test('do not run preload query when parent rows are empty', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public name: string
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		User.boot()

		const users = await User.query().preload('skills', () => {
			throw new Error('not expected to be here')
		})
		assert.lengthOf(users, 0)
	})
})

test.group('Model | ManyToMany | withCount', (group) => {
	group.before(async () => {
		db = getDb()
		BaseModel = getBaseModel(ormAdapter(db))
		await setup()
	})

	group.after(async () => {
		await cleanup()
		await db.manager.closeAll()
	})

	group.afterEach(async () => {
		await resetTables()
	})

	test('get count of a relationship rows', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public name: string
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		User.boot()
		await db
			.insertQuery()
			.table('users')
			.insert([{ username: 'virk' }, { username: 'nikk' }])

		await db
			.insertQuery()
			.table('skills')
			.insert([{ name: 'Programming' }, { name: 'Dancing' }])

		await db
			.insertQuery()
			.table('skill_user')
			.insert([
				{
					user_id: 1,
					skill_id: 1,
				},
				{
					user_id: 1,
					skill_id: 2,
				},
				{
					user_id: 2,
					skill_id: 2,
				},
			])

		const users = await User.query().withCount('skills').orderBy('id', 'asc')
		assert.lengthOf(users, 2)

		assert.deepEqual(users[0].$extras.skills_count, 2)
		assert.deepEqual(users[1].$extras.skills_count, 1)
	})

	test('apply constraints to the withCount subquery', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public name: string
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		User.boot()
		await db
			.insertQuery()
			.table('users')
			.insert([{ username: 'virk' }, { username: 'nikk' }])

		await db
			.insertQuery()
			.table('skills')
			.insert([{ name: 'Programming' }, { name: 'Dancing' }])

		await db
			.insertQuery()
			.table('skill_user')
			.insert([
				{
					user_id: 1,
					skill_id: 1,
				},
				{
					user_id: 1,
					skill_id: 2,
				},
				{
					user_id: 2,
					skill_id: 2,
				},
			])

		const users = await User.query()
			.withCount('skills', (query) => {
				query.where('name', 'Programming')
			})
			.orderBy('id', 'asc')

		assert.lengthOf(users, 2)
		assert.deepEqual(users[0].$extras.skills_count, 1)
		assert.deepEqual(users[1].$extras.skills_count, 0)
	})

	test('allow subquery to have custom aggregates', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public name: string
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		User.boot()
		await db
			.insertQuery()
			.table('users')
			.insert([{ username: 'virk' }, { username: 'nikk' }])

		await db
			.insertQuery()
			.table('skills')
			.insert([{ name: 'Programming' }, { name: 'Dancing' }])

		await db
			.insertQuery()
			.table('skill_user')
			.insert([
				{
					user_id: 1,
					skill_id: 1,
				},
				{
					user_id: 1,
					skill_id: 2,
				},
				{
					user_id: 2,
					skill_id: 2,
				},
			])

		const users = await User.query()
			.withCount('skills', (query) => {
				query.countDistinct('skill_user.user_id')
			})
			.orderBy('id', 'asc')

		assert.lengthOf(users, 2)
		assert.deepEqual(users[0].$extras.skills_count, 1)
		assert.deepEqual(users[1].$extras.skills_count, 1)
	})

	test('allow cherry picking columns', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public name: string
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public username: string

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		User.boot()
		await db
			.insertQuery()
			.table('users')
			.insert([{ username: 'virk' }, { username: 'nikk' }])

		await db
			.insertQuery()
			.table('skills')
			.insert([{ name: 'Programming' }, { name: 'Dancing' }])

		await db
			.insertQuery()
			.table('skill_user')
			.insert([
				{
					user_id: 1,
					skill_id: 1,
				},
				{
					user_id: 1,
					skill_id: 2,
				},
				{
					user_id: 2,
					skill_id: 2,
				},
			])

		const users = await User.query().select('username').withCount('skills').orderBy('id', 'asc')

		assert.lengthOf(users, 2)
		assert.deepEqual(users[0].$attributes, { username: 'virk' })
		assert.deepEqual(users[1].$attributes, { username: 'nikk' })
	})

	test('get count of self relationship', async (assert) => {
		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => User, {
				pivotTable: 'follows',
				pivotForeignKey: 'user_id',
				pivotRelatedForeignKey: 'following_user_id',
			})
			public follows: ManyToMany<typeof User>
		}

		User.boot()

		await db
			.insertQuery()
			.table('users')
			.multiInsert([
				{ username: 'virk' },
				{ username: 'nikk' },
				{ username: 'romain' },
				{ username: 'joe' },
			])

		await db
			.insertQuery()
			.table('follows')
			.insert([
				{
					user_id: 1,
					following_user_id: 2,
				},
				{
					user_id: 1,
					following_user_id: 3,
				},
				{
					user_id: 3,
					following_user_id: 1,
				},
			])

		const users = await User.query().withCount('follows').orderBy('id', 'asc')

		assert.lengthOf(users, 4)
		assert.deepEqual(users[0].$extras.follows_count, 2)
		assert.deepEqual(users[1].$extras.follows_count, 0)
		assert.deepEqual(users[2].$extras.follows_count, 1)
		assert.deepEqual(users[3].$extras.follows_count, 0)
	})

	test('define custom alias for the count', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public name: string
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public username: string

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		User.boot()
		await db
			.insertQuery()
			.table('users')
			.insert([{ username: 'virk' }, { username: 'nikk' }])

		await db
			.insertQuery()
			.table('skills')
			.insert([{ name: 'Programming' }, { name: 'Dancing' }])

		await db
			.insertQuery()
			.table('skill_user')
			.insert([
				{
					user_id: 1,
					skill_id: 1,
				},
				{
					user_id: 1,
					skill_id: 2,
				},
				{
					user_id: 2,
					skill_id: 2,
				},
			])

		const users = await User.query()
			.select('username')
			.withCount('skills', (query) => {
				query.as('mySkills')
			})
			.orderBy('id', 'asc')

		assert.lengthOf(users, 2)
		assert.deepEqual(users[0].$extras.mySkills, 2)
		assert.deepEqual(users[1].$extras.mySkills, 1)
	})
})

if (process.env.DB !== 'mysql_legacy') {
	test.group('Model | ManyToMany | Group Limit', (group) => {
		group.before(async () => {
			db = getDb()
			BaseModel = getBaseModel(ormAdapter(db))
			await setup()
		})

		group.after(async () => {
			await cleanup()
			await db.manager.closeAll()
		})

		group.afterEach(async () => {
			await resetTables()
		})

		test('apply group limit', async (assert) => {
			class Skill extends BaseModel {
				@column({ isPrimary: true })
				public id: number

				@column()
				public name: string
			}

			class User extends BaseModel {
				@column({ isPrimary: true })
				public id: number

				@manyToMany(() => Skill)
				public skills: ManyToMany<typeof Skill>
			}

			User.boot()
			await db
				.insertQuery()
				.table('users')
				.insert([{ username: 'virk' }, { username: 'nikk' }])

			await db
				.insertQuery()
				.table('skills')
				.insert([
					{ name: 'Programming' },
					{ name: 'Dancing' },
					{ name: 'Designing' },
					{ name: 'Cooking' },
					{ name: 'Singing' },
				])

			const skillIds = [1, 2, 3, 4, 5]

			/**
			 * User 1 skills
			 */
			await db
				.insertQuery()
				.table('skill_user')
				.insert(
					skillIds.map((id) => {
						return { user_id: 1, skill_id: id }
					})
				)

			/**
			 * User 2 skills
			 */
			await db
				.insertQuery()
				.table('skill_user')
				.insert(
					skillIds.map((id) => {
						return { user_id: 2, skill_id: id }
					})
				)

			const users = await User.query().preload('skills', (query) => query.groupLimit(2))

			assert.lengthOf(users, 2)
			assert.lengthOf(users[0].skills, 2)
			assert.equal(users[0].skills[0].name, 'Singing')
			assert.equal(users[0].skills[0].$extras.pivot_user_id, 1)
			assert.equal(users[0].skills[0].$extras.pivot_skill_id, 5)
			assert.equal(users[0].skills[1].name, 'Cooking')
			assert.equal(users[0].skills[1].$extras.pivot_user_id, 1)
			assert.equal(users[0].skills[1].$extras.pivot_skill_id, 4)

			assert.equal(users[1].skills[0].name, 'Singing')
			assert.equal(users[1].skills[0].$extras.pivot_user_id, 2)
			assert.equal(users[1].skills[0].$extras.pivot_skill_id, 5)
			assert.equal(users[1].skills[1].name, 'Cooking')
			assert.equal(users[1].skills[1].$extras.pivot_user_id, 2)
			assert.equal(users[1].skills[1].$extras.pivot_skill_id, 4)
		})

		test('apply group limit with extra constraints', async (assert) => {
			class Skill extends BaseModel {
				@column({ isPrimary: true })
				public id: number

				@column()
				public name: string
			}

			class User extends BaseModel {
				@column({ isPrimary: true })
				public id: number

				@manyToMany(() => Skill)
				public skills: ManyToMany<typeof Skill>
			}

			User.boot()
			await db
				.insertQuery()
				.table('users')
				.insert([{ username: 'virk' }, { username: 'nikk' }])

			await db
				.insertQuery()
				.table('skills')
				.insert([
					{ name: 'Programming' },
					{ name: 'Dancing' },
					{ name: 'Designing' },
					{ name: 'Cooking' },
					{ name: 'Singing' },
				])

			/**
			 * User 1 skills
			 */
			await db
				.insertQuery()
				.table('skill_user')
				.insert([
					{
						user_id: 1,
						skill_id: 1,
						proficiency: 'Master',
					},
					{
						user_id: 1,
						skill_id: 2,
						proficiency: 'Beginner',
					},
					{
						user_id: 1,
						skill_id: 3,
						proficiency: 'Master',
					},
					{
						user_id: 1,
						skill_id: 4,
						proficiency: 'Beginner',
					},
					{
						user_id: 1,
						skill_id: 5,
						proficiency: 'Noob',
					},
				])

			/**
			 * User 2 skills
			 */
			await db
				.insertQuery()
				.table('skill_user')
				.insert([
					{
						user_id: 2,
						skill_id: 1,
						proficiency: 'Beginner',
					},
					{
						user_id: 2,
						skill_id: 2,
						proficiency: 'Beginner',
					},
					{
						user_id: 2,
						skill_id: 3,
						proficiency: 'Master',
					},
					{
						user_id: 2,
						skill_id: 4,
						proficiency: 'Beginner',
					},
					{
						user_id: 2,
						skill_id: 5,
						proficiency: 'Master',
					},
				])

			const users = await User.query().preload('skills', (query) => {
				query.groupLimit(2).wherePivot('proficiency', 'Master')
			})

			assert.lengthOf(users, 2)
			assert.lengthOf(users[0].skills, 2)
			assert.equal(users[0].skills[0].name, 'Designing')
			assert.equal(users[0].skills[0].$extras.pivot_user_id, 1)
			assert.equal(users[0].skills[0].$extras.pivot_skill_id, 3)
			assert.equal(users[0].skills[1].name, 'Programming')
			assert.equal(users[0].skills[1].$extras.pivot_user_id, 1)
			assert.equal(users[0].skills[1].$extras.pivot_skill_id, 1)

			assert.equal(users[1].skills[0].name, 'Singing')
			assert.equal(users[1].skills[0].$extras.pivot_user_id, 2)
			assert.equal(users[1].skills[0].$extras.pivot_skill_id, 5)
			assert.equal(users[1].skills[1].name, 'Designing')
			assert.equal(users[1].skills[1].$extras.pivot_user_id, 2)
			assert.equal(users[1].skills[1].$extras.pivot_skill_id, 3)
		})

		test('apply group limit and select custom columns', async (assert) => {
			class Skill extends BaseModel {
				@column({ isPrimary: true })
				public id: number

				@column()
				public name: string
			}

			class User extends BaseModel {
				@column({ isPrimary: true })
				public id: number

				@manyToMany(() => Skill)
				public skills: ManyToMany<typeof Skill>
			}

			User.boot()
			await db
				.insertQuery()
				.table('users')
				.insert([{ username: 'virk' }, { username: 'nikk' }])

			await db
				.insertQuery()
				.table('skills')
				.insert([
					{ name: 'Programming' },
					{ name: 'Dancing' },
					{ name: 'Designing' },
					{ name: 'Cooking' },
					{ name: 'Singing' },
				])

			/**
			 * User 1 skills
			 */
			await db
				.insertQuery()
				.table('skill_user')
				.insert([
					{
						user_id: 1,
						skill_id: 1,
						proficiency: 'Master',
					},
					{
						user_id: 1,
						skill_id: 2,
						proficiency: 'Beginner',
					},
					{
						user_id: 1,
						skill_id: 3,
						proficiency: 'Master',
					},
					{
						user_id: 1,
						skill_id: 4,
						proficiency: 'Beginner',
					},
					{
						user_id: 1,
						skill_id: 5,
						proficiency: 'Noob',
					},
				])

			/**
			 * User 2 skills
			 */
			await db
				.insertQuery()
				.table('skill_user')
				.insert([
					{
						user_id: 2,
						skill_id: 1,
						proficiency: 'Beginner',
					},
					{
						user_id: 2,
						skill_id: 2,
						proficiency: 'Beginner',
					},
					{
						user_id: 2,
						skill_id: 3,
						proficiency: 'Master',
					},
					{
						user_id: 2,
						skill_id: 4,
						proficiency: 'Beginner',
					},
					{
						user_id: 2,
						skill_id: 5,
						proficiency: 'Master',
					},
				])

			const users = await User.query().preload('skills', (query) => {
				query
					.groupLimit(2)
					.wherePivot('proficiency', 'Master')
					.select('name')
					.pivotColumns(['proficiency'])
			})

			assert.lengthOf(users, 2)
			assert.lengthOf(users[0].skills, 2)
			assert.equal(users[0].skills[0].name, 'Designing')
			assert.equal(users[0].skills[0].$extras.pivot_user_id, 1)
			assert.equal(users[0].skills[0].$extras.pivot_skill_id, 3)
			assert.equal(users[0].skills[0].$extras.pivot_proficiency, 'Master')
			assert.equal(users[0].skills[1].name, 'Programming')
			assert.equal(users[0].skills[1].$extras.pivot_user_id, 1)
			assert.equal(users[0].skills[1].$extras.pivot_skill_id, 1)
			assert.equal(users[0].skills[1].$extras.pivot_proficiency, 'Master')

			assert.equal(users[1].skills[0].name, 'Singing')
			assert.equal(users[1].skills[0].$extras.pivot_user_id, 2)
			assert.equal(users[1].skills[0].$extras.pivot_skill_id, 5)
			assert.equal(users[1].skills[0].$extras.pivot_proficiency, 'Master')
			assert.equal(users[1].skills[1].name, 'Designing')
			assert.equal(users[1].skills[1].$extras.pivot_user_id, 2)
			assert.equal(users[1].skills[1].$extras.pivot_skill_id, 3)
			assert.equal(users[1].skills[1].$extras.pivot_proficiency, 'Master')
		})

		test('define custom order by clause', async (assert) => {
			class Skill extends BaseModel {
				@column({ isPrimary: true })
				public id: number

				@column()
				public name: string
			}

			class User extends BaseModel {
				@column({ isPrimary: true })
				public id: number

				@manyToMany(() => Skill)
				public skills: ManyToMany<typeof Skill>
			}

			User.boot()
			await db
				.insertQuery()
				.table('users')
				.insert([{ username: 'virk' }, { username: 'nikk' }])

			await db
				.insertQuery()
				.table('skills')
				.insert([
					{ name: 'Programming' },
					{ name: 'Dancing' },
					{ name: 'Designing' },
					{ name: 'Cooking' },
					{ name: 'Singing' },
				])

			/**
			 * User 1 skills
			 */
			await db
				.insertQuery()
				.table('skill_user')
				.insert([
					{
						user_id: 1,
						skill_id: 1,
						proficiency: 'Master',
					},
					{
						user_id: 1,
						skill_id: 2,
						proficiency: 'Beginner',
					},
					{
						user_id: 1,
						skill_id: 3,
						proficiency: 'Master',
					},
					{
						user_id: 1,
						skill_id: 4,
						proficiency: 'Beginner',
					},
					{
						user_id: 1,
						skill_id: 5,
						proficiency: 'Noob',
					},
				])

			/**
			 * User 2 skills
			 */
			await db
				.insertQuery()
				.table('skill_user')
				.insert([
					{
						user_id: 2,
						skill_id: 1,
						proficiency: 'Beginner',
					},
					{
						user_id: 2,
						skill_id: 2,
						proficiency: 'Beginner',
					},
					{
						user_id: 2,
						skill_id: 3,
						proficiency: 'Master',
					},
					{
						user_id: 2,
						skill_id: 4,
						proficiency: 'Beginner',
					},
					{
						user_id: 2,
						skill_id: 5,
						proficiency: 'Master',
					},
				])

			const users = await User.query().preload('skills', (query) => {
				query
					.groupLimit(2)
					.wherePivot('proficiency', 'Master')
					.select('name')
					.pivotColumns(['proficiency'])
					.groupOrderBy('skills.name', 'asc')
			})

			assert.lengthOf(users, 2)
			assert.lengthOf(users[0].skills, 2)
			assert.equal(users[0].skills[0].name, 'Designing')
			assert.equal(users[0].skills[0].$extras.pivot_user_id, 1)
			assert.equal(users[0].skills[0].$extras.pivot_skill_id, 3)
			assert.equal(users[0].skills[0].$extras.pivot_proficiency, 'Master')
			assert.equal(users[0].skills[1].name, 'Programming')
			assert.equal(users[0].skills[1].$extras.pivot_user_id, 1)
			assert.equal(users[0].skills[1].$extras.pivot_skill_id, 1)
			assert.equal(users[0].skills[1].$extras.pivot_proficiency, 'Master')

			assert.equal(users[1].skills[0].name, 'Designing')
			assert.equal(users[1].skills[0].$extras.pivot_user_id, 2)
			assert.equal(users[1].skills[0].$extras.pivot_skill_id, 3)
			assert.equal(users[1].skills[0].$extras.pivot_proficiency, 'Master')
			assert.equal(users[1].skills[1].name, 'Singing')
			assert.equal(users[1].skills[1].$extras.pivot_user_id, 2)
			assert.equal(users[1].skills[1].$extras.pivot_skill_id, 5)
			assert.equal(users[1].skills[1].$extras.pivot_proficiency, 'Master')
		})

		test('apply standard limit when not eagerloading', async (assert) => {
			class Skill extends BaseModel {
				@column({ isPrimary: true })
				public id: number

				@column()
				public name: string
			}

			class User extends BaseModel {
				@column({ isPrimary: true })
				public id: number

				@manyToMany(() => Skill)
				public skills: ManyToMany<typeof Skill>
			}

			User.boot()
			await db
				.insertQuery()
				.table('users')
				.insert([{ username: 'virk' }, { username: 'nikk' }])

			await db
				.insertQuery()
				.table('skills')
				.insert([
					{ name: 'Programming' },
					{ name: 'Dancing' },
					{ name: 'Designing' },
					{ name: 'Cooking' },
					{ name: 'Singing' },
				])

			const skillIds = [1, 2, 3, 4, 5]

			/**
			 * User 1 skills
			 */
			await db
				.insertQuery()
				.table('skill_user')
				.insert(
					skillIds.map((id) => {
						return { user_id: 1, skill_id: id }
					})
				)

			const user = await User.query().firstOrFail()
			const { sql, bindings } = user.related('skills').query().groupLimit(2).toSQL()
			const { sql: knexSql, bindings: knexBindings } = db
				.query()
				.from('skills')
				.select(
					'skills.*',
					'skill_user.user_id as pivot_user_id',
					'skill_user.skill_id as pivot_skill_id'
				)
				.innerJoin('skill_user', 'skills.id', 'skill_user.skill_id')
				.where('skill_user.user_id', 1)
				.limit(2)
				.toSQL()

			assert.equal(sql, knexSql)
			assert.deepEqual(bindings, knexBindings)
		})

		test('apply standard order by when not eagerloading', async (assert) => {
			class Skill extends BaseModel {
				@column({ isPrimary: true })
				public id: number

				@column()
				public name: string
			}

			class User extends BaseModel {
				@column({ isPrimary: true })
				public id: number

				@manyToMany(() => Skill)
				public skills: ManyToMany<typeof Skill>
			}

			User.boot()
			await db
				.insertQuery()
				.table('users')
				.insert([{ username: 'virk' }, { username: 'nikk' }])

			await db
				.insertQuery()
				.table('skills')
				.insert([
					{ name: 'Programming' },
					{ name: 'Dancing' },
					{ name: 'Designing' },
					{ name: 'Cooking' },
					{ name: 'Singing' },
				])

			const skillIds = [1, 2, 3, 4, 5]

			/**
			 * User 1 skills
			 */
			await db
				.insertQuery()
				.table('skill_user')
				.insert(
					skillIds.map((id) => {
						return { user_id: 1, skill_id: id }
					})
				)

			const user = await User.query().firstOrFail()
			const { sql, bindings } = user
				.related('skills')
				.query()
				.groupLimit(2)
				.groupOrderBy('skill_user.id', 'desc')
				.toSQL()

			const { sql: knexSql, bindings: knexBindings } = db
				.query()
				.from('skills')
				.select(
					'skills.*',
					'skill_user.user_id as pivot_user_id',
					'skill_user.skill_id as pivot_skill_id'
				)
				.innerJoin('skill_user', 'skills.id', 'skill_user.skill_id')
				.where('skill_user.user_id', 1)
				.limit(2)
				.orderBy('skill_user.id', 'desc')
				.toSQL()

			assert.equal(sql, knexSql)
			assert.deepEqual(bindings, knexBindings)
		})
	})
}

test.group('Model | ManyToMany | wherePivot', (group) => {
	group.before(async () => {
		db = getDb()
		BaseModel = getBaseModel(ormAdapter(db))
		await setup()
	})

	group.after(async () => {
		await cleanup()
		await db.manager.closeAll()
	})

	test('add where clause', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		User.boot()
		const user = new User()
		const query = user!.related('skills').query()

		query['appliedConstraints'] = true

		const { sql, bindings } = query.wherePivot('username', 'virk').toSQL()

		const { sql: knexSql, bindings: knexBindings } = db
			.connection()
			.getWriteClient()
			.from('skills')
			.where('skill_user.username', 'virk')
			.toSQL()

		assert.equal(sql, knexSql)
		assert.deepEqual(bindings, knexBindings)
	})

	test('add where wrapped clause', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		User.boot()
		const user = new User()
		const query = user!.related('skills').query()

		query['appliedConstraints'] = true

		const { sql, bindings } = query
			.where((builder) => builder.wherePivot('username', 'virk'))
			['toSQL']()

		const { sql: knexSql, bindings: knexBindings } = db
			.connection()
			.getWriteClient()
			.from('skills')
			.where((builder) => builder.where('skill_user.username', 'virk'))
			.toSQL()

		assert.equal(sql, knexSql)
		assert.deepEqual(bindings, knexBindings)
	})

	test('add where clause with operator', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		User.boot()
		const user = new User()
		const query = user!.related('skills').query()

		query['appliedConstraints'] = true

		const { sql, bindings } = query.wherePivot('age', '>', 22).toSQL()

		const { sql: knexSql, bindings: knexBindings } = db
			.connection()
			.getWriteClient()
			.from('skills')
			.where('skill_user.age', '>', 22)
			.toSQL()

		assert.equal(sql, knexSql)
		assert.deepEqual(bindings, knexBindings)
	})

	test('add where clause as a raw query', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		User.boot()
		const user = new User()
		const query = user!.related('skills').query()

		query['appliedConstraints'] = true

		const { sql, bindings } = query
			.wherePivot('age', '>', db.rawQuery('select min_age from ages limit 1;'))
			.toSQL()

		const { sql: knexSql, bindings: knexBindings } = db
			.connection()
			.getWriteClient()
			.from('skills')
			.where(
				'skill_user.age',
				'>',
				db.connection().getWriteClient().raw('select min_age from ages limit 1;')
			)
			.toSQL()

		assert.equal(sql, knexSql)
		assert.deepEqual(bindings, knexBindings)
	})

	test('add orWhere clause', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		User.boot()
		const user = new User()
		const query = user!.related('skills').query()

		query['appliedConstraints'] = true

		const { sql, bindings } = query.wherePivot('age', '>', 22).orWherePivot('age', 18).toSQL()

		const { sql: knexSql, bindings: knexBindings } = db
			.connection()
			.getWriteClient()
			.from('skills')
			.where('skill_user.age', '>', 22)
			.orWhere('skill_user.age', 18)
			.toSQL()

		assert.equal(sql, knexSql)
		assert.deepEqual(bindings, knexBindings)
	})

	test('add orWhere wrapped clause', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		User.boot()
		const user = new User()
		const query = user!.related('skills').query()

		query['appliedConstraints'] = true

		const { sql, bindings } = query
			.wherePivot('age', '>', 22)
			.orWhere((builder) => {
				builder.wherePivot('age', 18)
			})
			.toSQL()

		const { sql: knexSql, bindings: knexBindings } = db
			.connection()
			.getWriteClient()
			.from('skills')
			.where('skill_user.age', '>', 22)
			.orWhere((builder) => {
				builder.where('skill_user.age', 18)
			})
			.toSQL()

		assert.equal(sql, knexSql)
		assert.deepEqual(bindings, knexBindings)
	})

	test('pass relationship metadata to the profiler', async (assert) => {
		assert.plan(1)

		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public name: string
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		User.boot()
		await db
			.insertQuery()
			.table('users')
			.insert([{ username: 'virk' }])
		await db
			.insertQuery()
			.table('skills')
			.insert([{ name: 'Programming' }, { name: 'Dancing' }])
		await db
			.insertQuery()
			.table('skill_user')
			.insert([
				{
					user_id: 1,
					skill_id: 1,
				},
			])

		const profiler = getProfiler(true)

		let profilerPacketIndex = 0
		profiler.process((packet) => {
			if (profilerPacketIndex === 1) {
				assert.deepEqual(packet.data.relation, {
					model: 'User',
					relatedModel: 'Skill',
					pivotTable: 'skill_user',
					type: 'manyToMany',
				})
			}
			profilerPacketIndex++
		})

		await User.query({ profiler }).preload('skills')
	})
})

test.group('Model | ManyToMany | whereNotPivot', (group) => {
	group.before(async () => {
		db = getDb()
		BaseModel = getBaseModel(ormAdapter(db))
		await setup()
	})

	group.after(async () => {
		await cleanup()
		await db.manager.closeAll()
	})

	test('add where no clause', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		User.boot()
		const user = new User()
		const query = user!.related('skills').query()

		query['appliedConstraints'] = true
		const { sql, bindings } = query.whereNotPivot('username', 'virk').toSQL()

		const { sql: knexSql, bindings: knexBindings } = db
			.connection()
			.getWriteClient()
			.from('skills')
			.whereNot('skill_user.username', 'virk')
			.toSQL()

		assert.equal(sql, knexSql)
		assert.deepEqual(bindings, knexBindings)
	})

	test('add where not clause with operator', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		User.boot()
		const user = new User()
		const query = user!.related('skills').query()

		query['appliedConstraints'] = true

		const { sql, bindings } = query.whereNotPivot('age', '>', 22).toSQL()

		const { sql: knexSql, bindings: knexBindings } = db
			.connection()
			.getWriteClient()
			.from('skills')
			.whereNot('skill_user.age', '>', 22)
			.toSQL()

		assert.equal(sql, knexSql)
		assert.deepEqual(bindings, knexBindings)
	})

	test('add where not clause as a raw query', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		User.boot()
		const user = new User()
		const query = user!.related('skills').query()

		query['appliedConstraints'] = true

		const { sql, bindings } = query
			.whereNotPivot('age', '>', db.rawQuery('select min_age from ages limit 1;'))
			.toSQL()

		const { sql: knexSql, bindings: knexBindings } = db
			.connection()
			.getWriteClient()
			.from('skills')
			.whereNot(
				'skill_user.age',
				'>',
				db.connection().getWriteClient().raw('select min_age from ages limit 1;')
			)
			.toSQL()

		assert.equal(sql, knexSql)
		assert.deepEqual(bindings, knexBindings)
	})

	test('add orWhereNot clause', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		User.boot()
		const user = new User()
		const query = user!.related('skills').query()

		query['appliedConstraints'] = true

		const { sql, bindings } = query.whereNotPivot('age', '>', 22).orWhereNotPivot('age', 18).toSQL()

		const { sql: knexSql, bindings: knexBindings } = db
			.connection()
			.getWriteClient()
			.from('skills')
			.whereNot('skill_user.age', '>', 22)
			.orWhereNot('skill_user.age', 18)
			.toSQL()

		assert.equal(sql, knexSql)
		assert.deepEqual(bindings, knexBindings)
	})
})

test.group('Model | ManyToMany | whereInPivot', (group) => {
	group.before(async () => {
		db = getDb()
		BaseModel = getBaseModel(ormAdapter(db))
		await setup()
	})

	group.after(async () => {
		await cleanup()
		await db.manager.closeAll()
	})

	test('add whereIn clause', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		User.boot()
		const user = new User()
		const query = user!.related('skills').query()

		query['appliedConstraints'] = true

		const { sql, bindings } = query.whereInPivot('username', ['virk', 'nikk']).toSQL()

		const { sql: knexSql, bindings: knexBindings } = db
			.connection()
			.getWriteClient()
			.from('skills')
			.whereIn('skill_user.username', ['virk', 'nikk'])
			.toSQL()

		assert.equal(sql, knexSql)
		assert.deepEqual(bindings, knexBindings)
	})

	test('add whereIn as a query callback', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		User.boot()
		const user = new User()
		const query = user!.related('skills').query()

		query['appliedConstraints'] = true

		const { sql, bindings } = query
			.whereInPivot('username', (builder) => {
				builder.from('accounts')
			})
			.toSQL()

		const { sql: knexSql, bindings: knexBindings } = db
			.connection()
			.getWriteClient()
			.from('skills')
			.whereIn('skill_user.username', (builder) => {
				builder.from('accounts')
			})
			.toSQL()

		assert.equal(sql, knexSql)
		assert.deepEqual(bindings, knexBindings)
	})

	test('add whereIn as a subquery', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		User.boot()
		const user = new User()
		const query = user!.related('skills').query()

		query['appliedConstraints'] = true

		const { sql, bindings } = query
			.whereInPivot('username', db.query().select('id').from('accounts'))
			.toSQL()

		const { sql: knexSql, bindings: knexBindings } = db
			.connection()
			.getWriteClient()
			.from('skills')
			.whereIn(
				'skill_user.username',
				db.connection().getWriteClient().select('id').from('accounts')
			)
			.toSQL()

		assert.equal(sql, knexSql)
		assert.deepEqual(bindings, knexBindings)
	})

	test('add whereIn as a rawquery', async (assert) => {
		const ref = db.connection().getWriteClient().ref.bind(db.connection().getWriteClient())

		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		User.boot()
		const user = new User()
		const query = user!.related('skills').query()

		query['appliedConstraints'] = true

		const { sql, bindings } = query
			.whereInPivot('username', [db.rawQuery(`select ${ref('id')} from ${ref('accounts')}`)])
			.toSQL()

		const { sql: knexSql, bindings: knexBindings } = db
			.connection()
			.getWriteClient()
			.from('skills')
			.whereIn('skill_user.username', [
				db
					.connection()
					.getWriteClient()
					.raw(`select ${ref('id')} from ${ref('accounts')}`),
			])
			.toSQL()

		assert.equal(sql, knexSql)
		assert.deepEqual(bindings, knexBindings)
	})

	test('add whereIn as a subquery with array of keys', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		User.boot()
		const user = new User()
		const query = user!.related('skills').query()

		query['appliedConstraints'] = true

		const { sql, bindings } = query
			.whereInPivot(['username', 'email'], db.query().select('username', 'email').from('accounts'))
			.toSQL()

		const { sql: knexSql, bindings: knexBindings } = db
			.connection()
			.getWriteClient()
			.from('skills')
			.whereIn(
				['skill_user.username', 'skill_user.email'],
				db.connection().getWriteClient().select('username', 'email').from('accounts')
			)
			.toSQL()

		assert.equal(sql, knexSql)
		assert.deepEqual(bindings, knexBindings)
	})

	test('add whereIn as a 2d array', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		User.boot()
		const user = new User()
		const query = user!.related('skills').query()

		query['appliedConstraints'] = true

		const { sql, bindings } = query.whereInPivot(['username', 'email'], [['foo', 'bar']]).toSQL()

		const { sql: knexSql, bindings: knexBindings } = db
			.connection()
			.getWriteClient()
			.from('skills')
			.whereIn(['skill_user.username', 'skill_user.email'], [['foo', 'bar']])
			.toSQL()

		assert.equal(sql, knexSql)
		assert.deepEqual(bindings, knexBindings)
	})

	test('add orWhereIn clause', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		User.boot()
		const user = new User()
		const query = user!.related('skills').query()

		query['appliedConstraints'] = true

		const { sql, bindings } = query
			.whereInPivot('username', ['virk', 'nikk'])
			.orWhereInPivot('username', ['foo'])
			.toSQL()

		const { sql: knexSql, bindings: knexBindings } = db
			.connection()
			.getWriteClient()
			.from('skills')
			.whereIn('skill_user.username', ['virk', 'nikk'])
			.orWhereIn('skill_user.username', ['foo'])
			.toSQL()

		assert.equal(sql, knexSql)
		assert.deepEqual(bindings, knexBindings)
	})

	test('add orWhereIn as a query callback', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		User.boot()
		const user = new User()
		const query = user!.related('skills').query()

		query['appliedConstraints'] = true

		const { sql, bindings } = query
			.whereInPivot('username', (builder) => {
				builder.from('accounts')
			})
			.orWhereInPivot('username', (builder) => {
				builder.from('employees')
			})
			.toSQL()

		const { sql: knexSql, bindings: knexBindings } = db
			.connection()
			.getWriteClient()
			.from('skills')
			.whereIn('skill_user.username', (builder) => {
				builder.from('accounts')
			})
			.orWhereIn('skill_user.username', (builder) => {
				builder.from('employees')
			})
			.toSQL()

		assert.equal(sql, knexSql)
		assert.deepEqual(bindings, knexBindings)
	})
})

test.group('Model | ManyToMany | whereNotInPivot', (group) => {
	group.before(async () => {
		db = getDb()
		BaseModel = getBaseModel(ormAdapter(db))
		await setup()
	})

	group.after(async () => {
		await cleanup()
		await db.manager.closeAll()
	})

	test('add whereNotIn clause', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		User.boot()
		const user = new User()
		const query = user!.related('skills').query()

		query['appliedConstraints'] = true

		const { sql, bindings } = query.whereNotInPivot('username', ['virk', 'nikk']).toSQL()

		const { sql: knexSql, bindings: knexBindings } = db
			.connection()
			.getWriteClient()
			.from('skills')
			.whereNotIn('skill_user.username', ['virk', 'nikk'])
			.toSQL()

		assert.equal(sql, knexSql)
		assert.deepEqual(bindings, knexBindings)
	})

	test('add whereNotIn as a query callback', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		User.boot()
		const user = new User()
		const query = user!.related('skills').query()

		query['appliedConstraints'] = true

		const { sql, bindings } = query
			.whereNotInPivot('username', (builder) => {
				builder.from('accounts')
			})
			.toSQL()

		const { sql: knexSql, bindings: knexBindings } = db
			.connection()
			.getWriteClient()
			.from('skills')
			.whereNotIn('skill_user.username', (builder) => {
				builder.from('accounts')
			})
			.toSQL()

		assert.equal(sql, knexSql)
		assert.deepEqual(bindings, knexBindings)
	})

	test('add whereNotIn as a sub query', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		User.boot()
		const user = new User()
		const query = user!.related('skills').query()

		query['appliedConstraints'] = true

		const { sql, bindings } = query
			.whereNotInPivot('username', db.query().select('username').from('accounts'))
			.toSQL()

		const { sql: knexSql, bindings: knexBindings } = db
			.connection()
			.getWriteClient()
			.from('skills')
			.whereNotIn(
				'skill_user.username',
				db.connection().getWriteClient().select('username').from('accounts')
			)
			.toSQL()

		assert.equal(sql, knexSql)
		assert.deepEqual(bindings, knexBindings)
	})

	test('add whereNotIn as a 2d array', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		User.boot()
		const user = new User()
		const query = user!.related('skills').query()

		query['appliedConstraints'] = true

		const { sql, bindings } = query.whereNotInPivot(['username', 'email'], [['foo', 'bar']]).toSQL()

		const { sql: knexSql, bindings: knexBindings } = db
			.connection()
			.getWriteClient()
			.from('skills')
			.whereNotIn(['skill_user.username', 'skill_user.email'], [['foo', 'bar']])
			.toSQL()

		assert.equal(sql, knexSql)
		assert.deepEqual(bindings, knexBindings)
	})

	test('add orWhereNotIn clause', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		User.boot()
		const user = new User()
		const query = user!.related('skills').query()

		query['appliedConstraints'] = true

		const { sql, bindings } = query
			.whereNotInPivot('username', ['virk', 'nikk'])
			.orWhereNotInPivot('username', ['foo'])
			.toSQL()

		const { sql: knexSql, bindings: knexBindings } = db
			.connection()
			.getWriteClient()
			.from('skills')
			.whereNotIn('skill_user.username', ['virk', 'nikk'])
			.orWhereNotIn('skill_user.username', ['foo'])
			.toSQL()

		assert.equal(sql, knexSql)
		assert.deepEqual(bindings, knexBindings)
	})

	test('add orWhereNotIn as a subquery', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		User.boot()
		const user = new User()
		const query = user!.related('skills').query()

		query['appliedConstraints'] = true

		const { sql, bindings } = query
			.whereNotInPivot('username', (builder) => {
				builder.from('accounts')
			})
			.orWhereNotInPivot('username', (builder) => {
				builder.from('employees')
			})
			.toSQL()

		const { sql: knexSql, bindings: knexBindings } = db
			.connection()
			.getWriteClient()
			.from('skills')
			.whereNotIn('skill_user.username', (builder) => {
				builder.from('accounts')
			})
			.orWhereNotIn('skill_user.username', (builder) => {
				builder.from('employees')
			})
			.toSQL()

		assert.equal(sql, knexSql)
		assert.deepEqual(bindings, knexBindings)
	})
})

test.group('Model | ManyToMany | save', (group) => {
	group.before(async () => {
		db = getDb()
		BaseModel = getBaseModel(ormAdapter(db))
		await setup()
	})

	group.after(async () => {
		await cleanup()
		await db.manager.closeAll()
	})

	group.afterEach(async () => {
		await resetTables()
	})

	test('save related instance', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public name: string
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public username: string

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		const user = new User()
		user.username = 'virk'
		await user.save()

		const skill = new Skill()
		skill.name = 'Programming'

		await user.related('skills').save(skill)

		assert.isTrue(user.$isPersisted)
		assert.isTrue(skill.$isPersisted)

		const totalUsers = await db.query().from('users').count('*', 'total')
		const totalPosts = await db.query().from('skills').count('*', 'total')
		const skillUsers = await db.query().from('skill_user')

		assert.equal(totalUsers[0].total, 1)
		assert.equal(totalPosts[0].total, 1)

		assert.lengthOf(skillUsers, 1)
		assert.equal(skillUsers[0].user_id, user.id)
		assert.equal(skillUsers[0].skill_id, skill.id)
		assert.isUndefined(user.$trx)
		assert.isUndefined(skill.$trx)
	})

	test('do not attach duplicates when save is called more than once', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public name: string
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public username: string

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		const user = new User()
		user.username = 'virk'
		await user.save()

		const skill = new Skill()
		skill.name = 'Programming'

		await user.related('skills').save(skill)
		await user.related('skills').save(skill)

		assert.isTrue(user.$isPersisted)
		assert.isTrue(skill.$isPersisted)

		const totalUsers = await db.query().from('users').count('*', 'total')
		const totalPosts = await db.query().from('skills').count('*', 'total')
		const skillUsers = await db.query().from('skill_user')

		assert.equal(totalUsers[0].total, 1)
		assert.equal(totalPosts[0].total, 1)

		assert.lengthOf(skillUsers, 1)
		assert.equal(skillUsers[0].user_id, user.id)
		assert.equal(skillUsers[0].skill_id, skill.id)

		assert.isUndefined(user.$trx)
		assert.isUndefined(skill.$trx)
	})

	test('attach duplicates when save is called more than once with with checkExisting = false', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public name: string
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public username: string

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		const user = new User()
		user.username = 'virk'
		await user.save()

		const skill = new Skill()
		skill.name = 'Programming'

		await user.related('skills').save(skill)
		await user.related('skills').save(skill, false)

		assert.isTrue(user.$isPersisted)
		assert.isTrue(skill.$isPersisted)

		const totalUsers = await db.query().from('users').count('*', 'total')
		const totalPosts = await db.query().from('skills').count('*', 'total')
		const skillUsers = await db.query().from('skill_user')

		assert.equal(totalUsers[0].total, 1)
		assert.equal(totalPosts[0].total, 1)

		assert.lengthOf(skillUsers, 2)
		assert.equal(skillUsers[0].user_id, user.id)
		assert.equal(skillUsers[0].skill_id, skill.id)

		assert.equal(skillUsers[1].user_id, user.id)
		assert.equal(skillUsers[1].skill_id, skill.id)

		assert.isUndefined(user.$trx)
		assert.isUndefined(skill.$trx)
	})

	test('attach when related pivot entry exists but for a different parent @sanityCheck', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public name: string
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public username: string

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		const user = new User()
		user.username = 'virk'
		await user.save()

		const user1 = new User()
		user1.username = 'nikk'
		await user1.save()

		const skill = new Skill()
		skill.name = 'Programming'

		await user.related('skills').save(skill)
		await user1.related('skills').save(skill)

		assert.isTrue(user.$isPersisted)
		assert.isTrue(skill.$isPersisted)

		const totalUsers = await db.query().from('users').count('*', 'total')
		const totalSkills = await db.query().from('skills').count('*', 'total')
		const skillUsers = await db.query().from('skill_user')

		assert.equal(totalUsers[0].total, 2)
		assert.equal(totalSkills[0].total, 1)

		assert.equal(skillUsers[0].user_id, user.id)
		assert.equal(skillUsers[0].skill_id, skill.id)

		assert.equal(skillUsers[1].user_id, user1.id)
		assert.equal(skillUsers[1].skill_id, skill.id)

		assert.isUndefined(user.$trx)
		assert.isUndefined(user1.$trx)
		assert.isUndefined(skill.$trx)
	})
})

test.group('Model | ManyToMany | saveMany', (group) => {
	group.before(async () => {
		db = getDb()
		BaseModel = getBaseModel(ormAdapter(db))
		await setup()
	})

	group.after(async () => {
		await cleanup()
		await db.manager.closeAll()
	})

	group.afterEach(async () => {
		await resetTables()
	})

	test('save many of related instance', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public name: string
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public username: string

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		const user = new User()
		user.username = 'virk'
		await user.save()

		const skill = new Skill()
		skill.name = 'Programming'

		const skill1 = new Skill()
		skill1.name = 'Cooking'

		await user.related('skills').saveMany([skill, skill1])

		assert.isTrue(user.$isPersisted)
		assert.isTrue(skill.$isPersisted)

		const totalUsers = await db.query().from('users').count('*', 'total')
		const totalPosts = await db.query().from('skills').count('*', 'total')
		const skillUsers = await db.query().from('skill_user')

		assert.equal(totalUsers[0].total, 1)
		assert.equal(totalPosts[0].total, 2)

		assert.lengthOf(skillUsers, 2)
		assert.equal(skillUsers[0].user_id, user.id)
		assert.equal(skillUsers[0].skill_id, skill.id)
		assert.equal(skillUsers[1].user_id, user.id)
		assert.equal(skillUsers[1].skill_id, skill1.id)

		assert.isUndefined(user.$trx)
		assert.isUndefined(skill.$trx)
		assert.isUndefined(skill1.$trx)
	})

	test('do not attach duplicates when saveMany is called more than once', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public name: string
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public username: string

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		const user = new User()
		user.username = 'virk'
		await user.save()

		const skill = new Skill()
		skill.name = 'Programming'

		const skill1 = new Skill()
		skill1.name = 'Cooking'

		await user.related('skills').saveMany([skill, skill1])
		await user.related('skills').saveMany([skill, skill1])

		assert.isTrue(user.$isPersisted)
		assert.isTrue(skill.$isPersisted)

		const totalUsers = await db.query().from('users').count('*', 'total')
		const totalPosts = await db.query().from('skills').count('*', 'total')
		const skillUsers = await db.query().from('skill_user')

		assert.equal(totalUsers[0].total, 1)
		assert.equal(totalPosts[0].total, 2)

		assert.lengthOf(skillUsers, 2)
		assert.equal(skillUsers[0].user_id, user.id)
		assert.equal(skillUsers[0].skill_id, skill.id)
		assert.equal(skillUsers[1].user_id, user.id)
		assert.equal(skillUsers[1].skill_id, skill1.id)

		assert.isUndefined(user.$trx)
		assert.isUndefined(skill.$trx)
		assert.isUndefined(skill1.$trx)
	})

	test('attach duplicates when saveMany is called more than once with checkExisting = false', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public name: string
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public username: string

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		const user = new User()
		user.username = 'virk'
		await user.save()

		const skill = new Skill()
		skill.name = 'Programming'

		const skill1 = new Skill()
		skill1.name = 'Cooking'

		await user.related('skills').saveMany([skill, skill1])
		await user.related('skills').saveMany([skill, skill1], false)

		assert.isTrue(user.$isPersisted)
		assert.isTrue(skill.$isPersisted)

		const totalUsers = await db.query().from('users').count('*', 'total')
		const totalPosts = await db.query().from('skills').count('*', 'total')
		const skillUsers = await db.query().from('skill_user')

		assert.equal(totalUsers[0].total, 1)
		assert.equal(totalPosts[0].total, 2)

		assert.lengthOf(skillUsers, 4)
		assert.equal(skillUsers[0].user_id, user.id)
		assert.equal(skillUsers[0].skill_id, skill.id)
		assert.equal(skillUsers[1].user_id, user.id)
		assert.equal(skillUsers[1].skill_id, skill1.id)

		assert.equal(skillUsers[2].user_id, user.id)
		assert.equal(skillUsers[2].skill_id, skill.id)
		assert.equal(skillUsers[3].user_id, user.id)
		assert.equal(skillUsers[3].skill_id, skill1.id)

		assert.isUndefined(user.$trx)
		assert.isUndefined(skill.$trx)
		assert.isUndefined(skill1.$trx)
	})

	test('attach when related pivot entry exists but for a different parent @sanityCheck', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public name: string
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public username: string

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		const user = new User()
		user.username = 'virk'
		await user.save()

		const user1 = new User()
		user1.username = 'nikk'

		const skill = new Skill()
		skill.name = 'Programming'

		const skill1 = new Skill()
		skill1.name = 'Cooking'

		await user.related('skills').saveMany([skill, skill1])
		await user1.related('skills').saveMany([skill, skill1])

		assert.isTrue(user.$isPersisted)
		assert.isTrue(skill.$isPersisted)
		assert.isTrue(user1.$isPersisted)

		const totalUsers = await db.query().from('users').count('*', 'total')
		const totalPosts = await db.query().from('skills').count('*', 'total')
		const skillUsers = await db.query().from('skill_user')

		assert.equal(totalUsers[0].total, 2)
		assert.equal(totalPosts[0].total, 2)

		assert.lengthOf(skillUsers, 4)
		assert.equal(skillUsers[0].user_id, user.id)
		assert.equal(skillUsers[0].skill_id, skill.id)
		assert.equal(skillUsers[1].user_id, user.id)
		assert.equal(skillUsers[1].skill_id, skill1.id)

		assert.equal(skillUsers[2].user_id, user1.id)
		assert.equal(skillUsers[2].skill_id, skill.id)
		assert.equal(skillUsers[3].user_id, user1.id)
		assert.equal(skillUsers[3].skill_id, skill1.id)

		assert.isUndefined(user.$trx)
		assert.isUndefined(skill.$trx)
		assert.isUndefined(skill1.$trx)
	})

	test('wrap saveMany inside a custom transaction', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public name: string
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public username: string

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		const trx = await db.transaction()

		const user = new User()
		user.username = 'virk'
		user.$trx = trx
		await user.save()

		const user1 = new User()
		user1.$trx = trx
		user1.username = 'nikk'

		const skill = new Skill()
		skill.name = 'Programming'

		const skill1 = new Skill()
		skill1.name = 'Cooking'

		await user.related('skills').saveMany([skill, skill1])
		await user1.related('skills').saveMany([skill, skill1])

		assert.isFalse(user.$trx.isCompleted)
		assert.isFalse(user1.$trx.isCompleted)

		await trx.rollback()

		const totalUsers = await db.query().from('users').count('*', 'total')
		const totalPosts = await db.query().from('skills').count('*', 'total')
		const skillUsers = await db.query().from('skill_user')

		assert.equal(totalUsers[0].total, 0)
		assert.equal(totalPosts[0].total, 0)

		assert.lengthOf(skillUsers, 0)
	})
})

test.group('Model | ManyToMany | create', (group) => {
	group.before(async () => {
		db = getDb()
		BaseModel = getBaseModel(ormAdapter(db))
		await setup()
	})

	group.after(async () => {
		await cleanup()
		await db.manager.closeAll()
	})

	group.afterEach(async () => {
		await resetTables()
	})

	test('create related instance', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public name: string
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public username: string

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		const user = new User()
		user.username = 'virk'
		await user.save()

		const skill = await user.related('skills').create({ name: 'Programming' })

		assert.isTrue(user.$isPersisted)
		assert.isTrue(skill.$isPersisted)

		const totalUsers = await db.query().from('users').count('*', 'total')
		const totalPosts = await db.query().from('skills').count('*', 'total')
		const skillUsers = await db.query().from('skill_user')

		assert.equal(totalUsers[0].total, 1)
		assert.equal(totalPosts[0].total, 1)

		assert.lengthOf(skillUsers, 1)
		assert.equal(skillUsers[0].user_id, user.id)
		assert.equal(skillUsers[0].skill_id, skill.id)
		assert.isUndefined(user.$trx)
		assert.isUndefined(skill.$trx)
	})

	test('wrap create inside a custom transaction', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public name: string
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public username: string

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		const trx = await db.transaction()

		const user = new User()
		user.username = 'virk'
		user.$trx = trx
		await user.save()

		const skill = await user.related('skills').create({ name: 'Programming' })
		assert.isFalse(user.$trx.isCompleted)
		assert.isFalse(skill.$trx!.isCompleted)

		await trx.commit()

		const totalUsers = await db.query().from('users').count('*', 'total')
		const totalPosts = await db.query().from('skills').count('*', 'total')
		const skillUsers = await db.query().from('skill_user')

		assert.equal(totalUsers[0].total, 1)
		assert.equal(totalPosts[0].total, 1)

		assert.lengthOf(skillUsers, 1)
		assert.equal(skillUsers[0].user_id, user.id)
		assert.equal(skillUsers[0].skill_id, skill.id)

		assert.isUndefined(user.$trx)
		assert.isUndefined(skill.$trx)
	})
})

test.group('Model | ManyToMany | createMany', (group) => {
	group.before(async () => {
		db = getDb()
		BaseModel = getBaseModel(ormAdapter(db))
		await setup()
	})

	group.after(async () => {
		await cleanup()
		await db.manager.closeAll()
	})

	group.afterEach(async () => {
		await resetTables()
	})

	test('create many of related instance', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public name: string
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public username: string

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		const user = new User()
		user.username = 'virk'
		await user.save()

		const [skill, skill1] = await user
			.related('skills')
			.createMany([{ name: 'Programming' }, { name: 'Cooking' }])

		assert.isTrue(user.$isPersisted)
		assert.isTrue(skill.$isPersisted)
		assert.isTrue(skill1.$isPersisted)

		const totalUsers = await db.query().from('users').count('*', 'total')
		const totalSkills = await db.query().from('skills').count('*', 'total')
		const skillUsers = await db.query().from('skill_user')

		assert.equal(totalUsers[0].total, 1)
		assert.equal(totalSkills[0].total, 2)

		assert.lengthOf(skillUsers, 2)
		assert.equal(skillUsers[0].user_id, user.id)
		assert.equal(skillUsers[0].skill_id, skill.id)

		assert.equal(skillUsers[1].user_id, user.id)
		assert.equal(skillUsers[1].skill_id, skill1.id)

		assert.isUndefined(user.$trx)
		assert.isUndefined(skill.$trx)
		assert.isUndefined(skill1.$trx)
	})

	test('wrap create many inside a custom transaction', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public name: string
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public username: string

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		const trx = await db.transaction()

		const user = new User()
		user.username = 'virk'
		user.$trx = trx
		await user.save()

		const [skill, skill1] = await user
			.related('skills')
			.createMany([{ name: 'Programming' }, { name: 'Cooking' }])

		assert.isFalse(user.$trx.isCompleted)
		assert.isFalse(skill.$trx!.isCompleted)
		assert.isFalse(skill1.$trx!.isCompleted)

		await trx.rollback()

		const totalUsers = await db.query().from('users').count('*', 'total')
		const totalPosts = await db.query().from('skills').count('*', 'total')
		const skillUsers = await db.query().from('skill_user')

		assert.equal(totalUsers[0].total, 0)
		assert.equal(totalPosts[0].total, 0)
		assert.lengthOf(skillUsers, 0)
	})
})

test.group('Model | ManyToMany | attach', (group) => {
	group.before(async () => {
		db = getDb()
		BaseModel = getBaseModel(ormAdapter(db))
		await setup()
	})

	group.after(async () => {
		await cleanup()
		await db.manager.closeAll()
	})

	group.afterEach(async () => {
		await resetTables()
	})

	test('attach one or more ids to the pivot table', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public name: string
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public username: string

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		const user = new User()
		user.username = 'virk'
		await user.save()

		await user.related('skills').attach([1, 2])

		assert.isTrue(user.$isPersisted)

		const totalUsers = await db.query().from('users').count('*', 'total')
		const totalSkills = await db.query().from('skills').count('*', 'total')
		const skillUsers = await db.query().from('skill_user')

		assert.equal(totalUsers[0].total, 1)
		assert.equal(totalSkills[0].total, 0)

		assert.lengthOf(skillUsers, 2)
		assert.equal(skillUsers[0].user_id, user.id)
		assert.equal(skillUsers[0].skill_id, 1)

		assert.equal(skillUsers[1].user_id, user.id)
		assert.equal(skillUsers[1].skill_id, 2)
	})

	test('attach with extra attributes', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public name: string
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public username: string

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		const user = new User()
		user.username = 'virk'
		await user.save()

		await user.related('skills').attach({
			1: {
				proficiency: 'Beginner',
			},
			2: {
				proficiency: 'Master',
			},
		})

		assert.isTrue(user.$isPersisted)

		const totalUsers = await db.query().from('users').count('*', 'total')
		const totalSkills = await db.query().from('skills').count('*', 'total')
		const skillUsers = await db.query().from('skill_user')

		assert.equal(totalUsers[0].total, 1)
		assert.equal(totalSkills[0].total, 0)

		assert.lengthOf(skillUsers, 2)
		assert.equal(skillUsers[0].user_id, user.id)
		assert.equal(skillUsers[0].skill_id, 1)
		assert.equal(skillUsers[0].proficiency, 'Beginner')

		assert.equal(skillUsers[1].user_id, user.id)
		assert.equal(skillUsers[1].skill_id, 2)
		assert.equal(skillUsers[1].proficiency, 'Master')
	})
})

test.group('Model | ManyToMany | detach', (group) => {
	group.before(async () => {
		db = getDb()
		BaseModel = getBaseModel(ormAdapter(db))
		await setup()
	})

	group.after(async () => {
		await cleanup()
		await db.manager.closeAll()
	})

	group.afterEach(async () => {
		await resetTables()
	})

	test('detach one or more ids from the pivot table', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public name: string
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public username: string

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		const user = new User()
		user.username = 'virk'
		await user.save()

		await db
			.insertQuery()
			.table('skill_user')
			.multiInsert([
				{
					user_id: user.id,
					skill_id: 1,
					proficiency: 'Beginner',
				},
				{
					user_id: user.id,
					skill_id: 2,
					proficiency: 'Beginner',
				},
			])

		await user.related('skills').detach([1])

		const totalUsers = await db.query().from('users').count('*', 'total')
		const totalSkills = await db.query().from('skills').count('*', 'total')
		const skillUsers = await db.query().from('skill_user')

		assert.equal(totalUsers[0].total, 1)
		assert.equal(totalSkills[0].total, 0)

		assert.lengthOf(skillUsers, 1)
		assert.equal(skillUsers[0].user_id, user.id)
		assert.equal(skillUsers[0].skill_id, 2)
	})

	test('scope detach self to @sanityCheck', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public name: string
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public username: string

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		const user = new User()
		user.username = 'virk'
		await user.save()

		await db
			.insertQuery()
			.table('skill_user')
			.multiInsert([
				{
					user_id: user.id,
					skill_id: 1,
					proficiency: 'Beginner',
				},
				{
					user_id: 2,
					skill_id: 2,
					proficiency: 'Beginner',
				},
			])

		await user.related('skills').detach([2])

		const totalUsers = await db.query().from('users').count('*', 'total')
		const totalSkills = await db.query().from('skills').count('*', 'total')
		const skillUsers = await db.query().from('skill_user')

		assert.equal(totalUsers[0].total, 1)
		assert.equal(totalSkills[0].total, 0)

		assert.lengthOf(skillUsers, 2)
		assert.equal(skillUsers[0].user_id, user.id)
		assert.equal(skillUsers[0].skill_id, 1)

		assert.equal(skillUsers[1].user_id, 2)
		assert.equal(skillUsers[1].skill_id, 2)
	})
})

test.group('Model | ManyToMany | sync', (group) => {
	group.before(async () => {
		db = getDb()
		BaseModel = getBaseModel(ormAdapter(db))
		await setup()
	})

	group.after(async () => {
		await cleanup()
		await db.manager.closeAll()
	})

	group.afterEach(async () => {
		await resetTables()
	})

	test("sync ids by dropping only the missing one's", async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public name: string
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public username: string

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		const user = new User()
		user.username = 'virk'
		await user.save()

		await db
			.insertQuery()
			.table('skill_user')
			.multiInsert([
				{
					user_id: user.id,
					skill_id: 1,
					proficiency: 'Beginner',
				},
				{
					user_id: user.id,
					skill_id: 2,
					proficiency: 'Master',
				},
				{
					user_id: 2,
					skill_id: 1,
					proficiency: 'Master',
				},
			])

		await user.related('skills').sync([1])

		const totalUsers = await db.query().from('users').count('*', 'total')
		const totalSkills = await db.query().from('skills').count('*', 'total')
		const skillUsers = await db.query().from('skill_user')

		assert.equal(totalUsers[0].total, 1)
		assert.equal(totalSkills[0].total, 0)
		assert.lengthOf(skillUsers, 2)

		assert.equal(skillUsers[0].id, 1)
		assert.equal(skillUsers[0].user_id, user.id)
		assert.equal(skillUsers[0].skill_id, 1)

		assert.equal(skillUsers[1].id, 3)
		assert.equal(skillUsers[1].user_id, 2)
		assert.equal(skillUsers[1].skill_id, 1)
	})

	test('keep duplicates of the id under sync', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public name: string
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public username: string

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		const user = new User()
		user.username = 'virk'
		await user.save()

		await db
			.insertQuery()
			.table('skill_user')
			.multiInsert([
				{
					user_id: user.id,
					skill_id: 1,
					proficiency: 'Beginner',
				},
				{
					user_id: user.id,
					skill_id: 2,
					proficiency: 'Master',
				},
				{
					user_id: user.id,
					skill_id: 1,
					proficiency: 'Master',
				},
			])

		await user.related('skills').sync([1])

		const totalUsers = await db.query().from('users').count('*', 'total')
		const totalSkills = await db.query().from('skills').count('*', 'total')
		const skillUsers = await db.query().from('skill_user')

		assert.equal(totalUsers[0].total, 1)
		assert.equal(totalSkills[0].total, 0)
		assert.lengthOf(skillUsers, 2)

		assert.equal(skillUsers[0].id, 1)
		assert.equal(skillUsers[0].user_id, user.id)
		assert.equal(skillUsers[0].skill_id, 1)

		assert.equal(skillUsers[1].id, 3)
		assert.equal(skillUsers[1].user_id, user.id)
		assert.equal(skillUsers[1].skill_id, 1)
	})

	test('update pivot rows when additional properties are changed', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public name: string
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public username: string

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		const user = new User()
		user.username = 'virk'
		await user.save()

		await db
			.insertQuery()
			.table('skill_user')
			.multiInsert([
				{
					user_id: user.id,
					skill_id: 1,
					proficiency: 'Beginner',
				},
				{
					user_id: user.id,
					skill_id: 2,
					proficiency: 'Master',
				},
				{
					user_id: 2,
					skill_id: 1,
					proficiency: 'Master',
				},
			])

		await user.related('skills').sync({
			1: {
				proficiency: 'Intermediate',
			},
		})

		const totalUsers = await db.query().from('users').count('*', 'total')
		const totalSkills = await db.query().from('skills').count('*', 'total')
		const skillUsers = await db.query().from('skill_user').orderBy('id', 'asc')

		assert.equal(totalUsers[0].total, 1)
		assert.equal(totalSkills[0].total, 0)
		assert.lengthOf(skillUsers, 2)

		assert.equal(skillUsers[0].id, 1)
		assert.equal(skillUsers[0].user_id, user.id)
		assert.equal(skillUsers[0].skill_id, 1)
		assert.equal(skillUsers[0].proficiency, 'Intermediate')

		assert.equal(skillUsers[1].id, 3)
		assert.equal(skillUsers[1].user_id, 2)
		assert.equal(skillUsers[1].skill_id, 1)
		assert.equal(skillUsers[1].proficiency, 'Master')
	})

	test('do not update pivot row when no extra properties are defined', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public name: string
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public username: string

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		const user = new User()
		user.username = 'virk'
		await user.save()

		await db
			.insertQuery()
			.table('skill_user')
			.multiInsert([
				{
					user_id: user.id,
					skill_id: 1,
					proficiency: 'Beginner',
				},
				{
					user_id: user.id,
					skill_id: 2,
					proficiency: 'Master',
				},
				{
					user_id: 2,
					skill_id: 1,
					proficiency: 'Master',
				},
			])

		await user.related('skills').sync({ 1: {} })

		const totalUsers = await db.query().from('users').count('*', 'total')
		const totalSkills = await db.query().from('skills').count('*', 'total')
		const skillUsers = await db.query().from('skill_user')

		assert.equal(totalUsers[0].total, 1)
		assert.equal(totalSkills[0].total, 0)
		assert.lengthOf(skillUsers, 2)

		assert.equal(skillUsers[0].id, 1)
		assert.equal(skillUsers[0].user_id, user.id)
		assert.equal(skillUsers[0].skill_id, 1)
		assert.equal(skillUsers[0].proficiency, 'Beginner')

		assert.equal(skillUsers[1].id, 3)
		assert.equal(skillUsers[1].user_id, 2)
		assert.equal(skillUsers[1].skill_id, 1)
		assert.equal(skillUsers[1].proficiency, 'Master')
	})

	test('do not remove rows when detach = false', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public name: string
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public username: string

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		const user = new User()
		user.username = 'virk'
		await user.save()

		await db
			.insertQuery()
			.table('skill_user')
			.multiInsert([
				{
					user_id: user.id,
					skill_id: 1,
					proficiency: 'Beginner',
				},
				{
					user_id: user.id,
					skill_id: 2,
					proficiency: 'Master',
				},
				{
					user_id: 2,
					skill_id: 1,
					proficiency: 'Master',
				},
			])

		await user.related('skills').sync([1], false)

		const totalUsers = await db.query().from('users').count('*', 'total')
		const totalSkills = await db.query().from('skills').count('*', 'total')
		const skillUsers = await db.query().from('skill_user')

		assert.equal(totalUsers[0].total, 1)
		assert.equal(totalSkills[0].total, 0)
		assert.lengthOf(skillUsers, 3)

		assert.equal(skillUsers[0].id, 1)
		assert.equal(skillUsers[0].user_id, user.id)
		assert.equal(skillUsers[0].skill_id, 1)
		assert.equal(skillUsers[0].proficiency, 'Beginner')

		assert.equal(skillUsers[1].id, 2)
		assert.equal(skillUsers[1].user_id, user.id)
		assert.equal(skillUsers[1].skill_id, 2)
		assert.equal(skillUsers[1].proficiency, 'Master')

		assert.equal(skillUsers[2].id, 3)
		assert.equal(skillUsers[2].user_id, 2)
		assert.equal(skillUsers[2].skill_id, 1)
		assert.equal(skillUsers[2].proficiency, 'Master')
	})

	test('do not remove rows when nothing has changed', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public name: string
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public username: string

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		const user = new User()
		user.username = 'virk'
		await user.save()

		await db
			.insertQuery()
			.table('skill_user')
			.multiInsert([
				{
					user_id: user.id,
					skill_id: 1,
					proficiency: 'Beginner',
				},
				{
					user_id: user.id,
					skill_id: 2,
					proficiency: 'Master',
				},
				{
					user_id: 2,
					skill_id: 1,
					proficiency: 'Master',
				},
			])

		await user.related('skills').sync([1, 2])

		const totalUsers = await db.query().from('users').count('*', 'total')
		const totalSkills = await db.query().from('skills').count('*', 'total')
		const skillUsers = await db.query().from('skill_user')

		assert.equal(totalUsers[0].total, 1)
		assert.equal(totalSkills[0].total, 0)
		assert.lengthOf(skillUsers, 3)

		assert.equal(skillUsers[0].id, 1)
		assert.equal(skillUsers[0].user_id, user.id)
		assert.equal(skillUsers[0].skill_id, 1)
		assert.equal(skillUsers[0].proficiency, 'Beginner')

		assert.equal(skillUsers[1].id, 2)
		assert.equal(skillUsers[1].user_id, user.id)
		assert.equal(skillUsers[1].skill_id, 2)
		assert.equal(skillUsers[1].proficiency, 'Master')

		assert.equal(skillUsers[2].id, 3)
		assert.equal(skillUsers[2].user_id, 2)
		assert.equal(skillUsers[2].skill_id, 1)
		assert.equal(skillUsers[2].proficiency, 'Master')
	})

	test('use custom transaction', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public name: string
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public username: string

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		const user = new User()
		user.username = 'virk'
		await user.save()

		await db
			.insertQuery()
			.table('skill_user')
			.multiInsert([
				{
					user_id: user.id,
					skill_id: 1,
					proficiency: 'Beginner',
				},
				{
					user_id: user.id,
					skill_id: 2,
					proficiency: 'Master',
				},
				{
					user_id: 2,
					skill_id: 1,
					proficiency: 'Master',
				},
			])

		const trx = await db.transaction()
		await user.related('skills').sync(
			{
				1: {
					proficiency: 'Intermediate',
				},
				3: {
					proficiency: 'Intermediate',
				},
			},
			true,
			trx
		)

		await trx.rollback()

		const totalUsers = await db.query().from('users').count('*', 'total')
		const totalSkills = await db.query().from('skills').count('*', 'total')
		const skillUsers = await db.query().from('skill_user')

		assert.equal(totalUsers[0].total, 1)
		assert.equal(totalSkills[0].total, 0)
		assert.lengthOf(skillUsers, 3)

		assert.equal(skillUsers[0].id, 1)
		assert.equal(skillUsers[0].user_id, user.id)
		assert.equal(skillUsers[0].skill_id, 1)
		assert.equal(skillUsers[0].proficiency, 'Beginner')

		assert.equal(skillUsers[1].id, 2)
		assert.equal(skillUsers[1].user_id, user.id)
		assert.equal(skillUsers[1].skill_id, 2)
		assert.equal(skillUsers[1].proficiency, 'Master')

		assert.equal(skillUsers[2].id, 3)
		assert.equal(skillUsers[2].user_id, 2)
		assert.equal(skillUsers[2].skill_id, 1)
		assert.equal(skillUsers[2].proficiency, 'Master')
	})
})

test.group('Model | ManyToMany | pagination', (group) => {
	group.before(async () => {
		db = getDb()
		BaseModel = getBaseModel(ormAdapter(db))
		await setup()
	})

	group.after(async () => {
		await cleanup()
		await db.manager.closeAll()
	})

	group.afterEach(async () => {
		await resetTables()
	})

	test('paginate using related model query builder instance', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		await db.table('users').insert({ username: 'virk' })
		await db
			.insertQuery()
			.table('skills')
			.insert([{ name: 'Programming' }, { name: 'Dancing' }, { name: 'Singing' }])
		await db
			.insertQuery()
			.table('skill_user')
			.insert([
				{
					user_id: 1,
					skill_id: 1,
				},
				{
					user_id: 1,
					skill_id: 2,
				},
			])

		const user = await User.find(1)
		const skills = await user!.related('skills').query().paginate(1, 1)

		skills.baseUrl('/skills')

		assert.lengthOf(skills.all(), 1)
		assert.instanceOf(skills.all()[0], Skill)
		assert.notProperty(skills.all()[0].$extras, 'total')
		assert.equal(skills.perPage, 1)
		assert.equal(skills.currentPage, 1)
		assert.equal(skills.lastPage, 2)
		assert.isTrue(skills.hasPages)
		assert.isTrue(skills.hasMorePages)
		assert.isFalse(skills.isEmpty)
		assert.equal(skills.total, 2)
		assert.isTrue(skills.hasTotal)
		assert.deepEqual(skills.getMeta(), {
			total: 2,
			per_page: 1,
			current_page: 1,
			last_page: 2,
			first_page: 1,
			first_page_url: '/skills?page=1',
			last_page_url: '/skills?page=2',
			next_page_url: '/skills?page=2',
			previous_page_url: null,
		})
	})

	test('disallow paginate during preload', async (assert) => {
		assert.plan(1)

		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		await db.table('users').insert({ username: 'virk' })
		await db
			.insertQuery()
			.table('skills')
			.insert([{ name: 'Programming' }, { name: 'Dancing' }, { name: 'Singing' }])
		await db
			.insertQuery()
			.table('skill_user')
			.insert([
				{
					user_id: 1,
					skill_id: 1,
				},
				{
					user_id: 1,
					skill_id: 2,
				},
			])

		try {
			await User.query().preload('skills', (query) => {
				query.paginate(1, 5)
			})
		} catch ({ message }) {
			assert.equal(message, 'Cannot paginate relationship "skills" during preload')
		}
	})
})

test.group('Model | ManyToMany | clone', (group) => {
	group.before(async () => {
		db = getDb()
		BaseModel = getBaseModel(ormAdapter(db))
		await setup()
	})

	group.after(async () => {
		await cleanup()
		await db.manager.closeAll()
	})

	group.afterEach(async () => {
		await resetTables()
	})

	test('clone related model query builder', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		await db.table('users').insert({ username: 'virk' })
		await db
			.insertQuery()
			.table('skills')
			.insert([{ name: 'Programming' }, { name: 'Dancing' }, { name: 'Singing' }])
		await db
			.insertQuery()
			.table('skill_user')
			.insert([
				{
					user_id: 1,
					skill_id: 1,
				},
				{
					user_id: 1,
					skill_id: 2,
				},
			])

		const user = await User.find(1)
		const clonedQuery = user!.related('skills').query().clone()
		assert.instanceOf(clonedQuery, ManyToManyQueryBuilder)
	})
})

test.group('Model | ManyToMany | scopes', (group) => {
	group.before(async () => {
		db = getDb()
		BaseModel = getBaseModel(ormAdapter(db))
		await setup()
	})

	group.after(async () => {
		await cleanup()
		await db.manager.closeAll()
	})

	group.afterEach(async () => {
		await resetTables()
	})

	test('apply scopes during eagerload', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public name: string

			public static programmingOnly = scope((query) => {
				query.where('name', 'Programming')
			})
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		await db.table('users').insert({ username: 'virk' })
		await db
			.insertQuery()
			.table('skills')
			.insert([{ name: 'Programming' }, { name: 'Dancing' }, { name: 'Singing' }])
		await db
			.insertQuery()
			.table('skill_user')
			.insert([
				{
					user_id: 1,
					skill_id: 1,
				},
				{
					user_id: 1,
					skill_id: 2,
				},
			])

		const user = await User.query()
			.preload('skills', (query) => {
				query.apply((scopes) => scopes.programmingOnly())
			})
			.firstOrFail()

		const userWithoutScopes = await User.query().preload('skills').firstOrFail()

		assert.lengthOf(user.skills, 1)
		assert.lengthOf(userWithoutScopes.skills, 2)
		assert.equal(user.skills[0].name, 'Programming')
	})

	test('apply scopes on related query', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public name: string

			public static programmingOnly = scope((query) => {
				query.where('name', 'Programming')
			})
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill)
			public skills: ManyToMany<typeof Skill>
		}

		await db.table('users').insert({ username: 'virk' })
		await db
			.insertQuery()
			.table('skills')
			.insert([{ name: 'Programming' }, { name: 'Dancing' }, { name: 'Singing' }])
		await db
			.insertQuery()
			.table('skill_user')
			.insert([
				{
					user_id: 1,
					skill_id: 1,
				},
				{
					user_id: 1,
					skill_id: 2,
				},
			])

		const user = await User.findOrFail(1)
		const skills = await user
			.related('skills')
			.query()
			.apply((scopes) => scopes.programmingOnly())
		const skillsWithoutScope = await user.related('skills').query()

		assert.lengthOf(skills, 1)
		assert.lengthOf(skillsWithoutScope, 2)
		assert.equal(skills[0].name, 'Programming')
	})
})

test.group('Model | ManyToMany | onQuery', (group) => {
	group.before(async () => {
		db = getDb()
		BaseModel = getBaseModel(ormAdapter(db))
		await setup()
	})

	group.after(async () => {
		await cleanup()
		await db.manager.closeAll()
	})

	group.afterEach(async () => {
		await resetTables()
	})

	test('invoke onQuery method when preloading relationship', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public name: string
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill, {
				onQuery: (query) => query.where('name', 'Programming'),
			})
			public skills: ManyToMany<typeof Skill>
		}

		await db.table('users').insert({ username: 'virk' })
		await db
			.insertQuery()
			.table('skills')
			.insert([{ name: 'Programming' }, { name: 'Dancing' }, { name: 'Singing' }])
		await db
			.insertQuery()
			.table('skill_user')
			.insert([
				{
					user_id: 1,
					skill_id: 1,
				},
				{
					user_id: 1,
					skill_id: 2,
				},
			])

		const user = await User.query().preload('skills').firstOrFail()
		assert.lengthOf(user.skills, 1)
		assert.equal(user.skills[0].name, 'Programming')
	})

	test('do not invoke onQuery method during preloading subqueries', async (assert) => {
		assert.plan(3)

		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public name: string
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill, {
				onQuery: (query) => {
					assert.isTrue(true)
					query.where('name', 'Programming')
				},
			})
			public skills: ManyToMany<typeof Skill>
		}

		await db.table('users').insert({ username: 'virk' })
		await db
			.insertQuery()
			.table('skills')
			.insert([{ name: 'Programming' }, { name: 'Dancing' }, { name: 'Singing' }])
		await db
			.insertQuery()
			.table('skill_user')
			.insert([
				{
					user_id: 1,
					skill_id: 1,
				},
				{
					user_id: 1,
					skill_id: 2,
				},
			])

		const user = await User.query()
			.preload('skills', (query) => {
				query.where(() => {})
			})
			.firstOrFail()

		assert.lengthOf(user.skills, 1)
		assert.equal(user.skills[0].name, 'Programming')
	})

	test('invoke onQuery method on related query builder', async (assert) => {
		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public name: string
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill, {
				onQuery: (query) => query.where('name', 'Programming'),
			})
			public skills: ManyToMany<typeof Skill>
		}

		await db.table('users').insert({ username: 'virk' })
		await db
			.insertQuery()
			.table('skills')
			.insert([{ name: 'Programming' }, { name: 'Dancing' }, { name: 'Singing' }])
		await db
			.insertQuery()
			.table('skill_user')
			.insert([
				{
					user_id: 1,
					skill_id: 1,
				},
				{
					user_id: 1,
					skill_id: 2,
				},
			])

		const user = await User.findOrFail(1)
		const skills = await user.related('skills').query()
		assert.lengthOf(skills, 1)
		assert.equal(skills[0].name, 'Programming')
	})

	test('invoke onQuery method on pivot query builder', async (assert) => {
		assert.plan(1)

		class Skill extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@column()
			public name: string
		}

		class User extends BaseModel {
			@column({ isPrimary: true })
			public id: number

			@manyToMany(() => Skill, {
				onQuery: (query) => {
					assert.isTrue(query.isPivotOnlyQuery)
				},
			})
			public skills: ManyToMany<typeof Skill>
		}

		await db.table('users').insert({ username: 'virk' })
		await db
			.insertQuery()
			.table('skills')
			.insert([{ name: 'Programming' }, { name: 'Dancing' }, { name: 'Singing' }])
		await db
			.insertQuery()
			.table('skill_user')
			.insert([
				{
					user_id: 1,
					skill_id: 1,
				},
				{
					user_id: 1,
					skill_id: 2,
				},
			])

		const user = await User.findOrFail(1)
		await user.related('skills').pivotQuery()
	})
})
