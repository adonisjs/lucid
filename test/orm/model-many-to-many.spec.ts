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

// import { ManyToMany } from '../../src/Orm/Relations/ManyToMany'
// import { ManyToManyQueryBuilder } from '../../src/Orm/Relations/ManyToMany/QueryBuilder'
import { manyToMany, column } from '../../src/Orm/Decorators'
import { getDb, getBaseModel, ormAdapter, setup, resetTables, cleanup } from '../../test-helpers'

// import {
//   setup,
//   getDb,
//   cleanup,
//   resetTables,
//   ormAdapter,
//   getBaseModel,
//   getManyToManyQueryBuilder,
// } from '../../test-helpers'

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
      class Skill extends BaseModel {
      }

      class User extends BaseModel {
        @manyToMany(() => Skill)
        public skills: ManyToMany<Skill>
      }

      User.$boot()
      User.$getRelation('skills').$boot()
    } catch ({ message }) {
      assert.equal(
        message,
        'E_MISSING_MODEL_ATTRIBUTE: "User.skills" expects "id" to exist on "User" model, but is missing',
      )
    }
  })

  test('use primary key as the local key', (assert) => {
    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @manyToMany(() => Skill)
      public skills: ManyToMany<Skill>
    }

    User.$getRelation('skills').$boot()

    assert.equal(User.$getRelation('skills')!['$localKey'], 'id')
    assert.equal(User.$getRelation('skills')!['$localCastAsKey'], 'id')
  })

  test('use custom defined local key', (assert) => {
    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public uid: number

      @manyToMany(() => Skill, { localKey: 'uid' })
      public skills: ManyToMany<Skill>
    }

    User.$boot()
    User.$getRelation('skills').$boot()

    assert.equal(User.$getRelation('skills')!['$localKey'], 'uid')
    assert.equal(User.$getRelation('skills')!['$localCastAsKey'], 'uid')
  })

  test('raise error when relatedKey is missing', (assert) => {
    assert.plan(1)

    try {
      class Skill extends BaseModel {
      }
      Skill.$boot()

      class User extends BaseModel {
        @column({ primary: true })
        public id: number

        @manyToMany(() => Skill)
        public skills: ManyToMany<Skill>
      }

      User.$boot()
      User.$getRelation('skills').$boot()
    } catch ({ message }) {
      assert.equal(
        message,
        'E_MISSING_MODEL_ATTRIBUTE: "User.skills" expects "id" to exist on "Skill" model, but is missing',
      )
    }
  })

  test('use related model primary key as the related key', (assert) => {
    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @manyToMany(() => Skill)
      public skills: ManyToMany<Skill>
    }

    User.$getRelation('skills').$boot()

    assert.equal(User.$getRelation('skills')!['$relatedKey'], 'id')
    assert.equal(User.$getRelation('skills')!['$relatedCastAsKey'], 'id')
  })

  test('use custom defined related key', (assert) => {
    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public uid: number
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @manyToMany(() => Skill, { relatedKey: 'uid' })
      public skills: ManyToMany<Skill>
    }

    User.$getRelation('skills').$boot()

    assert.equal(User.$getRelation('skills')!['$relatedKey'], 'uid')
    assert.equal(User.$getRelation('skills')!['$relatedCastAsKey'], 'uid')
  })

  test('compute pivotForeignKey from table name + primary key', (assert) => {
    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @manyToMany(() => Skill)
      public skills: ManyToMany<Skill>
    }

    User.$getRelation('skills').$boot()

    assert.equal(User.$getRelation('skills')!['$pivotForeignKey'], 'user_id')
  })

  test('use custom defined pivotForeignKey', (assert) => {
    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @manyToMany(() => Skill, { pivotForeignKey: 'user_uid' })
      public skills: ManyToMany<Skill>
    }

    User.$getRelation('skills').$boot()

    assert.equal(User.$getRelation('skills')!['$pivotForeignKey'], 'user_uid')
  })

  test('compute relatedPivotForeignKey from related model name + primary key', (assert) => {
    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @manyToMany(() => Skill)
      public skills: ManyToMany<Skill>
    }

    User.$boot()
    User.$getRelation('skills').$boot()

    assert.equal(User.$getRelation('skills')!['$pivotRelatedForeignKey'], 'skill_id')
  })

  test('use custom defined relatedPivotForeignKey', (assert) => {
    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @manyToMany(() => Skill, { pivotRelatedForeignKey: 'skill_uid' })
      public skills: ManyToMany<Skill>
    }

    User.$boot()
    User.$getRelation('skills').$boot()

    assert.equal(User.$getRelation('skills')!['$pivotRelatedForeignKey'], 'skill_uid')
  })
})

test.group('Model | ManyToMany | Set Relations', (group) => {
  group.before(async () => {
    db = getDb()
    BaseModel = getBaseModel(ormAdapter(db))
  })

  test('set related model instance', (assert) => {
    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @manyToMany(() => Skill)
      public skills: ManyToMany<Skill>
    }

    User.$getRelation('skills').$boot()

    const user = new User()
    const skill = new Skill()
    User.$getRelation('skills').$setRelated(user, [skill])
    assert.deepEqual(user.skills, [skill])
  })

  test('push related model instance', (assert) => {
    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @manyToMany(() => Skill)
      public skills: ManyToMany<Skill>
    }

    User.$getRelation('skills').$boot()

    const user = new User()
    const skill = new Skill()
    const skill1 = new Skill()

    User.$getRelation('skills').$setRelated(user, [skill])
    User.$getRelation('skills').$pushRelated(user, [skill1])
    assert.deepEqual(user.skills, [skill, skill1])
  })

  test('set many of related instances', (assert) => {
    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number

      @manyToMany(() => User)
      public users: ManyToMany<User>
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @manyToMany(() => Skill)
      public skills: ManyToMany<Skill>
    }

    User.$getRelation('skills').$boot()
    Skill.$getRelation('users').$boot()

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

    User.$getRelation('skills').$setRelatedForMany([user, user1, user2], [skill, skill1, skill2])
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
      @column({ primary: true })
      public id: number
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @manyToMany(() => Skill)
      public skills: ManyToMany<Skill>
    }

    await db.table('users').insert({ username: 'virk' })

    const user = await User.find(1)
    const { sql, bindings } = user!.related('skills').query().toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.connection()
      .getWriteClient()
      .from('skills')
      .select('skills.*', 'skill_user.user_id as pivot_user_id', 'skill_user.skill_id as pivot_skill_id')
      .innerJoin('skill_user', 'skills.id', 'skill_user.skill_id')
      .where('skill_user.user_id', 1)
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('generate correct sql for selecting related for many rows', async (assert) => {
    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @manyToMany(() => Skill)
      public skills: ManyToMany<Skill>
    }

    await db.table('users').multiInsert([
      { username: 'virk' },
      { username: 'nikk' },
    ])

    const users = await User.all()
    User.$getRelation('skills').$boot()

    const related = User.$getRelation('skills').client(users, db.connection())
    const { sql, bindings } = related.query().toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.connection()
      .getWriteClient()
      .from('skills')
      .select('skills.*', 'skill_user.user_id as pivot_user_id', 'skill_user.skill_id as pivot_skill_id')
      .innerJoin('skill_user', 'skills.id', 'skill_user.skill_id')
      .whereIn('skill_user.user_id', [2, 1])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('select extra columns', async (assert) => {
    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @manyToMany(() => Skill, {
        pivotColumns: ['score'],
      })
      public skills: ManyToMany<Skill>
    }

    await db.table('users').insert({ username: 'virk' })

    const user = await User.find(1)
    const { sql, bindings } = user!.related('skills').query().toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.connection()
      .getWriteClient()
      .from('skills')
      .select(
        'skills.*',
        'skill_user.user_id as pivot_user_id',
        'skill_user.skill_id as pivot_skill_id',
        'skill_user.score as pivot_score',
      )
      .innerJoin('skill_user', 'skills.id', 'skill_user.skill_id')
      .where('skill_user.user_id', 1)
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('select extra columns at runtime', async (assert) => {
    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @manyToMany(() => Skill)
      public skills: ManyToMany<Skill>
    }

    await db.table('users').insert({ username: 'virk' })

    const user = await User.find(1)
    const { sql, bindings } = user!.related('skills').query().pivotColumns(['score']).toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.connection()
      .getWriteClient()
      .from('skills')
      .select(
        'skill_user.score as pivot_score',
        'skills.*',
        'skill_user.user_id as pivot_user_id',
        'skill_user.skill_id as pivot_skill_id',
      )
      .innerJoin('skill_user', 'skills.id', 'skill_user.skill_id')
      .where('skill_user.user_id', 1)
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('generate correct sql for updating rows', async (assert) => {
    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @manyToMany(() => Skill)
      public skills: ManyToMany<Skill>
    }

    await db.table('users').insert({ username: 'virk' })

    const user = await User.find(1)

    const now = new Date()
    const { sql, bindings } = user!.related('skills').query().update({ updated_at: now }).toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.connection()
      .getWriteClient()
      .from('skill_user')
      .where('skill_user.user_id', 1)
      .update({ updated_at: now })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('generate correct sql for updating many rows', async (assert) => {
    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @manyToMany(() => Skill)
      public skills: ManyToMany<Skill>
    }

    await db.table('users').multiInsert([
      { username: 'virk' },
      { username: 'nikk' },
    ])

    const users = await User.all()
    User.$getRelation('skills').$boot()

    const related = User.$getRelation('skills').client(users, db.connection())
    const now = new Date()

    const { sql, bindings } = related.query().update({ updated_at: now }).toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.connection()
      .getWriteClient()
      .from('skill_user')
      .whereIn('skill_user.user_id', [2, 1])
      .update({ updated_at: now })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('generate correct sql for deleting rows', async (assert) => {
    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @manyToMany(() => Skill)
      public skills: ManyToMany<Skill>
    }

    await db.table('users').insert({ username: 'virk' })

    const user = await User.find(1)

    const { sql, bindings } = user!.related('skills').query().del().toSQL()
    const { sql: knexSql, bindings: knexBindings } = db.connection()
      .getWriteClient()
      .from('skill_user')
      .where('skill_user.user_id', 1)
      .del()
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('generate correct sql for deleting many rows', async (assert) => {
    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @manyToMany(() => Skill)
      public skills: ManyToMany<Skill>
    }

    await db.table('users').multiInsert([
      { username: 'virk' },
      { username: 'nikk' },
    ])

    const users = await User.all()
    User.$getRelation('skills').$boot()

    const related = User.$getRelation('skills').client(users, db.connection())

    const { sql, bindings } = related.query().del().toSQL()
    const { sql: knexSql, bindings: knexBindings } = db.connection()
      .getWriteClient()
      .from('skill_user')
      .whereIn('skill_user.user_id', [2, 1])
      .del()
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
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
      @column({ primary: true })
      public id: number

      @column()
      public name: string
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @manyToMany(() => Skill)
      public skills: ManyToMany<Skill>
    }

    User.$boot()
    await db.insertQuery().table('users').insert([{ username: 'virk' }])
    await db.insertQuery().table('skills').insert([{ name: 'Programming' }, { name: 'Dancing' }])
    await db.insertQuery().table('skill_user').insert([
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
      @column({ primary: true })
      public id: number

      @column()
      public name: string
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @manyToMany(() => Skill)
      public skills: ManyToMany<Skill>
    }

    User.$boot()

    await db.insertQuery().table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await db.insertQuery().table('skills').insert([{ name: 'Programming' }, { name: 'Dancing' }])
    await db.insertQuery().table('skill_user').insert([
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
      @column({ primary: true })
      public id: number

      @column()
      public name: string
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @manyToMany(() => Skill)
      public skills: ManyToMany<Skill>
    }

    User.$boot()

    await db.insertQuery().table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await db.insertQuery().table('skills').insert([{ name: 'Programming' }, { name: 'Dancing' }])
    await db.insertQuery().table('skill_user').insert([
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
      @column({ primary: true })
      public id: number

      @column()
      public name: string

      @column()
      public proficiency: string
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @manyToMany(() => Skill, { pivotColumns: ['proficiency'] })
      public skills: ManyToMany<Skill>
    }

    User.$boot()

    await db.insertQuery().table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await db.insertQuery().table('skills').insert([{ name: 'Programming' }, { name: 'Dancing' }])
    await db.insertQuery().table('skill_user').insert([
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
      @column({ primary: true })
      public id: number

      @column()
      public name: string

      @column()
      public proficiency: string
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @manyToMany(() => Skill)
      public skills: ManyToMany<Skill>
    }

    User.$boot()

    await db.insertQuery().table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await db.insertQuery().table('skills').insert([{ name: 'Programming' }, { name: 'Dancing' }])
    await db.insertQuery().table('skill_user').insert([
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
      @column({ primary: true })
      public id: number

      @column()
      public name: string
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @manyToMany(() => Skill)
      public skills: ManyToMany<Skill>
    }

    User.$boot()
    await db.insertQuery().table('users').insert([{ username: 'virk' }])
    await db.insertQuery().table('skills').insert([{ name: 'Programming' }, { name: 'Dancing' }])
    await db.insertQuery().table('skill_user').insert([
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
      @column({ primary: true })
      public id: number

      @column()
      public name: string
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @manyToMany(() => Skill)
      public skills: ManyToMany<Skill>
    }

    User.$boot()

    await db.insertQuery().table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await db.insertQuery().table('skills').insert([{ name: 'Programming' }, { name: 'Dancing' }])
    await db.insertQuery().table('skill_user').insert([
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
})

// test.group('ManyToMany Query Builder | where', (group) => {
//   group.before(async () => {
//     db = getDb()
//     BaseModel = getBaseModel(ormAdapter(db))
//     await setup()
//   })

//   group.after(async () => {
//     await cleanup()
//     await db.manager.closeAll()
//   })

//   test('add where clause', async (assert) => {
//     class Skill extends BaseModel {
//       @column({ primary: true })
//       public id: number
//     }

//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @manyToMany(() => Skill)
//       public skills: Skill[]
//     }

//     User.$boot()
//     User.$getRelation('skills')!.boot()

//     const connection = db.connection()
//     const relation = User.$getRelation('skills')!
//     const query = getManyToManyQueryBuilder(new User(), relation as ManyToMany, connection)
//     query['$appliedConstraints'] = true

//     const { sql, bindings } = query
//       .wherePivot('username', 'virk')
//       .toSQL()

//     const { sql: knexSql, bindings: knexBindings } = connection.getWriteClient()!
//       .from('skills')
//       .where('skill_user.username', 'virk')
//       .toSQL()

//     assert.equal(sql, knexSql)
//     assert.deepEqual(bindings, knexBindings)
//   })

//   test('add where wrapped clause', async (assert) => {
//     class Skill extends BaseModel {
//       @column({ primary: true })
//       public id: number
//     }

//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @manyToMany(() => Skill)
//       public skills: Skill[]
//     }

//     User.$boot()
//     User.$getRelation('skills')!.boot()

//     const connection = db.connection()
//     const relation = User.$getRelation('skills')!
//     const query = getManyToManyQueryBuilder(new User(), relation as ManyToMany, connection)
//     query['$appliedConstraints'] = true

//     const { sql, bindings } = query
//       .where((builder) => builder.wherePivot('username', 'virk'))
//       ['toSQL']()

//     const { sql: knexSql, bindings: knexBindings } = db.connection().getWriteClient()
//       .from('skills')
//       .where((builder) => builder.where('skill_user.username', 'virk'))
//       .toSQL()

//     assert.equal(sql, knexSql)
//     assert.deepEqual(bindings, knexBindings)
//   })

//   test('add where clause with operator', async (assert) => {
//     class Skill extends BaseModel {
//       @column({ primary: true })
//       public id: number
//     }

//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @manyToMany(() => Skill)
//       public skills: Skill[]
//     }

//     User.$boot()
//     User.$getRelation('skills')!.boot()

//     const connection = db.connection()
//     const relation = User.$getRelation('skills')!
//     const query = getManyToManyQueryBuilder(new User(), relation as ManyToMany, connection)
//     query['$appliedConstraints'] = true

//     const { sql, bindings } = query
//       .wherePivot('age', '>', 22)
//       .toSQL()

//     const { sql: knexSql, bindings: knexBindings } = db.connection().getWriteClient()
//       .from('skills')
//       .where('skill_user.age', '>', 22)
//       .toSQL()

//     assert.equal(sql, knexSql)
//     assert.deepEqual(bindings, knexBindings)
//   })

//   test('add where clause as a raw query', async (assert) => {
//     class Skill extends BaseModel {
//       @column({ primary: true })
//       public id: number
//     }

//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @manyToMany(() => Skill)
//       public skills: Skill[]
//     }

//     User.$boot()
//     User.$getRelation('skills')!.boot()

//     const connection = db.connection()
//     const relation = User.$getRelation('skills')!
//     const query = getManyToManyQueryBuilder(new User(), relation as ManyToMany, connection)
//     query['$appliedConstraints'] = true

//     const { sql, bindings } = query
//       .wherePivot('age', '>', db.raw('select min_age from ages limit 1;'))
//       .toSQL()

//     const { sql: knexSql, bindings: knexBindings } = db.connection().getWriteClient()
//       .from('skills')
//       .where(
//         'skill_user.age',
//         '>',
//         db.connection().getWriteClient().raw('select min_age from ages limit 1;'),
//       )
//       .toSQL()

//     assert.equal(sql, knexSql)
//     assert.deepEqual(bindings, knexBindings)
//   })

//   test('add orWhere clause', async (assert) => {
//     class Skill extends BaseModel {
//       @column({ primary: true })
//       public id: number
//     }

//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @manyToMany(() => Skill)
//       public skills: Skill[]
//     }

//     User.$boot()
//     User.$getRelation('skills')!.boot()

//     const connection = db.connection()
//     const relation = User.$getRelation('skills')!
//     const query = getManyToManyQueryBuilder(new User(), relation as ManyToMany, connection)
//     query['$appliedConstraints'] = true

//     const { sql, bindings } = query
//       .wherePivot('age', '>', 22)
//       .orWherePivot('age', 18)
//       .toSQL()

//     const { sql: knexSql, bindings: knexBindings } = db.connection().getWriteClient()
//       .from('skills')
//       .where('skill_user.age', '>', 22)
//       .orWhere('skill_user.age', 18)
//       .toSQL()

//     assert.equal(sql, knexSql)
//     assert.deepEqual(bindings, knexBindings)
//   })

//   test('add orWhere wrapped clause', async (assert) => {
//     class Skill extends BaseModel {
//       @column({ primary: true })
//       public id: number
//     }

//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @manyToMany(() => Skill)
//       public skills: Skill[]
//     }

//     User.$boot()
//     User.$getRelation('skills')!.boot()

//     const connection = db.connection()
//     const relation = User.$getRelation('skills')!
//     const query = getManyToManyQueryBuilder(new User(), relation as ManyToMany, connection)
//     query['$appliedConstraints'] = true

//     const { sql, bindings } = query
//       .wherePivot('age', '>', 22)
//       .orWhere((builder) => {
//         builder.wherePivot('age', 18)
//       })
//       .toSQL()

//     const { sql: knexSql, bindings: knexBindings } = db.connection().getWriteClient()
//       .from('skills')
//       .where('skill_user.age', '>', 22)
//       .orWhere((builder) => {
//         builder.where('skill_user.age', 18)
//       })
//       .toSQL()

//     assert.equal(sql, knexSql)
//     assert.deepEqual(bindings, knexBindings)
//   })
// })

// test.group('ManyToMany Query Builder | whereNot', (group) => {
//   group.before(async () => {
//     db = getDb()
//     BaseModel = getBaseModel(ormAdapter(db))
//     await setup()
//   })

//   group.after(async () => {
//     await cleanup()
//     await db.manager.closeAll()
//   })

//   test('add where no clause', async (assert) => {
//     class Skill extends BaseModel {
//       @column({ primary: true })
//       public id: number
//     }

//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @manyToMany(() => Skill)
//       public skills: Skill[]
//     }

//     User.$boot()
//     User.$getRelation('skills')!.boot()

//     const connection = db.connection()
//     const relation = User.$getRelation('skills')!
//     const query = getManyToManyQueryBuilder(new User(), relation as ManyToMany, connection)
//     query['$appliedConstraints'] = true

//     const { sql, bindings } = query
//       .whereNotPivot('username', 'virk')
//       .toSQL()

//     const { sql: knexSql, bindings: knexBindings } = db.connection().getWriteClient()
//       .from('skills')
//       .whereNot('skill_user.username', 'virk')
//       .toSQL()

//     assert.equal(sql, knexSql)
//     assert.deepEqual(bindings, knexBindings)
//   })

//   test('add where not clause with operator', async (assert) => {
//     class Skill extends BaseModel {
//       @column({ primary: true })
//       public id: number
//     }

//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @manyToMany(() => Skill)
//       public skills: Skill[]
//     }

//     User.$boot()
//     User.$getRelation('skills')!.boot()

//     const connection = db.connection()
//     const relation = User.$getRelation('skills')!
//     const query = getManyToManyQueryBuilder(new User(), relation as ManyToMany, connection)
//     query['$appliedConstraints'] = true

//     const { sql, bindings } = query
//       .whereNotPivot('age', '>', 22)
//       .toSQL()

//     const { sql: knexSql, bindings: knexBindings } = db.connection().getWriteClient()
//       .from('skills')
//       .whereNot('skill_user.age', '>', 22)
//       .toSQL()

//     assert.equal(sql, knexSql)
//     assert.deepEqual(bindings, knexBindings)
//   })

//   test('add where not clause as a raw query', async (assert) => {
//     class Skill extends BaseModel {
//       @column({ primary: true })
//       public id: number
//     }

//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @manyToMany(() => Skill)
//       public skills: Skill[]
//     }

//     User.$boot()
//     User.$getRelation('skills')!.boot()

//     const connection = db.connection()
//     const relation = User.$getRelation('skills')!
//     const query = getManyToManyQueryBuilder(new User(), relation as ManyToMany, connection)
//     query['$appliedConstraints'] = true

//     const { sql, bindings } = query
//       .whereNotPivot('age', '>', db.raw('select min_age from ages limit 1;'))
//       .toSQL()

//     const { sql: knexSql, bindings: knexBindings } = db.connection().getWriteClient()
//       .from('skills')
//       .whereNot(
//         'skill_user.age',
//         '>',
//         db.connection().getWriteClient().raw('select min_age from ages limit 1;'),
//       )
//       .toSQL()

//     assert.equal(sql, knexSql)
//     assert.deepEqual(bindings, knexBindings)
//   })

//   test('add orWhereNot clause', async (assert) => {
//     class Skill extends BaseModel {
//       @column({ primary: true })
//       public id: number
//     }

//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @manyToMany(() => Skill)
//       public skills: Skill[]
//     }

//     User.$boot()
//     User.$getRelation('skills')!.boot()

//     const connection = db.connection()
//     const relation = User.$getRelation('skills')!
//     const query = getManyToManyQueryBuilder(new User(), relation as ManyToMany, connection)
//     query['$appliedConstraints'] = true

//     const { sql, bindings } = query
//       .whereNotPivot('age', '>', 22)
//       .orWhereNotPivot('age', 18)
//       .toSQL()

//     const { sql: knexSql, bindings: knexBindings } = db.connection().getWriteClient()
//       .from('skills')
//       .whereNot('skill_user.age', '>', 22)
//       .orWhereNot('skill_user.age', 18)
//       .toSQL()

//     assert.equal(sql, knexSql)
//     assert.deepEqual(bindings, knexBindings)
//   })
// })

// test.group('ManyToMany Query Builder | whereIn', (group) => {
//   group.before(async () => {
//     db = getDb()
//     BaseModel = getBaseModel(ormAdapter(db))
//     await setup()
//   })

//   group.after(async () => {
//     await cleanup()
//     await db.manager.closeAll()
//   })

//   test('add whereIn clause', async (assert) => {
//     class Skill extends BaseModel {
//       @column({ primary: true })
//       public id: number
//     }

//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @manyToMany(() => Skill)
//       public skills: Skill[]
//     }

//     User.$boot()
//     User.$getRelation('skills')!.boot()

//     const connection = db.connection()
//     const relation = User.$getRelation('skills')!
//     const query = getManyToManyQueryBuilder(new User(), relation as ManyToMany, connection)
//     query['$appliedConstraints'] = true

//     const { sql, bindings } = query
//       .whereInPivot('username', ['virk', 'nikk'])
//       .toSQL()

//     const { sql: knexSql, bindings: knexBindings } = db.connection().getWriteClient()
//       .from('skills')
//       .whereIn('skill_user.username', ['virk', 'nikk'])
//       .toSQL()

//     assert.equal(sql, knexSql)
//     assert.deepEqual(bindings, knexBindings)
//   })

//   test('add whereIn as a query callback', async (assert) => {
//     class Skill extends BaseModel {
//       @column({ primary: true })
//       public id: number
//     }

//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @manyToMany(() => Skill)
//       public skills: Skill[]
//     }

//     User.$boot()
//     User.$getRelation('skills')!.boot()

//     const connection = db.connection()
//     const relation = User.$getRelation('skills')!
//     const query = getManyToManyQueryBuilder(new User(), relation as ManyToMany, connection)
//     query['$appliedConstraints'] = true

//     const { sql, bindings } = query
//       .whereInPivot('username', (builder) => {
//         builder.from('accounts')
//       })
//       .toSQL()

//     const { sql: knexSql, bindings: knexBindings } = db.connection().getWriteClient()
//       .from('skills')
//       .whereIn('skill_user.username', (builder) => {
//         builder.from('accounts')
//       })
//       .toSQL()

//     assert.equal(sql, knexSql)
//     assert.deepEqual(bindings, knexBindings)
//   })

//   test('add whereIn as a subquery', async (assert) => {
//     class Skill extends BaseModel {
//       @column({ primary: true })
//       public id: number
//     }

//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @manyToMany(() => Skill)
//       public skills: Skill[]
//     }

//     User.$boot()
//     User.$getRelation('skills')!.boot()

//     const connection = db.connection()
//     const relation = User.$getRelation('skills')!
//     const query = getManyToManyQueryBuilder(new User(), relation as ManyToMany, connection)
//     query['$appliedConstraints'] = true

//     const { sql, bindings } = query
//       .whereInPivot('username', db.query().select('id').from('accounts'))
//       .toSQL()

//     const { sql: knexSql, bindings: knexBindings } = db.connection().getWriteClient()
//       .from('skills')
//       .whereIn('skill_user.username', db.connection().getWriteClient().select('id').from('accounts'))
//       .toSQL()

//     assert.equal(sql, knexSql)
//     assert.deepEqual(bindings, knexBindings)
//   })

//   test('add whereIn as a rawquery', async (assert) => {
//     const ref = db.connection().getWriteClient().ref.bind(db.connection().getWriteClient())

//     class Skill extends BaseModel {
//       @column({ primary: true })
//       public id: number
//     }

//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @manyToMany(() => Skill)
//       public skills: Skill[]
//     }

//     User.$boot()
//     User.$getRelation('skills')!.boot()

//     const connection = db.connection()
//     const relation = User.$getRelation('skills')!
//     const query = getManyToManyQueryBuilder(new User(), relation as ManyToMany, connection)
//     query['$appliedConstraints'] = true

//     const { sql, bindings } = query
//       .whereInPivot('username', [
//         db.raw(`select ${ref('id')} from ${ref('accounts')}`),
//       ])
//       .toSQL()

//     const { sql: knexSql, bindings: knexBindings } = db.connection().getWriteClient()
//       .from('skills')
//       .whereIn('skill_user.username', [
//         db.connection().getWriteClient().raw(`select ${ref('id')} from ${ref('accounts')}`),
//       ])
//       .toSQL()

//     assert.equal(sql, knexSql)
//     assert.deepEqual(bindings, knexBindings)
//   })

//   test('add whereIn as a subquery with array of keys', async (assert) => {
//     class Skill extends BaseModel {
//       @column({ primary: true })
//       public id: number
//     }

//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @manyToMany(() => Skill)
//       public skills: Skill[]
//     }

//     User.$boot()
//     User.$getRelation('skills')!.boot()

//     const connection = db.connection()
//     const relation = User.$getRelation('skills')!
//     const query = getManyToManyQueryBuilder(new User(), relation as ManyToMany, connection)
//     query['$appliedConstraints'] = true

//     const { sql, bindings } = query
//       .whereInPivot(
//         ['username', 'email'],
//         db.query().select('username', 'email').from('accounts'),
//       )
//       .toSQL()

//     const { sql: knexSql, bindings: knexBindings } = db.connection().getWriteClient()
//       .from('skills')
//       .whereIn(
//         ['skill_user.username', 'skill_user.email'],
//         db.connection().getWriteClient().select('username', 'email').from('accounts'),
//       )
//       .toSQL()

//     assert.equal(sql, knexSql)
//     assert.deepEqual(bindings, knexBindings)
//   })

//   test('add whereIn as a 2d array', async (assert) => {
//     class Skill extends BaseModel {
//       @column({ primary: true })
//       public id: number
//     }

//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @manyToMany(() => Skill)
//       public skills: Skill[]
//     }

//     User.$boot()
//     User.$getRelation('skills')!.boot()

//     const connection = db.connection()
//     const relation = User.$getRelation('skills')!
//     const query = getManyToManyQueryBuilder(new User(), relation as ManyToMany, connection)
//     query['$appliedConstraints'] = true

//     const { sql, bindings } = query
//       .whereInPivot(['username', 'email'], [['foo', 'bar']])
//       .toSQL()

//     const { sql: knexSql, bindings: knexBindings } = db.connection().getWriteClient()
//       .from('skills')
//       .whereIn(['skill_user.username', 'skill_user.email'], [['foo', 'bar']])
//       .toSQL()

//     assert.equal(sql, knexSql)
//     assert.deepEqual(bindings, knexBindings)
//   })

//   test('add orWhereIn clause', async (assert) => {
//     class Skill extends BaseModel {
//       @column({ primary: true })
//       public id: number
//     }

//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @manyToMany(() => Skill)
//       public skills: Skill[]
//     }

//     User.$boot()
//     User.$getRelation('skills')!.boot()

//     const connection = db.connection()
//     const relation = User.$getRelation('skills')!
//     const query = getManyToManyQueryBuilder(new User(), relation as ManyToMany, connection)
//     query['$appliedConstraints'] = true

//     const { sql, bindings } = query
//       .whereInPivot('username', ['virk', 'nikk'])
//       .orWhereInPivot('username', ['foo'])
//       .toSQL()

//     const { sql: knexSql, bindings: knexBindings } = db.connection().getWriteClient()
//       .from('skills')
//       .whereIn('skill_user.username', ['virk', 'nikk'])
//       .orWhereIn('skill_user.username', ['foo'])
//       .toSQL()

//     assert.equal(sql, knexSql)
//     assert.deepEqual(bindings, knexBindings)
//   })

//   test('add orWhereIn as a query callback', async (assert) => {
//     class Skill extends BaseModel {
//       @column({ primary: true })
//       public id: number
//     }

//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @manyToMany(() => Skill)
//       public skills: Skill[]
//     }

//     User.$boot()
//     User.$getRelation('skills')!.boot()

//     const connection = db.connection()
//     const relation = User.$getRelation('skills')!
//     const query = getManyToManyQueryBuilder(new User(), relation as ManyToMany, connection)
//     query['$appliedConstraints'] = true

//     const { sql, bindings } = query
//       .whereInPivot('username', (builder) => {
//         builder.from('accounts')
//       })
//       .orWhereInPivot('username', (builder) => {
//         builder.from('employees')
//       })
//       .toSQL()

//     const { sql: knexSql, bindings: knexBindings } = db.connection().getWriteClient()
//       .from('skills')
//       .whereIn('skill_user.username', (builder) => {
//         builder.from('accounts')
//       })
//       .orWhereIn('skill_user.username', (builder) => {
//         builder.from('employees')
//       })
//       .toSQL()

//     assert.equal(sql, knexSql)
//     assert.deepEqual(bindings, knexBindings)
//   })
// })

// test.group('ManyToMany Query Builder | whereNotIn', (group) => {
//   group.before(async () => {
//     db = getDb()
//     BaseModel = getBaseModel(ormAdapter(db))
//     await setup()
//   })

//   group.after(async () => {
//     await cleanup()
//     await db.manager.closeAll()
//   })

//   test('add whereNotIn clause', async (assert) => {
//     class Skill extends BaseModel {
//       @column({ primary: true })
//       public id: number
//     }

//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @manyToMany(() => Skill)
//       public skills: Skill[]
//     }

//     User.$boot()
//     User.$getRelation('skills')!.boot()

//     const connection = db.connection()
//     const relation = User.$getRelation('skills')!
//     const query = getManyToManyQueryBuilder(new User(), relation as ManyToMany, connection)
//     query['$appliedConstraints'] = true

//     const { sql, bindings } = query
//       .whereNotInPivot('username', ['virk', 'nikk'])
//       .toSQL()

//     const { sql: knexSql, bindings: knexBindings } = db.connection().getWriteClient()
//       .from('skills')
//       .whereNotIn('skill_user.username', ['virk', 'nikk'])
//       .toSQL()

//     assert.equal(sql, knexSql)
//     assert.deepEqual(bindings, knexBindings)
//   })

//   test('add whereNotIn as a query callback', async (assert) => {
//     class Skill extends BaseModel {
//       @column({ primary: true })
//       public id: number
//     }

//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @manyToMany(() => Skill)
//       public skills: Skill[]
//     }

//     User.$boot()
//     User.$getRelation('skills')!.boot()

//     const connection = db.connection()
//     const relation = User.$getRelation('skills')!
//     const query = getManyToManyQueryBuilder(new User(), relation as ManyToMany, connection)
//     query['$appliedConstraints'] = true

//     const { sql, bindings } = query
//       .whereNotInPivot('username', (builder) => {
//         builder.from('accounts')
//       })
//       .toSQL()

//     const { sql: knexSql, bindings: knexBindings } = db.connection().getWriteClient()
//       .from('skills')
//       .whereNotIn('skill_user.username', (builder) => {
//         builder.from('accounts')
//       })
//       .toSQL()

//     assert.equal(sql, knexSql)
//     assert.deepEqual(bindings, knexBindings)
//   })

//   test('add whereNotIn as a sub query', async (assert) => {
//     class Skill extends BaseModel {
//       @column({ primary: true })
//       public id: number
//     }

//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @manyToMany(() => Skill)
//       public skills: Skill[]
//     }

//     User.$boot()
//     User.$getRelation('skills')!.boot()

//     const connection = db.connection()
//     const relation = User.$getRelation('skills')!
//     const query = getManyToManyQueryBuilder(new User(), relation as ManyToMany, connection)
//     query['$appliedConstraints'] = true

//     const { sql, bindings } = query
//       .whereNotInPivot('username', db.query().select('username').from('accounts'))
//       .toSQL()

//     const { sql: knexSql, bindings: knexBindings } = db.connection().getWriteClient()
//       .from('skills')
//       .whereNotIn(
//         'skill_user.username',
//         db.connection().getWriteClient().select('username').from('accounts'),
//       )
//       .toSQL()

//     assert.equal(sql, knexSql)
//     assert.deepEqual(bindings, knexBindings)
//   })

//   test('add whereNotIn as a 2d array', async (assert) => {
//     class Skill extends BaseModel {
//       @column({ primary: true })
//       public id: number
//     }

//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @manyToMany(() => Skill)
//       public skills: Skill[]
//     }

//     User.$boot()
//     User.$getRelation('skills')!.boot()

//     const connection = db.connection()
//     const relation = User.$getRelation('skills')!
//     const query = getManyToManyQueryBuilder(new User(), relation as ManyToMany, connection)
//     query['$appliedConstraints'] = true

//     const { sql, bindings } = query
//       .whereNotInPivot(['username', 'email'], [['foo', 'bar']])
//       .toSQL()

//     const { sql: knexSql, bindings: knexBindings } = db.connection().getWriteClient()
//       .from('skills')
//       .whereNotIn(['skill_user.username', 'skill_user.email'], [['foo', 'bar']])
//       .toSQL()

//     assert.equal(sql, knexSql)
//     assert.deepEqual(bindings, knexBindings)
//   })

//   test('add orWhereNotIn clause', async (assert) => {
//     class Skill extends BaseModel {
//       @column({ primary: true })
//       public id: number
//     }

//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @manyToMany(() => Skill)
//       public skills: Skill[]
//     }

//     User.$boot()
//     User.$getRelation('skills')!.boot()

//     const connection = db.connection()
//     const relation = User.$getRelation('skills')!
//     const query = getManyToManyQueryBuilder(new User(), relation as ManyToMany, connection)
//     query['$appliedConstraints'] = true

//     const { sql, bindings } = query
//       .whereNotInPivot('username', ['virk', 'nikk'])
//       .orWhereNotInPivot('username', ['foo'])
//       .toSQL()

//     const { sql: knexSql, bindings: knexBindings } = db.connection().getWriteClient()
//       .from('skills')
//       .whereNotIn('skill_user.username', ['virk', 'nikk'])
//       .orWhereNotIn('skill_user.username', ['foo'])
//       .toSQL()

//     assert.equal(sql, knexSql)
//     assert.deepEqual(bindings, knexBindings)
//   })

//   test('add orWhereNotIn as a subquery', async (assert) => {
//     class Skill extends BaseModel {
//       @column({ primary: true })
//       public id: number
//     }

//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @manyToMany(() => Skill)
//       public skills: Skill[]
//     }

//     User.$boot()
//     User.$getRelation('skills')!.boot()

//     const connection = db.connection()
//     const relation = User.$getRelation('skills')!
//     const query = getManyToManyQueryBuilder(new User(), relation as ManyToMany, connection)
//     query['$appliedConstraints'] = true

//     const { sql, bindings } = query
//       .whereNotInPivot('username', (builder) => {
//         builder.from('accounts')
//       })
//       .orWhereNotInPivot('username', (builder) => {
//         builder.from('employees')
//       })
//       .toSQL()

//     const { sql: knexSql, bindings: knexBindings } = db.connection().getWriteClient()
//       .from('skills')
//       .whereNotIn('skill_user.username', (builder) => {
//         builder.from('accounts')
//       })
//       .orWhereNotIn('skill_user.username', (builder) => {
//         builder.from('employees')
//       })
//       .toSQL()

//     assert.equal(sql, knexSql)
//     assert.deepEqual(bindings, knexBindings)
//   })
// })

// test.group('Model | ManyToMany | fetch', (group) => {
//   group.before(async () => {
//     db = getDb()
//     BaseModel = getBaseModel(ormAdapter(db))
//     await setup()
//   })

//   group.after(async () => {
//     await cleanup()
//     await db.manager.closeAll()
//   })

//   group.afterEach(async () => {
//     await resetTables()
//   })

//   test('fetch using model instance', async (assert) => {
//     class Skill extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public name: string
//     }

//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @manyToMany(() => Skill)
//       public skills: Skill[]
//     }

//     User.$boot()
//     User.$getRelation('skills')!.boot()

//     await db.insertQuery().table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
//     await db.insertQuery().table('skills').insert([{ name: 'Programming' }, { name: 'Dancing' }])
//     await db.insertQuery().table('skill_user').insert([
//       {
//         user_id: 1,
//         skill_id: 1,
//       },
//       {
//         user_id: 1,
//         skill_id: 2,
//       },
//       {
//         user_id: 2,
//         skill_id: 2,
//       },
//     ])

//     const users = await User.query().firstOrFail()
//     const skills = await users.related('skills')

//     assert.lengthOf(skills, 2)

//     assert.equal(skills[0].name, 'Programming')
//     assert.equal(skills[0].$extras.pivot_user_id, 1)
//     assert.equal(skills[0].$extras.pivot_skill_id, 1)

//     assert.equal(skills[1].name, 'Dancing')
//     assert.equal(skills[1].$extras.pivot_user_id, 1)
//     assert.equal(skills[1].$extras.pivot_skill_id, 2)
//   })

//   test('fetch using parent model options', async (assert) => {
//     class Skill extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public name: string
//     }

//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @manyToMany(() => Skill)
//       public skills: Skill[]
//     }

//     User.$boot()
//     User.$getRelation('skills')!.boot()

//     await db.insertQuery().table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
//     await db.insertQuery().table('skills').insert([{ name: 'Programming' }, { name: 'Dancing' }])
//     await db.insertQuery().table('skill_user').insert([
//       {
//         user_id: 1,
//         skill_id: 1,
//       },
//       {
//         user_id: 1,
//         skill_id: 2,
//       },
//       {
//         user_id: 2,
//         skill_id: 2,
//       },
//     ])

//     const users = await User.query({ connection: 'secondary' }).firstOrFail()
//     const skills = await users.related<'manyToMany', 'skills'>('skills')

//     assert.lengthOf(skills, 2)

//     assert.equal(skills[0].name, 'Programming')
//     assert.equal(skills[0].$options!.connection, 'secondary')
//     assert.equal(skills[0].$extras.pivot_user_id, 1)
//     assert.equal(skills[0].$extras.pivot_skill_id, 1)

//     assert.equal(skills[1].name, 'Dancing')
//     assert.equal(skills[1].$options!.connection, 'secondary')
//     assert.equal(skills[1].$extras.pivot_user_id, 1)
//     assert.equal(skills[1].$extras.pivot_skill_id, 2)
//   })
// })

// test.group('Model | ManyToMany | persist', (group) => {
//   group.before(async () => {
//     db = getDb()
//     BaseModel = getBaseModel(ormAdapter(db))
//     await setup()
//   })

//   group.after(async () => {
//     await cleanup()
//     await db.manager.closeAll()
//   })

//   group.afterEach(async () => {
//     await resetTables()
//   })

//   test('save related instance', async (assert) => {
//     class Skill extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public name: string
//     }

//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public username: string

//       @manyToMany(() => Skill)
//       public skills: Skill[]
//     }

//     const user = new User()
//     user.username = 'virk'
//     await user.save()

//     const skill = new Skill()
//     skill.name = 'Programming'

//     await user.related('skills').save(skill)

//     assert.isTrue(user.$persisted)
//     assert.isTrue(skill.$persisted)

//     const totalUsers = await db.query().from('users').count('*', 'total')
//     const totalPosts = await db.query().from('skills').count('*', 'total')
//     const skillUsers = await db.query().from('skill_user')

//     assert.equal(totalUsers[0].total, 1)
//     assert.equal(totalPosts[0].total, 1)

//     assert.lengthOf(skillUsers, 1)
//     assert.equal(skillUsers[0].user_id, user.id)
//     assert.equal(skillUsers[0].skill_id, skill.id)
//     assert.isUndefined(user.$trx)
//     assert.isUndefined(skill.$trx)
//   })

//   test('attach duplicates when save is called twice', async (assert) => {
//     class Skill extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public name: string
//     }

//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public username: string

//       @manyToMany(() => Skill)
//       public skills: Skill[]
//     }

//     const user = new User()
//     user.username = 'virk'
//     await user.save()

//     const skill = new Skill()
//     skill.name = 'Programming'

//     await user.related('skills').save(skill)
//     await user.related<'manyToMany', 'skills'>('skills').save(skill, true, false)

//     assert.isTrue(user.$persisted)
//     assert.isTrue(skill.$persisted)

//     const totalUsers = await db.query().from('users').count('*', 'total')
//     const totalPosts = await db.query().from('skills').count('*', 'total')
//     const skillUsers = await db.query().from('skill_user')

//     assert.equal(totalUsers[0].total, 1)
//     assert.equal(totalPosts[0].total, 1)

//     assert.lengthOf(skillUsers, 2)
//     assert.equal(skillUsers[0].user_id, user.id)
//     assert.equal(skillUsers[0].skill_id, skill.id)

//     assert.equal(skillUsers[1].user_id, user.id)
//     assert.equal(skillUsers[1].skill_id, skill.id)

//     assert.isUndefined(user.$trx)
//     assert.isUndefined(skill.$trx)
//   })

//   test('do not attach duplicates when checkExisting is true', async (assert) => {
//     class Skill extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public name: string
//     }

//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public username: string

//       @manyToMany(() => Skill)
//       public skills: Skill[]
//     }

//     const user = new User()
//     user.username = 'virk'
//     await user.save()

//     const skill = new Skill()
//     skill.name = 'Programming'

//     await user.related('skills').save(skill)
//     await user.related<'manyToMany', 'skills'>('skills').save(skill)

//     assert.isTrue(user.$persisted)
//     assert.isTrue(skill.$persisted)

//     const totalUsers = await db.query().from('users').count('*', 'total')
//     const totalPosts = await db.query().from('skills').count('*', 'total')
//     const skillUsers = await db.query().from('skill_user')

//     assert.equal(totalUsers[0].total, 1)
//     assert.equal(totalPosts[0].total, 1)

//     assert.lengthOf(skillUsers, 1)
//     assert.equal(skillUsers[0].user_id, user.id)
//     assert.equal(skillUsers[0].skill_id, skill.id)

//     assert.isUndefined(user.$trx)
//     assert.isUndefined(skill.$trx)
//   })

//   test('attach when related pivot entry exists but for a different parent', async (assert) => {
//     class Skill extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public name: string
//     }

//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public username: string

//       @manyToMany(() => Skill)
//       public skills: Skill[]
//     }

//     const user = new User()
//     user.username = 'virk'
//     await user.save()

//     const user1 = new User()
//     user1.username = 'nikk'
//     await user1.save()

//     const skill = new Skill()
//     skill.name = 'Programming'

//     await user.related('skills').save(skill)
//     await user1.related<'manyToMany', 'skills'>('skills').save(skill)

//     assert.isTrue(user.$persisted)
//     assert.isTrue(skill.$persisted)

//     const totalUsers = await db.query().from('users').count('*', 'total')
//     const totalSkills = await db.query().from('skills').count('*', 'total')
//     const skillUsers = await db.query().from('skill_user')

//     assert.equal(totalUsers[0].total, 2)
//     assert.equal(totalSkills[0].total, 1)

//     assert.equal(skillUsers[0].user_id, user.id)
//     assert.equal(skillUsers[0].skill_id, skill.id)

//     assert.equal(skillUsers[1].user_id, user1.id)
//     assert.equal(skillUsers[1].skill_id, skill.id)

//     assert.isUndefined(user.$trx)
//     assert.isUndefined(user1.$trx)
//     assert.isUndefined(skill.$trx)
//   })

//   test('save many of related instance', async (assert) => {
//     class Skill extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public name: string
//     }

//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public username: string

//       @manyToMany(() => Skill)
//       public skills: Skill[]
//     }

//     const user = new User()
//     user.username = 'virk'
//     await user.save()

//     const skill = new Skill()
//     skill.name = 'Programming'

//     const skill1 = new Skill()
//     skill1.name = 'Dancing'

//     await user.related('skills').saveMany([skill, skill1])

//     assert.isTrue(user.$persisted)
//     assert.isTrue(skill.$persisted)
//     assert.isTrue(skill1.$persisted)

//     const totalUsers = await db.query().from('users').count('*', 'total')
//     const totalSkills = await db.query().from('skills').count('*', 'total')
//     const skillUsers = await db.query().from('skill_user')

//     assert.equal(totalUsers[0].total, 1)
//     assert.equal(totalSkills[0].total, 2)

//     assert.lengthOf(skillUsers, 2)
//     assert.equal(skillUsers[0].user_id, user.id)
//     assert.equal(skillUsers[0].skill_id, skill.id)

//     assert.equal(skillUsers[1].user_id, user.id)
//     assert.equal(skillUsers[1].skill_id, skill1.id)

//     assert.isUndefined(user.$trx)
//     assert.isUndefined(skill.$trx)
//     assert.isUndefined(skill1.$trx)
//   })

//   test('save many add duplicates when checkExisting is false', async (assert) => {
//     class Skill extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public name: string
//     }

//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public username: string

//       @manyToMany(() => Skill)
//       public skills: Skill[]
//     }

//     const user = new User()
//     user.username = 'virk'
//     await user.save()

//     const skill = new Skill()
//     skill.name = 'Programming'

//     const skill1 = new Skill()
//     skill1.name = 'Dancing'

//     await user.related('skills').save(skill)
//     await user.related<'manyToMany', 'skills'>('skills').saveMany([skill, skill1], true, false)

//     assert.isTrue(user.$persisted)
//     assert.isTrue(skill.$persisted)
//     assert.isTrue(skill1.$persisted)

//     const totalUsers = await db.query().from('users').count('*', 'total')
//     const totalSkills = await db.query().from('skills').count('*', 'total')
//     const skillUsers = await db.query().from('skill_user')

//     assert.equal(totalUsers[0].total, 1)
//     assert.equal(totalSkills[0].total, 2)

//     assert.lengthOf(skillUsers, 3)
//     assert.equal(skillUsers[0].user_id, user.id)
//     assert.equal(skillUsers[0].skill_id, skill.id)

//     assert.equal(skillUsers[1].user_id, user.id)
//     assert.equal(skillUsers[1].skill_id, skill.id)

//     assert.equal(skillUsers[2].user_id, user.id)
//     assert.equal(skillUsers[2].skill_id, skill1.id)

//     assert.isUndefined(user.$trx)
//     assert.isUndefined(skill.$trx)
//     assert.isUndefined(skill1.$trx)
//   })

//   test('wrap calls inside transaction', async (assert) => {
//     class Skill extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public name: string
//     }

//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public username: string

//       @manyToMany(() => Skill)
//       public skills: Skill[]
//     }

//     const user = new User()
//     user.username = 'virk'

//     const skill = new Skill()

//     try {
//       await user.related('skills').save(skill)
//     } catch (error) {
//       assert.exists(error)
//     }

//     const totalUsers = await db.query().from('users').count('*', 'total')
//     const totalSkills = await db.query().from('skills').count('*', 'total')
//     const skillUsers = await db.query().from('skill_user')

//     assert.equal(totalUsers[0].total, 0)
//     assert.equal(totalSkills[0].total, 0)
//     assert.lengthOf(skillUsers, 0)
//   })

//   test('wrap calls inside transaction even when parent has been persisted', async (assert) => {
//     class Skill extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public name: string
//     }

//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public username: string

//       @manyToMany(() => Skill)
//       public skills: Skill[]
//     }

//     const user = new User()
//     user.username = 'virk'
//     await user.save()

//     const skill = new Skill()

//     try {
//       await user.related('skills').save(skill)
//     } catch (error) {
//       assert.exists(error)
//     }

//     const totalUsers = await db.query().from('users').count('*', 'total')
//     const totalSkills = await db.query().from('skills').count('*', 'total')
//     const skillUsers = await db.query().from('skill_user')

//     assert.equal(totalUsers[0].total, 1)
//     assert.equal(totalSkills[0].total, 0)
//     assert.lengthOf(skillUsers, 0)
//   })

//   test('do not wrap calls inside transaction when wrapInTransaction=false', async (assert) => {
//     class Skill extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public name: string
//     }

//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public username: string

//       @manyToMany(() => Skill)
//       public skills: Skill[]
//     }

//     const user = new User()
//     user.username = 'virk'

//     const skill = new Skill()

//     try {
//       await user.related('skills').save(skill, false)
//     } catch (error) {
//       assert.exists(error)
//     }

//     const totalUsers = await db.query().from('users').count('*', 'total')
//     const totalSkills = await db.query().from('skills').count('*', 'total')
//     const skillUsers = await db.query().from('skill_user')

//     assert.equal(totalUsers[0].total, 1)
//     assert.equal(totalSkills[0].total, 0)
//     assert.lengthOf(skillUsers, 0)
//   })

//   test('wrap save many calls inside transaction', async (assert) => {
//     class Skill extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public name: string
//     }

//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public username: string

//       @manyToMany(() => Skill)
//       public skills: Skill[]
//     }

//     const user = new User()
//     user.username = 'virk'

//     const skill = new Skill()
//     skill.name = 'Programming'

//     const skill1 = new Skill()

//     try {
//       await user.related('skills').saveMany([skill, skill1])
//     } catch (error) {
//       assert.exists(error)
//     }

//     const totalUsers = await db.query().from('users').count('*', 'total')
//     const totalSkills = await db.query().from('skills').count('*', 'total')
//     const skillUsers = await db.query().from('skill_user')

//     assert.equal(totalUsers[0].total, 0)
//     assert.equal(totalSkills[0].total, 0)
//     assert.lengthOf(skillUsers, 0)
//   })

//   test('do not wrap save many calls inside transaction when wrapInTransaction=false', async (assert) => {
//     class Skill extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public name: string
//     }

//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public username: string

//       @manyToMany(() => Skill)
//       public skills: Skill[]
//     }

//     const user = new User()
//     user.username = 'virk'

//     const skill = new Skill()
//     skill.name = 'Programming'

//     const skill1 = new Skill()

//     try {
//       await user.related('skills').saveMany([skill, skill1], false)
//     } catch (error) {
//       assert.exists(error)
//     }

//     const totalUsers = await db.query().from('users').count('*', 'total')
//     const totalSkills = await db.query().from('skills').count('*', 'total')
//     const skillUsers = await db.query().from('skill_user')

//     assert.equal(totalUsers[0].total, 1)
//     assert.equal(totalSkills[0].total, 1)
//     assert.lengthOf(skillUsers, 0)
//   })

//   test('create save point when parent is not persisted', async (assert) => {
//     class Skill extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public name: string
//     }

//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public username: string

//       @manyToMany(() => Skill)
//       public skills: Skill[]
//     }

//     const trx = await db.transaction()

//     const user = new User()
//     user.$trx = trx
//     user.username = 'virk'

//     const skill = new Skill()
//     skill.name = 'Programming'

//     await user.related('skills').save(skill)
//     assert.isUndefined(user.$trx)

//     await trx.rollback()

//     const totalUsers = await db.query().from('users').count('*', 'total')
//     const totalSkills = await db.query().from('skills').count('*', 'total')
//     const skillUsers = await db.query().from('skill_user')

//     assert.equal(totalUsers[0].total, 0)
//     assert.equal(totalSkills[0].total, 0)
//     assert.lengthOf(skillUsers, 0)
//   })

//   test('use parent model transaction when wrapInTransaction=false', async (assert) => {
//     class Skill extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public name: string
//     }

//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public username: string

//       @manyToMany(() => Skill)
//       public skills: Skill[]
//     }

//     const trx = await db.transaction()

//     const user = new User()
//     user.$trx = trx
//     user.username = 'virk'

//     const skill = new Skill()
//     skill.name = 'Programming'

//     await user.related('skills').save(skill, false)

//     /**
//      * Ensure that related save has not committed the transaction
//      */
//     assert.deepEqual(user.$trx, trx)

//     await trx.rollback()

//     const totalUsers = await db.query().from('users').count('*', 'total')
//     const totalSkills = await db.query().from('skills').count('*', 'total')
//     const skillUsers = await db.query().from('skill_user')

//     assert.equal(totalUsers[0].total, 0)
//     assert.equal(totalSkills[0].total, 0)
//     assert.lengthOf(skillUsers, 0)
//   })

//   test('create save point with save many', async (assert) => {
//     class Skill extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public name: string
//     }

//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public username: string

//       @manyToMany(() => Skill)
//       public skills: Skill[]
//     }

//     const trx = await db.transaction()

//     const user = new User()
//     user.$trx = trx
//     user.username = 'virk'

//     const skill = new Skill()
//     skill.name = 'Programming'

//     const skill1 = new Skill()
//     skill1.name = 'Dancy'

//     await user.related('skills').saveMany([skill, skill1])
//     assert.isUndefined(user.$trx)

//     await trx.rollback()

//     const totalUsers = await db.query().from('users').count('*', 'total')
//     const totalSkills = await db.query().from('skills').count('*', 'total')
//     const skillUsers = await db.query().from('skill_user')

//     assert.equal(totalUsers[0].total, 0)
//     assert.equal(totalSkills[0].total, 0)
//     assert.lengthOf(skillUsers, 0)
//   })

//   test('use parent model transaction with save many when wrapInTransaction=false', async (assert) => {
//     class Skill extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public name: string
//     }

//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public username: string

//       @manyToMany(() => Skill)
//       public skills: Skill[]
//     }

//     const trx = await db.transaction()

//     const user = new User()
//     user.$trx = trx
//     user.username = 'virk'

//     const skill = new Skill()
//     skill.name = 'Programming'

//     const skill1 = new Skill()
//     skill1.name = 'Dancing'

//     await user.related('skills').saveMany([skill, skill1], false)

//     /**
//      * Ensure that related save has not committed the transaction
//      */
//     assert.deepEqual(user.$trx, trx)

//     await trx.rollback()

//     const totalUsers = await db.query().from('users').count('*', 'total')
//     const totalSkills = await db.query().from('skills').count('*', 'total')
//     const skillUsers = await db.query().from('skill_user')

//     assert.equal(totalUsers[0].total, 0)
//     assert.equal(totalSkills[0].total, 0)
//     assert.lengthOf(skillUsers, 0)
//   })

//   test('create save point when parent is in transaction and not persisted', async (assert) => {
//     class Skill extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public name: string
//     }

//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public username: string

//       @manyToMany(() => Skill)
//       public skills: Skill[]
//     }

//     const trx = await db.transaction()

//     const user = new User()
//     user.$trx = trx
//     user.username = 'virk'

//     const skill = new Skill()

//     try {
//       await user.related('skills').save(skill)
//     } catch (error) {
//       assert.exists(error)
//     }

//     await trx.commit()

//     const totalUsers = await db.query().from('users').count('*', 'total')
//     const totalSkills = await db.query().from('skills').count('*', 'total')
//     const skillUsers = await db.query().from('skill_user')

//     assert.equal(totalUsers[0].total, 0)
//     assert.equal(totalSkills[0].total, 0)
//     assert.lengthOf(skillUsers, 0)
//   })

//   test('create save point with save many when parent is in transaction and not persisted', async (assert) => {
//     class Skill extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public name: string
//     }

//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public username: string

//       @manyToMany(() => Skill)
//       public skills: Skill[]
//     }

//     const trx = await db.transaction()

//     const user = new User()
//     user.$trx = trx
//     user.username = 'virk'

//     const skill = new Skill()
//     skill.name = 'Programming'

//     const skill1 = new Skill()

//     try {
//       await user.related('skills').saveMany([skill, skill1])
//     } catch (error) {
//       assert.exists(error)
//     }

//     await trx.commit()

//     const totalUsers = await db.query().from('users').count('*', 'total')
//     const totalSkills = await db.query().from('skills').count('*', 'total')
//     const skillUsers = await db.query().from('skill_user')

//     assert.equal(totalUsers[0].total, 0)
//     assert.equal(totalSkills[0].total, 0)
//     assert.lengthOf(skillUsers, 0)
//   })

//   test('invoke hooks for related model', async (assert) => {
//     assert.plan(1)

//     class Skill extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public name: string

//       public static $boot () {
//         if (this.$booted) {
//           return
//         }

//         super.$boot()
//         this.$before('save', (model) => {
//           assert.instanceOf(model, Skill)
//         })
//       }
//     }

//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public username: string

//       @manyToMany(() => Skill)
//       public skills: Skill[]
//     }

//     const user = new User()
//     user.username = 'virk'
//     await user.save()

//     const skill = new Skill()
//     skill.name = 'Programming'

//     await user.related('skills').save(skill)
//   })

//   test('invoke hooks for related model using save many', async (assert) => {
//     assert.plan(2)

//     class Skill extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public name: string

//       public static $boot () {
//         if (this.$booted) {
//           return
//         }

//         super.$boot()
//         this.$before('save', (model) => {
//           assert.instanceOf(model, Skill)
//         })
//       }
//     }

//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public username: string

//       @manyToMany(() => Skill)
//       public skills: Skill[]
//     }

//     const user = new User()
//     user.username = 'virk'
//     await user.save()

//     const skill = new Skill()
//     skill.name = 'Programming'

//     const skill1 = new Skill()
//     skill1.name = 'Dancing'

//     await user.related('skills').saveMany([skill, skill1])
//   })

//   test('create related instance', async (assert) => {
//     class Skill extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public name: string
//     }

//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public username: string

//       @manyToMany(() => Skill)
//       public skills: Skill[]
//     }

//     const user = new User()
//     user.username = 'virk'
//     await user.save()

//     const skill = await user.related('skills').create({ name: 'Programming' })

//     assert.isTrue(user.$persisted)
//     assert.isTrue(skill.$persisted)

//     const totalUsers = await db.query().from('users').count('*', 'total')
//     const totalPosts = await db.query().from('skills').count('*', 'total')
//     const skillUsers = await db.query().from('skill_user')

//     assert.equal(totalUsers[0].total, 1)
//     assert.equal(totalPosts[0].total, 1)

//     assert.lengthOf(skillUsers, 1)
//     assert.equal(skillUsers[0].user_id, user.id)
//     assert.equal(skillUsers[0].skill_id, skill.id)
//     assert.isUndefined(user.$trx)
//     assert.isUndefined(skill.$trx)
//   })

//   test('create many of related instance', async (assert) => {
//     class Skill extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public name: string
//     }

//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public username: string

//       @manyToMany(() => Skill)
//       public skills: Skill[]
//     }

//     const user = new User()
//     user.username = 'virk'
//     await user.save()

//     const [skill, skill1] = await user.related('skills').createMany([{
//       name: 'Programming',
//     }, {
//       name: 'Dancing',
//     }])

//     assert.isTrue(user.$persisted)
//     assert.isTrue(skill.$persisted)
//     assert.isTrue(skill1.$persisted)

//     const totalUsers = await db.query().from('users').count('*', 'total')
//     const totalSkills = await db.query().from('skills').count('*', 'total')
//     const skillUsers = await db.query().from('skill_user')

//     assert.equal(totalUsers[0].total, 1)
//     assert.equal(totalSkills[0].total, 2)

//     assert.lengthOf(skillUsers, 2)
//     assert.equal(skillUsers[0].user_id, user.id)
//     assert.equal(skillUsers[0].skill_id, skill.id)

//     assert.equal(skillUsers[1].user_id, user.id)
//     assert.equal(skillUsers[1].skill_id, skill1.id)

//     assert.isUndefined(user.$trx)
//     assert.isUndefined(skill.$trx)
//     assert.isUndefined(skill1.$trx)
//   })
// })

// test.group('Model | ManyToMany | attach', (group) => {
//   group.before(async () => {
//     db = getDb()
//     BaseModel = getBaseModel(ormAdapter(db))
//     await setup()
//   })

//   group.after(async () => {
//     await cleanup()
//     await db.manager.closeAll()
//   })

//   group.afterEach(async () => {
//     await resetTables()
//   })

//   test('attach pivot ids', async (assert) => {
//     class Skill extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public name: string
//     }

//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public username: string

//       @manyToMany(() => Skill)
//       public skills: Skill[]
//     }

//     const user = new User()
//     user.username = 'virk'
//     await user.save()

//     await user.related<'manyToMany', 'skills'>('skills').attach([1, 2])
//     assert.isTrue(user.$persisted)

//     const totalUsers = await db.query().from('users').count('*', 'total')
//     const skillUsers = await db.query().from('skill_user')

//     assert.equal(totalUsers[0].total, 1)

//     assert.lengthOf(skillUsers, 2)
//     assert.equal(skillUsers[0].user_id, user.id)
//     assert.equal(skillUsers[0].skill_id, 1)
//     assert.equal(skillUsers[1].user_id, user.id)
//     assert.equal(skillUsers[1].skill_id, 2)

//     assert.isUndefined(user.$trx)
//   })

//   test('attach pivot ids avoid duplicates', async (assert) => {
//     class Skill extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public name: string
//     }

//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public username: string

//       @manyToMany(() => Skill)
//       public skills: Skill[]
//     }

//     const user = new User()
//     user.username = 'virk'
//     await user.save()

//     await user.related<'manyToMany', 'skills'>('skills').attach([1, 1, 2])
//     assert.isTrue(user.$persisted)

//     const totalUsers = await db.query().from('users').count('*', 'total')
//     const skillUsers = await db.query().from('skill_user')

//     assert.equal(totalUsers[0].total, 1)

//     assert.lengthOf(skillUsers, 2)
//     assert.equal(skillUsers[0].user_id, user.id)
//     assert.equal(skillUsers[0].skill_id, 1)
//     assert.equal(skillUsers[1].user_id, user.id)
//     assert.equal(skillUsers[1].skill_id, 2)

//     assert.isUndefined(user.$trx)
//   })

//   test('fail attach when parent model has not been persisted', async (assert) => {
//     assert.plan(1)

//     class Skill extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public name: string
//     }

//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public username: string

//       @manyToMany(() => Skill)
//       public skills: Skill[]
//     }

//     const user = new User()
//     user.username = 'virk'

//     try {
//       await user.related<'manyToMany', 'skills'>('skills').attach([1, 1, 2])
//     } catch ({ message }) {
//       assert.equal(message, 'Cannot attach skills, value of User.id is undefined')
//     }
//   })

//   test('attach with extra data', async (assert) => {
//     class Skill extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public name: string
//     }

//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public username: string

//       @manyToMany(() => Skill)
//       public skills: Skill[]
//     }

//     const user = new User()
//     user.username = 'virk'
//     await user.save()

//     await user.related<'manyToMany', 'skills'>('skills').attach({
//       1: { proficiency: 'Master' },
//       2: { proficiency: 'Beginner' },
//     })
//     assert.isTrue(user.$persisted)

//     const totalUsers = await db.query().from('users').count('*', 'total')
//     const skillUsers = await db.query().from('skill_user')

//     assert.equal(totalUsers[0].total, 1)

//     assert.lengthOf(skillUsers, 2)
//     assert.equal(skillUsers[0].user_id, user.id)
//     assert.equal(skillUsers[0].skill_id, 1)
//     assert.equal(skillUsers[0].proficiency, 'Master')

//     assert.equal(skillUsers[1].user_id, user.id)
//     assert.equal(skillUsers[1].skill_id, 2)
//     assert.equal(skillUsers[1].proficiency, 'Beginner')

//     assert.isUndefined(user.$trx)
//   })
// })

// test.group('Model | ManyToMany | bulk operation', (group) => {
//   group.before(async () => {
//     db = getDb()
//     BaseModel = getBaseModel(ormAdapter(db))
//     await setup()
//   })

//   group.after(async () => {
//     await cleanup()
//     await db.manager.closeAll()
//   })

//   group.afterEach(async () => {
//     await resetTables()
//   })

//   test('generate correct sql for deleting related rows', async (assert) => {
//     class Skill extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public name: string
//     }

//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public username: string

//       @manyToMany(() => Skill)
//       public skills: Skill[]
//     }

//     await db.table('users').insert({ username: 'virk' })

//     const user = await User.find(1)
//     const { sql, bindings } = user!.related('skills').del().toSQL()

//     const { sql: knexSql, bindings: knexBindings } = db.connection()
//       .getWriteClient()
//       .from('skill_user')
//       .where('skill_user.user_id', 1)
//       .del()
//       .toSQL()

//     assert.equal(sql, knexSql)
//     assert.deepEqual(bindings, knexBindings)
//   })

//   test('generate correct sql for updating related rows', async (assert) => {
//     class Skill extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public name: string
//     }

//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public username: string

//       @manyToMany(() => Skill)
//       public skills: Skill[]
//     }

//     await db.table('users').insert({ username: 'virk' })

//     const user = await User.find(1)
//     const { sql, bindings } = user!.related('skills').update({ proficiency: 'Master' }).toSQL()

//     const { sql: knexSql, bindings: knexBindings } = db.connection()
//       .getWriteClient()
//       .from('skill_user')
//       .where('skill_user.user_id', 1)
//       .update({ proficiency: 'Master' })
//       .toSQL()

//     assert.equal(sql, knexSql)
//     assert.deepEqual(bindings, knexBindings)
//   })
// })

// test.group('Model | ManyToMany | detach', (group) => {
//   group.before(async () => {
//     db = getDb()
//     BaseModel = getBaseModel(ormAdapter(db))
//     await setup()
//   })

//   group.after(async () => {
//     await cleanup()
//     await db.manager.closeAll()
//   })

//   group.afterEach(async () => {
//     await resetTables()
//   })

//   test('detach existing pivot ids', async (assert) => {
//     class Skill extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public name: string
//     }

//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public username: string

//       @manyToMany(() => Skill)
//       public skills: Skill[]
//     }

//     const user = new User()
//     user.username = 'virk'
//     await user.save()

//     await user.related<'manyToMany', 'skills'>('skills').attach([1, 2])
//     await user.related<'manyToMany', 'skills'>('skills').detach([1])

//     const totalUsers = await db.query().from('users').count('*', 'total')
//     const skillUsers = await db.query().from('skill_user')

//     assert.equal(totalUsers[0].total, 1)

//     assert.lengthOf(skillUsers, 1)
//     assert.equal(skillUsers[0].user_id, user.id)
//     assert.equal(skillUsers[0].skill_id, 2)

//     assert.isUndefined(user.$trx)
//   })

//   test('fail detach when parent is not persisted', async (assert) => {
//     assert.plan(1)

//     class Skill extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public name: string
//     }

//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public username: string

//       @manyToMany(() => Skill)
//       public skills: Skill[]
//     }

//     const user = new User()
//     user.username = 'virk'

//     try {
//       await user.related<'manyToMany', 'skills'>('skills').detach([1])
//     } catch ({ message }) {
//       assert.equal(message, 'Cannot detach skills, value of User.id is undefined')
//     }
//   })
// })

// test.group('Model | ManyToMany | sync', (group) => {
//   group.before(async () => {
//     db = getDb()
//     BaseModel = getBaseModel(ormAdapter(db))
//     await setup()
//   })

//   group.after(async () => {
//     await cleanup()
//     await db.manager.closeAll()
//   })

//   group.afterEach(async () => {
//     await resetTables()
//   })

//   test('do not perform deletes when not removing any ids', async (assert) => {
//     class Skill extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public name: string
//     }

//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public username: string

//       @manyToMany(() => Skill)
//       public skills: Skill[]
//     }

//     const user = new User()
//     user.username = 'virk'
//     await user.save()

//     await user.related<'manyToMany', 'skills'>('skills').attach([1, 2])
//     const skillUsers = await db.query().from('skill_user')

//     await user.related<'manyToMany', 'skills'>('skills').sync([1, 2])
//     const skillUsersAfterSync = await db.query().from('skill_user')

//     assert.equal(skillUsers[0].id, skillUsersAfterSync[0].id)
//     assert.equal(skillUsers[1].id, skillUsersAfterSync[1].id)
//   })

//   test('remove ids except one defined in the sync method', async (assert) => {
//     class Skill extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public name: string
//     }

//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public username: string

//       @manyToMany(() => Skill)
//       public skills: Skill[]
//     }

//     const user = new User()
//     user.username = 'virk'
//     await user.save()

//     await user.related<'manyToMany', 'skills'>('skills').attach([1, 2])
//     const skillUsers = await db.query().from('skill_user')

//     await user.related<'manyToMany', 'skills'>('skills').sync([2])
//     const skillUsersAfterSync = await db.query().from('skill_user')

//     assert.lengthOf(skillUsers, 2)
//     assert.lengthOf(skillUsersAfterSync, 1)

//     assert.equal(skillUsers[1].id, skillUsersAfterSync[0].id)
//     assert.equal(skillUsersAfterSync[0].user_id, user.id)
//     assert.equal(skillUsersAfterSync[0].skill_id, 2)
//   })

//   test('insert new ids mentioned in sync', async (assert) => {
//     class Skill extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public name: string
//     }

//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public username: string

//       @manyToMany(() => Skill)
//       public skills: Skill[]
//     }

//     const user = new User()
//     user.username = 'virk'
//     await user.save()

//     await user.related<'manyToMany', 'skills'>('skills').attach([1])
//     const skillUsers = await db.query().from('skill_user')

//     await user.related<'manyToMany', 'skills'>('skills').sync([1, 2])
//     const skillUsersAfterSync = await db.query().from('skill_user')

//     assert.lengthOf(skillUsers, 1)
//     assert.lengthOf(skillUsersAfterSync, 2)

//     assert.equal(skillUsers[0].id, skillUsersAfterSync[0].id)
//     assert.equal(skillUsersAfterSync[0].user_id, user.id)
//     assert.equal(skillUsersAfterSync[0].skill_id, 1)

//     assert.equal(skillUsersAfterSync[1].user_id, user.id)
//     assert.equal(skillUsersAfterSync[1].skill_id, 2)
//   })

//   test('sync with extra properties', async (assert) => {
//     class Skill extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public name: string
//     }

//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public username: string

//       @manyToMany(() => Skill)
//       public skills: Skill[]
//     }

//     const user = new User()
//     user.username = 'virk'
//     await user.save()

//     await user.related<'manyToMany', 'skills'>('skills').attach([1])
//     const skillUsers = await db.query().from('skill_user')

//     await user.related<'manyToMany', 'skills'>('skills').sync({
//       1: { proficiency: 'master' },
//       2: { proficiency: 'beginner' },
//     })
//     const skillUsersAfterSync = await db.query().from('skill_user')

//     assert.lengthOf(skillUsers, 1)
//     assert.lengthOf(skillUsersAfterSync, 2)

//     assert.equal(skillUsers[0].id, skillUsersAfterSync[0].id)
//     assert.equal(skillUsersAfterSync[0].user_id, user.id)
//     assert.equal(skillUsersAfterSync[0].skill_id, 1)
//     assert.equal(skillUsersAfterSync[0].proficiency, 'master')

//     assert.equal(skillUsersAfterSync[1].user_id, user.id)
//     assert.equal(skillUsersAfterSync[1].skill_id, 2)
//     assert.equal(skillUsersAfterSync[1].proficiency, 'beginner')
//   })

//   test('sync update extra properties when rows are same', async (assert) => {
//     class Skill extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public name: string
//     }

//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public username: string

//       @manyToMany(() => Skill)
//       public skills: Skill[]
//     }

//     const user = new User()
//     user.username = 'virk'
//     await user.save()

//     await user.related<'manyToMany', 'skills'>('skills').attach([1])
//     const skillUsers = await db.query().from('skill_user')

//     await user.related<'manyToMany', 'skills'>('skills').sync({
//       1: { proficiency: 'master' },
//       2: { proficiency: 'beginner' },
//     })

//     await user.related<'manyToMany', 'skills'>('skills').sync({
//       1: { proficiency: 'master' },
//       2: { proficiency: 'intermediate' },
//     })
//     const skillUsersAfterSync = await db.query().from('skill_user')

//     assert.lengthOf(skillUsers, 1)
//     assert.lengthOf(skillUsersAfterSync, 2)

//     assert.equal(skillUsers[0].id, skillUsersAfterSync[0].id)
//     assert.equal(skillUsersAfterSync[0].user_id, user.id)
//     assert.equal(skillUsersAfterSync[0].skill_id, 1)
//     assert.equal(skillUsersAfterSync[0].proficiency, 'master')

//     assert.equal(skillUsersAfterSync[1].user_id, user.id)
//     assert.equal(skillUsersAfterSync[1].skill_id, 2)
//     assert.equal(skillUsersAfterSync[1].proficiency, 'intermediate')
//   })
// })
