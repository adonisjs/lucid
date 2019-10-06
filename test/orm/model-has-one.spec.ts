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
import { column, hasOne } from '../../src/Orm/Decorators'
import { HasOneQueryBuilder } from '../../src/Orm/Relations/HasOne/QueryBuilder'
import { ormAdapter, getBaseModel, setup, cleanup, resetTables, getDb } from '../../test-helpers'

let db: ReturnType<typeof getDb>
let BaseModel: ReturnType<typeof getBaseModel>

test.group('Model | HasOne | preload', (group) => {
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
      class Profile extends BaseModel {
      }

      class User extends BaseModel {
        @hasOne(() => Profile)
        public profile: Profile
      }

      User.$boot()
      User.$getRelation('profile')!.boot()
    } catch ({ message }) {
      assert.equal(
        message,
        'E_MISSING_RELATED_LOCAL_KEY: User.id required by User.profile relation is missing',
      )
    }
  })

  test('raise error when foreignKey is missing', (assert) => {
    assert.plan(1)

    try {
      class Profile extends BaseModel {
      }
      Profile.$boot()

      class User extends BaseModel {
        @column({ primary: true })
        public id: number

        @hasOne(() => Profile)
        public profile: Profile
      }

      User.$boot()
      User.$getRelation('profile')!.boot()
    } catch ({ message }) {
      assert.equal(
        message,
        'E_MISSING_RELATED_FOREIGN_KEY: Profile.userId required by User.profile relation is missing',
      )
    }
  })

  test('use primary key is as the local key', (assert) => {
    class Profile extends BaseModel {
      @column()
      public userId: number
    }
    Profile.$boot()

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @hasOne(() => Profile)
      public profile: Profile
    }

    User.$boot()
    User.$getRelation('profile')!.boot()

    assert.equal(User.$getRelation('profile')!['localKey'], 'id')
    assert.equal(User.$getRelation('profile')!['localAdapterKey'], 'id')
  })

  test('use custom defined primary key', (assert) => {
    class Profile extends BaseModel {
      @column()
      public userId: number
    }
    Profile.$boot()

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @column({ castAs: 'user_uid' })
      public uid: number

      @hasOne(() => Profile, { localKey: 'uid' })
      public profile: Profile
    }

    User.$boot()
    User.$getRelation('profile')!.boot()

    assert.equal(User.$getRelation('profile')!['localKey'], 'uid')
    assert.equal(User.$getRelation('profile')!['localAdapterKey'], 'user_uid')
  })

  test('compute foreign key from model name and primary key', (assert) => {
    class Profile extends BaseModel {
      @column()
      public userId: number
    }
    Profile.$boot()

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @hasOne(() => Profile)
      public profile: Profile
    }

    User.$boot()
    User.$getRelation('profile')!.boot()

    assert.equal(User.$getRelation('profile')!['foreignKey'], 'userId')
    assert.equal(User.$getRelation('profile')!['foreignAdapterKey'], 'user_id')
  })

  test('use pre defined foreign key', (assert) => {
    class Profile extends BaseModel {
      @column({ castAs: 'user_id' })
      public userUid: number
    }
    Profile.$boot()

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @hasOne(() => Profile, { foreignKey: 'userUid' })
      public profile: Profile
    }

    User.$boot()
    User.$getRelation('profile')!.boot()

    assert.equal(User.$getRelation('profile')!['foreignKey'], 'userUid')
    assert.equal(User.$getRelation('profile')!['foreignAdapterKey'], 'user_id')
  })

  test('get eager query', (assert) => {
    class Profile extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public displayName: string
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @hasOne(() => Profile)
      public profile: Profile
    }

    User.$getRelation('profile')!.boot()
    const user = new User()
    user.id = 1

    const { sql, bindings } = User.$getRelation('profile')!
      .getEagerQuery([user], User.query().client)
      .applyConstraints()
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.query()
      .from('profiles')
      .whereIn('user_id', [1])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('get query', (assert) => {
    class Profile extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public displayName: string
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @hasOne(() => Profile)
      public profile: Profile
    }

    User.$getRelation('profile')!.boot()
    const user = new User()
    user.id = 1

    const { sql, bindings } = User.$getRelation('profile')!
      .getQuery(user, User.query().client)
      .applyConstraints()
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.query()
      .from('profiles')
      .where('user_id', 1)
      .limit(1)
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('queries must be instance of has one query builder', (assert) => {
    class Profile extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public displayName: string
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @hasOne(() => Profile)
      public profile: Profile
    }

    User.$getRelation('profile')!.boot()
    const user = new User()
    user.id = 1

    const query = User.$getRelation('profile')!.getQuery(user, User.query().client)
    const eagerQuery = User.$getRelation('profile')!.getEagerQuery([user], User.query().client)

    assert.instanceOf(query, HasOneQueryBuilder)
    assert.instanceOf(eagerQuery, HasOneQueryBuilder)
  })

  test('preload has one relationship', async (assert) => {
    class Profile extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public displayName: string
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @hasOne(() => Profile)
      public profile: Profile
    }

    await db.insertQuery().table('users').insert([{ username: 'virk' }, { username: 'nikk' }])

    const users = await db.query().from('users')
    await db.insertQuery().table('profiles').insert([
      {
        user_id: users[0].id,
        display_name: 'virk',
      },
      {
        user_id: users[1].id,
        display_name: 'nikk',
      },
    ])

    User.$boot()

    const user = await User.query().preload('profile').where('username', 'virk').first()
    assert.instanceOf(user!.profile, Profile)
  })

  test('preload has one relationship using model instance', async (assert) => {
    class Profile extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public displayName: string
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @hasOne(() => Profile)
      public profile: Profile
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

    User.$boot()

    const users = await User.all()
    assert.lengthOf(users, 2)

    await users[0].preload('profile')
    await users[1].preload('profile')

    assert.equal(users[0].profile.userId, users[0].id)
    assert.equal(users[1].profile.userId, users[1].id)
  })

  test('raise exception when local key is not selected', async (assert) => {
    assert.plan(1)

    class Profile extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public displayName: string
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @hasOne(() => Profile)
      public profile: Profile
    }

    await db.insertQuery().table('users').insert([{ username: 'virk' }, { username: 'nikk' }])

    const users = await db.query().from('users')
    await db.insertQuery().table('profiles').insert([
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
      assert.equal(message, 'Cannot preload profile, value of User.id is undefined')
    }
  })

  test('pass callback to preload', async (assert) => {
    class Profile extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public displayName: string
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @hasOne(() => Profile)
      public profile: Profile
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

    User.$boot()

    const user = await User.query().preload('profile', (builder) => {
      builder.whereNull('display_name')
    }).where('username', 'virk').first()

    assert.isUndefined(user!.profile)
  })

  test('preload nested relations', async (assert) => {
    class Identity extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public profileId: number

      @column()
      public identityName: string
    }

    class Profile extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public displayName: string

      @hasOne(() => Identity)
      public identity: Identity
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @hasOne(() => Profile)
      public profile: Profile
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

    User.$boot()

    const user = await User.query()
      .preload('profile.identity')
      .where('username', 'virk')
      .first()

    assert.instanceOf(user!.profile, Profile)
    assert.instanceOf(user!.profile!.identity, Identity)
  })

  test('preload nested relations with primary relation repeating twice', async (assert) => {
    class Identity extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public profileId: number

      @column()
      public identityName: string
    }

    class Profile extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public displayName: string

      @hasOne(() => Identity)
      public identity: Identity
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @hasOne(() => Profile)
      public profile: Profile
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

    User.$boot()

    const query = User.query()
      .preload('profile')
      .preload('profile.identity')
      .where('username', 'virk')

    const user = await query.first()
    assert.instanceOf(user!.profile, Profile)
    assert.instanceOf(user!.profile!.identity, Identity)
    assert.lengthOf(Object.keys(query['_preloader']['_preloads']), 1)
    assert.property(query['_preloader']['_preloads'], 'profile')
    assert.lengthOf(query['_preloader']['_preloads'].profile.children, 1)
    assert.equal(query['_preloader']['_preloads'].profile.children[0].relationName, 'identity')
  })

  test('preload nested relations using model instance', async (assert) => {
    class Identity extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public profileId: number

      @column()
      public identityName: string
    }

    class Profile extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public displayName: string

      @hasOne(() => Identity)
      public identity: Identity
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @hasOne(() => Profile)
      public profile: Profile
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

    User.$boot()

    const users = await User.all()
    assert.lengthOf(users, 2)

    await users[0].preload((preloader) => {
      preloader.preload('profile').preload('profile.identity')
    })

    await users[1].preload((preloader) => {
      preloader.preload('profile').preload('profile.identity')
    })

    assert.instanceOf(users[0].profile, Profile)
    assert.instanceOf(users[0].profile!.identity, Identity)

    assert.instanceOf(users[1].profile, Profile)
    assert.instanceOf(users[1].profile!.identity, Identity)
  })

  test('pass main query options down the chain', async (assert) => {
    class Identity extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public profileId: number

      @column()
      public identityName: string
    }

    class Profile extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public displayName: string

      @hasOne(() => Identity)
      public identity: Identity
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @hasOne(() => Profile)
      public profile: Profile
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

    User.$boot()

    const query = User.query({ connection: 'secondary' })
      .preload('profile')
      .preload('profile.identity')
      .where('username', 'virk')

    const user = await query.first()
    assert.instanceOf(user!.profile, Profile)
    assert.instanceOf(user!.profile!.identity, Identity)

    assert.equal(user!.$options!.connection, 'secondary')
    assert.equal(user!.profile.$options!.connection, 'secondary')
    assert.equal(user!.profile.identity.$options!.connection, 'secondary')
  })
})

test.group('Model | HasOne | fetch related', (group) => {
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
    class Profile extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public displayName: string
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @hasOne(() => Profile)
      public profile: Profile
    }

    await db.insertQuery().table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await db.insertQuery().table('profiles').insert([
      {
        user_id: 1,
        display_name: 'virk',
      },
      {
        user_id: 1,
        display_name: 'virk',
      },
    ])

    const user = await User.findOrFail(1)
    const profiles = await user.related('profile')
    assert.lengthOf(profiles, 1)

    assert.instanceOf(profiles[0], Profile)
    assert.equal(profiles[0].userId, user.id)
  })

  test('fetch with preloads using model instance', async (assert) => {
    class Identity extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public profileId: number

      @column()
      public identityName: string
    }

    class Profile extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public displayName: string

      @hasOne(() => Identity)
      public identity: Identity
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @hasOne(() => Profile)
      public profile: Profile
    }

    await db.insertQuery().table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await db.insertQuery().table('profiles').insert([
      {
        user_id: 1,
        display_name: 'virk',
      },
      {
        user_id: 1,
        display_name: 'virk',
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

    const user = await User.findOrFail(1)
    const profiles = await user.related<'hasOne', 'profile'>('profile').preload('identity')
    assert.lengthOf(profiles, 1)

    assert.instanceOf(profiles[0], Profile)
    assert.equal(profiles[0].userId, user.id)

    assert.instanceOf(profiles[0].identity, Identity)
    assert.equal(profiles[0].identity.profileId, profiles[0].id)
  })

  test('use parent options to fetch related model instance', async (assert) => {
    class Identity extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public profileId: number

      @column()
      public identityName: string
    }

    class Profile extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public displayName: string

      @hasOne(() => Identity)
      public identity: Identity
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @hasOne(() => Profile)
      public profile: Profile
    }

    await db.insertQuery().table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await db.insertQuery().table('profiles').insert([
      {
        user_id: 1,
        display_name: 'virk',
      },
      {
        user_id: 1,
        display_name: 'virk',
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

    const user = await User.query({ connection: 'secondary' }).firstOrFail()
    const profiles = await user.related<'hasOne', 'profile'>('profile').preload('identity')
    assert.lengthOf(profiles, 1)

    assert.instanceOf(profiles[0], Profile)
    assert.equal(profiles[0].$options!.connection, 'secondary')

    assert.instanceOf(profiles[0].identity, Identity)
    assert.equal(profiles[0].identity.profileId, profiles[0].id)
    assert.equal(profiles[0].identity.$options!.connection, 'secondary')
  })
})

test.group('Model | HasOne | persist', (group) => {
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
    class Profile extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public displayName: string
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public username: string

      @hasOne(() => Profile)
      public profile: Profile
    }

    const user = new User()
    user.username = 'virk'
    await user.save()

    const profile = new Profile()
    profile.displayName = 'Hvirk'

    await user.related<'hasOne', 'profile'>('profile').save(profile)

    assert.isTrue(profile.$persisted)
    assert.equal(user.id, profile.userId)
  })

  test('wrap save calls inside transaction', async (assert) => {
    assert.plan(5)

    class Profile extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public displayName: string
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public username: string

      @hasOne(() => Profile)
      public profile: Profile
    }

    const user = new User()
    user.username = 'virk'

    const profile = new Profile()

    try {
      await user.related<'hasOne', 'profile'>('profile').save(profile)
    } catch (error) {
      assert.exists(error)
    }

    const totalUsers = await db.query().from('users').count('*', 'total')
    const totalProfiles = await db.query().from('profiles').count('*', 'total')

    assert.equal(totalUsers[0].total, 0)
    assert.equal(totalProfiles[0].total, 0)
    assert.isUndefined(user.$trx)
    assert.isUndefined(profile.$trx)
  })

  test('do not wrap when wrapInTransaction is set to false', async (assert) => {
    assert.plan(5)

    class Profile extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public displayName: string
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public username: string

      @hasOne(() => Profile)
      public profile: Profile
    }

    const user = new User()
    user.username = 'virk'

    const profile = new Profile()

    try {
      await user.related<'hasOne', 'profile'>('profile').save(profile, false)
    } catch (error) {
      assert.exists(error)
    }

    const totalUsers = await db.query().from('users').count('*', 'total')
    const totalProfiles = await db.query().from('profiles').count('*', 'total')

    assert.equal(totalUsers[0].total, 1)
    assert.equal(totalProfiles[0].total, 0)
    assert.isUndefined(user.$trx)
    assert.isUndefined(profile.$trx)
  })

  test('do not wrap in transaction when parent has been persisted', async (assert) => {
    assert.plan(5)

    class Profile extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public displayName: string
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public username: string

      @hasOne(() => Profile)
      public profile: Profile
    }

    const user = new User()
    user.username = 'virk'
    await user.save()

    const profile = new Profile()

    try {
      await user.related<'hasOne', 'profile'>('profile').save(profile)
    } catch (error) {
      assert.exists(error)
    }

    const totalUsers = await db.query().from('users').count('*', 'total')
    const totalProfiles = await db.query().from('profiles').count('*', 'total')

    assert.equal(totalUsers[0].total, 1)
    assert.equal(totalProfiles[0].total, 0)
    assert.isUndefined(user.$trx)
    assert.isUndefined(profile.$trx)
  })

  test('use parent model transaction when defined', async (assert) => {
    assert.plan(4)

    class Profile extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public displayName: string
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public username: string

      @hasOne(() => Profile)
      public profile: Profile
    }

    const trx = await db.transaction()

    const user = new User()
    user.username = 'virk'
    user.$trx = trx
    await user.save()

    const profile = new Profile()
    profile.displayName = 'virk'

    await user.related<'hasOne', 'profile'>('profile').save(profile)
    await trx.rollback()

    const totalUsers = await db.query().from('users').count('*', 'total')
    const totalProfiles = await db.query().from('profiles').count('*', 'total')

    assert.equal(totalUsers[0].total, 0)
    assert.equal(totalProfiles[0].total, 0)
    assert.isUndefined(user.$trx)
    assert.isUndefined(profile.$trx)
  })

  test('create save point when parent is already in transaction', async (assert) => {
    assert.plan(5)

    class Profile extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public displayName: string
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public username: string

      @hasOne(() => Profile)
      public profile: Profile
    }

    const trx = await db.transaction()

    const user = new User()
    user.username = 'virk'
    user.$trx = trx

    const profile = new Profile()

    try {
      await user.related<'hasOne', 'profile'>('profile').save(profile)
    } catch (error) {
      assert.exists(error)
    }

    await trx.commit()

    const totalUsers = await db.query().from('users').count('*', 'total')
    const totalProfiles = await db.query().from('profiles').count('*', 'total')

    assert.equal(totalUsers[0].total, 0)
    assert.equal(totalProfiles[0].total, 0)
    assert.isUndefined(user.$trx)
    assert.isUndefined(profile.$trx)
  })
})
