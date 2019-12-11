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
import { HasManyQueryBuilder } from '../../src/Orm/Relations/HasMany/QueryBuilder'
import { ormAdapter, getBaseModel, setup, cleanup, resetTables, getDb } from '../../test-helpers'

let db: ReturnType<typeof getDb>
let BaseModel: ReturnType<typeof getBaseModel>

test.group('Model | HasMany', (group) => {
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
      User.$getRelation('posts')!.boot()
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
      User.$getRelation('posts')!.boot()
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
    User.$getRelation('posts')!.boot()

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
    User.$getRelation('posts')!.boot()

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
    User.$getRelation('posts')!.boot()

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
    User.$getRelation('posts')!.boot()

    assert.equal(User.$getRelation('posts')!['foreignKey'], 'userUid')
    assert.equal(User.$getRelation('posts')!['foreignAdapterKey'], 'user_id')
  })

  test('get eager query', (assert) => {
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

    User.$getRelation('posts')!.boot()
    const user = new User()
    user.id = 1

    const { sql, bindings } = User.$getRelation('posts')!
      .getEagerQuery([user], User.query().client)
      .applyConstraints()
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.query()
      .from('posts')
      .whereIn('user_id', [1])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('get query', (assert) => {
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

    User.$getRelation('posts')!.boot()
    const user = new User()
    user.id = 1

    const { sql, bindings } = User.$getRelation('posts')!
      .getQuery(user, User.query().client)
      .applyConstraints()
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.query()
      .from('posts')
      .where('user_id', 1)
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('queries must be instance of has many query builder', (assert) => {
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

    User.$getRelation('posts')!.boot()
    const user = new User()
    user.id = 1

    const query = User.$getRelation('posts')!.getQuery(user, User.query().client)
    const eagerQuery = User.$getRelation('posts')!.getEagerQuery([user], User.query().client)

    assert.instanceOf(query, HasManyQueryBuilder)
    assert.instanceOf(eagerQuery, HasManyQueryBuilder)
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

    await db.insertQuery().table('users').insert([{ username: 'virk' }])

    const users = await db.query().from('users')
    await db.insertQuery().table('posts').insert([
      {
        user_id: users[0].id,
        title: 'Adonis 101',
      },
      {
        user_id: users[0].id,
        title: 'Lucid 101',
      },
    ])

    User.$boot()
    const user = await User.query().preload('posts').where('username', 'virk').first()
    assert.lengthOf(user!.posts, 2)
    assert.instanceOf(user!.posts[0], Post)
    assert.equal(user!.posts[0].userId, user!.id)

    assert.instanceOf(user!.posts[1], Post)
    assert.equal(user!.posts[1].userId, user!.id)
  })

  test('preload has many relationship for many rows', async (assert) => {
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
    await db.insertQuery().table('posts').insert([
      {
        user_id: 1,
        title: 'Adonis 101',
      },
      {
        user_id: 1,
        title: 'Lucid 101',
      },
      {
        user_id: 2,
        title: 'Lucid 102',
      },
    ])

    User.$boot()
    const users = await User.query().preload('posts')

    assert.lengthOf(users[0]!.posts, 2)
    assert.instanceOf(users[0].posts[0], Post)
    assert.equal(users[0].posts[0].userId, users[0].id)
    assert.instanceOf(users[0].posts[1], Post)
    assert.equal(users[0].posts[1].userId, users[0].id)

    assert.lengthOf(users[1]!.posts, 1)
    assert.instanceOf(users[1].posts[0], Post)
    assert.equal(users[1].posts[0].userId, users[1].id)
  })

  test('preload has many relationship using model instance', async (assert) => {
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
    await db.insertQuery().table('posts').insert([
      {
        user_id: 1,
        title: 'Adonis 101',
      },
      {
        user_id: 1,
        title: 'Lucid 101',
      },
      {
        user_id: 2,
        title: 'Lucid 102',
      },
    ])

    User.$boot()
    const users = await User.query().orderBy('id', 'asc')

    await users[0].preload('posts')
    await users[1].preload('posts')

    assert.lengthOf(users[0]!.posts, 2)
    assert.instanceOf(users[0].posts[0], Post)
    assert.equal(users[0].posts[0].userId, users[0].id)
    assert.instanceOf(users[0].posts[1], Post)
    assert.equal(users[0].posts[1].userId, users[0].id)

    assert.lengthOf(users[1]!.posts, 1)
    assert.instanceOf(users[1].posts[0], Post)
    assert.equal(users[1].posts[0].userId, users[1].id)
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

    assert.lengthOf(Object.keys(query['_preloader']['_preloads']), 1)
    assert.property(query['_preloader']['_preloads'], 'posts')
    assert.lengthOf(query['_preloader']['_preloads'].posts.children, 1)
    assert.equal(query['_preloader']['_preloads'].posts.children[0].relationName, 'comments')
  })

  test('preload nested relations using model instance', async (assert) => {
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

    const users = await User.all()

    await users[0].preload((preloader) => {
      preloader.preload('posts').preload('posts.comments')
    })

    await users[1].preload((preloader) => {
      preloader.preload('posts').preload('posts.comments')
    })

    assert.lengthOf(users[0].posts, 1)
    assert.lengthOf(users[0].posts[0].comments, 1)
    assert.equal(users[0].posts[0].comments[0].postId, users[0].posts[0].id)

    assert.lengthOf(users[1].posts, 1)
    assert.lengthOf(users[1].posts[0].comments, 1)
    assert.equal(users[1].posts[0].comments[0].postId, users[1].posts[0].id)
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

  test('push to existing relations when preloading using model instance', async (assert) => {
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
    await db.insertQuery().table('posts').insert([
      {
        user_id: 1,
        title: 'Adonis 101',
      },
      {
        user_id: 1,
        title: 'Lucid 101',
      },
      {
        user_id: 2,
        title: 'Lucid 102',
      },
    ])

    User.$boot()
    const users = await User.query().orderBy('id', 'asc')

    const dummyPost = new Post()
    dummyPost.fill({ userId: users[0].id, title: 'Dummy 101' })
    users[0].$setRelated('posts', [dummyPost])

    await users[0].preload('posts')
    await users[1].preload('posts')

    assert.lengthOf(users[0]!.posts, 3)
    assert.equal(users[0].posts[0].title, 'Dummy 101')

    assert.lengthOf(users[1]!.posts, 1)
    assert.equal(users[1].posts[0].title, 'Lucid 102')
  })
})

test.group('Model | HasMany | fetch related', (group) => {
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

    const user = await User.query().firstOrFail()
    const posts = await user.related('posts')

    assert.lengthOf(posts, 1)
    assert.equal(posts[0].userId, user.id)
  })

  test('fetch with preloads using model instance', async (assert) => {
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
        post_id: 1,
        body: 'Wow! Never knew that',
      },
    ])

    const user = await User.query().firstOrFail()
    const posts = await user.related<'hasMany', 'posts'>('posts').preload<'hasMany'>('comments')

    assert.lengthOf(posts, 1)
    assert.equal(posts[0].userId, user.id)
    assert.lengthOf(posts[0].comments, 2)

    assert.equal(posts[0].comments[0].postId, 1)
    assert.equal(posts[0].comments[0].body, 'Looks nice')

    assert.equal(posts[0].comments[1].postId, 1)
    assert.equal(posts[0].comments[1].body, 'Wow! Never knew that')
  })

  test('fetch with preloads using parent model options', async (assert) => {
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
        post_id: 1,
        body: 'Wow! Never knew that',
      },
    ])

    const user = await User.query({ connection: 'secondary' }).firstOrFail()
    const posts = await user.related<'hasMany', 'posts'>('posts').preload<'hasMany'>('comments')

    assert.lengthOf(posts, 1)
    assert.equal(posts[0].$options!.connection, 'secondary')
    assert.equal(posts[0].comments[0].$options!.connection, 'secondary')
    assert.equal(posts[0].comments[1].$options!.connection, 'secondary')
  })
})

test.group('Model | HasMany | persist', (group) => {
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

      @column()
      public username: string

      @hasMany(() => Post)
      public posts: Post[]
    }

    const user = new User()
    user.username = 'virk'
    await user.save()

    const post = new Post()
    post.title = 'Adonis 101'

    await user.related('posts').save(post)

    assert.isTrue(post.$persisted)
    assert.equal(user.id, post.userId)

    const totalUsers = await db.query().from('users').count('*', 'total')
    const totalPosts = await db.query().from('posts').count('*', 'total')

    assert.equal(totalUsers[0].total, 1)
    assert.equal(totalPosts[0].total, 1)
  })

  test('save many related instance', async (assert) => {
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

      @column()
      public username: string

      @hasMany(() => Post)
      public posts: Post[]
    }

    const user = new User()
    user.username = 'virk'
    await user.save()

    const post = new Post()
    post.title = 'Adonis 101'

    const post1 = new Post()
    post1.title = 'Lucid 101'

    await user.related('posts').saveMany([post, post1])

    assert.isTrue(post.$persisted)
    assert.equal(user.id, post.userId)

    assert.isTrue(post1.$persisted)
    assert.equal(user.id, post1.userId)

    const totalUsers = await db.query().from('users').count('*', 'total')
    const totalPosts = await db.query().from('posts').count('*', 'total')

    assert.equal(totalUsers[0].total, 1)
    assert.equal(totalPosts[0].total, 2)
  })

  test('wrap save calls inside transaction', async (assert) => {
    assert.plan(5)

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

      @column()
      public username: string

      @hasMany(() => Post)
      public posts: Post[]
    }

    const user = new User()
    user.username = 'virk'

    const post = new Post()

    try {
      await user.related('posts').save(post)
    } catch (error) {
      assert.exists(error)
    }

    const totalUsers = await db.query().from('users').count('*', 'total')
    const totalPosts = await db.query().from('posts').count('*', 'total')

    assert.equal(totalUsers[0].total, 0)
    assert.equal(totalPosts[0].total, 0)
    assert.isUndefined(user.$trx)
    assert.isUndefined(post.$trx)
  })

  test('wrap save many calls inside transaction', async (assert) => {
    assert.plan(6)

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

      @column()
      public username: string

      @hasMany(() => Post)
      public posts: Post[]
    }

    const user = new User()
    user.username = 'virk'

    const post = new Post()
    post.title = 'Adonis 101'

    const post1 = new Post()

    try {
      await user.related('posts').saveMany([post, post1])
    } catch (error) {
      assert.exists(error)
    }

    const totalUsers = await db.query().from('users').count('*', 'total')
    const totalPosts = await db.query().from('posts').count('*', 'total')

    assert.equal(totalUsers[0].total, 0)
    assert.equal(totalPosts[0].total, 0)
    assert.isUndefined(user.$trx)
    assert.isUndefined(post.$trx)
    assert.isUndefined(post1.$trx)
  })

  test('do not wrap when wrapInTransaction is set to false', async (assert) => {
    assert.plan(5)

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

      @column()
      public username: string

      @hasMany(() => Post)
      public posts: Post[]
    }

    const user = new User()
    user.username = 'virk'

    const post = new Post()

    try {
      await user.related('posts').save(post, false)
    } catch (error) {
      assert.exists(error)
    }

    const totalUsers = await db.query().from('users').count('*', 'total')
    const totalPosts = await db.query().from('posts').count('*', 'total')

    assert.equal(totalUsers[0].total, 1)
    assert.equal(totalPosts[0].total, 0)
    assert.isUndefined(user.$trx)
    assert.isUndefined(post.$trx)
  })

  test('do not wrap with saveMany when wrapInTransaction is set to false', async (assert) => {
    assert.plan(5)

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

      @column()
      public username: string

      @hasMany(() => Post)
      public posts: Post[]
    }

    const user = new User()
    user.username = 'virk'

    const post = new Post()
    post.title = 'Adonis 101'

    const post1 = new Post()

    try {
      await user.related('posts').saveMany([post, post1], false)
    } catch (error) {
      assert.exists(error)
    }

    const totalUsers = await db.query().from('users').count('*', 'total')
    const totalPosts = await db.query().from('posts').count('*', 'total')

    assert.equal(totalUsers[0].total, 1)
    assert.equal(totalPosts[0].total, 1)
    assert.isUndefined(user.$trx)
    assert.isUndefined(post.$trx)
  })

  test('do not wrap in transaction when parent has been persisted', async (assert) => {
    assert.plan(5)

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

      @column()
      public username: string

      @hasMany(() => Post)
      public posts: Post[]
    }

    const user = new User()
    user.username = 'virk'
    await user.save()

    const post = new Post()

    try {
      await user.related('posts').save(post)
    } catch (error) {
      assert.exists(error)
    }

    const totalUsers = await db.query().from('users').count('*', 'total')
    const totalPosts = await db.query().from('posts').count('*', 'total')

    assert.equal(totalUsers[0].total, 1)
    assert.equal(totalPosts[0].total, 0)
    assert.isUndefined(user.$trx)
    assert.isUndefined(post.$trx)
  })

  test('do wrap in transaction with saveMany even when parent has been persisted', async (assert) => {
    assert.plan(6)

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

      @column()
      public username: string

      @hasMany(() => Post)
      public posts: Post[]
    }

    const user = new User()
    user.username = 'virk'
    await user.save()

    const post = new Post()
    post.title = 'Adonis 101'

    const post1 = new Post()

    try {
      await user.related('posts').saveMany([post, post1])
    } catch (error) {
      assert.exists(error)
    }

    const totalUsers = await db.query().from('users').count('*', 'total')
    const totalPosts = await db.query().from('posts').count('*', 'total')

    assert.equal(totalUsers[0].total, 1)
    assert.equal(totalPosts[0].total, 0)
    assert.isUndefined(user.$trx)
    assert.isUndefined(post.$trx)
    assert.isUndefined(post1.$trx)
  })

  test('use parent model transaction when defined', async (assert) => {
    assert.plan(4)

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

      @column()
      public username: string

      @hasMany(() => Post)
      public posts: Post[]
    }

    const trx = await db.transaction()

    const user = new User()
    user.username = 'virk'
    user.$trx = trx
    await user.save()

    const post = new Post()
    post.title = 'Adonis 101'

    await user.related('posts').save(post)
    await trx.rollback()

    const totalUsers = await db.query().from('users').count('*', 'total')
    const totalPosts = await db.query().from('posts').count('*', 'total')

    assert.equal(totalUsers[0].total, 0)
    assert.equal(totalPosts[0].total, 0)
    assert.isUndefined(user.$trx)
    assert.isUndefined(post.$trx)
  })

  test('use parent model transaction with save many when defined', async (assert) => {
    assert.plan(5)

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

      @column()
      public username: string

      @hasMany(() => Post)
      public posts: Post[]
    }

    const trx = await db.transaction()

    const user = new User()
    user.username = 'virk'
    user.$trx = trx
    await user.save()

    const post = new Post()
    post.title = 'Adonis 101'

    const post1 = new Post()
    post1.title = 'Lucid 101'

    await user.related('posts').saveMany([post, post1])
    await trx.rollback()

    const totalUsers = await db.query().from('users').count('*', 'total')
    const totalPosts = await db.query().from('posts').count('*', 'total')

    assert.equal(totalUsers[0].total, 0)
    assert.equal(totalPosts[0].total, 0)
    assert.isUndefined(user.$trx)
    assert.isUndefined(post.$trx)
    assert.isUndefined(post1.$trx)
  })

  test('create save point when parent is already in transaction', async (assert) => {
    assert.plan(5)

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

      @column()
      public username: string

      @hasMany(() => Post)
      public posts: Post[]
    }

    const trx = await db.transaction()

    const user = new User()
    user.username = 'virk'
    user.$trx = trx

    const post = new Post()

    try {
      await user.related('posts').save(post)
    } catch (error) {
      assert.exists(error)
    }
    await trx.commit()

    const totalUsers = await db.query().from('users').count('*', 'total')
    const totalPosts = await db.query().from('posts').count('*', 'total')

    assert.equal(totalUsers[0].total, 0)
    assert.equal(totalPosts[0].total, 0)
    assert.isUndefined(user.$trx)
    assert.isUndefined(post.$trx)
  })

  test('create save point with saveMany when parent is already in transaction', async (assert) => {
    assert.plan(5)

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

      @column()
      public username: string

      @hasMany(() => Post)
      public posts: Post[]
    }

    const trx = await db.transaction()

    const user = new User()
    user.username = 'virk'
    user.$trx = trx

    const post = new Post()
    post.title = 'Adonis 101'

    const post1 = new Post()

    try {
      await user.related('posts').saveMany([post, post1])
    } catch (error) {
      assert.exists(error)
    }
    await trx.commit()

    const totalUsers = await db.query().from('users').count('*', 'total')
    const totalPosts = await db.query().from('posts').count('*', 'total')

    assert.equal(totalUsers[0].total, 0)
    assert.equal(totalPosts[0].total, 0)
    assert.isUndefined(user.$trx)
    assert.isUndefined(post.$trx)
  })

  test('invoke hooks for related model', async (assert) => {
    assert.plan(1)

    class Post extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public title: string

      public static $boot () {
        if (this.$booted) {
          return
        }

        super.$boot()
        this.$before('save', (model) => {
          assert.instanceOf(model, Post)
        })
      }
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public username: string

      @hasMany(() => Post)
      public posts: Post[]
    }

    const user = new User()
    user.username = 'virk'
    await user.save()

    const post = new Post()
    post.title = 'Adonis 101'

    await user.related('posts').save(post)
  })

  test('invoke hooks when called saveMany', async (assert) => {
    assert.plan(2)

    class Post extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public title: string

      public static $boot () {
        if (this.$booted) {
          return
        }

        super.$boot()
        this.$before('save', (model) => {
          assert.instanceOf(model, Post)
        })
      }
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public username: string

      @hasMany(() => Post)
      public posts: Post[]
    }

    const user = new User()
    user.username = 'virk'
    await user.save()

    const post = new Post()
    post.title = 'Adonis 101'

    const post1 = new Post()
    post1.title = 'Lucid 101'

    await user.related('posts').saveMany([post, post1])
  })
})

test.group('Model | HasMany | bulk operation', (group) => {
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

      @column()
      public username: string

      @hasMany(() => Post)
      public posts: Post[]
    }

    await db.table('users').insert({ username: 'virk' })

    const user = await User.find(1)
    const { sql, bindings } = user!.related('posts').del().toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.connection()
      .getWriteClient()
      .from('posts')
      .where('user_id', 1)
      .del()
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('generate correct sql for updating related rows', async (assert) => {
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

      @column()
      public username: string

      @hasMany(() => Post)
      public posts: Post[]
    }

    await db.table('users').insert({ username: 'virk' })

    const user = await User.find(1)
    const { sql, bindings } = user!.related('posts').update({ title: 'Adonis 101' }).toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.connection()
      .getWriteClient()
      .from('posts')
      .where('user_id', 1)
      .update({ title: 'Adonis 101' })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })
})
