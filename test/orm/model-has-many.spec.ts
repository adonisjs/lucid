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
import { column, hasMany } from '../../src/Orm/Decorators'
import { ormAdapter, getBaseModel, setup, cleanup, resetTables, getDb } from '../../test-helpers'

let db: ReturnType<typeof getDb>
let BaseModel: ReturnType<typeof getBaseModel>

test.group('Model | Has Many', (group) => {
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
      class Post extends BaseModel {
      }

      class User extends BaseModel {
        @hasMany(() => Post)
        public posts: Post[]
      }

      User.$boot()
    } catch ({ message }) {
      assert.equal(
        message,
        'E_MISSING_RELATED_LOCAL_KEY: User.id required by User.posts relation is missing',
      )
    }
  })

  test('raise error when foreignKey is missing', (assert) => {
    assert.plan(1)

    try {
      class Post extends BaseModel {
      }
      Post.$boot()

      class User extends BaseModel {
        @column({ primary: true })
        public id: number

        @hasMany(() => Post)
        public posts: Post[]
      }

      User.$boot()
    } catch ({ message }) {
      assert.equal(
        message,
        'E_MISSING_RELATED_FOREIGN_KEY: Post.userId required by User.posts relation is missing',
      )
    }
  })

  test('use primary key is as the local key', (assert) => {
    class Post extends BaseModel {
      @column()
      public userId: number
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @hasMany(() => Post)
      public posts: Post[]
    }
    User.$boot()

    assert.equal(User.$getRelation('posts')!['localKey'], 'id')
    assert.equal(User.$getRelation('posts')!['localAdapterKey'], 'id')
  })

  test('use custom defined primary key', (assert) => {
    class Post extends BaseModel {
      @column()
      public userId: number
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @column({ castAs: 'user_uid' })
      public uid: number

      @hasMany(() => Post, { localKey: 'uid' })
      public posts: Post[]
    }

    User.$boot()

    assert.equal(User.$getRelation('posts')!['localKey'], 'uid')
    assert.equal(User.$getRelation('posts')!['localAdapterKey'], 'user_uid')
  })

  test('compute foreign key from model name and primary key', (assert) => {
    class Post extends BaseModel {
      @column()
      public userId: number
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @hasMany(() => Post)
      public posts: Post[]
    }
    User.$boot()

    assert.equal(User.$getRelation('posts')!['foreignKey'], 'userId')
    assert.equal(User.$getRelation('posts')!['foreignAdapterKey'], 'user_id')
  })

  test('use pre defined foreign key', (assert) => {
    class Post extends BaseModel {
      @column({ castAs: 'user_id' })
      public userUid: number
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @hasMany(() => Post, { foreignKey: 'userUid' })
      public posts: Post[]
    }
    User.$boot()

    assert.equal(User.$getRelation('posts')!['foreignKey'], 'userUid')
    assert.equal(User.$getRelation('posts')!['foreignAdapterKey'], 'user_id')
  })

  test('preload has many relationship', async (assert) => {
    class Post extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public title: string
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @hasMany(() => Post)
      public posts: Post[]
    }

    await db.insertQuery().table('users').insert([{ username: 'virk' }, { username: 'nikk' }])

    const users = await db.query().from('users')
    await db.insertQuery().table('posts').insert([
      {
        user_id: users[0].id,
        title: 'Adonis 101',
      },
      {
        user_id: users[1].id,
        title: 'Lucid 101',
      },
    ])

    User.$boot()
    const user = await User.query().preload('posts').where('username', 'virk').first()
    assert.lengthOf(user!.posts, 1)
    assert.instanceOf(user!.posts[0], Post)
    assert.equal(user!.posts[0].userId, user!.id)
  })

  test('raise exception when local key is not selected', async (assert) => {
    assert.plan(1)

    class Post extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public title: string
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @hasMany(() => Post)
      public posts: Post[]
    }

    await db.insertQuery().table('users').insert([{ username: 'virk' }, { username: 'nikk' }])

    const users = await db.query().from('users')
    await db.insertQuery().table('posts').insert([
      {
        user_id: users[0].id,
        title: 'Adonis 101',
      },
      {
        user_id: users[1].id,
        title: 'Lucid 101',
      },
    ])

    try {
      await User.query().select('username').preload('posts').where('username', 'virk').first()
    } catch ({ message }) {
      assert.equal(message, 'Cannot preload posts, value of User.id is undefined')
    }
  })

  test('pass callback to preload', async (assert) => {
    class Post extends BaseModel {
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

      @hasMany(() => Post)
      public posts: Post[]
    }

    await db.insertQuery().table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await db.insertQuery().table('posts').insert([
      {
        user_id: 1,
        title: 'Adonis 101',
      },
      {
        user_id: 2,
        title: 'Lucid 101',
      },
    ])

    User.$boot()

    const user = await User.query().preload('posts', (builder) => {
      builder.whereNull('title')
    }).where('username', 'virk').first()

    assert.lengthOf(user!.posts, 0)
  })

  test('preload nested relations', async (assert) => {
    class Comment extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public postId: number

      @column()
      public body: string
    }

    class Post extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public title: string

      @hasMany(() => Comment)
      public comments: Comment[]
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @hasMany(() => Post)
      public posts: Post[]
    }

    await db.insertQuery().table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await db.insertQuery().table('posts').insert([
      {
        user_id: 1,
        title: 'Adonis 101',
      },
      {
        user_id: 2,
        title: 'Lucid 101',
      },
    ])

     await db.insertQuery().table('comments').insert([
      {
        post_id: 1,
        body: 'Looks nice',
      },
      {
        post_id: 2,
        body: 'Wow! Never knew that',
      },
    ])

    const user = await User.query()
      .preload('posts.comments')
      .where('username', 'virk')
      .first()

    assert.lengthOf(user!.posts, 1)
    assert.lengthOf(user!.posts[0].comments, 1)
    assert.equal(user!.posts[0].comments[0].postId, user!.posts[0].id)
  })

  test('preload nested relations with primary relation repeating twice', async (assert) => {
    class Comment extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public postId: number

      @column()
      public body: string
    }

    class Post extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public title: string

      @hasMany(() => Comment)
      public comments: Comment[]
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @hasMany(() => Post)
      public posts: Post[]
    }

    await db.insertQuery().table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await db.insertQuery().table('posts').insert([
      {
        user_id: 1,
        title: 'Adonis 101',
      },
      {
        user_id: 2,
        title: 'Lucid 101',
      },
    ])

     await db.insertQuery().table('comments').insert([
      {
        post_id: 1,
        body: 'Looks nice',
      },
      {
        post_id: 2,
        body: 'Wow! Never knew that',
      },
    ])

    const query = User.query()
      .preload('posts')
      .preload('posts.comments')
      .where('username', 'virk')

    const user = await query.first()
    assert.lengthOf(user!.posts, 1)
    assert.lengthOf(user!.posts[0].comments, 1)
    assert.equal(user!.posts[0].comments[0].postId, user!.posts[0].id)

    assert.lengthOf(Object.keys(query['_preloads']), 1)
    assert.property(query['_preloads'], 'posts')
    assert.lengthOf(query['_preloads'].posts.children, 1)
    assert.equal(query['_preloads'].posts.children[0].relationName, 'comments')
  })

  test('pass main query options down the chain', async (assert) => {
    class Comment extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public postId: number

      @column()
      public body: string
    }

    class Post extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public title: string

      @hasMany(() => Comment)
      public comments: Comment[]
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @hasMany(() => Post)
      public posts: Post[]
    }

    await db.insertQuery().table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await db.insertQuery().table('posts').insert([
      {
        user_id: 1,
        title: 'Adonis 101',
      },
      {
        user_id: 2,
        title: 'Lucid 101',
      },
    ])

     await db.insertQuery().table('comments').insert([
      {
        post_id: 1,
        body: 'Looks nice',
      },
      {
        post_id: 2,
        body: 'Wow! Never knew that',
      },
    ])

    const query = User.query({ connection: 'secondary' })
      .preload('posts')
      .preload('posts.comments')
      .where('username', 'virk')

    const user = await query.first()
    assert.lengthOf(user!.posts, 1)
    assert.lengthOf(user!.posts[0].comments, 1)
    assert.equal(user!.posts[0].comments[0].postId, user!.posts[0].id)

    assert.equal(user!.$options!.connection, 'secondary')
    assert.equal(user!.posts[0].$options!.connection, 'secondary')
    assert.equal(user!.posts[0].comments[0].$options!.connection, 'secondary')
  })
})
