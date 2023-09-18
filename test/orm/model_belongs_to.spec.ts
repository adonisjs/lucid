/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import type { BelongsTo } from '../../adonis-typings/relations.js'
import { scope } from '../../src/orm/base_model/index.js'

import { column, belongsTo } from '../../src/orm/decorators/index.js'
import { BelongsToQueryBuilder } from '../../src/orm/relations/belongs_to/query_builder.js'
import {
  ormAdapter,
  getBaseModel,
  setup,
  cleanup,
  resetTables,
  getDb,
} from '../../test-helpers/index.js'
import { AppFactory } from '@adonisjs/core/factories/app'

test.group('Model | BelongsTo | Options', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  test('raise error when localKey is missing', async ({ fs, assert }) => {
    assert.plan(1)

    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    try {
      class User extends BaseModel {}
      User.boot()

      class Profile extends BaseModel {
        @belongsTo(() => User)
        declare user: BelongsTo<typeof User>
      }

      Profile.boot()
      Profile.$getRelation('user')!.boot()
    } catch ({ message }) {
      assert.equal(message, '"Profile.user" expects "id" to exist on "User" model, but is missing')
    }
  })

  test('raise error when foreignKey is missing', async ({ fs, assert }) => {
    assert.plan(1)

    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    try {
      class User extends BaseModel {
        @column({ isPrimary: true })
        declare id: number
      }

      User.boot()

      class Profile extends BaseModel {
        @belongsTo(() => User)
        declare user: BelongsTo<typeof User>
      }

      Profile.boot()
      Profile.$getRelation('user')!.boot()
    } catch ({ message }) {
      assert.equal(
        message,
        '"Profile.user" expects "userId" to exist on "Profile" model, but is missing'
      )
    }
  })

  test('use primary key is as the local key', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number
    }

    class Profile extends BaseModel {
      @column()
      declare userId: number

      @belongsTo(() => User)
      declare user: BelongsTo<typeof User>
    }

    Profile.$getRelation('user')!.boot()

    assert.equal(Profile.$getRelation('user')!['localKey'], 'id')
  })

  test('use custom defined local key', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column({ columnName: 'user_uid' })
      declare uid: number
    }

    class Profile extends BaseModel {
      @column()
      declare userId: number

      @belongsTo(() => User, { localKey: 'uid' })
      declare user: BelongsTo<typeof User>
    }

    Profile.$getRelation('user')!.boot()

    assert.equal(Profile.$getRelation('user')!['localKey'], 'uid')
  })

  test('compute foreign key from model name and primary key', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number
    }

    class Profile extends BaseModel {
      @column()
      declare userId: number

      @belongsTo(() => User)
      declare user: BelongsTo<typeof User>
    }

    Profile.$getRelation('user')!.boot()

    assert.equal(Profile.$getRelation('user')['foreignKey'], 'userId')
  })

  test('use pre defined foreign key', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number
    }

    class Profile extends BaseModel {
      @column({ columnName: 'user_id' })
      declare userUid: number

      @belongsTo(() => User, { foreignKey: 'userUid' })
      declare user: BelongsTo<typeof User>
    }

    Profile.$getRelation('user')!.boot()

    assert.equal(Profile.$getRelation('user')!['foreignKey'], 'userUid')
  })

  test('clone relationship instance with options', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number
    }

    class BaseProfile extends BaseModel {
      @column({ columnName: 'user_id' })
      declare userUid: number

      @belongsTo(() => User, { foreignKey: 'userUid' })
      declare user: BelongsTo<typeof User>
    }

    class Profile extends BaseProfile {}
    Profile.boot()

    Profile.$getRelation('user')!.boot()

    assert.deepEqual(Profile.$getRelation('user')!.relatedModel(), User)
    assert.deepEqual(Profile.$getRelation('user')!.model, Profile)
    assert.equal(Profile.$getRelation('user')!['foreignKey'], 'userUid')
  })
})

test.group('Model | BelongsTo | Set Relations', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  test('set related model instance', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number
    }

    class Profile extends BaseModel {
      @column()
      declare userId: number

      @belongsTo(() => User)
      declare user: BelongsTo<typeof User>
    }

    Profile.$getRelation('user')!.boot()

    const user = new User()
    user.fill({ id: 1 })

    const profile = new Profile()
    profile.fill({ userId: 1 })

    Profile.$getRelation('user')!.setRelated(profile, user)
    assert.deepEqual(profile.user, user)
  })

  test('push related model instance', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number
    }

    class Profile extends BaseModel {
      @column()
      declare userId: number

      @belongsTo(() => User)
      declare user: BelongsTo<typeof User>
    }

    Profile.$getRelation('user')!.boot()

    const profile = new Profile()

    const user = new User()

    const user1 = new User()

    profile.fill({ userId: 1 })
    user.fill({ id: 1 })
    Profile.$getRelation('user')!.setRelated(profile, user)

    profile.fill({ userId: 2 })
    user1.fill({ id: 2 })
    Profile.$getRelation('user')!.pushRelated(profile, user1)

    assert.deepEqual(profile.user, user1)
  })

  test('set many of related instances', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number
    }

    class Profile extends BaseModel {
      @column()
      declare userId: number

      @belongsTo(() => User)
      declare user: BelongsTo<typeof User>
    }

    Profile.$getRelation('user')!.boot()

    const profile = new Profile()
    profile.fill({ userId: 1 })

    const profile1 = new Profile()
    profile1.fill({ userId: 2 })

    const profile2 = new Profile()

    const user = new User()
    user.fill({ id: 1 })

    const user1 = new User()
    user1.fill({ id: 2 })

    Profile.$getRelation('user')!.setRelatedForMany([profile, profile1, profile2], [user, user1])

    assert.deepEqual(profile.user, user)
    assert.deepEqual(profile1.user, user1)
    assert.isNull(profile2.user)
  })
})

test.group('Model | BelongsTo | bulk operations', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('generate correct sql for selecting related rows', async ({ assert, fs }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number
    }

    class Profile extends BaseModel {
      @column()
      declare userId: number

      @belongsTo(() => User)
      declare user: BelongsTo<typeof User>
    }

    await db.table('profiles').insert({ user_id: 4, display_name: 'Hvirk' })

    const profile = await Profile.find(1)
    const { sql, bindings } = profile!.related('user').query().toSQL()

    const { sql: knexSql, bindings: knexBindings } = db
      .connection()
      .getWriteClient()
      .from('users')
      .where('id', 4)
      .limit(1)
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('generate correct sql for selecting many related rows', async ({ assert, fs }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number
    }

    class Profile extends BaseModel {
      @column()
      declare userId: number

      @belongsTo(() => User)
      declare user: BelongsTo<typeof User>
    }

    await db.table('profiles').multiInsert([
      { display_name: 'virk', user_id: 2 },
      { display_name: 'nikk', user_id: 3 },
    ])

    const profiles = await Profile.all()
    Profile.$getRelation('user')!.boot()

    const query = Profile.$getRelation('user')!.eagerQuery(profiles, db.connection())
    const { sql, bindings } = query.toSQL()

    const { sql: knexSql, bindings: knexBindings } = db
      .connection()
      .getWriteClient()
      .from('users')
      .whereIn('id', [3, 2])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('generate correct sql for updating related row', async ({ assert, fs }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number
    }

    class Profile extends BaseModel {
      @column()
      declare userId: number

      @belongsTo(() => User)
      declare user: BelongsTo<typeof User>
    }

    await db.table('profiles').insert({ user_id: 2, display_name: 'virk' })

    const profile = await Profile.find(1)
    const { sql, bindings } = profile!
      .related('user')
      .query()
      .update({
        display_name: 'nikk',
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = db
      .connection()
      .getWriteClient()
      .from('users')
      .where('id', 2)
      .update({ display_name: 'nikk' })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('generate correct sql for deleting related row', async ({ assert, fs }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number
    }

    class Profile extends BaseModel {
      @column()
      declare userId: number

      @belongsTo(() => User)
      declare user: BelongsTo<typeof User>
    }

    await db.table('profiles').insert({ user_id: 2, display_name: 'virk' })

    const profile = await Profile.find(1)
    const { sql, bindings } = profile!.related('user').query().del().toSQL()

    const { sql: knexSql, bindings: knexBindings } = db
      .connection()
      .getWriteClient()
      .from('users')
      .where('id', 2)
      .del()
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })
})

test.group('Model | BelongsTo | sub queries', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('generate correct sub query for selecting rows', async ({ assert, fs }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class Profile extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare displayName: string

      @belongsTo(() => User)
      declare user: BelongsTo<typeof User>
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string
    }

    Profile.boot()
    Profile.$getRelation('user')!.boot()

    const { sql, bindings } = Profile.$getRelation('user')!.subQuery(db.connection()).toSQL()
    const { sql: knexSql, bindings: knexBindings } = db
      .connection()
      .knexQuery()
      .from('users')
      .where('users.id', '=', db.connection().getReadClient().ref('profiles.user_id'))
      .toSQL()

    assert.deepEqual(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('create aggregate query', async ({ assert, fs }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class Profile extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare displayName: string

      @belongsTo(() => User)
      declare user: BelongsTo<typeof User>
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string
    }

    Profile.boot()
    Profile.$getRelation('user')!.boot()

    const { sql, bindings } = Profile.$getRelation('user')!
      .subQuery(db.connection())
      .count('* as total')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = db
      .connection()
      .knexQuery()
      .from('users')
      .count('* as total')
      .where('users.id', '=', db.connection().getReadClient().ref('profiles.user_id'))
      .toSQL()

    assert.deepEqual(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('allow selecting custom columns', async ({ assert, fs }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class Profile extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare displayName: string

      @belongsTo(() => User)
      declare user: BelongsTo<typeof User>
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string
    }

    Profile.boot()
    Profile.$getRelation('user')!.boot()

    const { sql, bindings } = Profile.$getRelation('user')!
      .subQuery(db.connection())
      .select('title', 'is_published')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = db
      .connection()
      .knexQuery()
      .from('users')
      .select('title', 'is_published')
      .where('users.id', '=', db.connection().getReadClient().ref('profiles.user_id'))
      .toSQL()

    assert.deepEqual(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('generate correct self relationship subquery', async ({ assert, fs }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare username: string

      @belongsTo(() => User)
      declare child: BelongsTo<typeof User>
    }

    User.boot()
    User.$getRelation('child')!.boot()

    const { sql, bindings } = User.$getRelation('child')!
      .subQuery(db.connection())
      .select('email')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = db
      .connection()
      .knexQuery()
      .from('users as adonis_temp_0')
      .select('email')
      .where('adonis_temp_0.id', '=', db.connection().getReadClient().ref('users.user_id'))
      .toSQL()

    assert.deepEqual(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('raise exception when trying to execute the query', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class Profile extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare displayName: string

      @belongsTo(() => User)
      declare user: BelongsTo<typeof User>
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string
    }

    Profile.boot()
    Profile.$getRelation('user')!.boot()

    const exec = () => Profile.$getRelation('user')!.subQuery(db.connection())['exec']()
    const paginate = () => Profile.$getRelation('user')!.subQuery(db.connection())['paginate'](1)
    const update = () => Profile.$getRelation('user')!.subQuery(db.connection())['update']({})
    const del = () => Profile.$getRelation('user')!.subQuery(db.connection())['del']()
    const first = () => Profile.$getRelation('user')!.subQuery(db.connection())['first']()
    const firstOrFail = () =>
      Profile.$getRelation('user')!.subQuery(db.connection())['firstOrFail']()

    assert.throws(exec, 'Cannot execute relationship subqueries')
    assert.throws(paginate, 'Cannot execute relationship subqueries')
    assert.throws(update, 'Cannot execute relationship subqueries')
    assert.throws(del, 'Cannot execute relationship subqueries')
    assert.throws(first, 'Cannot execute relationship subqueries')
    assert.throws(firstOrFail, 'Cannot execute relationship subqueries')
  })

  test('run onQuery method when defined', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class Profile extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare displayName: string

      @belongsTo(() => User, {
        onQuery: (query) => query.where('isActive', false),
      })
      declare user: BelongsTo<typeof User>
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare isActive: boolean

      @column()
      declare username: string
    }

    Profile.boot()
    Profile.$getRelation('user')!.boot()

    const { sql, bindings } = Profile.$getRelation('user')!.subQuery(db.connection()).toSQL()
    const { sql: knexSql, bindings: knexBindings } = db
      .connection()
      .knexQuery()
      .from('users')
      .where((subquery) => subquery.where('is_active', false))
      .where((subquery) =>
        subquery.where('users.id', '=', db.connection().getReadClient().ref('profiles.user_id'))
      )
      .toSQL()

    assert.deepEqual(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })
})

test.group('Model | BelongsTo | preload', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('preload relationship', async ({ assert, fs }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number
    }

    class Profile extends BaseModel {
      @column()
      declare userId: number

      @belongsTo(() => User)
      declare user: BelongsTo<typeof User>
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    await db.insertQuery().table('profiles').insert({ display_name: 'Hvirk', user_id: 1 })

    Profile.boot()

    const profiles = await Profile.query().preload('user')
    assert.lengthOf(profiles, 1)

    assert.equal(profiles[0].user.id, profiles[0].userId)
  })

  test('set property value to null when no preload rows were found', async ({ assert, fs }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number
    }

    class Profile extends BaseModel {
      @column()
      declare userId: number

      @belongsTo(() => User)
      declare user: BelongsTo<typeof User>
    }

    await db.insertQuery().table('profiles').insert({ display_name: 'Hvirk', user_id: null })

    Profile.boot()

    const profiles = await Profile.query().preload('user')
    assert.lengthOf(profiles, 1)

    assert.isNull(profiles[0].user)
  })

  test('set value to null when serializing', async ({ assert, fs }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number
    }

    class Profile extends BaseModel {
      @column()
      declare userId: number

      @belongsTo(() => User)
      declare user: BelongsTo<typeof User>
    }

    await db.insertQuery().table('profiles').insert({ display_name: 'Hvirk', user_id: null })

    Profile.boot()

    const profiles = await Profile.query().preload('user')
    assert.lengthOf(profiles, 1)

    assert.isNull(profiles[0].toJSON().user)
  })

  test('preload relationship for many rows', async ({ assert, fs }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number
    }

    class Profile extends BaseModel {
      @column()
      declare userId: number

      @belongsTo(() => User)
      declare user: BelongsTo<typeof User>
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    await db
      .insertQuery()
      .table('profiles')
      .insert([
        {
          user_id: 1,
          display_name: 'Hvirk',
        },
        {
          user_id: 1,
          display_name: 'Nikk',
        },
      ])

    Profile.boot()
    const profiles = await Profile.query().preload('user')

    assert.lengthOf(profiles, 2)
    assert.equal(profiles[0].user.id, profiles[0].userId)
    assert.equal(profiles[1].user.id, profiles[1].userId)
  })

  test('add runtime constraints to related query', async ({ assert, fs }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number
    }

    class Profile extends BaseModel {
      @column()
      declare userId: number

      @belongsTo(() => User)
      declare user: BelongsTo<typeof User>
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    await db
      .insertQuery()
      .table('profiles')
      .insert([
        {
          user_id: 1,
          display_name: 'Hvirk',
        },
        {
          user_id: 1,
          display_name: 'Nikk',
        },
      ])

    Profile.boot()
    const profiles = await Profile.query().preload('user', (builder) =>
      builder.where('username', 'foo')
    )

    assert.lengthOf(profiles, 2)
    assert.isNull(profiles[0].user)
    assert.isNull(profiles[1].user)
  })

  test('cherry pick columns during preload', async ({ assert, fs }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string
    }

    class Profile extends BaseModel {
      @column()
      declare userId: number

      @belongsTo(() => User)
      declare user: BelongsTo<typeof User>
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    await db
      .insertQuery()
      .table('profiles')
      .insert([
        {
          user_id: 1,
          display_name: 'Hvirk',
        },
        {
          user_id: 1,
          display_name: 'Nikk',
        },
      ])

    Profile.boot()

    const profiles = await Profile.query().preload('user', (builder) => {
      return builder.select('username')
    })

    assert.lengthOf(profiles, 2)
    assert.deepEqual(profiles[0].user.$extras, {})
    assert.deepEqual(profiles[1].user.$extras, {})
  })

  test('do not repeat fk when already defined', async ({ assert, fs }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string
    }

    class Profile extends BaseModel {
      @column()
      declare userId: number

      @belongsTo(() => User)
      declare user: BelongsTo<typeof User>
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    await db
      .insertQuery()
      .table('profiles')
      .insert([
        {
          user_id: 1,
          display_name: 'Hvirk',
        },
        {
          user_id: 1,
          display_name: 'Nikk',
        },
      ])

    Profile.boot()

    const profiles = await Profile.query().preload('user', (builder) => {
      return builder.select('username', 'id')
    })

    assert.lengthOf(profiles, 2)
    assert.deepEqual(profiles[0].user.$extras, {})
    assert.deepEqual(profiles[1].user.$extras, {})
  })

  test('raise exception when local key is not selected', async ({ assert, fs }) => {
    assert.plan(1)

    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string
    }

    class Profile extends BaseModel {
      @column()
      declare userId: number

      @belongsTo(() => User)
      declare user: BelongsTo<typeof User>
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    await db
      .insertQuery()
      .table('profiles')
      .insert([
        {
          user_id: 1,
          display_name: 'Hvirk',
        },
        {
          user_id: 1,
          display_name: 'Nikk',
        },
      ])

    Profile.boot()

    try {
      await Profile.query().select('display_name').preload('user')
    } catch ({ message }) {
      assert.equal(
        message,
        [
          'Cannot preload "user", value of "Profile.userId" is undefined.',
          'Make sure to set "null" as the default value for foreign keys',
        ].join(' ')
      )
    }
  })

  test('preload using model instance', async ({ assert, fs }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number
    }

    class Profile extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare displayName: string

      @belongsTo(() => User)
      declare user: BelongsTo<typeof User>
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }])

    const users = await db.query().from('users')
    await db
      .insertQuery()
      .table('profiles')
      .insert([
        {
          user_id: users[0].id,
          display_name: 'virk',
        },
        {
          user_id: users[0].id,
          display_name: 'virk',
        },
      ])

    const profile = await Profile.findOrFail(1)
    await profile.load('user')

    assert.instanceOf(profile.user, User)
    assert.equal(profile.user.id, profile.userId)
  })

  test('preload nested relations', async ({ assert, fs }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number
    }

    class Profile extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare displayName: string

      @belongsTo(() => User)
      declare user: BelongsTo<typeof User>
    }

    class Identity extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare profileId: number

      @column()
      declare identityName: string

      @belongsTo(() => Profile)
      declare profile: BelongsTo<typeof Profile>
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }, { username: 'nikk' }])
    await db
      .insertQuery()
      .table('profiles')
      .insert([
        {
          user_id: 1,
          display_name: 'virk',
        },
        {
          user_id: 2,
          display_name: 'nikk',
        },
      ])

    await db
      .insertQuery()
      .table('identities')
      .insert([
        {
          profile_id: 1,
          identity_name: 'virk',
        },
        {
          profile_id: 2,
          identity_name: 'nikk',
        },
      ])

    const identity = await Identity.query()
      .preload('profile', (builder) => builder.preload('user'))
      .where('identity_name', 'virk')
      .first()

    assert.instanceOf(identity!.profile, Profile)
    assert.instanceOf(identity!.profile!.user, User)
  })

  test('preload nested relations using model instance', async ({ assert, fs }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number
    }

    class Profile extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare displayName: string

      @belongsTo(() => User)
      declare user: BelongsTo<typeof User>
    }

    class Identity extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare profileId: number

      @column()
      declare identityName: string

      @belongsTo(() => Profile)
      declare profile: BelongsTo<typeof Profile>
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }, { username: 'nikk' }])
    await db
      .insertQuery()
      .table('profiles')
      .insert([
        {
          user_id: 1,
          display_name: 'virk',
        },
        {
          user_id: 2,
          display_name: 'nikk',
        },
      ])

    await db
      .insertQuery()
      .table('identities')
      .insert([
        {
          profile_id: 1,
          identity_name: 'virk',
        },
        {
          profile_id: 2,
          identity_name: 'nikk',
        },
      ])

    const identity = await Identity.query().firstOrFail()
    await identity.load((preloader) => {
      preloader.load('profile', (builder) => builder.preload('user'))
    })

    assert.instanceOf(identity!.profile, Profile)
    assert.instanceOf(identity!.profile!.user, User)
  })

  test('pass main query options down the chain', async ({ assert, fs }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number
    }

    class Profile extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare displayName: string

      @belongsTo(() => User)
      declare user: BelongsTo<typeof User>
    }

    class Identity extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare profileId: number

      @column()
      declare identityName: string

      @belongsTo(() => Profile)
      declare profile: BelongsTo<typeof Profile>
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }, { username: 'nikk' }])
    await db
      .insertQuery()
      .table('profiles')
      .insert([
        {
          user_id: 1,
          display_name: 'virk',
        },
        {
          user_id: 2,
          display_name: 'nikk',
        },
      ])

    await db
      .insertQuery()
      .table('identities')
      .insert([
        {
          profile_id: 1,
          identity_name: 'virk',
        },
        {
          profile_id: 2,
          identity_name: 'nikk',
        },
      ])

    const query = Identity.query({ connection: 'secondary' })
      .preload('profile', (builder) => builder.preload('user'))
      .where('identity_name', 'virk')

    const identity = await query.first()
    assert.instanceOf(identity!.profile, Profile)
    assert.instanceOf(identity!.profile!.user, User)

    assert.equal(identity!.$options!.connection, 'secondary')
    assert.equal(identity!.profile.$options!.connection, 'secondary')
    assert.equal(identity!.profile.user.$options!.connection, 'secondary')
  })
  test('work fine when foreign key is null', async ({ assert, fs }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number
    }

    class Profile extends BaseModel {
      @column()
      declare userId: number

      @belongsTo(() => User)
      declare user: BelongsTo<typeof User>
    }

    await db.insertQuery().table('profiles').insert({ display_name: 'Hvirk', user_id: null })

    Profile.boot()

    const profiles = await Profile.query().preload('user')
    assert.lengthOf(profiles, 1)

    assert.isNull(profiles[0].user)
  })

  test('work fine during lazy load when foreign key is null', async ({ assert, fs }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number
    }

    class Profile extends BaseModel {
      @column()
      declare userId: number

      @belongsTo(() => User)
      declare user: BelongsTo<typeof User>
    }

    await db.insertQuery().table('profiles').insert({ display_name: 'Hvirk', user_id: null })

    Profile.boot()

    const profiles = await Profile.query()
    assert.lengthOf(profiles, 1)
    await profiles[0].load('user')

    assert.isNull(profiles[0].user)
  })

  test('do not run preload query when parent rows are empty', async ({ assert, fs }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number
    }

    class Profile extends BaseModel {
      @column()
      declare userId: number

      @belongsTo(() => User)
      declare user: BelongsTo<typeof User>
    }

    Profile.boot()

    const profiles = await Profile.query().preload('user', () => {
      throw new Error('not expected to be here')
    })
    assert.lengthOf(profiles, 0)
  })
})

test.group('Model | BelongsTo | withCount', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('get count of a relationship rows', async ({ assert, fs }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number
    }

    class Profile extends BaseModel {
      @column()
      declare userId: number

      @belongsTo(() => User)
      declare user: BelongsTo<typeof User>
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    await db.insertQuery().table('profiles').insert({ display_name: 'Hvirk', user_id: 1 })

    Profile.boot()

    const profiles = await Profile.query().withCount('user')

    assert.lengthOf(profiles, 1)
    assert.equal(profiles[0].$extras.user_count, 1)
  })

  test('allow cherry picking columns', async ({ assert, fs }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number
    }

    class Profile extends BaseModel {
      @column()
      declare userId: number

      @column()
      declare displayName: string

      @belongsTo(() => User)
      declare user: BelongsTo<typeof User>
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    await db.insertQuery().table('profiles').insert({ display_name: 'Hvirk', user_id: 1 })

    Profile.boot()

    const profiles = await Profile.query().select('displayName').withCount('user')

    assert.lengthOf(profiles, 1)
    assert.deepEqual(profiles[0].$attributes, { displayName: 'Hvirk' })
  })

  test('lazy load relationship row', async ({ assert, fs }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number
    }

    class Profile extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @belongsTo(() => User)
      declare user: BelongsTo<typeof User>
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    await db.insertQuery().table('profiles').insert({ display_name: 'Hvirk', user_id: 1 })

    Profile.boot()

    const profile = await Profile.query().firstOrFail()
    await profile.loadCount('user')

    assert.equal(profile.$extras.user_count, 1)
  })
})

test.group('Model | BelongsTo | has', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('limit rows to the existance of relationship', async ({ assert, fs }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number
    }

    class Profile extends BaseModel {
      @column()
      declare userId: number

      @belongsTo(() => User)
      declare user: BelongsTo<typeof User>
    }

    await db
      .insertQuery()
      .table('users')
      .multiInsert([{ username: 'virk' }, { username: 'nikk' }])

    await db
      .insertQuery()
      .table('profiles')
      .multiInsert([{ display_name: 'Virk', user_id: 1 }])

    Profile.boot()

    const profiles = await Profile.query().has('user')
    assert.lengthOf(profiles, 1)
  })
})

test.group('Model | BelongsTo | whereHas', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('limit rows to the existance of relationship', async ({ assert, fs }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number
    }

    class Profile extends BaseModel {
      @column()
      declare userId: number

      @column()
      declare displayName: string

      @belongsTo(() => User)
      declare user: BelongsTo<typeof User>
    }

    await db
      .insertQuery()
      .table('users')
      .multiInsert([
        { username: 'virk', points: 10 },
        { username: 'nikk', points: 20 },
      ])

    await db
      .insertQuery()
      .table('profiles')
      .multiInsert([
        { display_name: 'Virk', user_id: 1 },
        { display_name: 'Nikk', user_id: 2 },
      ])

    Profile.boot()

    const profiles = await Profile.query().whereHas(
      'user',
      (query) => {
        query.sum('points')
      },
      '>',
      15
    )

    assert.lengthOf(profiles, 1)
    assert.equal(profiles[0].displayName, 'Nikk')
  })
})

test.group('Model | BelongsTo | associate', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('associate related instance', async ({ assert, fs }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string
    }

    class Profile extends BaseModel {
      @column()
      declare userId: number

      @column()
      declare displayName: string

      @belongsTo(() => User)
      declare user: BelongsTo<typeof User>
    }

    const user = new User()
    user.username = 'virk'

    const profile = new Profile()
    profile.displayName = 'Hvirk'

    await profile.related('user').associate(user)

    assert.isTrue(profile.$isPersisted)
    assert.equal(user.id, profile.userId)

    const profiles = await db.query().from('profiles')
    assert.lengthOf(profiles, 1)
    assert.equal(profiles[0].user_id, user.id)
  })

  test('wrap associate call inside transaction', async ({ assert, fs }) => {
    assert.plan(3)

    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string
    }

    class Profile extends BaseModel {
      @column()
      declare userId: number

      @column()
      declare displayName: string

      @belongsTo(() => User)
      declare user: BelongsTo<typeof User>
    }

    const user = new User()
    user.username = 'virk'

    const profile = new Profile()

    try {
      await profile.related('user').associate(user)
    } catch (error) {
      assert.exists(error)
    }

    const profiles = await db.query().from('profiles')
    const users = await db.query().from('users')
    assert.lengthOf(profiles, 0)
    assert.lengthOf(users, 0)
  })
})

test.group('Model | BelongsTo | dissociate', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('dissociate relation', async ({ assert, fs }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string
    }

    class Profile extends BaseModel {
      @column()
      declare id: number

      @column()
      declare userId: number

      @column()
      declare displayName: string

      @belongsTo(() => User)
      declare user: BelongsTo<typeof User>
    }

    const [row] = await db
      .insertQuery<{ id: number }>()
      .table('users')
      .insert({ username: 'virk' })
      .returning('id')

    await db.insertQuery().table('profiles').insert({ display_name: 'Hvirk', user_id: row.id })

    const profile = await Profile.query().first()
    await profile!.related('user').dissociate()

    assert.isTrue(profile!.$isPersisted)
    assert.isNull(profile!.userId)

    const profiles = await db.query().from('profiles')
    assert.lengthOf(profiles, 1)
    assert.isNull(profiles[0].user_id)
  })
})

test.group('Model | BelongsTo | bulk operations', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('disallow pagination', async ({ assert, fs }) => {
    assert.plan(1)

    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number
    }

    class Profile extends BaseModel {
      @column()
      declare userId: number

      @belongsTo(() => User)
      declare user: BelongsTo<typeof User>
    }

    await db.table('profiles').insert({ user_id: 4, display_name: 'Hvirk' })

    const profile = await Profile.find(1)
    try {
      await profile!.related('user').query().paginate(1)
    } catch ({ message }) {
      assert.equal(message, 'Cannot paginate a belongsTo relationship "(user)"')
    }
  })
})

test.group('Model | BelongsTo | clone', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('clone related query builder', async ({ assert, fs }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string
    }
    User.boot()

    class Profile extends BaseModel {
      @column()
      declare userId: number

      @column()
      declare displayName: string

      @belongsTo(() => User)
      declare user: BelongsTo<typeof User>
    }
    Profile.boot()

    await db.insertQuery().table('users').insert({ username: 'virk' })
    await db.insertQuery().table('profiles').insert({ display_name: 'Hvirk', user_id: 1 })

    const profile = await Profile.findOrFail(1)

    const clonedQuery = profile.related('user').query().clone()
    assert.instanceOf(clonedQuery, BelongsToQueryBuilder)
  })
})

test.group('Model | BelongsTo | scopes', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('apply scopes during eagerload', async ({ assert, fs }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      static fromCountry = scope((query, countryId) => {
        query.where('country_id', countryId)
      })
    }
    User.boot()

    class Profile extends BaseModel {
      @column()
      declare userId: number

      @column()
      declare displayName: string

      @belongsTo(() => User)
      declare user: BelongsTo<typeof User>
    }
    Profile.boot()

    await db.insertQuery().table('users').insert({ username: 'virk' })
    await db.insertQuery().table('profiles').insert({ display_name: 'Hvirk', user_id: 1 })

    const profile = await Profile.query()
      .preload('user', (builder) => {
        builder.apply((scopes) => scopes.fromCountry(1))
      })
      .first()

    const profileWithoutScope = await Profile.query().preload('user').first()
    assert.isNull(profile?.user)
    assert.instanceOf(profileWithoutScope?.user, User)
  })

  test('apply scopes on related query', async ({ assert, fs }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      static fromCountry = scope((query, countryId) => {
        query.where('country_id', countryId)
      })
    }
    User.boot()

    class Profile extends BaseModel {
      @column()
      declare userId: number

      @column()
      declare displayName: string

      @belongsTo(() => User)
      declare user: BelongsTo<typeof User>
    }
    Profile.boot()

    await db.insertQuery().table('users').insert({ username: 'virk' })
    await db.insertQuery().table('profiles').insert({ display_name: 'Hvirk', user_id: 1 })

    const profile = await Profile.query().firstOrFail()
    const profileUser = await profile
      .related('user')
      .query()
      .apply((scopes) => {
        scopes.fromCountry(1)
      })
      .first()
    const profileUserWithoutScopes = await profile.related('user').query().first()

    assert.isNull(profileUser)
    assert.instanceOf(profileUserWithoutScopes, User)
  })
})

test.group('Model | BelongsTo | onQuery', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('invoke onQuery method when preloading relationship', async ({ assert, fs }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string
    }
    User.boot()

    class Profile extends BaseModel {
      @column()
      declare userId: number

      @column()
      declare displayName: string

      @belongsTo(() => User, {
        onQuery: (builder) => {
          builder.where('country_id', 1)
        },
      })
      declare user: BelongsTo<typeof User>
    }
    Profile.boot()

    await db.insertQuery().table('users').insert({ username: 'virk' })
    await db.insertQuery().table('profiles').insert({ display_name: 'Hvirk', user_id: 1 })

    const profile = await Profile.query().preload('user').first()
    assert.isNull(profile?.user)
  })

  test('do not run onQuery hook on subqueries', async ({ assert, fs }) => {
    assert.plan(2)

    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string
    }
    User.boot()

    class Profile extends BaseModel {
      @column()
      declare userId: number

      @column()
      declare displayName: string

      @belongsTo(() => User, {
        onQuery: (builder) => {
          assert.isTrue(true)
          builder.where('country_id', 1)
        },
      })
      declare user: BelongsTo<typeof User>
    }
    Profile.boot()

    await db.insertQuery().table('users').insert({ username: 'virk' })
    await db.insertQuery().table('profiles').insert({ display_name: 'Hvirk', user_id: 1 })

    const profile = await Profile.query()
      .preload('user', (query) => {
        query.where((_) => {})
      })
      .first()

    assert.isNull(profile?.user)
  })

  test('invoke onQuery method on related query builder', async ({ assert, fs }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string
    }
    User.boot()

    class Profile extends BaseModel {
      @column()
      declare userId: number

      @column()
      declare displayName: string

      @belongsTo(() => User, {
        onQuery: (builder) => {
          builder.where('country_id', 1)
        },
      })
      declare user: BelongsTo<typeof User>
    }
    Profile.boot()

    await db.insertQuery().table('users').insert({ username: 'virk' })
    await db.insertQuery().table('profiles').insert({ display_name: 'Hvirk', user_id: 1 })
    const profile = await Profile.findOrFail(1)
    const user = await profile.related('user').query().first()
    assert.isNull(user)
  })

  test('do not run onQuery hook on related query builder subqueries', async ({ assert, fs }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string
    }
    User.boot()

    class Profile extends BaseModel {
      @column()
      declare userId: number

      @column()
      declare displayName: string

      @belongsTo(() => User, {
        onQuery: (builder) => {
          builder.where('country_id', 1)
        },
      })
      declare user: BelongsTo<typeof User>
    }
    Profile.boot()

    await db.insertQuery().table('users').insert({ username: 'virk' })
    await db.insertQuery().table('profiles').insert({ display_name: 'Hvirk', user_id: 1 })
    const profile = await Profile.findOrFail(1)

    const { sql, bindings } = profile
      .related('user')
      .query()
      .where((builder) => {
        builder.where('score', '>', 0)
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = db
      .connection()
      .from('users')
      .where((subquery) => {
        subquery.where('country_id', 1).where((query) => query.where('score', '>', 0))
      })
      .where((subquery) => subquery.where('id', 1))
      .limit(1)
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })
})
