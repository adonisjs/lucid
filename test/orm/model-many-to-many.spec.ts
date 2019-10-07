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
import { ManyToMany } from '../../src/Orm/Relations/ManyToMany'
import { ManyToManyQueryBuilder } from '../../src/Orm/Relations/ManyToMany/QueryBuilder'
import { manyToMany, column } from '../../src/Orm/Decorators'

import {
  setup,
  getDb,
  cleanup,
  resetTables,
  ormAdapter,
  getBaseModel,
  getManyToManyQueryBuilder,
} from '../../test-helpers'

let db: ReturnType<typeof getDb>
let BaseModel: ReturnType<typeof getBaseModel>

test.group('Model | Many To Many', (group) => {
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

  test('raise error when localKey is missing', (assert) => {
    assert.plan(1)

    try {
      class Skill extends BaseModel {
      }

      class User extends BaseModel {
        @manyToMany(() => Skill)
        public skills: Skill[]
      }

      User.$boot()
      User.$getRelation('skills')!.boot()
    } catch ({ message }) {
      assert.equal(
        message,
        'E_MISSING_RELATED_LOCAL_KEY: User.id required by User.skills relation is missing',
      )
    }
  })

  test('raise error when foreignKey is missing', (assert) => {
    assert.plan(1)

    try {
      class Skill extends BaseModel {
      }
      Skill.$boot()

      class User extends BaseModel {
        @column({ primary: true })
        public id: number

        @manyToMany(() => Skill)
        public skills: Skill[]
      }

      User.$boot()
      User.$getRelation('skills')!.boot()
    } catch ({ message }) {
      assert.equal(
        message,
        'E_MISSING_RELATED_FOREIGN_KEY: Skill.id required by User.skills relation is missing',
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
      public skills: Skill[]
    }

    User.$getRelation('skills')!.boot()

    assert.equal(User.$getRelation('skills')!['localKey'], 'id')
    assert.equal(User.$getRelation('skills')!['localAdapterKey'], 'id')
  })

  test('use custom defined primary key', (assert) => {
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
      public skills: Skill[]
    }

    User.$boot()
    User.$getRelation('skills')!.boot()

    assert.equal(User.$getRelation('skills')!['localKey'], 'uid')
    assert.equal(User.$getRelation('skills')!['localAdapterKey'], 'uid')
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
      public skills: Skill[]
    }

    User.$getRelation('skills')!.boot()

    assert.equal(User.$getRelation('skills')!['pivotForeignKey'], 'user_id')
    assert.equal(User.$getRelation('skills')!['pivotForeignKeyAlias'], 'pivot_user_id')
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
      public skills: Skill[]
    }

    User.$getRelation('skills')!.boot()

    assert.equal(User.$getRelation('skills')!['pivotForeignKey'], 'user_uid')
    assert.equal(User.$getRelation('skills')!['pivotForeignKeyAlias'], 'pivot_user_uid')
  })

  test('use primary key of the related model as relatedKey', (assert) => {
    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @manyToMany(() => Skill)
      public skills: Skill[]
    }

    User.$boot()
    User.$getRelation('skills')!.boot()

    assert.equal(User.$getRelation('skills')!['relatedKey'], 'id')
    assert.equal(User.$getRelation('skills')!['relatedAdapterKey'], 'id')
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
      public skills: Skill[]
    }

    User.$boot()
    User.$getRelation('skills')!.boot()

    assert.equal(User.$getRelation('skills')!['relatedKey'], 'uid')
    assert.equal(User.$getRelation('skills')!['relatedAdapterKey'], 'uid')
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
      public skills: Skill[]
    }

    User.$boot()
    User.$getRelation('skills')!.boot()

    assert.equal(User.$getRelation('skills')!['pivotRelatedForeignKey'], 'skill_id')
    assert.equal(User.$getRelation('skills')!['pivotRelatedForeignKeyAlias'], 'pivot_skill_id')
  })

  test('use predefined relatedPivotForeignKey', (assert) => {
    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @manyToMany(() => Skill, { pivotRelatedForeignKey: 'skill_uid' })
      public skills: Skill[]
    }

    User.$boot()
    User.$getRelation('skills')!.boot()

    assert.equal(User.$getRelation('skills')!['pivotRelatedForeignKey'], 'skill_uid')
    assert.equal(User.$getRelation('skills')!['pivotRelatedForeignKeyAlias'], 'pivot_skill_uid')
  })

  test('get eager query', (assert) => {
    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @manyToMany(() => Skill)
      public skills: Skill[]
    }

    User.$boot()
    User.$getRelation('skills')!.boot()

    const user = new User()
    user.id = 1

    const { sql, bindings } = User.$getRelation('skills')!
      .getEagerQuery([user], User.query().client)
      .applyConstraints()
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.query()
      .from('skills')
      .select([
        'skills.*',
        'skill_user.user_id as pivot_user_id',
        'skill_user.skill_id as pivot_skill_id',
      ])
      .innerJoin('skill_user', 'skills.id', 'skill_user.skill_id')
      .whereIn('skill_user.user_id', [1])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('get query', (assert) => {
    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @manyToMany(() => Skill)
      public skills: Skill[]
    }

    User.$boot()
    User.$getRelation('skills')!.boot()

    const user = new User()
    user.id = 1

    const { sql, bindings } = User.$getRelation('skills')!
      .getQuery(user, User.query().client)
      .applyConstraints()
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.query()
      .from('skills')
      .select([
        'skills.*',
        'skill_user.user_id as pivot_user_id',
        'skill_user.skill_id as pivot_skill_id',
      ])
      .innerJoin('skill_user', 'skills.id', 'skill_user.skill_id')
      .where('skill_user.user_id', 1)
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('queries must be instance of many to many query builder', (assert) => {
    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @manyToMany(() => Skill)
      public skills: Skill[]
    }

    User.$boot()
    User.$getRelation('skills')!.boot()

    const user = new User()
    user.id = 1

    const query = User.$getRelation('skills')!.getQuery(user, User.query().client)
    const eagerQuery = User.$getRelation('skills')!.getEagerQuery([user], User.query().client)

    assert.instanceOf(query, ManyToManyQueryBuilder)
    assert.instanceOf(eagerQuery, ManyToManyQueryBuilder)
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
      public skills: Skill[]
    }

    User.$boot()
    User.$getRelation('skills')!.boot()

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
      public skills: Skill[]
    }

    User.$boot()
    User.$getRelation('skills')!.boot()

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
      public skills: Skill[]
    }

    User.$boot()
    User.$getRelation('skills')!.boot()

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
      public skills: Skill[]
    }

    User.$boot()
    User.$getRelation('skills')!.boot()

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
      assert.equal(message, 'Cannot preload skills, value of User.id is undefined')
    }
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
      public skills: Skill[]
    }

    User.$boot()
    User.$getRelation('skills')!.boot()

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
      public skills: Skill[]
    }

    User.$boot()
    User.$getRelation('skills')!.boot()

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

    const users = await User.query().preload<'manyToMany'>('skills', (builder) => {
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

  test('select extra pivot columns at runtime using model instance', async (assert) => {
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
      public skills: Skill[]
    }

    User.$boot()
    User.$getRelation('skills')!.boot()

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

    const users = await User.query().orderBy('id', 'asc')

    await users[0].preload<'manyToMany'>('skills', (builder) => {
      builder.pivotColumns(['proficiency'])
    })

    await users[1].preload((preloader) => {
      preloader.preload<'manyToMany'>('skills', (builder) => {
        builder.pivotColumns(['proficiency'])
      })
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
})

test.group('ManyToMany Query Builder | where', (group) => {
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
      @column({ primary: true })
      public id: number
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @manyToMany(() => Skill)
      public skills: Skill[]
    }

    User.$boot()
    User.$getRelation('skills')!.boot()

    const connection = db.connection()
    const relation = User.$getRelation('skills')!
    const query = getManyToManyQueryBuilder(new User(), relation as ManyToMany, connection)
    query['$appliedConstraints'] = true

    const { sql, bindings } = query
      .wherePivot('username', 'virk')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.getWriteClient()!
      .from('skills')
      .where('skill_user.username', 'virk')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('add where wrapped clause', async (assert) => {
    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @manyToMany(() => Skill)
      public skills: Skill[]
    }

    User.$boot()
    User.$getRelation('skills')!.boot()

    const connection = db.connection()
    const relation = User.$getRelation('skills')!
    const query = getManyToManyQueryBuilder(new User(), relation as ManyToMany, connection)
    query['$appliedConstraints'] = true

    const { sql, bindings } = query
      .where((builder) => builder.wherePivot('username', 'virk'))
      ['toSQL']()

    const { sql: knexSql, bindings: knexBindings } = db.connection().getWriteClient()
      .from('skills')
      .where((builder) => builder.where('skill_user.username', 'virk'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('add where clause with operator', async (assert) => {
    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @manyToMany(() => Skill)
      public skills: Skill[]
    }

    User.$boot()
    User.$getRelation('skills')!.boot()

    const connection = db.connection()
    const relation = User.$getRelation('skills')!
    const query = getManyToManyQueryBuilder(new User(), relation as ManyToMany, connection)
    query['$appliedConstraints'] = true

    const { sql, bindings } = query
      .wherePivot('age', '>', 22)
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.connection().getWriteClient()
      .from('skills')
      .where('skill_user.age', '>', 22)
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('add where clause as a raw query', async (assert) => {
    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @manyToMany(() => Skill)
      public skills: Skill[]
    }

    User.$boot()
    User.$getRelation('skills')!.boot()

    const connection = db.connection()
    const relation = User.$getRelation('skills')!
    const query = getManyToManyQueryBuilder(new User(), relation as ManyToMany, connection)
    query['$appliedConstraints'] = true

    const { sql, bindings } = query
      .wherePivot('age', '>', db.raw('select min_age from ages limit 1;'))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.connection().getWriteClient()
      .from('skills')
      .where(
        'skill_user.age',
        '>',
        db.connection().getWriteClient().raw('select min_age from ages limit 1;'),
      )
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('add orWhere clause', async (assert) => {
    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @manyToMany(() => Skill)
      public skills: Skill[]
    }

    User.$boot()
    User.$getRelation('skills')!.boot()

    const connection = db.connection()
    const relation = User.$getRelation('skills')!
    const query = getManyToManyQueryBuilder(new User(), relation as ManyToMany, connection)
    query['$appliedConstraints'] = true

    const { sql, bindings } = query
      .wherePivot('age', '>', 22)
      .orWherePivot('age', 18)
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.connection().getWriteClient()
      .from('skills')
      .where('skill_user.age', '>', 22)
      .orWhere('skill_user.age', 18)
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('add orWhere wrapped clause', async (assert) => {
    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @manyToMany(() => Skill)
      public skills: Skill[]
    }

    User.$boot()
    User.$getRelation('skills')!.boot()

    const connection = db.connection()
    const relation = User.$getRelation('skills')!
    const query = getManyToManyQueryBuilder(new User(), relation as ManyToMany, connection)
    query['$appliedConstraints'] = true

    const { sql, bindings } = query
      .wherePivot('age', '>', 22)
      .orWhere((builder) => {
        builder.wherePivot('age', 18)
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.connection().getWriteClient()
      .from('skills')
      .where('skill_user.age', '>', 22)
      .orWhere((builder) => {
        builder.where('skill_user.age', 18)
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })
})

test.group('ManyToMany Query Builder | whereNot', (group) => {
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
      @column({ primary: true })
      public id: number
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @manyToMany(() => Skill)
      public skills: Skill[]
    }

    User.$boot()
    User.$getRelation('skills')!.boot()

    const connection = db.connection()
    const relation = User.$getRelation('skills')!
    const query = getManyToManyQueryBuilder(new User(), relation as ManyToMany, connection)
    query['$appliedConstraints'] = true

    const { sql, bindings } = query
      .whereNotPivot('username', 'virk')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.connection().getWriteClient()
      .from('skills')
      .whereNot('skill_user.username', 'virk')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('add where not clause with operator', async (assert) => {
    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @manyToMany(() => Skill)
      public skills: Skill[]
    }

    User.$boot()
    User.$getRelation('skills')!.boot()

    const connection = db.connection()
    const relation = User.$getRelation('skills')!
    const query = getManyToManyQueryBuilder(new User(), relation as ManyToMany, connection)
    query['$appliedConstraints'] = true

    const { sql, bindings } = query
      .whereNotPivot('age', '>', 22)
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.connection().getWriteClient()
      .from('skills')
      .whereNot('skill_user.age', '>', 22)
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('add where not clause as a raw query', async (assert) => {
    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @manyToMany(() => Skill)
      public skills: Skill[]
    }

    User.$boot()
    User.$getRelation('skills')!.boot()

    const connection = db.connection()
    const relation = User.$getRelation('skills')!
    const query = getManyToManyQueryBuilder(new User(), relation as ManyToMany, connection)
    query['$appliedConstraints'] = true

    const { sql, bindings } = query
      .whereNotPivot('age', '>', db.raw('select min_age from ages limit 1;'))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.connection().getWriteClient()
      .from('skills')
      .whereNot(
        'skill_user.age',
        '>',
        db.connection().getWriteClient().raw('select min_age from ages limit 1;'),
      )
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('add orWhereNot clause', async (assert) => {
    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @manyToMany(() => Skill)
      public skills: Skill[]
    }

    User.$boot()
    User.$getRelation('skills')!.boot()

    const connection = db.connection()
    const relation = User.$getRelation('skills')!
    const query = getManyToManyQueryBuilder(new User(), relation as ManyToMany, connection)
    query['$appliedConstraints'] = true

    const { sql, bindings } = query
      .whereNotPivot('age', '>', 22)
      .orWhereNotPivot('age', 18)
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.connection().getWriteClient()
      .from('skills')
      .whereNot('skill_user.age', '>', 22)
      .orWhereNot('skill_user.age', 18)
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })
})

test.group('ManyToMany Query Builder | whereIn', (group) => {
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
      @column({ primary: true })
      public id: number
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @manyToMany(() => Skill)
      public skills: Skill[]
    }

    User.$boot()
    User.$getRelation('skills')!.boot()

    const connection = db.connection()
    const relation = User.$getRelation('skills')!
    const query = getManyToManyQueryBuilder(new User(), relation as ManyToMany, connection)
    query['$appliedConstraints'] = true

    const { sql, bindings } = query
      .whereInPivot('username', ['virk', 'nikk'])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.connection().getWriteClient()
      .from('skills')
      .whereIn('skill_user.username', ['virk', 'nikk'])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('add whereIn as a query callback', async (assert) => {
    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @manyToMany(() => Skill)
      public skills: Skill[]
    }

    User.$boot()
    User.$getRelation('skills')!.boot()

    const connection = db.connection()
    const relation = User.$getRelation('skills')!
    const query = getManyToManyQueryBuilder(new User(), relation as ManyToMany, connection)
    query['$appliedConstraints'] = true

    const { sql, bindings } = query
      .whereInPivot('username', (builder) => {
        builder.from('accounts')
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.connection().getWriteClient()
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
      @column({ primary: true })
      public id: number
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @manyToMany(() => Skill)
      public skills: Skill[]
    }

    User.$boot()
    User.$getRelation('skills')!.boot()

    const connection = db.connection()
    const relation = User.$getRelation('skills')!
    const query = getManyToManyQueryBuilder(new User(), relation as ManyToMany, connection)
    query['$appliedConstraints'] = true

    const { sql, bindings } = query
      .whereInPivot('username', db.query().select('id').from('accounts'))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.connection().getWriteClient()
      .from('skills')
      .whereIn('skill_user.username', db.connection().getWriteClient().select('id').from('accounts'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('add whereIn as a rawquery', async (assert) => {
    const ref = db.connection().getWriteClient().ref.bind(db.connection().getWriteClient())

    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @manyToMany(() => Skill)
      public skills: Skill[]
    }

    User.$boot()
    User.$getRelation('skills')!.boot()

    const connection = db.connection()
    const relation = User.$getRelation('skills')!
    const query = getManyToManyQueryBuilder(new User(), relation as ManyToMany, connection)
    query['$appliedConstraints'] = true

    const { sql, bindings } = query
      .whereInPivot('username', [
        db.raw(`select ${ref('id')} from ${ref('accounts')}`),
      ])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.connection().getWriteClient()
      .from('skills')
      .whereIn('skill_user.username', [
        db.connection().getWriteClient().raw(`select ${ref('id')} from ${ref('accounts')}`),
      ])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('add whereIn as a subquery with array of keys', async (assert) => {
    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @manyToMany(() => Skill)
      public skills: Skill[]
    }

    User.$boot()
    User.$getRelation('skills')!.boot()

    const connection = db.connection()
    const relation = User.$getRelation('skills')!
    const query = getManyToManyQueryBuilder(new User(), relation as ManyToMany, connection)
    query['$appliedConstraints'] = true

    const { sql, bindings } = query
      .whereInPivot(
        ['username', 'email'],
        db.query().select('username', 'email').from('accounts'),
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.connection().getWriteClient()
      .from('skills')
      .whereIn(
        ['skill_user.username', 'skill_user.email'],
        db.connection().getWriteClient().select('username', 'email').from('accounts'),
      )
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('add whereIn as a 2d array', async (assert) => {
    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @manyToMany(() => Skill)
      public skills: Skill[]
    }

    User.$boot()
    User.$getRelation('skills')!.boot()

    const connection = db.connection()
    const relation = User.$getRelation('skills')!
    const query = getManyToManyQueryBuilder(new User(), relation as ManyToMany, connection)
    query['$appliedConstraints'] = true

    const { sql, bindings } = query
      .whereInPivot(['username', 'email'], [['foo', 'bar']])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.connection().getWriteClient()
      .from('skills')
      .whereIn(['skill_user.username', 'skill_user.email'], [['foo', 'bar']])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('add orWhereIn clause', async (assert) => {
    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @manyToMany(() => Skill)
      public skills: Skill[]
    }

    User.$boot()
    User.$getRelation('skills')!.boot()

    const connection = db.connection()
    const relation = User.$getRelation('skills')!
    const query = getManyToManyQueryBuilder(new User(), relation as ManyToMany, connection)
    query['$appliedConstraints'] = true

    const { sql, bindings } = query
      .whereInPivot('username', ['virk', 'nikk'])
      .orWhereInPivot('username', ['foo'])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.connection().getWriteClient()
      .from('skills')
      .whereIn('skill_user.username', ['virk', 'nikk'])
      .orWhereIn('skill_user.username', ['foo'])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('add orWhereIn as a query callback', async (assert) => {
    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @manyToMany(() => Skill)
      public skills: Skill[]
    }

    User.$boot()
    User.$getRelation('skills')!.boot()

    const connection = db.connection()
    const relation = User.$getRelation('skills')!
    const query = getManyToManyQueryBuilder(new User(), relation as ManyToMany, connection)
    query['$appliedConstraints'] = true

    const { sql, bindings } = query
      .whereInPivot('username', (builder) => {
        builder.from('accounts')
      })
      .orWhereInPivot('username', (builder) => {
        builder.from('employees')
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.connection().getWriteClient()
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

test.group('ManyToMany Query Builder | whereNotIn', (group) => {
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
      @column({ primary: true })
      public id: number
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @manyToMany(() => Skill)
      public skills: Skill[]
    }

    User.$boot()
    User.$getRelation('skills')!.boot()

    const connection = db.connection()
    const relation = User.$getRelation('skills')!
    const query = getManyToManyQueryBuilder(new User(), relation as ManyToMany, connection)
    query['$appliedConstraints'] = true

    const { sql, bindings } = query
      .whereNotInPivot('username', ['virk', 'nikk'])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.connection().getWriteClient()
      .from('skills')
      .whereNotIn('skill_user.username', ['virk', 'nikk'])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('add whereNotIn as a query callback', async (assert) => {
    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @manyToMany(() => Skill)
      public skills: Skill[]
    }

    User.$boot()
    User.$getRelation('skills')!.boot()

    const connection = db.connection()
    const relation = User.$getRelation('skills')!
    const query = getManyToManyQueryBuilder(new User(), relation as ManyToMany, connection)
    query['$appliedConstraints'] = true

    const { sql, bindings } = query
      .whereNotInPivot('username', (builder) => {
        builder.from('accounts')
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.connection().getWriteClient()
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
      @column({ primary: true })
      public id: number
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @manyToMany(() => Skill)
      public skills: Skill[]
    }

    User.$boot()
    User.$getRelation('skills')!.boot()

    const connection = db.connection()
    const relation = User.$getRelation('skills')!
    const query = getManyToManyQueryBuilder(new User(), relation as ManyToMany, connection)
    query['$appliedConstraints'] = true

    const { sql, bindings } = query
      .whereNotInPivot('username', db.query().select('username').from('accounts'))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.connection().getWriteClient()
      .from('skills')
      .whereNotIn(
        'skill_user.username',
        db.connection().getWriteClient().select('username').from('accounts'),
      )
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('add whereNotIn as a 2d array', async (assert) => {
    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @manyToMany(() => Skill)
      public skills: Skill[]
    }

    User.$boot()
    User.$getRelation('skills')!.boot()

    const connection = db.connection()
    const relation = User.$getRelation('skills')!
    const query = getManyToManyQueryBuilder(new User(), relation as ManyToMany, connection)
    query['$appliedConstraints'] = true

    const { sql, bindings } = query
      .whereNotInPivot(['username', 'email'], [['foo', 'bar']])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.connection().getWriteClient()
      .from('skills')
      .whereNotIn(['skill_user.username', 'skill_user.email'], [['foo', 'bar']])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('add orWhereNotIn clause', async (assert) => {
    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @manyToMany(() => Skill)
      public skills: Skill[]
    }

    User.$boot()
    User.$getRelation('skills')!.boot()

    const connection = db.connection()
    const relation = User.$getRelation('skills')!
    const query = getManyToManyQueryBuilder(new User(), relation as ManyToMany, connection)
    query['$appliedConstraints'] = true

    const { sql, bindings } = query
      .whereNotInPivot('username', ['virk', 'nikk'])
      .orWhereNotInPivot('username', ['foo'])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.connection().getWriteClient()
      .from('skills')
      .whereNotIn('skill_user.username', ['virk', 'nikk'])
      .orWhereNotIn('skill_user.username', ['foo'])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('add orWhereNotIn as a subquery', async (assert) => {
    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @manyToMany(() => Skill)
      public skills: Skill[]
    }

    User.$boot()
    User.$getRelation('skills')!.boot()

    const connection = db.connection()
    const relation = User.$getRelation('skills')!
    const query = getManyToManyQueryBuilder(new User(), relation as ManyToMany, connection)
    query['$appliedConstraints'] = true

    const { sql, bindings } = query
      .whereNotInPivot('username', (builder) => {
        builder.from('accounts')
      })
      .orWhereNotInPivot('username', (builder) => {
        builder.from('employees')
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.connection().getWriteClient()
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

test.group('Model | ManyToMany | fetch', (group) => {
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

  test('fetch using model instance', async (assert) => {
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
      public skills: Skill[]
    }

    User.$boot()
    User.$getRelation('skills')!.boot()

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

    const users = await User.query().firstOrFail()
    const skills = await users.related('skills')

    assert.lengthOf(skills, 2)

    assert.equal(skills[0].name, 'Programming')
    assert.equal(skills[0].$extras.pivot_user_id, 1)
    assert.equal(skills[0].$extras.pivot_skill_id, 1)

    assert.equal(skills[1].name, 'Dancing')
    assert.equal(skills[1].$extras.pivot_user_id, 1)
    assert.equal(skills[1].$extras.pivot_skill_id, 2)
  })

  test('fetch using parent model options', async (assert) => {
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
      public skills: Skill[]
    }

    User.$boot()
    User.$getRelation('skills')!.boot()

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

    const users = await User.query({ connection: 'secondary' }).firstOrFail()
    const skills = await users.related<'manyToMany', 'skills'>('skills')

    assert.lengthOf(skills, 2)

    assert.equal(skills[0].name, 'Programming')
    assert.equal(skills[0].$options!.connection, 'secondary')
    assert.equal(skills[0].$extras.pivot_user_id, 1)
    assert.equal(skills[0].$extras.pivot_skill_id, 1)

    assert.equal(skills[1].name, 'Dancing')
    assert.equal(skills[1].$options!.connection, 'secondary')
    assert.equal(skills[1].$extras.pivot_user_id, 1)
    assert.equal(skills[1].$extras.pivot_skill_id, 2)
  })
})

test.group('Model | ManyToMany | persist', (group) => {
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
      @column({ primary: true })
      public id: number

      @column()
      public name: string
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public username: string

      @manyToMany(() => Skill)
      public skills: Skill[]
    }

    const user = new User()
    user.username = 'virk'
    await user.save()

    const skill = new Skill()
    skill.name = 'Programming'

    await user.related('skills').save(skill)

    assert.isTrue(user.$persisted)
    assert.isTrue(skill.$persisted)

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

  test('attach duplicates when save is called twice', async (assert) => {
    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public name: string
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public username: string

      @manyToMany(() => Skill)
      public skills: Skill[]
    }

    const user = new User()
    user.username = 'virk'
    await user.save()

    const skill = new Skill()
    skill.name = 'Programming'

    await user.related('skills').save(skill)
    await user.related<'manyToMany', 'skills'>('skills').save(skill, true, false)

    assert.isTrue(user.$persisted)
    assert.isTrue(skill.$persisted)

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

  test('do not attach duplicates when checkExisting is true', async (assert) => {
    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public name: string
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public username: string

      @manyToMany(() => Skill)
      public skills: Skill[]
    }

    const user = new User()
    user.username = 'virk'
    await user.save()

    const skill = new Skill()
    skill.name = 'Programming'

    await user.related('skills').save(skill)
    await user.related<'manyToMany', 'skills'>('skills').save(skill)

    assert.isTrue(user.$persisted)
    assert.isTrue(skill.$persisted)

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

  test('attach when related pivot entry exists but for a different parent', async (assert) => {
    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public name: string
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public username: string

      @manyToMany(() => Skill)
      public skills: Skill[]
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
    await user1.related<'manyToMany', 'skills'>('skills').save(skill)

    assert.isTrue(user.$persisted)
    assert.isTrue(skill.$persisted)

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

  test('save many of related instance', async (assert) => {
    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public name: string
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public username: string

      @manyToMany(() => Skill)
      public skills: Skill[]
    }

    const user = new User()
    user.username = 'virk'
    await user.save()

    const skill = new Skill()
    skill.name = 'Programming'

    const skill1 = new Skill()
    skill1.name = 'Dancing'

    await user.related('skills').saveMany([skill, skill1])

    assert.isTrue(user.$persisted)
    assert.isTrue(skill.$persisted)
    assert.isTrue(skill1.$persisted)

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

  test('save many add duplicates when checkExisting is false', async (assert) => {
    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public name: string
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public username: string

      @manyToMany(() => Skill)
      public skills: Skill[]
    }

    const user = new User()
    user.username = 'virk'
    await user.save()

    const skill = new Skill()
    skill.name = 'Programming'

    const skill1 = new Skill()
    skill1.name = 'Dancing'

    await user.related('skills').save(skill)
    await user.related<'manyToMany', 'skills'>('skills').saveMany([skill, skill1], true, false)

    assert.isTrue(user.$persisted)
    assert.isTrue(skill.$persisted)
    assert.isTrue(skill1.$persisted)

    const totalUsers = await db.query().from('users').count('*', 'total')
    const totalSkills = await db.query().from('skills').count('*', 'total')
    const skillUsers = await db.query().from('skill_user')

    assert.equal(totalUsers[0].total, 1)
    assert.equal(totalSkills[0].total, 2)

    assert.lengthOf(skillUsers, 3)
    assert.equal(skillUsers[0].user_id, user.id)
    assert.equal(skillUsers[0].skill_id, skill.id)

    assert.equal(skillUsers[1].user_id, user.id)
    assert.equal(skillUsers[1].skill_id, skill.id)

    assert.equal(skillUsers[2].user_id, user.id)
    assert.equal(skillUsers[2].skill_id, skill1.id)

    assert.isUndefined(user.$trx)
    assert.isUndefined(skill.$trx)
    assert.isUndefined(skill1.$trx)
  })

  test('wrap calls inside transaction', async (assert) => {
    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public name: string
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public username: string

      @manyToMany(() => Skill)
      public skills: Skill[]
    }

    const user = new User()
    user.username = 'virk'

    const skill = new Skill()

    try {
      await user.related('skills').save(skill)
    } catch (error) {
      assert.exists(error)
    }

    const totalUsers = await db.query().from('users').count('*', 'total')
    const totalSkills = await db.query().from('skills').count('*', 'total')
    const skillUsers = await db.query().from('skill_user')

    assert.equal(totalUsers[0].total, 0)
    assert.equal(totalSkills[0].total, 0)
    assert.lengthOf(skillUsers, 0)
  })

  test('wrap calls inside transaction even when parent has been persisted', async (assert) => {
    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public name: string
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public username: string

      @manyToMany(() => Skill)
      public skills: Skill[]
    }

    const user = new User()
    user.username = 'virk'
    await user.save()

    const skill = new Skill()

    try {
      await user.related('skills').save(skill)
    } catch (error) {
      assert.exists(error)
    }

    const totalUsers = await db.query().from('users').count('*', 'total')
    const totalSkills = await db.query().from('skills').count('*', 'total')
    const skillUsers = await db.query().from('skill_user')

    assert.equal(totalUsers[0].total, 1)
    assert.equal(totalSkills[0].total, 0)
    assert.lengthOf(skillUsers, 0)
  })

  test('do not wrap calls inside transaction when wrapInTransaction=false', async (assert) => {
    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public name: string
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public username: string

      @manyToMany(() => Skill)
      public skills: Skill[]
    }

    const user = new User()
    user.username = 'virk'

    const skill = new Skill()

    try {
      await user.related('skills').save(skill, false)
    } catch (error) {
      assert.exists(error)
    }

    const totalUsers = await db.query().from('users').count('*', 'total')
    const totalSkills = await db.query().from('skills').count('*', 'total')
    const skillUsers = await db.query().from('skill_user')

    assert.equal(totalUsers[0].total, 1)
    assert.equal(totalSkills[0].total, 0)
    assert.lengthOf(skillUsers, 0)
  })

  test('wrap save many calls inside transaction', async (assert) => {
    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public name: string
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public username: string

      @manyToMany(() => Skill)
      public skills: Skill[]
    }

    const user = new User()
    user.username = 'virk'

    const skill = new Skill()
    skill.name = 'Programming'

    const skill1 = new Skill()

    try {
      await user.related('skills').saveMany([skill, skill1])
    } catch (error) {
      assert.exists(error)
    }

    const totalUsers = await db.query().from('users').count('*', 'total')
    const totalSkills = await db.query().from('skills').count('*', 'total')
    const skillUsers = await db.query().from('skill_user')

    assert.equal(totalUsers[0].total, 0)
    assert.equal(totalSkills[0].total, 0)
    assert.lengthOf(skillUsers, 0)
  })

  test('do not wrap save many calls inside transaction when wrapInTransaction=false', async (assert) => {
    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public name: string
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public username: string

      @manyToMany(() => Skill)
      public skills: Skill[]
    }

    const user = new User()
    user.username = 'virk'

    const skill = new Skill()
    skill.name = 'Programming'

    const skill1 = new Skill()

    try {
      await user.related('skills').saveMany([skill, skill1], false)
    } catch (error) {
      assert.exists(error)
    }

    const totalUsers = await db.query().from('users').count('*', 'total')
    const totalSkills = await db.query().from('skills').count('*', 'total')
    const skillUsers = await db.query().from('skill_user')

    assert.equal(totalUsers[0].total, 1)
    assert.equal(totalSkills[0].total, 1)
    assert.lengthOf(skillUsers, 0)
  })

  test('use parent model transaction when defined', async (assert) => {
    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public name: string
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public username: string

      @manyToMany(() => Skill)
      public skills: Skill[]
    }

    const trx = await db.transaction()

    const user = new User()
    user.$trx = trx
    user.username = 'virk'

    const skill = new Skill()
    skill.name = 'Programming'

    await user.related('skills').save(skill)
    await trx.rollback()

    const totalUsers = await db.query().from('users').count('*', 'total')
    const totalSkills = await db.query().from('skills').count('*', 'total')
    const skillUsers = await db.query().from('skill_user')

    assert.equal(totalUsers[0].total, 0)
    assert.equal(totalSkills[0].total, 0)
    assert.lengthOf(skillUsers, 0)
  })

  test('use parent model transaction when wrapInTransaction=false', async (assert) => {
    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public name: string
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public username: string

      @manyToMany(() => Skill)
      public skills: Skill[]
    }

    const trx = await db.transaction()

    const user = new User()
    user.$trx = trx
    user.username = 'virk'

    const skill = new Skill()
    skill.name = 'Programming'

    await user.related('skills').save(skill, false)
    await trx.rollback()

    const totalUsers = await db.query().from('users').count('*', 'total')
    const totalSkills = await db.query().from('skills').count('*', 'total')
    const skillUsers = await db.query().from('skill_user')

    assert.equal(totalUsers[0].total, 0)
    assert.equal(totalSkills[0].total, 0)
    assert.lengthOf(skillUsers, 0)
  })

  test('use parent model transaction with save many when defined', async (assert) => {
    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public name: string
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public username: string

      @manyToMany(() => Skill)
      public skills: Skill[]
    }

    const trx = await db.transaction()

    const user = new User()
    user.$trx = trx
    user.username = 'virk'

    const skill = new Skill()
    skill.name = 'Programming'

    const skill1 = new Skill()
    skill1.name = 'Dancy'

    await user.related('skills').saveMany([skill, skill1])
    await trx.rollback()

    const totalUsers = await db.query().from('users').count('*', 'total')
    const totalSkills = await db.query().from('skills').count('*', 'total')
    const skillUsers = await db.query().from('skill_user')

    assert.equal(totalUsers[0].total, 0)
    assert.equal(totalSkills[0].total, 0)
    assert.lengthOf(skillUsers, 0)
  })

  test('use parent model transaction with save many when wrapInTransaction=false', async (assert) => {
    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public name: string
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public username: string

      @manyToMany(() => Skill)
      public skills: Skill[]
    }

    const trx = await db.transaction()

    const user = new User()
    user.$trx = trx
    user.username = 'virk'

    const skill = new Skill()
    skill.name = 'Programming'

    const skill1 = new Skill()
    skill1.name = 'Dancing'

    await user.related('skills').saveMany([skill, skill1], false)
    await trx.rollback()

    const totalUsers = await db.query().from('users').count('*', 'total')
    const totalSkills = await db.query().from('skills').count('*', 'total')
    const skillUsers = await db.query().from('skill_user')

    assert.equal(totalUsers[0].total, 0)
    assert.equal(totalSkills[0].total, 0)
    assert.lengthOf(skillUsers, 0)
  })

  test('create save point when parent is already in transaction', async (assert) => {
    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public name: string
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public username: string

      @manyToMany(() => Skill)
      public skills: Skill[]
    }

    const trx = await db.transaction()

    const user = new User()
    user.$trx = trx
    user.username = 'virk'

    const skill = new Skill()

    try {
      await user.related('skills').save(skill)
    } catch (error) {
      assert.exists(error)
    }

    await trx.commit()

    const totalUsers = await db.query().from('users').count('*', 'total')
    const totalSkills = await db.query().from('skills').count('*', 'total')
    const skillUsers = await db.query().from('skill_user')

    assert.equal(totalUsers[0].total, 0)
    assert.equal(totalSkills[0].total, 0)
    assert.lengthOf(skillUsers, 0)
  })

  test('create save point with save many when parent is already in transaction', async (assert) => {
    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public name: string
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public username: string

      @manyToMany(() => Skill)
      public skills: Skill[]
    }

    const trx = await db.transaction()

    const user = new User()
    user.$trx = trx
    user.username = 'virk'

    const skill = new Skill()
    skill.name = 'Programming'

    const skill1 = new Skill()

    try {
      await user.related('skills').saveMany([skill, skill1])
    } catch (error) {
      assert.exists(error)
    }

    await trx.commit()

    const totalUsers = await db.query().from('users').count('*', 'total')
    const totalSkills = await db.query().from('skills').count('*', 'total')
    const skillUsers = await db.query().from('skill_user')

    assert.equal(totalUsers[0].total, 0)
    assert.equal(totalSkills[0].total, 0)
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

  test('attach pivot ids', async (assert) => {
    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public name: string
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public username: string

      @manyToMany(() => Skill)
      public skills: Skill[]
    }

    const user = new User()
    user.username = 'virk'
    await user.save()

    await user.related<'manyToMany', 'skills'>('skills').attach([1, 2])
    assert.isTrue(user.$persisted)

    const totalUsers = await db.query().from('users').count('*', 'total')
    const skillUsers = await db.query().from('skill_user')

    assert.equal(totalUsers[0].total, 1)

    assert.lengthOf(skillUsers, 2)
    assert.equal(skillUsers[0].user_id, user.id)
    assert.equal(skillUsers[0].skill_id, 1)
    assert.equal(skillUsers[1].user_id, user.id)
    assert.equal(skillUsers[1].skill_id, 2)

    assert.isUndefined(user.$trx)
  })

  test('attach pivot ids avoid duplicates', async (assert) => {
    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public name: string
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public username: string

      @manyToMany(() => Skill)
      public skills: Skill[]
    }

    const user = new User()
    user.username = 'virk'
    await user.save()

    await user.related<'manyToMany', 'skills'>('skills').attach([1, 1, 2])
    assert.isTrue(user.$persisted)

    const totalUsers = await db.query().from('users').count('*', 'total')
    const skillUsers = await db.query().from('skill_user')

    assert.equal(totalUsers[0].total, 1)

    assert.lengthOf(skillUsers, 2)
    assert.equal(skillUsers[0].user_id, user.id)
    assert.equal(skillUsers[0].skill_id, 1)
    assert.equal(skillUsers[1].user_id, user.id)
    assert.equal(skillUsers[1].skill_id, 2)

    assert.isUndefined(user.$trx)
  })

  test('fail attach when parent model has not been persisted', async (assert) => {
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

      @column()
      public username: string

      @manyToMany(() => Skill)
      public skills: Skill[]
    }

    const user = new User()
    user.username = 'virk'

    try {
      await user.related<'manyToMany', 'skills'>('skills').attach([1, 1, 2])
    } catch ({ message }) {
      assert.equal(message, 'Cannot attach skills, value of User.id is undefined')
    }
  })

  test('attach with extra data', async (assert) => {
    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public name: string
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public username: string

      @manyToMany(() => Skill)
      public skills: Skill[]
    }

    const user = new User()
    user.username = 'virk'
    await user.save()

    await user.related<'manyToMany', 'skills'>('skills').attach({
      1: { proficiency: 'Master' },
      2: { proficiency: 'Beginner' },
    })
    assert.isTrue(user.$persisted)

    const totalUsers = await db.query().from('users').count('*', 'total')
    const skillUsers = await db.query().from('skill_user')

    assert.equal(totalUsers[0].total, 1)

    assert.lengthOf(skillUsers, 2)
    assert.equal(skillUsers[0].user_id, user.id)
    assert.equal(skillUsers[0].skill_id, 1)
    assert.equal(skillUsers[0].proficiency, 'Master')

    assert.equal(skillUsers[1].user_id, user.id)
    assert.equal(skillUsers[1].skill_id, 2)
    assert.equal(skillUsers[1].proficiency, 'Beginner')

    assert.isUndefined(user.$trx)
  })
})

test.group('Model | ManyToMany | bulk operation', (group) => {
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

  test('generate correct sql for deleting related rows', async (assert) => {
    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public name: string
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public username: string

      @manyToMany(() => Skill)
      public skills: Skill[]
    }

    await db.table('users').insert({ username: 'virk' })

    const user = await User.find(1)
    const { sql, bindings } = user!.related('skills').del().toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.connection()
      .getWriteClient()
      .from('skill_user')
      .where('skill_user.user_id', 1)
      .del()
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('generate correct sql for updating related rows', async (assert) => {
    class Skill extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public name: string
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public username: string

      @manyToMany(() => Skill)
      public skills: Skill[]
    }

    await db.table('users').insert({ username: 'virk' })

    const user = await User.find(1)
    const { sql, bindings } = user!.related('skills').update({ proficiency: 'Master' }).toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.connection()
      .getWriteClient()
      .from('skill_user')
      .where('skill_user.user_id', 1)
      .update({ proficiency: 'Master' })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })
})
