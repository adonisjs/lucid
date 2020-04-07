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
import { BelongsTo } from '@ioc:Adonis/Lucid/Orm'

import { scope } from '../../src/Orm/Helpers/scope'
import { column, belongsTo } from '../../src/Orm/Decorators'
import { BelongsToQueryBuilder } from '../../src/Orm/Relations/BelongsTo/QueryBuilder'
import { ormAdapter, getBaseModel, setup, cleanup, resetTables, getDb, getProfiler } from '../../test-helpers'

let db: ReturnType<typeof getDb>
let BaseModel: ReturnType<typeof getBaseModel>

test.group('Model | BelongsTo | Options', (group) => {
  group.before(async () => {
    db = getDb()
    BaseModel = getBaseModel(ormAdapter(db))
  })

  test('raise error when localKey is missing', (assert) => {
    assert.plan(1)

    try {
      class User extends BaseModel {
      }
      User.boot()

      class Profile extends BaseModel {
        @belongsTo(() => User)
        public user: BelongsTo<typeof User>
      }

      Profile.boot()
      Profile.$getRelation('user')!.boot()
    } catch ({ message }) {
      assert.equal(
        message,
        'E_MISSING_MODEL_ATTRIBUTE: "Profile.user" expects "id" to exist on "User" model, but is missing',
      )
    }
  })

  test('raise error when foreignKey is missing', (assert) => {
    assert.plan(1)

    try {
      class User extends BaseModel {
        @column({ isPrimary: true })
        public id: number
      }

      User.boot()

      class Profile extends BaseModel {
        @belongsTo(() => User)
        public user: BelongsTo<typeof User>
      }

      Profile.boot()
      Profile.$getRelation('user')!.boot()
    } catch ({ message }) {
      assert.equal(
        message,
        'E_MISSING_MODEL_ATTRIBUTE: "Profile.user" expects "userId" to exist on "Profile" model, but is missing',
      )
    }
  })

  test('use primary key is as the local key', (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number
    }

    class Profile extends BaseModel {
      @column()
      public userId: number

      @belongsTo(() => User)
      public user: BelongsTo<typeof User>
    }

    Profile.$getRelation('user')!.boot()

    assert.equal(Profile.$getRelation('user')!['localKey'], 'id')
  })

  test('use custom defined local key', (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column({ columnName: 'user_uid' })
      public uid: number
    }

    class Profile extends BaseModel {
      @column()
      public userId: number

      @belongsTo(() => User, { localKey: 'uid' })
      public user: BelongsTo<typeof User>
    }

    Profile.$getRelation('user')!.boot()

    assert.equal(Profile.$getRelation('user')!['localKey'], 'uid')
  })

  test('compute foreign key from model name and primary key', (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number
    }

    class Profile extends BaseModel {
      @column()
      public userId: number

      @belongsTo(() => User)
      public user: BelongsTo<typeof User>
    }

    Profile.$getRelation('user')!.boot()

    assert.equal(Profile.$getRelation('user')!['foreignKey'], 'userId')
  })

  test('use pre defined foreign key', (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number
    }

    class Profile extends BaseModel {
      @column({ columnName: 'user_id' })
      public userUid: number

      @belongsTo(() => User, { foreignKey: 'userUid' })
      public user: BelongsTo<typeof User>
    }

    Profile.$getRelation('user')!.boot()

    assert.equal(Profile.$getRelation('user')!['foreignKey'], 'userUid')
  })
})

test.group('Model | BelongsTo | Set Relations', (group) => {
  group.before(async () => {
    db = getDb()
    BaseModel = getBaseModel(ormAdapter(db))
  })

  test('set related model instance', (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number
    }

    class Profile extends BaseModel {
      @column()
      public userId: number

      @belongsTo(() => User)
      public user: BelongsTo<typeof User>
    }

    Profile.$getRelation('user')!.boot()

    const user = new User()
    user.fill({ id: 1 })

    const profile = new Profile()
    profile.fill({ userId: 1 })

    Profile.$getRelation('user')!.setRelated(profile, user)
    assert.deepEqual(profile.user, user)
  })

  test('push related model instance', (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number
    }

    class Profile extends BaseModel {
      @column()
      public userId: number

      @belongsTo(() => User)
      public user: BelongsTo<typeof User>
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

  test('set many of related instances', (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number
    }

    class Profile extends BaseModel {
      @column()
      public userId: number

      @belongsTo(() => User)
      public user: BelongsTo<typeof User>
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
    assert.isUndefined(profile2.user)
  })
})

test.group('Model | BelongsTo | bulk operations', (group) => {
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
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number
    }

    class Profile extends BaseModel {
      @column()
      public userId: number

      @belongsTo(() => User)
      public user: BelongsTo<typeof User>
    }

    await db.table('profiles').insert({ user_id: 4, display_name: 'Hvirk' })

    const profile = await Profile.find(1)
    const { sql, bindings } = profile!.related('user').query().toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.connection()
      .getWriteClient()
      .from('users')
      .where('id', 4)
      .limit(1)
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('generate correct sql for selecting many related rows', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number
    }

    class Profile extends BaseModel {
      @column()
      public userId: number

      @belongsTo(() => User)
      public user: BelongsTo<typeof User>
    }

    await db.table('profiles').multiInsert([
      { display_name: 'virk', user_id: 2 },
      { display_name: 'nikk', user_id: 3 },
    ])

    const profiles = await Profile.all()
    Profile.$getRelation('user')!.boot()

    const query = Profile.$getRelation('user')!.eagerQuery(profiles, db.connection())
    const { sql, bindings } = query.toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.connection()
      .getWriteClient()
      .from('users')
      .whereIn('id', [3, 2])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('generate correct sql for updating related row', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number
    }

    class Profile extends BaseModel {
      @column()
      public userId: number

      @belongsTo(() => User)
      public user: BelongsTo<typeof User>
    }

    await db.table('profiles').insert({ user_id: 2, display_name: 'virk' })

    const profile = await Profile.find(1)
    const { sql, bindings } = profile!.related('user').query().update({
      display_name: 'nikk',
    }).toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.connection()
      .getWriteClient()
      .from('users')
      .where('id', 2)
      .update({ display_name: 'nikk' })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('generate correct sql for deleting related row', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number
    }

    class Profile extends BaseModel {
      @column()
      public userId: number

      @belongsTo(() => User)
      public user: BelongsTo<typeof User>
    }

    await db.table('profiles').insert({ user_id: 2, display_name: 'virk' })

    const profile = await Profile.find(1)
    const { sql, bindings } = profile!.related('user').query().del().toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.connection()
      .getWriteClient()
      .from('users')
      .where('id', 2)
      .del()
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })
})

test.group('Model | BelongsTo | preload', (group) => {
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

  test('preload relationship', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number
    }

    class Profile extends BaseModel {
      @column()
      public userId: number

      @belongsTo(() => User)
      public user: BelongsTo<typeof User>
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    await db.insertQuery().table('profiles').insert({ display_name: 'Hvirk', user_id: 1 })

    Profile.boot()

    const profiles = await Profile.query().preload('user')
    assert.lengthOf(profiles, 1)

    assert.equal(profiles[0].user.id, profiles[0].userId)
  })

  test('preload relationship for many rows', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number
    }

    class Profile extends BaseModel {
      @column()
      public userId: number

      @belongsTo(() => User)
      public user: BelongsTo<typeof User>
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    await db.insertQuery().table('profiles').insert([
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

  test('add runtime constraints to related query', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number
    }

    class Profile extends BaseModel {
      @column()
      public userId: number

      @belongsTo(() => User)
      public user: BelongsTo<typeof User>
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    await db.insertQuery().table('profiles').insert([
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
    const profiles = await Profile.query().preload('user', (builder) => builder.where('username', 'foo'))

    assert.lengthOf(profiles, 2)
    assert.isUndefined(profiles[0].user)
    assert.isUndefined(profiles[1].user)
  })

  test('cherry pick columns during preload', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    class Profile extends BaseModel {
      @column()
      public userId: number

      @belongsTo(() => User)
      public user: BelongsTo<typeof User>
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    await db.insertQuery().table('profiles').insert([
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

  test('do not repeat fk when already defined', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    class Profile extends BaseModel {
      @column()
      public userId: number

      @belongsTo(() => User)
      public user: BelongsTo<typeof User>
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    await db.insertQuery().table('profiles').insert([
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

  test('raise exception when local key is not selected', async (assert) => {
    assert.plan(1)

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    class Profile extends BaseModel {
      @column()
      public userId: number

      @belongsTo(() => User)
      public user: BelongsTo<typeof User>
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    await db.insertQuery().table('profiles').insert([
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
        ].join(' '),
      )
    }
  })

  test('preload using model instance', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number
    }

    class Profile extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public displayName: string

      @belongsTo(() => User)
      public user: BelongsTo<typeof User>
    }

    await db.insertQuery().table('users').insert([{ username: 'virk' }])

    const users = await db.query().from('users')
    await db.insertQuery().table('profiles').insert([
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
    await profile.preload('user')

    assert.instanceOf(profile.user, User)
    assert.equal(profile.user.id, profile.userId)
  })

  test('preload nested relations', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number
    }

    class Profile extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public displayName: string

      @belongsTo(() => User)
      public user: BelongsTo<typeof User>
    }

    class Identity extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public profileId: number

      @column()
      public identityName: string

      @belongsTo(() => Profile)
      public profile: BelongsTo<typeof Profile>
    }

    await db.insertQuery().table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await db.insertQuery().table('profiles').insert([
      {
        user_id: 1,
        display_name: 'virk',
      },
      {
        user_id: 2,
        display_name: 'nikk',
      },
    ])

    await db.insertQuery().table('identities').insert([
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

  test('preload nested relations using model instance', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number
    }

    class Profile extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public displayName: string

      @belongsTo(() => User)
      public user: BelongsTo<typeof User>
    }

    class Identity extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public profileId: number

      @column()
      public identityName: string

      @belongsTo(() => Profile)
      public profile: BelongsTo<typeof Profile>
    }

    await db.insertQuery().table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await db.insertQuery().table('profiles').insert([
      {
        user_id: 1,
        display_name: 'virk',
      },
      {
        user_id: 2,
        display_name: 'nikk',
      },
    ])

    await db.insertQuery().table('identities').insert([
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
    await identity.preload((preloader) => {
      preloader.preload('profile', (builder) => builder.preload('user'))
    })

    assert.instanceOf(identity!.profile, Profile)
    assert.instanceOf(identity!.profile!.user, User)
  })

  test('pass main query options down the chain', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number
    }

    class Profile extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public displayName: string

      @belongsTo(() => User)
      public user: BelongsTo<typeof User>
    }

    class Identity extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public profileId: number

      @column()
      public identityName: string

      @belongsTo(() => Profile)
      public profile: BelongsTo<typeof Profile>
    }

    await db.insertQuery().table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await db.insertQuery().table('profiles').insert([
      {
        user_id: 1,
        display_name: 'virk',
      },
      {
        user_id: 2,
        display_name: 'nikk',
      },
    ])

    await db.insertQuery().table('identities').insert([
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

  test('pass relationship metadata to the profiler', async (assert) => {
    assert.plan(1)

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number
    }

    class Profile extends BaseModel {
      @column()
      public userId: number

      @belongsTo(() => User)
      public user: BelongsTo<typeof User>
    }

    const profiler = getProfiler(true)

    let profilerPacketIndex = 0
    profiler.process((packet) => {
      if (profilerPacketIndex === 1) {
        assert.deepEqual(packet.data.relation, {
          model: 'Profile',
          relatedModel: 'User',
          type: 'belongsTo',
        })
      }
      profilerPacketIndex++
    })

    await db.insertQuery().table('users').insert({ username: 'virk' })
    await db.insertQuery().table('profiles').insert({ display_name: 'Hvirk', user_id: 1 })
    await Profile.query({ profiler }).preload('user')
  })

  test('work fine when foreign key is null', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number
    }

    class Profile extends BaseModel {
      @column()
      public userId: number

      @belongsTo(() => User)
      public user: BelongsTo<typeof User>
    }

    await db.insertQuery().table('profiles').insert({ display_name: 'Hvirk', user_id: null })

    Profile.boot()

    const profiles = await Profile.query().preload('user')
    assert.lengthOf(profiles, 1)

    assert.isUndefined(profiles[0].user)
  })

  test('do not run preload query when parent rows are empty', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number
    }

    class Profile extends BaseModel {
      @column()
      public userId: number

      @belongsTo(() => User)
      public user: BelongsTo<typeof User>
    }

    Profile.boot()

    const profiles = await Profile.query().preload('user', () => {
      throw new Error('not expected to be here')
    })
    assert.lengthOf(profiles, 0)
  })
})

test.group('Model | BelongsTo | associate', (group) => {
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

  test('associate related instance', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    class Profile extends BaseModel {
      @column()
      public userId: number

      @column()
      public displayName: string

      @belongsTo(() => User)
      public user: BelongsTo<typeof User>
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

  test('wrap associate call inside transaction', async (assert) => {
    assert.plan(3)

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    class Profile extends BaseModel {
      @column()
      public userId: number

      @column()
      public displayName: string

      @belongsTo(() => User)
      public user: BelongsTo<typeof User>
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

  test('dissociate relation', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    class Profile extends BaseModel {
      @column()
      public userId: number

      @column()
      public displayName: string

      @belongsTo(() => User)
      public user: BelongsTo<typeof User>
    }

    const [user] = await db.insertQuery().table('users').insert({ username: 'virk' }).returning('id')
    await db.insertQuery().table('profiles').insert({ display_name: 'Hvirk', user_id: user.id })

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

  test('disallow pagination', async (assert) => {
    assert.plan(1)

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number
    }

    class Profile extends BaseModel {
      @column()
      public userId: number

      @belongsTo(() => User)
      public user: BelongsTo<typeof User>
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

  test('clone related query builder', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }
    User.boot()

    class Profile extends BaseModel {
      @column()
      public userId: number

      @column()
      public displayName: string

      @belongsTo(() => User)
      public user: BelongsTo<typeof User>
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
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      public static fromCountry = scope((query, countryId) => {
        query.where('country_id', countryId)
      })
    }
    User.boot()

    class Profile extends BaseModel {
      @column()
      public userId: number

      @column()
      public displayName: string

      @belongsTo(() => User)
      public user: BelongsTo<typeof User>
    }
    Profile.boot()

    await db.insertQuery().table('users').insert({ username: 'virk' })
    await db.insertQuery().table('profiles').insert({ display_name: 'Hvirk', user_id: 1 })

    const profile = await Profile.query().preload('user', (builder) => {
      builder.apply((scopes) => scopes.fromCountry(1))
    }).first()

    const profileWithoutScope = await Profile.query().preload('user').first()
    assert.isUndefined(profile?.user)
    assert.instanceOf(profileWithoutScope?.user, User)
  })

  test('apply scopes on related query', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      public static fromCountry = scope((query, countryId) => {
        query.where('country_id', countryId)
      })
    }
    User.boot()

    class Profile extends BaseModel {
      @column()
      public userId: number

      @column()
      public displayName: string

      @belongsTo(() => User)
      public user: BelongsTo<typeof User>
    }
    Profile.boot()

    await db.insertQuery().table('users').insert({ username: 'virk' })
    await db.insertQuery().table('profiles').insert({ display_name: 'Hvirk', user_id: 1 })

    const profile = await Profile.query().firstOrFail()
    const profileUser = await profile.related('user').query().apply((scopes) => {
      scopes.fromCountry(1)
    }).first()
    const profileUserWithoutScopes = await profile.related('user').query().first()

    assert.isNull(profileUser)
    assert.instanceOf(profileUserWithoutScopes, User)
  })
})

test.group('Model | BelongsTo | onQuery', (group) => {
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
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }
    User.boot()

    class Profile extends BaseModel {
      @column()
      public userId: number

      @column()
      public displayName: string

      @belongsTo(() => User, {
        onQuery: (builder) => {
          builder.where('country_id', 1)
        },
      })
      public user: BelongsTo<typeof User>
    }
    Profile.boot()

    await db.insertQuery().table('users').insert({ username: 'virk' })
    await db.insertQuery().table('profiles').insert({ display_name: 'Hvirk', user_id: 1 })

    const profile = await Profile.query().preload('user').first()
    assert.isUndefined(profile?.user)
  })

  test('do not run onQuery hook on subqueries', async (assert) => {
    assert.plan(2)

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }
    User.boot()

    class Profile extends BaseModel {
      @column()
      public userId: number

      @column()
      public displayName: string

      @belongsTo(() => User, {
        onQuery: (builder) => {
          assert.isTrue(true)
          builder.where('country_id', 1)
        },
      })
      public user: BelongsTo<typeof User>
    }
    Profile.boot()

    await db.insertQuery().table('users').insert({ username: 'virk' })
    await db.insertQuery().table('profiles').insert({ display_name: 'Hvirk', user_id: 1 })

    const profile = await Profile.query().preload('user', (query) => {
      query.where((_) => {})
    }).first()

    assert.isUndefined(profile?.user)
  })

  test('invoke onQuery method on related query builder', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }
    User.boot()

    class Profile extends BaseModel {
      @column()
      public userId: number

      @column()
      public displayName: string

      @belongsTo(() => User, {
        onQuery: (builder) => {
          builder.where('country_id', 1)
        },
      })
      public user: BelongsTo<typeof User>
    }
    Profile.boot()

    await db.insertQuery().table('users').insert({ username: 'virk' })
    await db.insertQuery().table('profiles').insert({ display_name: 'Hvirk', user_id: 1 })
    const profile = await Profile.findOrFail(1)
    const user = await profile.related('user').query().first()
    assert.isNull(user)
  })

  test('do not run onQuery hook on related query builder subqueries', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }
    User.boot()

    class Profile extends BaseModel {
      @column()
      public userId: number

      @column()
      public displayName: string

      @belongsTo(() => User, {
        onQuery: (builder) => {
          builder.where('country_id', 1)
        },
      })
      public user: BelongsTo<typeof User>
    }
    Profile.boot()

    await db.insertQuery().table('users').insert({ username: 'virk' })
    await db.insertQuery().table('profiles').insert({ display_name: 'Hvirk', user_id: 1 })
    const profile = await Profile.findOrFail(1)

    const { sql, bindings } = profile.related('user').query().where((builder) => {
      builder.where('score', '>', 0)
    }).toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.connection()
      .from('users')
      .where('country_id', 1)
      .where((query) => query.where('score', '>', 0))
      .where('id', 1)
      .limit(1)
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })
})
