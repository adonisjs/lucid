/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import type { HasOne, BelongsTo } from '../../src/types/relations.js'

import { scope } from '../../src/orm/base_model/index.js'
import { column, hasOne, belongsTo } from '../../src/orm/decorators/index.js'
import { HasOneQueryBuilder } from '../../src/orm/relations/has_one/query_builder.js'

import {
  getDb,
  getBaseModel,
  ormAdapter,
  setup,
  cleanup,
  resetTables,
} from '../../test-helpers/index.js'
import { AppFactory } from '@adonisjs/core/factories/app'

test.group('Model | HasOne | Options', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  test('raise error when localKey is missing', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    assert.plan(1)

    try {
      class Profile extends BaseModel {}

      class User extends BaseModel {
        @hasOne(() => Profile)
        declare profile: HasOne<typeof Profile>
      }

      User.boot()
      User.$getRelation('profile')!.boot()
    } catch ({ message }) {
      assert.equal(message, '"User.profile" expects "id" to exist on "User" model, but is missing')
    }
  })

  test('raise error when foreignKey is missing', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    assert.plan(1)

    try {
      class Profile extends BaseModel {}
      Profile.boot()

      class User extends BaseModel {
        @column({ isPrimary: true })
        declare id: number

        @hasOne(() => Profile)
        declare profile: HasOne<typeof Profile>
      }

      User.boot()
      User.$getRelation('profile')!.boot()
    } catch ({ message }) {
      assert.equal(
        message,
        '"User.profile" expects "userId" to exist on "Profile" model, but is missing'
      )
    }
  })

  test('use primary key is as the local key', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Profile extends BaseModel {
      @column()
      declare userId: number
    }
    Profile.boot()

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasOne(() => Profile)
      declare profile: HasOne<typeof Profile>
    }

    User.boot()
    User.$getRelation('profile')!.boot()

    assert.equal(User.$getRelation('profile')!['localKey'], 'id')
  })

  test('use custom defined local key', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Profile extends BaseModel {
      @column()
      declare userId: number
    }
    Profile.boot()

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column({ columnName: 'user_uid' })
      declare uid: number

      @hasOne(() => Profile, { localKey: 'uid' })
      declare profile: HasOne<typeof Profile>
    }

    User.boot()
    User.$getRelation('profile')!.boot()

    assert.equal(User.$getRelation('profile')!['localKey'], 'uid')
  })

  test('compute foreign key from model name and primary key', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Profile extends BaseModel {
      @column()
      declare userId: number
    }
    Profile.boot()

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasOne(() => Profile)
      declare profile: HasOne<typeof Profile>
    }

    User.boot()
    User.$getRelation('profile')!.boot()

    assert.equal(User.$getRelation('profile')!['foreignKey'], 'userId')
  })

  test('use pre defined foreign key', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Profile extends BaseModel {
      @column({ columnName: 'user_id' })
      declare userUid: number
    }
    Profile.boot()

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasOne(() => Profile, { foreignKey: 'userUid' })
      declare profile: HasOne<typeof Profile>
    }

    User.boot()
    User.$getRelation('profile')!.boot()

    assert.equal(User.$getRelation('profile')!['foreignKey'], 'userUid')
  })

  test('clone relationship instance with options', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Profile extends BaseModel {
      @column({ columnName: 'user_id' })
      declare userUid: number
    }
    Profile.boot()

    class BaseUser extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasOne(() => Profile, { foreignKey: 'userUid' })
      declare profile: HasOne<typeof Profile>
    }

    class User extends BaseUser {}

    User.boot()
    User.$getRelation('profile')!.boot()

    assert.equal(User.$getRelation('profile')!['foreignKey'], 'userUid')
    assert.deepEqual(User.$getRelation('profile')!.model, User)
  })
})

test.group('Model | HasOne | Set Relations', (group) => {
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
    const BaseModel = getBaseModel(adapter)

    class Profile extends BaseModel {
      @column()
      declare userId: number
    }

    class User extends BaseModel {
      @column()
      declare id: number

      @hasOne(() => Profile)
      declare profile: HasOne<typeof Profile>
    }

    User.boot()
    User.$getRelation('profile')!.boot()

    const user = new User()
    const profile = new Profile()
    User.$getRelation('profile')!.setRelated(user, profile)
    assert.deepEqual(user.profile, profile)
  })

  test('push related model instance', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Profile extends BaseModel {
      @column()
      declare userId: number
    }

    class User extends BaseModel {
      @column()
      declare id: number

      @hasOne(() => Profile)
      declare profile: HasOne<typeof Profile>
    }

    User.boot()
    User.$getRelation('profile')!.boot()

    const user = new User()
    const profile = new Profile()
    User.$getRelation('profile')!.pushRelated(user, profile)
    assert.deepEqual(user.profile, profile)
  })

  test('set many of related instances', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Profile extends BaseModel {
      @column()
      declare userId: number
    }

    class User extends BaseModel {
      @column()
      declare id: number

      @hasOne(() => Profile)
      declare profile: HasOne<typeof Profile>
    }

    User.boot()
    User.$getRelation('profile')!.boot()

    const user = new User()
    user.fill({ id: 1 })

    const user1 = new User()
    user1.fill({ id: 2 })

    const user2 = new User()
    user2.fill({ id: 3 })

    const profile = new Profile()
    profile.fill({ userId: 1 })

    const profile1 = new Profile()
    profile1.fill({ userId: 2 })

    User.$getRelation('profile')!.setRelatedForMany([user, user1, user2], [profile, profile1])
    assert.deepEqual(user.profile, profile)
    assert.deepEqual(user1.profile, profile1)
    assert.isNull(user2.profile)
  })
})

test.group('Model | HasOne | bulk operations', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('generate correct sql for selecting related rows', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Profile extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare displayName: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasOne(() => Profile)
      declare profile: HasOne<typeof Profile>
    }

    await db.table('users').insert({ username: 'virk' })

    const user = await User.find(1)
    const { sql, bindings } = user!.related('profile').query().toSQL()

    const { sql: knexSql, bindings: knexBindings } = db
      .connection()
      .getWriteClient()
      .from('profiles')
      .where('user_id', 1)
      .limit(1)
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('generate correct sql for selecting related many rows', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Profile extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare displayName: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasOne(() => Profile)
      declare profile: HasOne<typeof Profile>
    }

    await db.table('users').multiInsert([{ username: 'virk' }, { username: 'nikk' }])

    const users = await User.all()
    User.$getRelation('profile')!.boot()

    const related = User.$getRelation('profile')!.eagerQuery(users, db.connection())
    const { sql, bindings } = related.toSQL()

    const { sql: knexSql, bindings: knexBindings } = db
      .connection()
      .getWriteClient()
      .from('profiles')
      .whereIn('user_id', [2, 1])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('generate correct sql for updating related row', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Profile extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare displayName: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasOne(() => Profile)
      declare profile: HasOne<typeof Profile>
    }

    await db.table('users').insert({ username: 'virk' })

    const user = await User.find(1)
    const { sql, bindings } = user!
      .related('profile')
      .query()
      .update({
        username: 'nikk',
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = db
      .connection()
      .getWriteClient()
      .from('profiles')
      .where('user_id', 1)
      .update({ username: 'nikk' })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('generate correct sql for deleting related row', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Profile extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare displayName: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasOne(() => Profile)
      declare profile: HasOne<typeof Profile>
    }

    await db.table('users').insert({ username: 'virk' })

    const user = await User.find(1)
    const { sql, bindings } = user!.related('profile').query().del().toSQL()

    const { sql: knexSql, bindings: knexBindings } = db
      .connection()
      .getWriteClient()
      .from('profiles')
      .where('user_id', 1)
      .del()
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })
})

test.group('Model | HasOne | sub queries', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('generate correct subquery for selecting rows', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Profile extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare displayName: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasOne(() => Profile)
      declare profile: HasOne<typeof Profile>
    }

    User.boot()
    User.$getRelation('profile')!.boot()

    const { sql, bindings } = User.$getRelation('profile')!.subQuery(db.connection()).toSQL()
    const { sql: knexSql, bindings: knexBindings } = db
      .connection()
      .knexQuery()
      .from('profiles')
      .where('users.id', '=', db.connection().getReadClient().ref('profiles.user_id'))
      .toSQL()

    assert.deepEqual(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('create aggregate query', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Profile extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare displayName: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasOne(() => Profile)
      declare profile: HasOne<typeof Profile>
    }

    User.boot()
    User.$getRelation('profile')!.boot()

    const { sql, bindings } = User.$getRelation('profile')!
      .subQuery(db.connection())
      .count('* as total')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = db
      .connection()
      .knexQuery()
      .from('profiles')
      .count('* as total')
      .where('users.id', '=', db.connection().getReadClient().ref('profiles.user_id'))
      .toSQL()

    assert.deepEqual(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('allow selecting custom columns', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Profile extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare displayName: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasOne(() => Profile)
      declare profile: HasOne<typeof Profile>
    }

    User.boot()
    User.$getRelation('profile')!.boot()

    const { sql, bindings } = User.$getRelation('profile')!
      .subQuery(db.connection())
      .select('title', 'is_published')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = db
      .connection()
      .knexQuery()
      .from('profiles')
      .select('title', 'is_published')
      .where('users.id', '=', db.connection().getReadClient().ref('profiles.user_id'))
      .toSQL()

    assert.deepEqual(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('generate correct self relationship subquery', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare username: string

      @hasOne(() => User)
      declare parent: HasOne<typeof User>
    }

    User.boot()
    User.$getRelation('parent')!.boot()

    const { sql, bindings } = User.$getRelation('parent')!
      .subQuery(db.connection())
      .select('email')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = db
      .connection()
      .knexQuery()
      .from('users as adonis_temp_0')
      .select('email')
      .where('users.id', '=', db.connection().getReadClient().ref('adonis_temp_0.user_id'))
      .toSQL()

    assert.deepEqual(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('raise exception when trying to execute the query', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Profile extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare displayName: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasOne(() => Profile)
      declare profile: HasOne<typeof Profile>
    }

    User.boot()
    User.$getRelation('profile')!.boot()

    const exec = () => User.$getRelation('profile')!.subQuery(db.connection())['exec']()
    const paginate = () => User.$getRelation('profile')!.subQuery(db.connection())['paginate'](1)
    const update = () => User.$getRelation('profile')!.subQuery(db.connection())['update']({})
    const del = () => User.$getRelation('profile')!.subQuery(db.connection())['del']()
    const first = () => User.$getRelation('profile')!.subQuery(db.connection())['first']()
    const firstOrFail = () =>
      User.$getRelation('profile')!.subQuery(db.connection())['firstOrFail']()

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
    const BaseModel = getBaseModel(adapter)

    class Profile extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare accountType: string

      @column()
      declare displayName: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasOne(() => Profile, {
        onQuery: (query) => query.where('accountType', 'twitter'),
      })
      declare profile: HasOne<typeof Profile>
    }

    User.boot()
    User.$getRelation('profile')!.boot()

    const { sql, bindings } = User.$getRelation('profile')!.subQuery(db.connection()).toSQL()
    const { sql: knexSql, bindings: knexBindings } = db
      .connection()
      .knexQuery()
      .from('profiles')
      .where((query) => query.where('account_type', 'twitter'))
      .where((query) =>
        query.where('users.id', '=', db.connection().getReadClient().ref('profiles.user_id'))
      )
      .toSQL()

    assert.deepEqual(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })
})

test.group('Model | HasOne | preload', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('preload relationship', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Profile extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare displayName: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasOne(() => Profile)
      declare profile: HasOne<typeof Profile>
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }, { username: 'nikk' }])

    const [user0, user1] = await db.query().from('users')
    await db
      .insertQuery()
      .table('profiles')
      .insert([
        {
          user_id: user0.id,
          display_name: 'virk',
        },
        {
          user_id: user1.id,
          display_name: 'nikk',
        },
      ])

    User.boot()

    const users = await User.query().preload('profile')
    assert.lengthOf(users, 2)

    assert.equal(users[0].profile.userId, users[0].id)
    assert.equal(users[1].profile.userId, users[1].id)
  })

  test('set relationship property value to null when no related rows were found', async ({
    assert,
    fs,
  }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Profile extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare displayName: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasOne(() => Profile)
      declare profile: HasOne<typeof Profile>
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }, { username: 'nikk' }])

    User.boot()

    const users = await User.query().preload('profile')
    assert.lengthOf(users, 2)

    assert.isNull(users[0].profile)
    assert.isNull(users[1].profile)
  })

  test('preload nested relations', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Identity extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare profileId: number

      @column()
      declare identityName: string
    }

    class Profile extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare displayName: string

      @hasOne(() => Identity)
      declare identity: HasOne<typeof Identity>
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasOne(() => Profile)
      declare profile: HasOne<typeof Profile>
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

    User.boot()

    const user = await User.query()
      .preload('profile', (builder) => builder.preload('identity'))
      .where('username', 'virk')
      .first()

    assert.instanceOf(user!.profile, Profile)
    assert.instanceOf(user!.profile!.identity, Identity)
  })

  test('preload self referenced relationship', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

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

      @hasOne(() => Profile)
      declare profile: HasOne<typeof Profile>
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }, { username: 'nikk' }])

    const [user0, user1] = await db.query().from('users')
    await db
      .insertQuery()
      .table('profiles')
      .insert([
        {
          user_id: user0.id,
          display_name: 'virk',
        },
        {
          user_id: user1.id,
          display_name: 'nikk',
        },
      ])

    User.boot()

    const users = await User.query().preload('profile', (builder) => builder.preload('user'))
    assert.lengthOf(users, 2)

    assert.deepEqual(users[0].profile.user.id, users[0].id)
    assert.deepEqual(users[1].profile.user.id, users[1].id)
  })

  test('add constraints during preload', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Profile extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare displayName: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasOne(() => Profile)
      declare profile: HasOne<typeof Profile>
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }, { username: 'nikk' }])

    const [user0, user1] = await db.query().from('users')
    await db
      .insertQuery()
      .table('profiles')
      .insert([
        {
          user_id: user0.id,
          display_name: 'virk',
        },
        {
          user_id: user1.id,
          display_name: 'nikk',
        },
      ])

    User.boot()

    const users = await User.query().preload('profile', (builder) =>
      builder.where('display_name', 'foo')
    )
    assert.lengthOf(users, 2)

    assert.isNull(users[0].profile)
    assert.isNull(users[1].profile)
  })

  test('cherry pick columns during preload', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Profile extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare displayName: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasOne(() => Profile)
      declare profile: HasOne<typeof Profile>
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }, { username: 'nikk' }])

    const [user0, user1] = await db.query().from('users')
    await db
      .insertQuery()
      .table('profiles')
      .insert([
        {
          user_id: user0.id,
          display_name: 'virk',
        },
        {
          user_id: user1.id,
          display_name: 'nikk',
        },
      ])

    User.boot()

    const users = await User.query().preload('profile', (builder) => {
      return builder.select('display_name')
    })

    assert.lengthOf(users, 2)
    assert.deepEqual(users[0].profile.$extras, {})
    assert.deepEqual(users[1].profile.$extras, {})
  })

  test('do not repeat fk when already defined', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Profile extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare displayName: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasOne(() => Profile)
      declare profile: HasOne<typeof Profile>
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }, { username: 'nikk' }])

    const [user0, user1] = await db.query().from('users')
    await db
      .insertQuery()
      .table('profiles')
      .insert([
        {
          user_id: user0.id,
          display_name: 'virk',
        },
        {
          user_id: user1.id,
          display_name: 'nikk',
        },
      ])

    User.boot()

    const users = await User.query().preload('profile', (builder) => {
      return builder.select('display_name', 'user_id')
    })

    assert.lengthOf(users, 2)
    assert.deepEqual(users[0].profile.$extras, {})
    assert.deepEqual(users[1].profile.$extras, {})
  })

  test('pass sideloaded attributes to the relationship', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Profile extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare displayName: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasOne(() => Profile)
      declare profile: HasOne<typeof Profile>
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }, { username: 'nikk' }])

    const [user0, user1] = await db.query().from('users')
    await db
      .insertQuery()
      .table('profiles')
      .insert([
        {
          user_id: user0.id,
          display_name: 'virk',
        },
        {
          user_id: user1.id,
          display_name: 'nikk',
        },
      ])

    User.boot()

    const users = await User.query().preload('profile').sideload({ id: 1 })
    assert.lengthOf(users, 2)

    assert.deepEqual(users[0].$sideloaded, { id: 1 })
    assert.deepEqual(users[1].$sideloaded, { id: 1 })
    assert.deepEqual(users[0].profile.$sideloaded, { id: 1 })
    assert.deepEqual(users[1].profile.$sideloaded, { id: 1 })
  })

  test('preload using model instance', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Profile extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare displayName: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasOne(() => Profile)
      declare profile: HasOne<typeof Profile>
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

    User.boot()

    const users = await User.all()
    assert.lengthOf(users, 2)

    await users[0].load('profile')
    await users[1].load('profile')

    assert.equal(users[0].profile.userId, users[0].id)
    assert.equal(users[1].profile.userId, users[1].id)
  })

  test('raise exception when local key is not selected', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    assert.plan(1)

    class Profile extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare displayName: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasOne(() => Profile)
      declare profile: HasOne<typeof Profile>
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }, { username: 'nikk' }])

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
          user_id: users[1].id,
          display_name: 'nikk',
        },
      ])

    try {
      await User.query().select('username').preload('profile').where('username', 'virk').first()
    } catch ({ message }) {
      assert.equal(message, 'Cannot preload "profile", value of "User.id" is undefined')
    }
  })

  test('preload nested relations using model instance', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Identity extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare profileId: number

      @column()
      declare identityName: string
    }

    class Profile extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare displayName: string

      @hasOne(() => Identity)
      declare identity: HasOne<typeof Identity>
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasOne(() => Profile)
      declare profile: HasOne<typeof Profile>
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

    User.boot()

    const users = await User.all()
    assert.lengthOf(users, 2)

    await users[0].load((preloader) => {
      preloader.load('profile', (builder) => builder.preload('identity'))
    })

    await users[1].load((preloader) => {
      preloader.load('profile', (builder) => builder.preload('identity'))
    })

    assert.instanceOf(users[0].profile, Profile)
    assert.instanceOf(users[0].profile!.identity, Identity)

    assert.instanceOf(users[1].profile, Profile)
    assert.instanceOf(users[1].profile!.identity, Identity)
  })

  test('pass main query options down the chain', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Identity extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare profileId: number

      @column()
      declare identityName: string
    }

    class Profile extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare displayName: string

      @hasOne(() => Identity)
      declare identity: HasOne<typeof Identity>
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasOne(() => Profile)
      declare profile: HasOne<typeof Profile>
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

    User.boot()

    const query = User.query({ connection: 'secondary' })
      .preload('profile', (builder) => builder.preload('identity'))
      .where('username', 'virk')

    const user = await query.first()
    assert.instanceOf(user!.profile, Profile)
    assert.instanceOf(user!.profile.identity, Identity)

    assert.equal(user!.$options!.connection, 'secondary')
    assert.equal(user!.profile.$options!.connection, 'secondary')
    assert.equal(user!.profile.identity.$options!.connection, 'secondary')
  })

  test('do not run preload query when parent rows are empty', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Profile extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare displayName: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasOne(() => Profile)
      declare profile: HasOne<typeof Profile>
    }

    User.boot()

    const users = await User.query().preload('profile', () => {
      throw new Error('not expected to be here')
    })

    assert.lengthOf(users, 0)
  })
})

test.group('Model | HasOne | withCount', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('get count of a relationship rows', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Profile extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare displayName: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasOne(() => Profile)
      declare profile: HasOne<typeof Profile>
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }, { username: 'nikk' }])

    const [user0, user1] = await db.query().from('users')
    await db
      .insertQuery()
      .table('profiles')
      .insert([
        {
          user_id: user0.id,
          display_name: 'virk',
        },
        {
          user_id: user1.id,
          display_name: 'nikk',
        },
      ])

    User.boot()

    const users = await User.query().withCount('profile')
    assert.lengthOf(users, 2)

    assert.equal(users[0].$extras.profile_count, 1)
    assert.equal(users[1].$extras.profile_count, 1)
  })

  test('allow cherry picking columns', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Profile extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare displayName: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: number

      @hasOne(() => Profile)
      declare profile: HasOne<typeof Profile>
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }, { username: 'nikk' }])

    const [user0, user1] = await db.query().from('users')
    await db
      .insertQuery()
      .table('profiles')
      .insert([
        {
          user_id: user0.id,
          display_name: 'virk',
        },
        {
          user_id: user1.id,
          display_name: 'nikk',
        },
      ])

    User.boot()

    const users = await User.query().select('username').withCount('profile').orderBy('id', 'asc')

    assert.lengthOf(users, 2)
    assert.deepEqual(users[0].$attributes, { username: 'virk' })
    assert.deepEqual(users[1].$attributes, { username: 'nikk' })
  })

  test('lazy load related count', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Profile extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare displayName: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasOne(() => Profile)
      declare profile: HasOne<typeof Profile>
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }, { username: 'nikk' }])

    const [user0, user1] = await db.query().from('users')
    await db
      .insertQuery()
      .table('profiles')
      .insert([
        {
          user_id: user0.id,
          display_name: 'virk',
        },
        {
          user_id: user1.id,
          display_name: 'nikk',
        },
      ])

    User.boot()

    const user = await User.firstOrFail()
    await user.loadCount('profile')

    assert.deepEqual(Number(user.$extras.profile_count), 1)
  })

  test('lazy load count of self referenced relationship', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare parentId: number

      @hasOne(() => User, { foreignKey: 'parentId' })
      declare manager: HasOne<typeof User>
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }, { username: 'nikk', parent_id: 1 }])

    User.boot()

    const user = await User.firstOrFail()
    await user.loadCount('manager')

    assert.deepEqual(Number(user.$extras.manager_count), 1)
  })
})

test.group('Model | HasOne | has', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('limit rows to the existance of relationship', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Profile extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare displayName: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasOne(() => Profile)
      declare profile: HasOne<typeof Profile>
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }, { username: 'nikk' }])

    const [user0] = await db.query().from('users').orderBy('id', 'asc')
    await db
      .insertQuery()
      .table('profiles')
      .insert([
        {
          user_id: user0.id,
          display_name: 'virk',
        },
      ])

    User.boot()

    const users = await User.query().has('profile')

    assert.lengthOf(users, 1)
    assert.equal(users[0].username, 'virk')
  })
})

test.group('Model | HasOne | whereHas', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('limit rows to the existance of relationship', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Profile extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare displayName: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasOne(() => Profile)
      declare profile: HasOne<typeof Profile>
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }, { username: 'nikk' }])

    const [user0, user1] = await db.query().from('users').orderBy('id', 'asc')
    await db
      .insertQuery()
      .table('profiles')
      .insert([
        {
          user_id: user0.id,
          display_name: 'Virk',
          type: 'personal',
        },
        {
          user_id: user1.id,
          display_name: '@nikk',
          type: 'social',
        },
        {
          user_id: user1.id,
          display_name: 'Nikk',
          type: 'personal',
        },
      ])

    User.boot()

    const users = await User.query().whereHas('profile', (query) => {
      query.where('type', 'social')
    })

    assert.lengthOf(users, 1)
    assert.equal(users[0].username, 'nikk')
  })
})

test.group('Model | HasOne | save', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('save related instance', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Profile extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare displayName: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasOne(() => Profile)
      declare profile: HasOne<typeof Profile>
    }

    const user = new User()
    user.username = 'virk'
    await user.save()

    const profile = new Profile()
    profile.displayName = 'Hvirk'

    await user.related('profile').save(profile)

    assert.isTrue(profile.$isPersisted)
    assert.equal(user.id, profile.userId)
  })

  test('wrap save calls inside a managed transaction', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    assert.plan(3)

    class Profile extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare displayName: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasOne(() => Profile)
      declare profile: HasOne<typeof Profile>
    }

    const user = new User()
    user.username = 'virk'

    try {
      const profile = new Profile()
      await user.related('profile').save(profile)
    } catch (error) {
      assert.exists(error)
    }

    const users = await db.query().from('users')
    const profiles = await db.query().from('profiles')

    assert.lengthOf(users, 0)
    assert.lengthOf(profiles, 0)
  })

  test('use parent model transaction when its defined', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    assert.plan(4)

    class Profile extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare displayName: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasOne(() => Profile)
      declare profile: HasOne<typeof Profile>
    }

    const trx = await db.transaction()
    const user = new User()
    user.username = 'virk'
    user.$trx = trx

    try {
      const profile = new Profile()
      await user.related('profile').save(profile)
    } catch (error) {
      assert.exists(error)
    }

    assert.isFalse(user.$trx.isCompleted)
    await trx.rollback()

    const users = await db.query().from('users')
    const profiles = await db.query().from('profiles')

    assert.lengthOf(users, 0)
    assert.lengthOf(profiles, 0)
  })
})

test.group('Model | HasOne | create', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('create related instance', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Profile extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare displayName: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasOne(() => Profile)
      declare profile: HasOne<typeof Profile>
    }

    const user = new User()
    user.username = 'virk'
    await user.save()

    const profile = await user.related('profile').create({
      displayName: 'Hvirk',
    })

    assert.isTrue(profile.$isPersisted)
    assert.equal(user.id, profile.userId)
  })

  test('wrap create call inside a managed transaction', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    assert.plan(3)

    class Profile extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare displayName: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasOne(() => Profile)
      declare profile: HasOne<typeof Profile>
    }

    const user = new User()
    user.username = 'virk'

    try {
      await user.related('profile').create({})
    } catch (error) {
      assert.exists(error)
    }

    const users = await db.query().from('users')
    const profiles = await db.query().from('profiles')

    assert.lengthOf(users, 0)
    assert.lengthOf(profiles, 0)
  })

  test('use parent model transaction during create', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Profile extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare displayName: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasOne(() => Profile)
      declare profile: HasOne<typeof Profile>
    }

    const trx = await db.transaction()

    const user = new User()
    user.username = 'virk'
    user.$trx = trx

    const profile = await user.related('profile').create({ displayName: 'Hvirk' })

    assert.isFalse(user.$trx.isCompleted)
    await trx.rollback()

    const totalUsers = await db.query().from('users').count('*', 'total')
    const totalProfiles = await db.query().from('profiles').count('*', 'total')

    assert.equal(totalUsers[0].total, 0)
    assert.equal(totalProfiles[0].total, 0)
    assert.isUndefined(user.$trx)
    assert.isUndefined(profile.$trx)
  })
})

test.group('Model | HasOne | firstOrCreate', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test("create related instance when there isn't any existing row", async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Profile extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare displayName: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasOne(() => Profile)
      declare profile: HasOne<typeof Profile>
    }

    const user = new User()
    user.username = 'virk'
    await user.save()

    const profile = await user.related('profile').firstOrCreate(
      {},
      {
        displayName: 'Hvirk',
      }
    )

    assert.isTrue(profile.$isPersisted)
    assert.isTrue(profile.$isLocal)
    assert.equal(user.id, profile.userId)
    assert.equal(profile.displayName, 'Hvirk')
  })

  test('return the existing row vs creating a new one', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Profile extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare displayName: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasOne(() => Profile)
      declare profile: HasOne<typeof Profile>
    }

    const user = new User()
    user.username = 'virk'
    await user.save()

    await db.insertQuery().table('profiles').insert({ user_id: user.id, display_name: 'Hvirk' })
    const profile = await user.related('profile').firstOrCreate(
      {},
      {
        displayName: 'Hvirk',
      }
    )

    assert.isTrue(profile.$isPersisted)
    assert.isFalse(profile.$isLocal)
    assert.equal(user.id, profile.userId)
    assert.equal(profile.displayName, 'Hvirk')

    const profiles = await db.query().from('profiles')
    assert.lengthOf(profiles, 1)
  })
})

test.group('Model | HasOne | updateOrCreate', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test("create related instance when there isn't any existing row", async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Profile extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare displayName: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasOne(() => Profile)
      declare profile: HasOne<typeof Profile>
    }

    const user = new User()
    user.username = 'virk'
    await user.save()

    const profile = await user.related('profile').updateOrCreate(
      {},
      {
        displayName: 'Virk',
      }
    )

    assert.isTrue(profile.$isPersisted)
    assert.isTrue(profile.$isLocal)
    assert.equal(user.id, profile.userId)
    assert.equal(profile.displayName, 'Virk')

    const profiles = await db.query().from('profiles')
    assert.lengthOf(profiles, 1)
    assert.equal(profiles[0].display_name, 'Virk')
  })

  test('update the existing row vs creating a new one', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Profile extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare displayName: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasOne(() => Profile)
      declare profile: HasOne<typeof Profile>
    }

    const user = new User()
    user.username = 'virk'
    await user.save()

    await db.insertQuery().table('profiles').insert({ user_id: user.id, display_name: 'Hvirk' })
    const profile = await user.related('profile').updateOrCreate(
      {},
      {
        displayName: 'Virk',
      }
    )

    assert.isTrue(profile.$isPersisted)
    assert.isFalse(profile.$isLocal)
    assert.equal(user.id, profile.userId)
    assert.equal(profile.displayName, 'Virk')

    const profiles = await db.query().from('profiles')
    assert.lengthOf(profiles, 1)
    assert.equal(profiles[0].display_name, 'Virk')
  })
})

test.group('Model | HasOne | pagination', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('dis-allow pagination', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    assert.plan(1)

    class Profile extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare displayName: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasOne(() => Profile)
      declare profile: HasOne<typeof Profile>
    }

    await db.table('users').insert({ username: 'virk' })

    const user = await User.find(1)
    try {
      await user!.related('profile').query().paginate(1)
    } catch ({ message }) {
      assert.equal(message, 'Cannot paginate a hasOne relationship "(profile)"')
    }
  })
})

test.group('Model | HasOne | clone', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('clone related query builder', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    assert.plan(1)

    class Profile extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare displayName: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasOne(() => Profile)
      declare profile: HasOne<typeof Profile>
    }

    await db.table('users').insert({ username: 'virk' })

    const user = await User.find(1)
    const clonedQuery = user!.related('profile').query().clone()
    assert.instanceOf(clonedQuery, HasOneQueryBuilder)
  })
})

test.group('Model | HasOne | scopes', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('apply scopes during eagerload', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Profile extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare displayName: string

      static twitter = scope((query) => {
        query.where('type', 'twitter')
      })
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasOne(() => Profile)
      declare profile: HasOne<typeof Profile>
    }

    const [row] = await db
      .table<{ id: number } | number>('users')
      .insert({ username: 'virk' })
      .returning('id')
    await db
      .table('profiles')
      .multiInsert([
        { user_id: typeof row === 'number' ? row : row.id, display_name: 'virk', type: 'github' },
      ])

    const user = await User.query()
      .preload('profile', (query) => {
        query.apply((scopes) => scopes.twitter())
      })
      .firstOrFail()
    const userWithScopes = await User.query().preload('profile').firstOrFail()

    assert.isNull(user.profile)
    assert.instanceOf(userWithScopes.profile, Profile)
  })

  test('apply scopes on related query', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Profile extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare displayName: string

      static twitter = scope((query) => {
        query.where('type', 'twitter')
      })
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasOne(() => Profile)
      declare profile: HasOne<typeof Profile>
    }

    const [row] = await db
      .table<{ id: number } | number>('users')
      .insert({ username: 'virk' })
      .returning('id')
    await db
      .table('profiles')
      .multiInsert([
        { user_id: typeof row === 'number' ? row : row.id, display_name: 'virk', type: 'github' },
      ])

    const user = await User.findOrFail(1)

    const profile = await user
      .related('profile')
      .query()
      .apply((scopes) => scopes.twitter())
      .first()
    const profileWithoutScopes = await user.related('profile').query().first()

    assert.isNull(profile)
    assert.instanceOf(profileWithoutScopes, Profile)
  })
})

test.group('Model | HasOne | onQuery', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('invoke onQuery method when preloading relationship', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Profile extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare displayName: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasOne(() => Profile, {
        onQuery: (query) => query.where('type', 'twitter'),
      })
      declare profile: HasOne<typeof Profile>
    }

    const [row] = await db
      .table<{ id: number } | number>('users')
      .insert({ username: 'virk' })
      .returning('id')
    await db
      .table('profiles')
      .multiInsert([
        { user_id: typeof row === 'number' ? row : row.id, display_name: 'virk', type: 'github' },
      ])

    const user = await User.query().preload('profile').firstOrFail()
    assert.isNull(user.profile)
  })

  test('do not invoke onQuery method on preloading subqueries', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    assert.plan(2)

    class Profile extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare displayName: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasOne(() => Profile, {
        onQuery: (query) => {
          assert.isTrue(true)
          query.where('type', 'twitter')
        },
      })
      declare profile: HasOne<typeof Profile>
    }

    const [row] = await db
      .table<{ id: number } | number>('users')
      .insert({ username: 'virk' })
      .returning('id')
    await db
      .table('profiles')
      .multiInsert([
        { user_id: typeof row === 'number' ? row : row.id, display_name: 'virk', type: 'github' },
      ])

    const user = await User.query()
      .preload('profile', (query) => query.where(() => {}))
      .firstOrFail()
    assert.isNull(user.profile)
  })

  test('invoke onQuery method on related query builder', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Profile extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare displayName: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasOne(() => Profile, {
        onQuery: (query) => query.where('type', 'twitter'),
      })
      declare profile: HasOne<typeof Profile>
    }

    const [row] = await db
      .table<{ id: number } | number>('users')
      .insert({ username: 'virk' })
      .returning('id')
    await db
      .table('profiles')
      .multiInsert([
        { user_id: typeof row === 'number' ? row : row.id, display_name: 'virk', type: 'github' },
      ])

    const user = await User.findOrFail(1)
    const profile = await user.related('profile').query().first()
    assert.isNull(profile)
  })

  test('do not invoke onQuery method on related query builder subqueries', async ({
    fs,
    assert,
  }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Profile extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare displayName: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasOne(() => Profile, {
        onQuery: (query) => query.where('type', 'twitter'),
      })
      declare profile: HasOne<typeof Profile>
    }

    const [row] = await db
      .table<{ id: number } | number>('users')
      .insert({ username: 'virk' })
      .returning('id')
    await db
      .table('profiles')
      .multiInsert([
        { user_id: typeof row === 'number' ? row : row.id, display_name: 'virk', type: 'github' },
      ])

    const user = await User.findOrFail(1)
    const { sql, bindings } = user
      .related('profile')
      .query()
      .where((query) => {
        query.whereNotNull('created_at')
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = db
      .connection()
      .from('profiles')
      .where((query) => {
        query.where('type', 'twitter').where((subquery) => subquery.whereNotNull('created_at'))
      })
      .where((query) => {
        query.where('user_id', 1)
      })
      .limit(1)
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })
})

test.group('Model | HasOne | delete', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('delete related instance', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Profile extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare displayName: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasOne(() => Profile)
      declare profile: HasOne<typeof Profile>
    }

    const user = new User()
    user.username = 'virk'
    await user.save()

    const profile = new Profile()
    profile.displayName = 'Hvirk'

    await user.related('profile').save(profile)
    const { sql, bindings } = user.related('profile').query().del().toSQL()

    const { sql: rawSql, bindings: rawBindings } = db
      .from('profiles')
      .where('user_id', user.id)
      .del()
      .toSQL()

    assert.deepEqual(bindings, rawBindings)
    assert.deepEqual(sql, rawSql)
  })
})
