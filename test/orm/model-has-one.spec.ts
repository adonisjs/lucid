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
import { ormAdapter, getBaseModel, setup, cleanup, resetTables, getDb } from '../../test-helpers'

let db: ReturnType<typeof getDb>
let BaseModel: ReturnType<typeof getBaseModel>

test.group('Model | Has one', (group) => {
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

    assert.equal(User.$getRelation('profile')!['foreignKey'], 'userUid')
    assert.equal(User.$getRelation('profile')!['foreignAdapterKey'], 'user_id')
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

    assert.isNull(user!.profile)
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
    assert.lengthOf(Object.keys(query['_preloads']), 1)
    assert.property(query['_preloads'], 'profile')
    assert.lengthOf(query['_preloads'].profile.children, 1)
    assert.equal(query['_preloads'].profile.children[0].relationName, 'identity')
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
