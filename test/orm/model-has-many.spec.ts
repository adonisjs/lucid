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
import { HasMany } from '@ioc:Adonis/Lucid/Orm'

import { column, hasMany } from '../../src/Orm/Decorators'
import {
  setup,
  getDb,
  cleanup,
  getPosts,
  ormAdapter,
  getProfiler,
  resetTables,
  getBaseModel,
} from '../../test-helpers'

let db: ReturnType<typeof getDb>
let BaseModel: ReturnType<typeof getBaseModel>

test.group('Model | HasMany | Options', (group) => {
  group.before(async () => {
    db = getDb()
    BaseModel = getBaseModel(ormAdapter(db))
  })

  test('raise error when localKey is missing', (assert) => {
    assert.plan(1)

    try {
      class Post extends BaseModel {
      }

      class User extends BaseModel {
        @hasMany(() => Post)
        public posts: HasMany<Post>
      }

      User.boot()
      User.$getRelation('posts').boot()
    } catch ({ message }) {
      assert.equal(
        message,
        'E_MISSING_MODEL_ATTRIBUTE: "User.posts" expects "id" to exist on "User" model, but is missing',
      )
    }
  })

  test('raise error when foreignKey is missing', (assert) => {
    assert.plan(1)

    try {
      class Post extends BaseModel {
      }
      Post.boot()

      class User extends BaseModel {
        @column({ isPrimary: true })
        public id: number

        @hasMany(() => Post)
        public posts: HasMany<Post>
      }

      User.boot()
      User.$getRelation('posts').boot()
    } catch ({ message }) {
      assert.equal(
        message,
        'E_MISSING_MODEL_ATTRIBUTE: "User.posts" expects "userId" to exist on "Post" model, but is missing',
      )
    }
  })

  test('use primary key as the local key', (assert) => {
    class Post extends BaseModel {
      @column()
      public userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasMany(() => Post)
      public posts: HasMany<Post>
    }

    User.boot()
    User.$getRelation('posts').boot()

    assert.equal(User.$getRelation('posts')!['localKey'], 'id')
  })

  test('use custom defined primary key', (assert) => {
    class Post extends BaseModel {
      @column()
      public userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column({ columnName: 'user_uid' })
      public uid: number

      @hasMany(() => Post, { localKey: 'uid' })
      public posts: HasMany<Post>
    }

    User.boot()
    User.$getRelation('posts').boot()

    assert.equal(User.$getRelation('posts')!['localKey'], 'uid')
  })

  test('compute foreign key from model name and primary key', (assert) => {
    class Post extends BaseModel {
      @column()
      public userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasMany(() => Post)
      public posts: HasMany<Post>
    }

    User.boot()
    User.$getRelation('posts').boot()

    assert.equal(User.$getRelation('posts')!['foreignKey'], 'userId')
  })

  test('use pre defined foreign key', (assert) => {
    class Post extends BaseModel {
      @column({ columnName: 'user_id' })
      public userUid: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasMany(() => Post, { foreignKey: 'userUid' })
      public posts: HasMany<Post>
    }

    User.boot()
    User.$getRelation('posts').boot()

    assert.equal(User.$getRelation('posts')!['foreignKey'], 'userUid')
  })
})

test.group('Model | HasMany | Set Relations', (group) => {
  group.before(async () => {
    db = getDb()
    BaseModel = getBaseModel(ormAdapter(db))
  })

  test('set related model instance', (assert) => {
    class Post extends BaseModel {
      @column()
      public userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasMany(() => Post)
      public posts: HasMany<Post>
    }

    User.boot()
    User.$getRelation('posts').boot()

    const user = new User()
    const post = new Post()
    User.$getRelation('posts').$setRelated(user, [post])
    assert.deepEqual(user.posts, [post])
  })

  test('push related model instance', (assert) => {
    class Post extends BaseModel {
      @column()
      public userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasMany(() => Post)
      public posts: HasMany<Post>
    }

    User.boot()
    User.$getRelation('posts').boot()

    const user = new User()
    const post = new Post()
    const post1 = new Post()

    User.$getRelation('posts').$setRelated(user, [post])
    User.$getRelation('posts').$pushRelated(user, [post1])

    assert.deepEqual(user.posts, [post, post1])
  })

  test('set many of related instances', (assert) => {
    class Post extends BaseModel {
      @column()
      public userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasMany(() => Post)
      public posts: HasMany<Post>
    }

    User.boot()
    User.$getRelation('posts').boot()

    const user = new User()
    user.fill({ id: 1 })

    const user1 = new User()
    user1.fill({ id: 2 })

    const user2 = new User()
    user2.fill({ id: 3 })

    const post = new Post()
    post.fill({ userId: 1 })

    const post1 = new Post()
    post1.fill({ userId: 2 })

    const post2 = new Post()
    post2.fill({ userId: 1 })

    User.$getRelation('posts').$setRelatedForMany([user, user1, user2], [post, post1, post2])
    assert.deepEqual(user.posts, [post, post2])
    assert.deepEqual(user1.posts, [post1])
    assert.deepEqual(user2.posts, [] as any)
  })
})

test.group('Model | HasMany | bulk operations', (group) => {
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
    class Post extends BaseModel {
      @column()
      public userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasMany(() => Post)
      public posts: HasMany<Post>
    }

    User.boot()
    User.$getRelation('posts').boot()

    await db.table('users').insert({ username: 'virk' })

    const user = await User.find(1)
    const { sql, bindings } = user!.related('posts').query().toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.connection()
      .getWriteClient()
      .from('posts')
      .where('user_id', 1)
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('generate correct sql for selecting related many rows', async (assert) => {
    class Post extends BaseModel {
      @column()
      public userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasMany(() => Post)
      public posts: HasMany<Post>
    }

    User.boot()
    User.$getRelation('posts').boot()

    await db.table('users').multiInsert([
      { username: 'virk' },
      { username: 'nikk' },
    ])

    const users = await User.all()

    const related = User.$getRelation('posts').client(users, db.connection())
    const { sql, bindings } = related.query().toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.connection()
      .getWriteClient()
      .from('posts')
      .whereIn('user_id', [2, 1])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('generate correct sql for updating related rows', async (assert) => {
    class Post extends BaseModel {
      @column()
      public userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasMany(() => Post)
      public posts: HasMany<Post>
    }

    User.boot()
    User.$getRelation('posts').boot()

    await db.table('users').insert({ username: 'virk' })

    const user = await User.find(1)
    const { sql, bindings } = user!.related('posts').query().update({
      title: 'Adonis 101',
    }).toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.connection()
      .getWriteClient()
      .from('posts')
      .where('user_id', 1)
      .update({ title: 'Adonis 101' })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('generate correct sql for updating many rows', async (assert) => {
    class Post extends BaseModel {
      @column()
      public userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasMany(() => Post)
      public posts: HasMany<Post>
    }

    await db.table('users').multiInsert([
      { username: 'virk' },
      { username: 'nikk' },
    ])

    const users = await User.all()
    User.$getRelation('posts').boot()

    const now = new Date()
    const related = User.$getRelation('posts').client(users, db.connection())
    const { sql, bindings } = related.query().update({ updated_at: now }).toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.connection()
      .getWriteClient()
      .from('posts')
      .whereIn('user_id', [2, 1])
      .update({ updated_at: now })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('generate correct sql for deleting related row', async (assert) => {
    class Post extends BaseModel {
      @column()
      public userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasMany(() => Post)
      public posts: HasMany<Post>
    }

    await db.table('users').insert({ username: 'virk' })

    const user = await User.find(1)
    const { sql, bindings } = user!.related('posts').query().del().toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.connection()
      .getWriteClient()
      .from('posts')
      .where('user_id', 1)
      .del()
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('generate correct sql for deleting many rows', async (assert) => {
    class Post extends BaseModel {
      @column()
      public userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasMany(() => Post)
      public posts: HasMany<Post>
    }

    await db.table('users').multiInsert([
      { username: 'virk' },
      { username: 'nikk' },
    ])

    const users = await User.all()
    User.$getRelation('posts').boot()

    const related = User.$getRelation('posts').client(users, db.connection())
    const { sql, bindings } = related.query().del().toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.connection()
      .getWriteClient()
      .from('posts')
      .whereIn('user_id', [2, 1])
      .del()
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })
})

test.group('Model | HasMany | aggregates', (group) => {
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

  test('get total of all related rows', async (assert) => {
    class Post extends BaseModel {
      @column()
      public userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasMany(() => Post)
      public posts: HasMany<Post>
    }

    User.boot()
    User.$getRelation('posts').boot()

    await db.table('users').insert({ username: 'virk' })
    await db.table('posts').multiInsert([
      { title: 'Adonis 101', user_id: 1 },
      { title: 'Lucid 101', user_id: 1 },
      { title: 'Profiler 101', user_id: 2 },
    ])

    const user = await User.find(1)
    const total = await user!.related('posts').query().count('* as total')
    assert.equal(Number(total[0].total), 2)
  })
})

test.group('Model | HasMany | preload', (group) => {
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
    class Post extends BaseModel {
      @column()
      public userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasMany(() => Post)
      public posts: HasMany<Post>
    }

    await db.insertQuery().table('users').insert([{ username: 'virk' }, { username: 'nikk' }])

    const [user0, user1] = await db.query().from('users')
    await db.insertQuery().table('posts').insert([
      {
        user_id: user0.id,
        title: 'Adonis 101',
      },
      {
        user_id: user1.id,
        title: 'Lucid 101',
      },
    ])

    User.boot()

    const users = await User.query().preload('posts')
    assert.lengthOf(users, 2)

    assert.equal(users[0].posts[0].userId, users[0].id)
    assert.equal(users[1].posts[0].userId, users[1].id)
  })

  test('preload relationship for many rows', async (assert) => {
    class Post extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public title: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasMany(() => Post)
      public posts: HasMany<Post>
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

    User.boot()
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

  test('add constraints during preload', async (assert) => {
    class Post extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public title: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasMany(() => Post)
      public posts: HasMany<Post>
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

    User.boot()

    const users = await User.query().preload('posts', (builder) => builder.where('title', 'Lucid 101'))
    assert.lengthOf(users, 2)

    assert.lengthOf(users[0].posts, 1)
    assert.equal(users[0].posts[0].title, 'Lucid 101')
    assert.lengthOf(users[1].posts, 0)
  })

  test('cherry pick columns during preload', async (assert) => {
    class Post extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public title: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasMany(() => Post)
      public posts: HasMany<Post>
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

    User.boot()

    const users = await User.query().preload('posts', (builder) => {
      return builder.select('title')
    })

    assert.lengthOf(users, 2)
    assert.deepEqual(users[0].posts[0].extras, {})
    assert.deepEqual(users[1].posts[0].extras, {})
  })

  test('do not repeat fk when already defined', async (assert) => {
    class Post extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public title: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasMany(() => Post)
      public posts: HasMany<Post>
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

    User.boot()

    const users = await User.query().preload('posts', (builder) => {
      return builder.select('title', 'user_id')
    })

    assert.lengthOf(users, 2)
    assert.deepEqual(users[0].posts[0].extras, {})
    assert.deepEqual(users[1].posts[0].extras, {})
  })

  test('raise exception when local key is not selected', async (assert) => {
    assert.plan(1)

    class Post extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public title: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasMany(() => Post)
      public posts: HasMany<Post>
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

    try {
      await User.query().select('username').preload('posts').where('username', 'virk').first()
    } catch ({ message }) {
      assert.equal(message, 'Cannot preload "posts", value of "User.id" is undefined')
    }
  })

  test('preload nested relations', async (assert) => {
    class Comment extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public postId: number

      @column()
      public body: string
    }

    class Post extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public title: string

      @hasMany(() => Comment)
      public comments: HasMany<Comment>
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasMany(() => Post)
      public posts: HasMany<Post>
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
      .preload('posts', (builder) => builder.preload('comments'))
      .where('username', 'virk')
      .first()

    assert.lengthOf(user!.posts, 1)
    assert.lengthOf(user!.posts[0].comments, 1)
    assert.equal(user!.posts[0].comments[0].postId, user!.posts[0].id)
  })

  test('preload nested relations using model instance', async (assert) => {
    class Comment extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public postId: number

      @column()
      public body: string
    }

    class Post extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public title: string

      @hasMany(() => Comment)
      public comments: HasMany<Comment>
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasMany(() => Post)
      public posts: HasMany<Post>
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
      preloader.preload('posts', (builder) => builder.preload('comments'))
    })

    await users[1].preload((preloader) => {
      preloader.preload('posts', (builder) => builder.preload('comments'))
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
      @column({ isPrimary: true })
      public id: number

      @column()
      public postId: number

      @column()
      public body: string
    }

    class Post extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public title: string

      @hasMany(() => Comment)
      public comments: HasMany<Comment>
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasMany(() => Post)
      public posts: HasMany<Post>
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
      .preload('posts', (builder) => builder.preload('comments'))
      .where('username', 'virk')

    const user = await query.first()
    assert.lengthOf(user!.posts, 1)
    assert.lengthOf(user!.posts[0].comments, 1)
    assert.equal(user!.posts[0].comments[0].postId, user!.posts[0].id)

    assert.equal(user!.options!.connection, 'secondary')
    assert.equal(user!.posts[0].options!.connection, 'secondary')
    assert.equal(user!.posts[0].comments[0].options!.connection, 'secondary')
  })

  test('pass relationship metadata to the profiler', async (assert) => {
    assert.plan(1)

    class Post extends BaseModel {
      @column()
      public userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasMany(() => Post)
      public posts: HasMany<Post>
    }

    await db.insertQuery().table('users').insert([{ username: 'virk' }, { username: 'nikk' }])

    const [user0, user1] = await db.query().from('users')
    await db.insertQuery().table('posts').insert([
      {
        user_id: user0.id,
        title: 'Adonis 101',
      },
      {
        user_id: user1.id,
        title: 'Lucid 101',
      },
    ])

    const profiler = getProfiler(true)

    let profilerPacketIndex = 0
    profiler.process((packet) => {
      if (profilerPacketIndex === 1) {
        assert.deepEqual(packet.data.relation, { model: 'User', relatedModel: 'Post', relation: 'hasMany' })
      }
      profilerPacketIndex++
    })

    User.boot()
    await User.query({ profiler }).preload('posts')
  })

  test('do not run preload query when parent rows are empty', async (assert) => {
    class Post extends BaseModel {
      @column()
      public userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasMany(() => Post)
      public posts: HasMany<Post>
    }

    User.boot()

    const users = await User.query().preload('posts', () => {
      throw new Error('not expected to be here')
    })

    assert.lengthOf(users, 0)
  })
})

test.group('Model | HasMany | save', (group) => {
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
      @column({ isPrimary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public title: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @hasMany(() => Post)
      public posts: HasMany<Post>
    }

    const user = new User()
    user.username = 'virk'
    await user.save()

    const post = new Post()
    post.title = 'Adonis 101'

    await user.related('posts').save(post)

    assert.isTrue(post.isPersisted)
    assert.equal(user.id, post.userId)

    const totalUsers = await db.query().from('users').count('*', 'total')
    const totalPosts = await db.query().from('posts').count('*', 'total')

    assert.equal(totalUsers[0].total, 1)
    assert.equal(totalPosts[0].total, 1)
  })
})

test.group('Model | HasMany | saveMany', (group) => {
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

  test('save many related instances', async (assert) => {
    class Post extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public title: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @hasMany(() => Post)
      public posts: HasMany<Post>
    }

    const user = new User()
    user.username = 'virk'
    await user.save()

    const post = new Post()
    post.title = 'Adonis 101'

    const post1 = new Post()
    post1.title = 'Lucid 101'

    await user.related('posts').saveMany([post, post1])

    assert.isTrue(post.isPersisted)
    assert.equal(user.id, post.userId)

    assert.isTrue(post1.isPersisted)
    assert.equal(user.id, post1.userId)

    const totalUsers = await db.query().from('users').count('*', 'total')
    const totalPosts = await db.query().from('posts').count('*', 'total')

    assert.equal(totalUsers[0].total, 1)
    assert.equal(totalPosts[0].total, 2)
  })

  test('wrap save many calls inside transaction', async (assert) => {
    assert.plan(6)

    class Post extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public title: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @hasMany(() => Post)
      public posts: HasMany<Post>
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
    assert.isUndefined(user.trx)
    assert.isUndefined(post.trx)
    assert.isUndefined(post1.trx)
  })

  test('use parent model transaction when exists', async (assert) => {
    class Post extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public title: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @hasMany(() => Post)
      public posts: HasMany<Post>
    }

    const trx = await db.transaction()
    const user = new User()
    user.trx = trx
    user.username = 'virk'

    const post = new Post()
    post.title = 'Adonis 101'

    try {
      await user.related('posts').saveMany([post])
    } catch (error) {
      console.log(error)
    }

    assert.isFalse(user.trx.isCompleted)
    await trx.rollback()

    const totalUsers = await db.query().from('users').count('*', 'total')
    const totalPosts = await db.query().from('posts').count('*', 'total')

    assert.equal(totalUsers[0].total, 0)
    assert.equal(totalPosts[0].total, 0)
    assert.isUndefined(user.trx)
    assert.isUndefined(post.trx)
  })
})

test.group('Model | HasMany | create', (group) => {
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

  test('create related instance', async (assert) => {
    class Post extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public title: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @hasMany(() => Post)
      public posts: HasMany<Post>
    }

    const user = new User()
    user.username = 'virk'
    await user.save()

    const post = await user.related('posts').create({ title: 'Adonis 101' })

    assert.isTrue(post.isPersisted)
    assert.equal(user.id, post.userId)

    const totalUsers = await db.query().from('users').count('*', 'total')
    const totalPosts = await db.query().from('posts').count('*', 'total')

    assert.equal(totalUsers[0].total, 1)
    assert.equal(totalPosts[0].total, 1)
  })
})

test.group('Model | HasMany | createMany', (group) => {
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

  test('create many related instances', async (assert) => {
    class Post extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public title: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @hasMany(() => Post)
      public posts: HasMany<Post>
    }

    const user = new User()
    user.username = 'virk'
    await user.save()

    const [post, post1] = await user.related('posts').createMany([
      {
        title: 'Adonis 101',
      },
      {
        title: 'Lucid 101',
      },
    ])

    assert.isTrue(post.isPersisted)
    assert.equal(user.id, post.userId)

    assert.isTrue(post1.isPersisted)
    assert.equal(user.id, post1.userId)

    const totalUsers = await db.query().from('users').count('*', 'total')
    const totalPosts = await db.query().from('posts').count('*', 'total')

    assert.equal(totalUsers[0].total, 1)
    assert.equal(totalPosts[0].total, 2)
  })

  test('wrap create many calls inside transaction', async (assert) => {
    assert.plan(4)

    class Post extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public title: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @hasMany(() => Post)
      public posts: HasMany<Post>
    }

    const user = new User()
    user.username = 'virk'

    try {
      await user.related('posts').createMany([{ title: 'Adonis 101' }, {}])
    } catch (error) {
      assert.exists(error)
    }

    const totalUsers = await db.query().from('users').count('*', 'total')
    const totalPosts = await db.query().from('posts').count('*', 'total')

    assert.equal(totalUsers[0].total, 0)
    assert.equal(totalPosts[0].total, 0)
    assert.isUndefined(user.trx)
  })

  test('use parent model transaction when already exists', async (assert) => {
    class Post extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public title: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @hasMany(() => Post)
      public posts: HasMany<Post>
    }

    const trx = await db.transaction()
    const user = new User()
    user.trx = trx
    user.username = 'virk'

    const [post] = await user.related('posts').createMany([{ title: 'Adonis 101' }])
    assert.isFalse(user.trx.isCompleted)
    await trx.rollback()

    const totalUsers = await db.query().from('users').count('*', 'total')
    const totalPosts = await db.query().from('posts').count('*', 'total')

    assert.equal(totalUsers[0].total, 0)
    assert.equal(totalPosts[0].total, 0)
    assert.isUndefined(user.trx)
    assert.isUndefined(post.trx)
  })
})

test.group('Model | HasMany | firstOrCreate', (group) => {
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

  test('create related instance when there isn\'t any existing row', async (assert) => {
    class Post extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public title: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @hasMany(() => Post)
      public posts: HasMany<Post>
    }

    const user = new User()
    user.username = 'virk'
    await user.save()

    await db.insertQuery().table('posts').insert({ title: 'Lucid 101' })
    const post = await user.related('posts').firstOrCreate({}, {
      title: 'Adonis 101',
    })

    assert.isTrue(post.isPersisted)
    assert.isTrue(post.isLocal)
    assert.equal(user.id, post.userId)
    assert.equal(post.title, 'Adonis 101')

    const posts = await db.query().from('posts').orderBy('id', 'asc')
    assert.lengthOf(posts, 2)
    assert.equal(posts[1].user_id, user.id)
  })

  test('return existing instance vs creating one', async (assert) => {
    class Post extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public title: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @hasMany(() => Post)
      public posts: HasMany<Post>
    }

    const user = new User()
    user.username = 'virk'
    await user.save()

    await db.insertQuery().table('posts').insert({ title: 'Lucid 101', user_id: user.id })
    const post = await user.related('posts').firstOrCreate({}, {
      title: 'Adonis 101',
    })

    assert.isTrue(post.isPersisted)
    assert.isFalse(post.isLocal)
    assert.equal(user.id, post.userId)
    assert.equal(post.title, 'Lucid 101')

    const posts = await db.query().from('posts').orderBy('id', 'asc')
    assert.lengthOf(posts, 1)
    assert.equal(posts[0].user_id, user.id)
  })
})

test.group('Model | HasMany | updateOrCreate', (group) => {
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

  test('create related instance when there isn\'t any existing row', async (assert) => {
    class Post extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public title: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @hasMany(() => Post)
      public posts: HasMany<Post>
    }

    const user = new User()
    user.username = 'virk'
    await user.save()

    await db.insertQuery().table('posts').insert({ title: 'Lucid 101' })
    const post = await user.related('posts').updateOrCreate({}, {
      title: 'Adonis 101',
    })

    assert.isTrue(post.isPersisted)
    assert.isTrue(post.isLocal)
    assert.equal(user.id, post.userId)
    assert.equal(post.title, 'Adonis 101')

    const posts = await db.query().from('posts').orderBy('id', 'asc')
    assert.lengthOf(posts, 2)
    assert.equal(posts[1].user_id, user.id)
  })

  test('update existing instance vs creating one', async (assert) => {
    class Post extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public title: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @hasMany(() => Post)
      public posts: HasMany<Post>
    }

    const user = new User()
    user.username = 'virk'
    await user.save()

    await db.insertQuery().table('posts').insert({ title: 'Lucid 101', user_id: user.id })
    const post = await user.related('posts').updateOrCreate({}, {
      title: 'Adonis 101',
    })

    assert.isTrue(post.isPersisted)
    assert.isFalse(post.isLocal)
    assert.equal(user.id, post.userId)
    assert.equal(post.title, 'Adonis 101')

    const posts = await db.query().from('posts').orderBy('id', 'asc')
    assert.lengthOf(posts, 1)
    assert.equal(posts[0].user_id, user.id)
    assert.equal(posts[0].title, 'Adonis 101')
  })
})

test.group('Model | HasMany | paginate', (group) => {
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

  test('paginate using related model query builder instance', async (assert) => {
    class Post extends BaseModel {
      @column()
      public userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasMany(() => Post)
      public posts: HasMany<Post>
    }

    User.boot()
    User.$getRelation('posts').boot()

    const [ userId ] = await db.table('users').insert({ username: 'virk' }).returning('id')
    await db.table('posts').multiInsert(getPosts(18, userId))

    const user = await User.find(1)
    const posts = await user!.related('posts').query().paginate(1, 5)
    posts.baseUrl('/posts')

    assert.lengthOf(posts.all(), 5)
    assert.instanceOf(posts.all()[0], Post)
    assert.equal(posts.perPage, 5)
    assert.equal(posts.currentPage, 1)
    assert.equal(posts.lastPage, 4)
    assert.isTrue(posts.hasPages)
    assert.isTrue(posts.hasMorePages)
    assert.isFalse(posts.isEmpty)
    assert.equal(posts.total, 18)
    assert.isTrue(posts.hasTotal)
    assert.deepEqual(posts.getMeta(), {
      total: 18,
      per_page: 5,
      current_page: 1,
      last_page: 4,
      first_page: 1,
      first_page_url: '/posts?page=1',
      last_page_url: '/posts?page=4',
      next_page_url: '/posts?page=2',
      previous_page_url: null,
    })
  })

  test('disallow paginate during preload', async (assert) => {
    assert.plan(1)

    class Post extends BaseModel {
      @column()
      public userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasMany(() => Post)
      public posts: HasMany<Post>
    }

    User.boot()
    User.$getRelation('posts').boot()

    await db.table('users').insert({ username: 'virk' })

    try {
      await User.query().preload('posts', (query) => {
        query.paginate(1, 5)
      })
    } catch ({ message }) {
      assert.equal(message, 'Cannot paginate relationship "posts" during preload')
    }
  })
})
