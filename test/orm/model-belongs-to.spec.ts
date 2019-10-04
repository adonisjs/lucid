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
import { column, belongsTo } from '../../src/Orm/Decorators'
import { BelongsToQueryBuilder } from '../../src/Orm/Relations/BelongsTo/QueryBuilder'
import { ormAdapter, getBaseModel, setup, cleanup, resetTables, getDb } from '../../test-helpers'

let db: ReturnType<typeof getDb>
let BaseModel: ReturnType<typeof getBaseModel>

test.group('Model | BelongsTo', (group) => {
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

  test('raise error when foreignKey is missing', (assert) => {
    assert.plan(1)

    try {
      class User extends BaseModel {
      }
      User.$boot()

      class Profile extends BaseModel {
        @belongsTo(() => User)
        public user: User
      }

      Profile.$boot()
      Profile.$getRelation('user')!.boot()

    } catch ({ message }) {
      assert.equal(
        message,
        'E_MISSING_RELATED_LOCAL_KEY: Profile.userId required by Profile.user relation is missing',
      )
    }
  })

  test('raise error when localKey is missing', (assert) => {
    assert.plan(1)

    try {
      class User extends BaseModel {
      }
      User.$boot()

      class Profile extends BaseModel {
        @column({ primary: true })
        public userId: number

        @belongsTo(() => User)
        public user: User
      }

      Profile.$boot()
      Profile.$getRelation('user')!.boot()
    } catch ({ message }) {
      assert.equal(
        message,
        'E_MISSING_RELATED_FOREIGN_KEY: User.id required by Profile.user relation is missing',
      )
    }
  })

  test('use primary key is as the local key', (assert) => {
    class User extends BaseModel {
      @column({ primary: true })
      public id: number
    }

    class Profile extends BaseModel {
      @column()
      public userId: number

      @belongsTo(() => User)
      public user: User
    }

    Profile.$getRelation('user')!.boot()

    assert.equal(Profile.$getRelation('user')!['localKey'], 'id')
    assert.equal(Profile.$getRelation('user')!['localAdapterKey'], 'id')
  })

  test('use custom defined local key', (assert) => {
    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @column({ castAs: 'user_uid' })
      public uid: number
    }

    class Profile extends BaseModel {
      @column()
      public userId: number

      @belongsTo(() => User, { localKey: 'uid' })
      public user: User
    }

    Profile.$getRelation('user')!.boot()

    assert.equal(Profile.$getRelation('user')!['localKey'], 'uid')
    assert.equal(Profile.$getRelation('user')!['localAdapterKey'], 'user_uid')
  })

  test('compute foreign key from model name and primary key', (assert) => {
    class User extends BaseModel {
      @column({ primary: true })
      public id: number
    }

    class Profile extends BaseModel {
      @column()
      public userId: number

      @belongsTo(() => User)
      public user: User
    }

    Profile.$getRelation('user')!.boot()

    assert.equal(Profile.$getRelation('user')!['foreignKey'], 'userId')
    assert.equal(Profile.$getRelation('user')!['foreignAdapterKey'], 'user_id')
  })

  test('use pre defined foreign key', (assert) => {
    class User extends BaseModel {
      @column({ primary: true })
      public id: number
    }

    class Profile extends BaseModel {
      @column({ castAs: 'user_id' })
      public userUid: number

      @belongsTo(() => User, { foreignKey: 'userUid' })
      public user: User
    }

    Profile.$getRelation('user')!.boot()

    assert.equal(Profile.$getRelation('user')!['foreignKey'], 'userUid')
    assert.equal(Profile.$getRelation('user')!['foreignAdapterKey'], 'user_id')
  })

  test('queries must be instance of belongs to query builder', (assert) => {
    class User extends BaseModel {
      @column({ primary: true })
      public id: number
    }

    class Profile extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public displayName: string

      @belongsTo(() => User)
      public user: User
    }

    Profile.$getRelation('user')!.boot()
    const profile = new Profile()
    profile.userId = 1

    const query = Profile.$getRelation('user')!.getQuery(profile, Profile.query().client)
    const eagerQuery = Profile.$getRelation('user')!.getQuery(profile, Profile.query().client)

    assert.instanceOf(query, BelongsToQueryBuilder)
    assert.instanceOf(eagerQuery, BelongsToQueryBuilder)
  })

  test('get eager query', (assert) => {
    class User extends BaseModel {
      @column({ primary: true })
      public id: number
    }

    class Profile extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public displayName: string

      @belongsTo(() => User)
      public user: User
    }

    Profile.$getRelation('user')!.boot()
    const profile = new Profile()
    profile.userId = 1

    const { sql, bindings } = Profile.$getRelation('user')!
      .getEagerQuery([profile], Profile.query().client)
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.query()
      .from('users')
      .whereIn('id', [1])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('get query', (assert) => {
    class User extends BaseModel {
      @column({ primary: true })
      public id: number
    }

    class Profile extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public displayName: string

      @belongsTo(() => User)
      public user: User
    }

    Profile.$getRelation('user')!.boot()
    const profile = new Profile()
    profile.userId = 1

    const { sql, bindings } = Profile.$getRelation('user')!
      .getQuery(profile, Profile.query().client)
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.query()
      .from('users')
      .where('id', 1)
      .limit(1)
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('preload belongsTo relationship', async (assert) => {
    class User extends BaseModel {
      @column({ primary: true })
      public id: number
    }

    class Profile extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public displayName: string

      @belongsTo(() => User)
      public user: User
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

    const profiles = await Profile.query().preload('user')
    assert.instanceOf(profiles[0].user, User)
    assert.instanceOf(profiles[1].user, User)
  })

  test('preload belongsTo relationship for many rows', async (assert) => {
    class User extends BaseModel {
      @column({ primary: true })
      public id: number
    }

    class Profile extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public displayName: string

      @belongsTo(() => User)
      public user: User
    }

    await db.insertQuery().table('users').insert([{ username: 'virk' }, { username: 'nikk' }])

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
      {
        user_id: users[1].id,
        display_name: 'nikk',
      },
    ])

    const profiles = await Profile.query().preload('user')
    assert.equal(profiles[0].user.id, 1)
    assert.equal(profiles[1].user.id, 1)
    assert.equal(profiles[2].user.id, 2)
  })

  test('preload using model instance', async (assert) => {
    class User extends BaseModel {
      @column({ primary: true })
      public id: number
    }

    class Profile extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public displayName: string

      @belongsTo(() => User)
      public user: User
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

  test('raise exception when foreign key is not selected', async (assert) => {
    assert.plan(1)
    class User extends BaseModel {
      @column({ primary: true })
      public id: number
    }

    class Profile extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public displayName: string

      @belongsTo(() => User)
      public user: User
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
      await Profile.query().select('display_name').preload('user').first()
    } catch ({ message }) {
      assert.equal(message, 'Cannot preload user, value of Profile.userId is undefined')
    }
  })

  test('pass callback to preload', async (assert) => {
    class User extends BaseModel {
      @column({ primary: true })
      public id: number
    }

    class Profile extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public displayName: string

      @belongsTo(() => User)
      public user: User
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

    const profile = await Profile.query().preload('user', (builder) => {
      builder.whereNull('username')
    }).first()

    assert.isNull(profile!.user)
  })

  test('preload nested relations', async (assert) => {
    class User extends BaseModel {
      @column({ primary: true })
      public id: number
    }

    class Profile extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public displayName: string

      @belongsTo(() => User)
      public user: User
    }

    class Identity extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public profileId: number

      @column()
      public identityName: string

      @belongsTo(() => Profile)
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

    const identity = await Identity.query()
      .preload('profile.user')
      .where('identity_name', 'virk')
      .first()

    assert.instanceOf(identity!.profile, Profile)
    assert.instanceOf(identity!.profile!.user, User)
  })

  test('preload nested relations with primary relation repeating twice', async (assert) => {
    class User extends BaseModel {
      @column({ primary: true })
      public id: number
    }

    class Profile extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public displayName: string

      @belongsTo(() => User)
      public user: User
    }

    class Identity extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public profileId: number

      @column()
      public identityName: string

      @belongsTo(() => Profile)
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

    const query = Identity.query()
      .preload('profile')
      .preload('profile.user')
      .where('identity_name', 'virk')

    const identity = await query.first()
    assert.instanceOf(identity!.profile, Profile)
    assert.instanceOf(identity!.profile!.user, User)
    assert.lengthOf(Object.keys(query['_preloader']['_preloads']), 1)
    assert.property(query['_preloader']['_preloads'], 'profile')
    assert.lengthOf(query['_preloader']['_preloads'].profile.children, 1)
    assert.equal(query['_preloader']['_preloads'].profile.children[0].relationName, 'user')
  })

  test('preload nested relations using model instance', async (assert) => {
    class User extends BaseModel {
      @column({ primary: true })
      public id: number
    }

    class Profile extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public displayName: string

      @belongsTo(() => User)
      public user: User
    }

    class Identity extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public profileId: number

      @column()
      public identityName: string

      @belongsTo(() => Profile)
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

    const identity = await Identity.query().firstOrFail()
    await identity.preload((preloader) => {
      preloader.preload('profile').preload('profile.user')
    })

    assert.instanceOf(identity!.profile, Profile)
    assert.instanceOf(identity!.profile!.user, User)
  })

  test('pass main query options down the chain', async (assert) => {
    class User extends BaseModel {
      @column({ primary: true })
      public id: number
    }

    class Profile extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public displayName: string

      @belongsTo(() => User)
      public user: User
    }

    class Identity extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public profileId: number

      @column()
      public identityName: string

      @belongsTo(() => Profile)
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

    const query = Identity.query({ connection: 'secondary' })
      .preload('profile')
      .preload('profile.user')
      .where('identity_name', 'virk')

    const identity = await query.first()
    assert.instanceOf(identity!.profile, Profile)
    assert.instanceOf(identity!.profile!.user, User)

    assert.equal(identity!.$options!.connection, 'secondary')
    assert.equal(identity!.profile.$options!.connection, 'secondary')
    assert.equal(identity!.profile.user.$options!.connection, 'secondary')
  })
})

// test.group('Model | BelongsTo | persist', (group) => {
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
//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public username: string
//     }

//     class Profile extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public userId: number

//       @column()
//       public displayName: string

//       @belongsTo(() => User)
//       public user: User
//     }

//     const profile = new Profile()
//     profile.displayName = 'virk'
//     await profile.save()

//     const user = new User()
//     user.username = 'virk'

//     await profile.associate('user', user)

//     assert.isTrue(profile.$persisted)
//     assert.equal(user.id, profile.userId)
//   })

//   test('use parent model transaction when defined', async (assert) => {
//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public username: string
//     }

//     class Profile extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public userId: number

//       @column()
//       public displayName: string

//       @belongsTo(() => User)
//       public user: User
//     }

//     const profile = new Profile()
//     profile.displayName = 'virk'
//     await profile.save()

//     const user = new User()
//     user.username = 'virk'

//     const trx = await db.transaction()
//     profile.$trx = trx
//     await profile.associate('user', user)

//     assert.isTrue(profile.$persisted)
//     assert.equal(user.id, profile.userId)

//     await trx.rollback()

//     const totalUsers = await db.from('users').count('*', 'total')
//     const profiles = await db.from('profiles')

//     assert.lengthOf(profiles, 1)
//     assert.equal(profiles[0].user_id, null)

//     assert.equal(totalUsers[0].total, 0)
//     assert.isUndefined(user.$trx)
//     assert.isUndefined(profile.$trx)
//   })

//   test('use parent model options when defined', async (assert) => {
//     class User extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public username: string
//     }

//     class Profile extends BaseModel {
//       @column({ primary: true })
//       public id: number

//       @column()
//       public userId: number

//       @column()
//       public displayName: string

//       @belongsTo(() => User)
//       public user: User
//     }

//     const profile = new Profile()
//     profile.displayName = 'virk'
//     profile.$options = { connection: 'secondary' }
//     await profile.save()

//     const user = new User()
//     user.username = 'virk'
//     await profile.associate('user', user)

//     assert.isTrue(profile.$persisted)
//     assert.equal(user.id, profile.userId)

//     assert.deepEqual(user.$options, { connection: 'secondary' })
//     assert.deepEqual(profile.$options, { connection: 'secondary' })
//   })
// })
