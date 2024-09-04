/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import type { HasMany } from '../../src/types/relations.js'

import { scope } from '../../src/orm/base_model/index.js'
import { column, hasMany } from '../../src/orm/decorators/index.js'
import { HasManyQueryBuilder } from '../../src/orm/relations/has_many/query_builder.js'

import {
  setup,
  getDb,
  cleanup,
  getPosts,
  ormAdapter,
  resetTables,
  getBaseModel,
} from '../../test-helpers/index.js'
import { AppFactory } from '@adonisjs/core/factories/app'

test.group('Model | HasMany | Options', (group) => {
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
      class Post extends BaseModel {}

      class User extends BaseModel {
        @hasMany(() => Post)
        declare posts: HasMany<typeof Post>
      }

      User.boot()
      User.$getRelation('posts')!.boot()
    } catch ({ message }) {
      assert.equal(message, '"User.posts" expects "id" to exist on "User" model, but is missing')
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
      class Post extends BaseModel {}
      Post.boot()

      class User extends BaseModel {
        @column({ isPrimary: true })
        declare id: number

        @hasMany(() => Post)
        declare posts: HasMany<typeof Post>
      }

      User.boot()
      User.$getRelation('posts')!.boot()
    } catch ({ message }) {
      assert.equal(
        message,
        '"User.posts" expects "userId" to exist on "Post" model, but is missing'
      )
    }
  })

  test('use primary key as the local key', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column()
      declare userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    User.boot()
    User.$getRelation('posts')!.boot()

    assert.equal(User.$getRelation('posts')!['localKey'], 'id')
  })

  test('use custom defined primary key', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column()
      declare userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column({ columnName: 'user_uid' })
      declare uid: number

      @hasMany(() => Post, { localKey: 'uid' })
      declare posts: HasMany<typeof Post>
    }

    User.boot()
    User.$getRelation('posts')!.boot()

    assert.equal(User.$getRelation('posts')!['localKey'], 'uid')
  })

  test('compute foreign key from model name and primary key', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column()
      declare userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    User.boot()
    User.$getRelation('posts')!.boot()

    assert.equal(User.$getRelation('posts')!['foreignKey'], 'userId')
  })

  test('use pre defined foreign key', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column({ columnName: 'user_id' })
      declare userUid: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasMany(() => Post, { foreignKey: 'userUid' })
      declare posts: HasMany<typeof Post>
    }

    User.boot()
    User.$getRelation('posts')!.boot()

    assert.equal(User.$getRelation('posts')!['foreignKey'], 'userUid')
  })

  test('clone relationship instance with options during inheritance', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column({ columnName: 'user_id' })
      declare userUid: number
    }

    class BaseUser extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasMany(() => Post, { foreignKey: 'userUid' })
      declare posts: HasMany<typeof Post>
    }

    class User extends BaseUser {}

    User.boot()
    User.$getRelation('posts')!.boot()

    assert.deepEqual(User.$getRelation('posts')!.model, User)
    assert.equal(User.$getRelation('posts')!['foreignKey'], 'userUid')
  })
})

test.group('Model | HasMany | Set Relations', (group) => {
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

    class Post extends BaseModel {
      @column()
      declare userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    User.boot()
    User.$getRelation('posts')!.boot()

    const user = new User()
    user.fill({ id: 1 })

    const post = new Post()
    post.fill({ userId: 1 })

    User.$getRelation('posts')!.setRelated(user, [post])
    assert.deepEqual(user.posts, [post])
  })

  test('push related model instance', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column()
      declare userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    User.boot()
    User.$getRelation('posts')!.boot()

    const user = new User()
    user.fill({ id: 1 })

    const post = new Post()
    post.fill({ userId: 1 })

    const post1 = new Post()
    post1.fill({ userId: 1 })

    User.$getRelation('posts')!.setRelated(user, [post])
    User.$getRelation('posts')!.pushRelated(user, [post1])

    assert.deepEqual(user.posts, [post, post1])
  })

  test('set many of related instances', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column()
      declare userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    User.boot()
    User.$getRelation('posts')!.boot()

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

    User.$getRelation('posts')!.setRelatedForMany([user, user1, user2], [post, post1, post2])
    assert.deepEqual(user.posts, [post, post2])
    assert.deepEqual(user1.posts, [post1])
    assert.deepEqual(user2.posts, [] as any)
  })
})

test.group('Model | HasMany | bulk operations', (group) => {
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

    class Post extends BaseModel {
      @column()
      declare userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    User.boot()
    User.$getRelation('posts')!.boot()

    await db.table('users').insert({ username: 'virk' })

    const user = await User.find(1)
    const { sql, bindings } = user!.related('posts').query().toSQL()

    const { sql: knexSql, bindings: knexBindings } = db
      .connection()
      .getWriteClient()
      .from('posts')
      .where('user_id', 1)
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

    class Post extends BaseModel {
      @column()
      declare userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    User.boot()
    User.$getRelation('posts')!.boot()

    await db.table('users').multiInsert([{ username: 'virk' }, { username: 'nikk' }])

    const users = await User.all()

    const related = User.$getRelation('posts')!.eagerQuery(users, db.connection())
    const { sql, bindings } = related.toSQL()

    const { sql: knexSql, bindings: knexBindings } = db
      .connection()
      .getWriteClient()
      .from('posts')
      .whereIn('user_id', [2, 1])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('generate correct sql for updating related rows', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column()
      declare userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    User.boot()
    User.$getRelation('posts')!.boot()

    await db.table('users').insert({ username: 'virk' })

    const user = await User.find(1)
    const { sql, bindings } = user!
      .related('posts')
      .query()
      .update({
        title: 'Adonis 101',
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = db
      .connection()
      .getWriteClient()
      .from('posts')
      .where('user_id', 1)
      .update({ title: 'Adonis 101' })
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

    class Post extends BaseModel {
      @column()
      declare userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    await db.table('users').insert({ username: 'virk' })

    const user = await User.find(1)
    const { sql, bindings } = user!.related('posts').query().del().toSQL()

    const { sql: knexSql, bindings: knexBindings } = db
      .connection()
      .getWriteClient()
      .from('posts')
      .where('user_id', 1)
      .del()
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('generate correct sql with additional constraints', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column()
      declare userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    User.boot()
    User.$getRelation('posts')!.boot()

    await db.table('users').insert({ username: 'virk' })
    await db.table('posts').insert({ title: 'Adonis 101' })

    const user = await User.find(1)
    const { sql, bindings } = user!.related('posts').query().where('id', 1).toSQL()

    const post = await user!.related('posts').query().where('id', 1).first()
    assert.isNull(post)

    const { sql: knexSql, bindings: knexBindings } = db
      .connection()
      .getWriteClient()
      .from('posts')
      .where((query) => query.where('id', 1))
      .where((query) => query.where('user_id', 1))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('paginate with additional constraints using related query builder', async ({
    fs,
    assert,
  }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column()
      declare userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    User.boot()
    User.$getRelation('posts')!.boot()

    const [row] = await db
      .table<{ id: number } | number>('users')
      .insert({ username: 'virk' })
      .returning('id')

    await db
      .table('posts')
      .multiInsert([
        { title: 'Adonis 101' },
        { title: 'Adonis 101', user_id: typeof row === 'number' ? row : row.id },
        { title: 'Auth 101', user_id: typeof row === 'number' ? row : row.id },
      ])

    const user = await User.find(1)
    const posts = await user!.related('posts').query().where('title', 'Adonis 101').paginate(1, 20)

    assert.equal(posts.total, 1)
    assert.lengthOf(posts.all(), 1)
  })
})

test.group('Model | HasMany | sub queries', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('generate correct sub query for selecting rows', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column()
      declare userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    User.boot()
    User.$getRelation('posts')!.boot()

    const { sql, bindings } = User.$getRelation('posts')!.subQuery(db.connection()).toSQL()
    const { sql: knexSql, bindings: knexBindings } = db
      .connection()
      .knexQuery()
      .from('posts')
      .where('users.id', '=', db.connection().getReadClient().ref('posts.user_id'))
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

    class Post extends BaseModel {
      @column()
      declare userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    User.boot()
    User.$getRelation('posts')!.boot()

    const { sql, bindings } = User.$getRelation('posts')!
      .subQuery(db.connection())
      .count('* as total')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = db
      .connection()
      .knexQuery()
      .from('posts')
      .count('* as total')
      .where('users.id', '=', db.connection().getReadClient().ref('posts.user_id'))
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

    class Post extends BaseModel {
      @column()
      declare userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    User.boot()
    User.$getRelation('posts')!.boot()

    const { sql, bindings } = User.$getRelation('posts')!
      .subQuery(db.connection())
      .select('title', 'is_published')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = db
      .connection()
      .knexQuery()
      .from('posts')
      .select('title', 'is_published')
      .where('users.id', '=', db.connection().getReadClient().ref('posts.user_id'))
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

      @hasMany(() => User)
      declare parents: HasMany<typeof User>
    }

    User.boot()
    User.$getRelation('parents')!.boot()

    const { sql, bindings } = User.$getRelation('parents')!
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

    class Post extends BaseModel {
      @column()
      declare userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    User.boot()
    User.$getRelation('posts')!.boot()

    const exec = () => User.$getRelation('posts')!.subQuery(db.connection())['exec']()
    const paginate = () => User.$getRelation('posts')!.subQuery(db.connection())['paginate'](1)
    const update = () => User.$getRelation('posts')!.subQuery(db.connection())['update']({})
    const del = () => User.$getRelation('posts')!.subQuery(db.connection())['del']()
    const first = () => User.$getRelation('posts')!.subQuery(db.connection())['first']()
    const firstOrFail = () => User.$getRelation('posts')!.subQuery(db.connection())['firstOrFail']()

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

    class Post extends BaseModel {
      @column()
      declare userId: number

      @column()
      declare isPublished: boolean
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasMany(() => Post, {
        onQuery: (query) => query.where('isPublished', true),
      })
      declare posts: HasMany<typeof Post>
    }

    User.boot()
    User.$getRelation('posts')!.boot()

    const { sql, bindings } = User.$getRelation('posts')!.subQuery(db.connection()).toSQL()
    const { sql: knexSql, bindings: knexBindings } = db
      .connection()
      .knexQuery()
      .from('posts')
      .where((query) => query.where('is_published', true))
      .where((query) =>
        query.where('users.id', '=', db.connection().getReadClient().ref('posts.user_id'))
      )
      .toSQL()

    assert.deepEqual(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })
})

test.group('Model | HasMany | aggregates', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('get total of all related rows', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column()
      declare userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    User.boot()
    User.$getRelation('posts')!.boot()

    await db.table('users').insert({ username: 'virk' })
    await db.table('posts').multiInsert([
      { title: 'Adonis 101', user_id: 1 },
      { title: 'Lucid 101', user_id: 1 },
      { title: 'Profiler 101', user_id: 2 },
    ])

    const user = await User.find(1)
    const total = await user!.related('posts').query().count('* as total')
    assert.equal(Number(total[0].$extras.total), 2)
  })
})

test.group('Model | HasMany | preload', (group) => {
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

    class Post extends BaseModel {
      @column()
      declare userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }, { username: 'nikk' }])

    const [user0, user1] = await db.query().from('users')
    await db
      .insertQuery()
      .table('posts')
      .insert([
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

  test('set relationship property value to empty array when no related rows have been found', async ({
    assert,
    fs,
  }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column()
      declare userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }, { username: 'nikk' }])

    User.boot()

    const users = await User.query().preload('posts')
    assert.lengthOf(users, 2)

    assert.lengthOf(users[0].posts, 0)
    assert.lengthOf(users[1].posts, 0)
  })

  test('preload relationship for many rows', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare title: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }, { username: 'nikk' }])
    await db
      .insertQuery()
      .table('posts')
      .insert([
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

  test('add constraints during preload', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare title: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }, { username: 'nikk' }])
    await db
      .insertQuery()
      .table('posts')
      .insert([
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

    const users = await User.query().preload('posts', (builder) =>
      builder.where('title', 'Lucid 101')
    )
    assert.lengthOf(users, 2)

    assert.lengthOf(users[0].posts, 1)
    assert.equal(users[0].posts[0].title, 'Lucid 101')
    assert.lengthOf(users[1].posts, 0)
  })

  test('cherry pick columns during preload', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare title: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }, { username: 'nikk' }])
    await db
      .insertQuery()
      .table('posts')
      .insert([
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
    assert.deepEqual(users[0].posts[0].$extras, {})
    assert.deepEqual(users[1].posts[0].$extras, {})
  })

  test('do not repeat fk when already defined', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare title: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }, { username: 'nikk' }])
    await db
      .insertQuery()
      .table('posts')
      .insert([
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
    assert.deepEqual(users[0].posts[0].$extras, {})
    assert.deepEqual(users[1].posts[0].$extras, {})
  })

  test('raise exception when local key is not selected', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    assert.plan(1)

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare title: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }, { username: 'nikk' }])
    await db
      .insertQuery()
      .table('posts')
      .insert([
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

  test('preload nested relations', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Comment extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare postId: number

      @column()
      declare body: string
    }

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare title: string

      @hasMany(() => Comment)
      declare comments: HasMany<typeof Comment>
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }, { username: 'nikk' }])
    await db
      .insertQuery()
      .table('posts')
      .insert([
        {
          user_id: 1,
          title: 'Adonis 101',
        },
        {
          user_id: 2,
          title: 'Lucid 101',
        },
      ])

    await db
      .insertQuery()
      .table('comments')
      .insert([
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

  test('preload nested relations using model instance', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Comment extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare postId: number

      @column()
      declare body: string
    }

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare title: string

      @hasMany(() => Comment)
      declare comments: HasMany<typeof Comment>
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }, { username: 'nikk' }])
    await db
      .insertQuery()
      .table('posts')
      .insert([
        {
          user_id: 1,
          title: 'Adonis 101',
        },
        {
          user_id: 2,
          title: 'Lucid 101',
        },
      ])

    await db
      .insertQuery()
      .table('comments')
      .insert([
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

    await users[0].load((preloader) => {
      preloader.load('posts', (builder) => builder.preload('comments'))
    })

    await users[1].load((preloader) => {
      preloader.load('posts', (builder) => builder.preload('comments'))
    })

    assert.lengthOf(users[0].posts, 1)
    assert.lengthOf(users[0].posts[0].comments, 1)
    assert.equal(users[0].posts[0].comments[0].postId, users[0].posts[0].id)

    assert.lengthOf(users[1].posts, 1)
    assert.lengthOf(users[1].posts[0].comments, 1)
    assert.equal(users[1].posts[0].comments[0].postId, users[1].posts[0].id)
  })

  test('pass main query options down the chain', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Comment extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare postId: number

      @column()
      declare body: string
    }

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare title: string

      @hasMany(() => Comment)
      declare comments: HasMany<typeof Comment>
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }, { username: 'nikk' }])
    await db
      .insertQuery()
      .table('posts')
      .insert([
        {
          user_id: 1,
          title: 'Adonis 101',
        },
        {
          user_id: 2,
          title: 'Lucid 101',
        },
      ])

    await db
      .insertQuery()
      .table('comments')
      .insert([
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

    assert.equal(user!.$options!.connection, 'secondary')
    assert.equal(user!.posts[0].$options!.connection, 'secondary')
    assert.equal(user!.posts[0].comments[0].$options!.connection, 'secondary')
  })

  test('do not run preload query when parent rows are empty', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column()
      declare userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    User.boot()

    const users = await User.query().preload('posts', () => {
      throw new Error('not expected to be here')
    })

    assert.lengthOf(users, 0)
  })
})

test.group('Model | HasMany | withCount', (group) => {
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

    class Post extends BaseModel {
      @column()
      declare userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }, { username: 'nikk' }])

    const [user0, user1] = await db.query().from('users')
    await db
      .insertQuery()
      .table('posts')
      .insert([
        {
          user_id: user0.id,
          title: 'Adonis 101',
        },
        {
          user_id: user0.id,
          title: 'Adonis 102',
        },
        {
          user_id: user1.id,
          title: 'Lucid 101',
        },
      ])

    User.boot()

    const users = await User.query().withCount('posts')
    assert.lengthOf(users, 2)

    assert.deepEqual(Number(users[0].$extras.posts_count), 2)
    assert.deepEqual(Number(users[1].$extras.posts_count), 1)
  })

  test('apply constraints to the withCount subquery', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column()
      declare userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }, { username: 'nikk' }])

    const [user0, user1] = await db.query().from('users')
    await db
      .insertQuery()
      .table('posts')
      .insert([
        {
          user_id: user0.id,
          title: 'Adonis 101',
        },
        {
          user_id: user0.id,
          title: 'Adonis 102',
        },
        {
          user_id: user1.id,
          title: 'Lucid 101',
        },
      ])

    User.boot()

    const users = await User.query().withCount('posts', (query) => {
      query.whereIn('title', ['Adonis 101', 'Lucid 101'])
    })

    assert.lengthOf(users, 2)
    assert.deepEqual(Number(users[0].$extras.posts_count), 1)
    assert.deepEqual(Number(users[1].$extras.posts_count), 1)
  })

  test('allow subquery to have custom aggregates', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column()
      declare userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }, { username: 'nikk' }])

    const [user0, user1] = await db.query().from('users')
    await db
      .insertQuery()
      .table('posts')
      .insert([
        {
          user_id: user0.id,
          title: 'Adonis 101',
        },
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

    const users = await User.query().withAggregate('posts', (query) => {
      query.countDistinct('title').as('postsCount')
    })

    assert.lengthOf(users, 2)
    assert.deepEqual(Number(users[0].$extras.postsCount), 1)
    assert.deepEqual(Number(users[1].$extras.postsCount), 1)
  })

  test('allow cherry picking columns', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column()
      declare userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }, { username: 'nikk' }])

    const [user0, user1] = await db.query().from('users').orderBy('id', 'asc')
    await db
      .insertQuery()
      .table('posts')
      .insert([
        {
          user_id: user0.id,
          title: 'Adonis 101',
        },
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

    const users = await User.query().select('username').withCount('posts').orderBy('id', 'asc')

    assert.lengthOf(users, 2)
    assert.deepEqual(users[0].$attributes, { username: 'virk' })
    assert.deepEqual(Number(users[0].$extras.posts_count), 2)

    assert.deepEqual(users[1].$attributes, { username: 'nikk' })
    assert.deepEqual(Number(users[1].$extras.posts_count), 1)
  })

  test('get count of self relationship', async ({ fs, assert }) => {
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

      @column()
      declare username: string

      @hasMany(() => User, { foreignKey: 'parentId' })
      declare parents: HasMany<typeof User>
    }

    User.boot()
    User.$getRelation('parents')!.boot()

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }, { username: 'nikk' }])

    const [user0, user1] = await db.query().from('users')
    await db
      .insertQuery()
      .table('users')
      .insert([
        {
          parent_id: user0.id,
          username: 'romain',
        },
        {
          parent_id: user0.id,
          username: 'joe',
        },
        {
          parent_id: user1.id,
          username: 'tick',
        },
      ])

    User.boot()

    const users = await User.query().withCount('parents', (query) => {
      query.countDistinct('parent_id')
    })

    assert.lengthOf(users, 5)
    assert.deepEqual(Number(users[0].$extras.parents_count), 1)
    assert.deepEqual(Number(users[1].$extras.parents_count), 1)
  })

  test('define custom alias for the count', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column()
      declare userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }, { username: 'nikk' }])

    const [user0, user1] = await db.query().from('users')
    await db
      .insertQuery()
      .table('posts')
      .insert([
        {
          user_id: user0.id,
          title: 'Adonis 101',
        },
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

    const users = await User.query()
      .withCount('posts', (query) => {
        query.as('totalPosts')
      })
      .orderBy('id', 'asc')

    assert.lengthOf(users, 2)
    assert.deepEqual(Number(users[0].$extras.totalPosts), 2)
    assert.deepEqual(Number(users[1].$extras.totalPosts), 1)
  })

  test('get count of a nested relationship', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Comment extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare postId: number

      @column()
      declare body: string
    }

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @hasMany(() => Comment)
      declare comments: HasMany<typeof Comment>
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }, { username: 'nikk' }])

    const [user0, user1] = await db.query().from('users')
    await db
      .insertQuery()
      .table('posts')
      .insert([
        {
          user_id: user0.id,
          title: 'Adonis 101',
        },
        {
          user_id: user0.id,
          title: 'Adonis 102',
        },
        {
          user_id: user1.id,
          title: 'Lucid 101',
        },
      ])

    const [post1, post2, post3] = await db.query().from('posts')
    await db
      .insertQuery()
      .table('comments')
      .insert([
        {
          post_id: post1.id,
          body: 'Nice post',
        },
        {
          post_id: post1.id,
          body: 'Nice post',
        },
        {
          post_id: post2.id,
          body: 'Nice post',
        },
        {
          post_id: post3.id,
          body: 'Nice post',
        },
      ])

    User.boot()

    const user = await User.query().orderBy('id', 'asc').first()
    const query = user!.related('posts').query().withCount('comments')

    const { sql, bindings } = query.toSQL()
    const { sql: rawSql, bindings: rawBindings } = db
      .from('posts')
      .select('posts.*')
      .select(
        db
          .from('comments')
          .count('*')
          .whereColumn('posts.id', 'comments.post_id')
          .as('comments_count')
      )
      .where('user_id', user!.id)
      .toSQL()

    assert.equal(sql, rawSql)
    assert.deepEqual(bindings, rawBindings)

    const posts = await query
    assert.lengthOf(posts, 2)
    assert.deepEqual(Number(posts[0].$extras.comments_count), 2)
    assert.deepEqual(Number(posts[1].$extras.comments_count), 1)
  })

  test('set count directly on the model when defined as a property', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column()
      declare userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      postsCount: number = 0

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }, { username: 'nikk' }])

    const [user0, user1] = await db.query().from('users')
    await db
      .insertQuery()
      .table('posts')
      .insert([
        {
          user_id: user0.id,
          title: 'Adonis 101',
        },
        {
          user_id: user0.id,
          title: 'Adonis 102',
        },
        {
          user_id: user1.id,
          title: 'Lucid 101',
        },
      ])

    User.boot()

    const users = await User.query().withCount('posts', (query) => query.as('postsCount'))
    assert.lengthOf(users, 2)

    assert.deepEqual(Number(users[0].postsCount), 2)
    assert.deepEqual(Number(users[1].postsCount), 1)
  })

  test('do not set count directly on the model when defined as a getter', async ({
    fs,
    assert,
  }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column()
      declare userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      get postsCount(): number {
        return this.$extras.postsCount
      }

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }, { username: 'nikk' }])

    const [user0, user1] = await db.query().from('users')
    await db
      .insertQuery()
      .table('posts')
      .insert([
        {
          user_id: user0.id,
          title: 'Adonis 101',
        },
        {
          user_id: user0.id,
          title: 'Adonis 102',
        },
        {
          user_id: user1.id,
          title: 'Lucid 101',
        },
      ])

    User.boot()

    const users = await User.query().withCount('posts', (query) => query.as('postsCount'))
    assert.lengthOf(users, 2)

    assert.deepEqual(Number(users[0].postsCount), 2)
    assert.deepEqual(Number(users[1].postsCount), 1)
    assert.deepEqual(Number(users[0].$extras.postsCount), 2)
    assert.deepEqual(Number(users[1].$extras.postsCount), 1)
  })

  test('lazy load related rows count', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column()
      declare userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }])

    const user0 = await db.query().from('users').firstOrFail()
    await db
      .insertQuery()
      .table('posts')
      .insert([
        {
          user_id: user0.id,
          title: 'Adonis 101',
        },
        {
          user_id: user0.id,
          title: 'Adonis 102',
        },
      ])

    User.boot()

    const user = await User.firstOrFail()
    assert.equal(user.username, 'virk')

    await user.loadCount('posts')

    assert.equal(user.username, 'virk')
    assert.deepEqual(Number(user.$extras.posts_count), 2)
  })

  test('apply constraints to the loadCount subquery', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column()
      declare userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }])

    const [user0] = await db.query().from('users')
    await db
      .insertQuery()
      .table('posts')
      .insert([
        {
          user_id: user0.id,
          title: 'Adonis 101',
        },
        {
          user_id: user0.id,
          title: 'Adonis 102',
        },
      ])

    User.boot()

    const user = await User.query().firstOrFail()
    await user.loadCount('posts', (query) => {
      query.whereIn('title', ['Adonis 101', 'Lucid 101'])
    })

    assert.deepEqual(Number(user.$extras.posts_count), 1)
  })
})

test.group('Model | HasMany | has', (group) => {
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

    class Post extends BaseModel {
      @column()
      declare userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }, { username: 'nikk' }])

    const [user0] = await db.query().from('users')
    await db
      .insertQuery()
      .table('posts')
      .insert([
        {
          user_id: user0.id,
          title: 'Adonis 101',
        },
        {
          user_id: user0.id,
          title: 'Adonis 102',
        },
      ])

    User.boot()

    const query = User.query().has('posts')
    const connection = db.connection()

    const { sql, bindings } = query.toSQL()
    const { sql: knexSql, bindings: knexBindings } = connection
      .knexQuery()
      .from('users')
      .whereExists(
        connection
          .knexQuery()
          .from('posts')
          .where('users.id', '=', connection.getReadClient().ref('posts.user_id'))
      )
      .toSQL()

    assert.deepEqual(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    const users = await query.exec()
    assert.lengthOf(users, 1)
  })

  test('define expected number of rows', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column()
      declare userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }, { username: 'nikk' }])

    const [user0, user1] = await db.query().from('users')
    await db
      .insertQuery()
      .table('posts')
      .insert([
        {
          user_id: user0.id,
          title: 'Adonis 101',
        },
        {
          user_id: user0.id,
          title: 'Adonis 102',
        },
        {
          user_id: user1.id,
          title: 'Adonis 102',
        },
      ])

    User.boot()

    const query = User.query().has('posts', '>', 1)
    const connection = db.connection()

    const { sql, bindings } = query.toSQL()

    const knexSubQuery = connection
      .knexQuery()
      .from('posts')
      .count('*')
      .where('users.id', '=', connection.getReadClient().ref('posts.user_id'))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .knexQuery()
      .from('users')
      .whereRaw(`(${knexSubQuery.sql}) > (?)`, knexSubQuery.bindings.concat([1]))
      .toSQL()

    assert.deepEqual(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    const users = await query.exec()
    assert.lengthOf(users, 1)
  })

  test('merge query existing bindings with the count query', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column()
      declare userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }, { username: 'nikk' }])

    const [user0, user1] = await db.query().from('users')
    await db
      .insertQuery()
      .table('posts')
      .insert([
        {
          user_id: user0.id,
          title: 'Adonis 101',
        },
        {
          user_id: user0.id,
          title: 'Adonis 102',
        },
        {
          user_id: user1.id,
          title: 'Adonis 102',
        },
      ])

    User.boot()

    const query = User.query().has('posts', '>', 1).whereIn('username', ['virk', 'nikk'])
    const connection = db.connection()

    const { sql, bindings } = query.toSQL()

    const knexSubQuery = connection
      .knexQuery()
      .from('posts')
      .count('*')
      .where('users.id', '=', connection.getReadClient().ref('posts.user_id'))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .knexQuery()
      .from('users')
      .whereRaw(`(${knexSubQuery.sql}) > (?)`, knexSubQuery.bindings.concat([1]))
      .whereIn('username', ['virk', 'nikk'])
      .toSQL()

    assert.deepEqual(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    const users = await query.exec()
    assert.lengthOf(users, 1)
  })

  test('define or clause in existance query', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column()
      declare userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }, { username: 'nikk' }])

    const [user0, user1] = await db.query().from('users')
    await db
      .insertQuery()
      .table('posts')
      .insert([
        {
          user_id: user0.id,
          title: 'Adonis 101',
        },
        {
          user_id: user0.id,
          title: 'Adonis 102',
        },
        {
          user_id: user1.id,
          title: 'Adonis 102',
        },
      ])

    User.boot()

    const query = User.query().has('posts', '>', 1).orHas('posts', '=', 1)
    const connection = db.connection()

    const { sql, bindings } = query.toSQL()

    const knexSubQuery = connection
      .knexQuery()
      .from('posts')
      .count('*')
      .where('users.id', '=', connection.getReadClient().ref('posts.user_id'))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .knexQuery()
      .from('users')
      .whereRaw(`(${knexSubQuery.sql}) > (?)`, knexSubQuery.bindings.concat([1]))
      .orWhereRaw(`(${knexSubQuery.sql}) = (?)`, knexSubQuery.bindings.concat([1]))
      .toSQL()

    assert.deepEqual(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    const users = await query.exec()
    assert.lengthOf(users, 2)
  })

  test('define not existance query', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column()
      declare userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }, { username: 'nikk' }])

    const [user0] = await db.query().from('users').orderBy('id', 'asc')
    await db
      .insertQuery()
      .table('posts')
      .insert([
        {
          user_id: user0.id,
          title: 'Adonis 101',
        },
        {
          user_id: user0.id,
          title: 'Adonis 102',
        },
      ])

    User.boot()

    const query = User.query().doesntHave('posts')
    const connection = db.connection()

    const { sql, bindings } = query.toSQL()

    const knexSubQuery = connection
      .knexQuery()
      .from('posts')
      .where('users.id', '=', connection.getReadClient().ref('posts.user_id'))

    const { sql: knexSql, bindings: knexBindings } = connection
      .knexQuery()
      .from('users')
      .whereNotExists(knexSubQuery)
      .toSQL()

    const users = await query.exec()

    assert.lengthOf(users, 1)
    assert.deepEqual(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
    assert.equal(users[0].username, 'nikk')
  })

  test('define or not existance query', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column()
      declare userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }, { username: 'nikk' }])

    const [user0] = await db.query().from('users').orderBy('id', 'asc')
    await db
      .insertQuery()
      .table('posts')
      .insert([
        {
          user_id: user0.id,
          title: 'Adonis 101',
        },
        {
          user_id: user0.id,
          title: 'Adonis 102',
        },
      ])

    User.boot()

    const query = User.query().doesntHave('posts').orDoesntHave('posts', '>', 1)
    const connection = db.connection()

    const { sql, bindings } = query.toSQL()

    const knexSubQuery = connection
      .knexQuery()
      .from('posts')
      .where('users.id', '=', connection.getReadClient().ref('posts.user_id'))

    const knexCountSubQuery = connection
      .knexQuery()
      .from('posts')
      .count('*')
      .where('users.id', '=', connection.getReadClient().ref('posts.user_id'))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .knexQuery()
      .from('users')
      .whereNotExists(knexSubQuery)
      .orWhereRaw(`not (${knexCountSubQuery.sql}) > (?)`, knexCountSubQuery.bindings.concat([1]))
      .toSQL()

    const users = await query.exec()

    assert.lengthOf(users, 1)
    assert.deepEqual(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
    assert.equal(users[0].username, 'nikk')
  })
})

test.group('Model | HasMany | whereHas', (group) => {
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

    class Post extends BaseModel {
      @column()
      declare userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }, { username: 'nikk' }])

    const [user0, user1] = await db.query().from('users')
    await db
      .insertQuery()
      .table('posts')
      .insert([
        {
          user_id: user0.id,
          title: 'Adonis 101',
        },
        {
          user_id: user0.id,
          title: 'Adonis 102',
        },
        {
          user_id: user1.id,
          title: 'Lucid 101',
        },
      ])

    User.boot()

    const query = User.query().whereHas('posts', ($query) => {
      $query.where('title', 'Adonis 101')
    })

    const connection = db.connection()

    const { sql, bindings } = query.toSQL()
    const { sql: knexSql, bindings: knexBindings } = connection
      .knexQuery()
      .from('users')
      .whereExists(
        connection
          .knexQuery()
          .from('posts')
          .where((subquery) => subquery.where('title', 'Adonis 101'))
          .where((subquery) =>
            subquery.where('users.id', '=', connection.getReadClient().ref('posts.user_id'))
          )
      )
      .toSQL()

    assert.deepEqual(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    const users = await query.exec()
    assert.lengthOf(users, 1)
  })

  test('define expected number of rows', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column()
      declare userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }, { username: 'nikk' }])

    const [user0, user1] = await db.query().from('users')
    await db
      .insertQuery()
      .table('posts')
      .insert([
        {
          user_id: user0.id,
          title: 'Adonis 101',
        },
        {
          user_id: user0.id,
          title: 'Adonis 101',
        },
        {
          user_id: user0.id,
          title: 'Adonis 102',
        },
        {
          user_id: user1.id,
          title: 'Adonis 101',
        },
        {
          user_id: user1.id,
          title: 'Lucid 101',
        },
      ])

    User.boot()

    const query = User.query().whereHas(
      'posts',
      ($query) => {
        $query.where('title', 'Adonis 101')
      },
      '>',
      1
    )

    const connection = db.connection()

    const { sql, bindings } = query.toSQL()
    const knexSubQuery = connection
      .knexQuery()
      .from('posts')
      .count('*')
      .where((subquery) => subquery.where('title', 'Adonis 101'))
      .where((subquery) =>
        subquery.where('users.id', '=', connection.getReadClient().ref('posts.user_id'))
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .knexQuery()
      .from('users')
      .whereRaw(`(${knexSubQuery.sql}) > (?)`, knexSubQuery.bindings.concat([1]))
      .toSQL()

    const users = await query.exec()

    assert.deepEqual(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
    assert.lengthOf(users, 1)
  })

  test('define custom aggregates', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column()
      declare userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }, { username: 'nikk' }])

    const [user0, user1] = await db.query().from('users').orderBy('id', 'asc')
    await db
      .insertQuery()
      .table('posts')
      .insert([
        {
          user_id: user0.id,
          title: 'Adonis 101',
        },
        {
          user_id: user0.id,
          title: 'Adonis 101',
        },
        {
          user_id: user1.id,
          title: 'Adonis 101',
        },
        {
          user_id: user1.id,
          title: 'Lucid 101',
        },
      ])

    User.boot()

    const query = User.query().whereHas(
      'posts',
      ($query) => {
        $query.countDistinct('title')
      },
      '>',
      1
    )

    const connection = db.connection()

    const { sql, bindings } = query.toSQL()
    const knexSubQuery = connection
      .knexQuery()
      .from('posts')
      .countDistinct('title')
      .where('users.id', '=', connection.getReadClient().ref('posts.user_id'))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .knexQuery()
      .from('users')
      .whereRaw(`(${knexSubQuery.sql}) > (?)`, knexSubQuery.bindings.concat([1]))
      .toSQL()

    const users = await query.exec()

    assert.deepEqual(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
    assert.lengthOf(users, 1)
    assert.equal(users[0].username, 'nikk')
  })

  test('define or clause', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column()
      declare userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }, { username: 'nikk' }])

    const [user0, user1] = await db.query().from('users')
    await db
      .insertQuery()
      .table('posts')
      .insert([
        {
          user_id: user0.id,
          title: 'Adonis 101',
        },
        {
          user_id: user0.id,
          title: 'Adonis 101',
        },
        {
          user_id: user0.id,
          title: 'Adonis 102',
        },
        {
          user_id: user1.id,
          title: 'Adonis 101',
        },
        {
          user_id: user1.id,
          title: 'Lucid 101',
        },
      ])

    User.boot()

    const query = User.query()
      .whereHas(
        'posts',
        ($query) => {
          $query.where('title', 'Adonis 101')
        },
        '>',
        1
      )
      .orWhereHas('posts', ($query) => {
        $query.where('title', 'Lucid 101')
      })

    const connection = db.connection()

    const { sql, bindings } = query.toSQL()

    const knexSubQuery = connection
      .knexQuery()
      .from('posts')
      .where((subquery) => subquery.where('title', 'Lucid 101'))
      .where((subquery) =>
        subquery.where('users.id', '=', connection.getReadClient().ref('posts.user_id'))
      )

    const knexCountSubQuery = connection
      .knexQuery()
      .from('posts')
      .count('*')
      .where((subquery) => subquery.where('title', 'Adonis 101'))
      .where((subquery) =>
        subquery.where('users.id', '=', connection.getReadClient().ref('posts.user_id'))
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .knexQuery()
      .from('users')
      .whereRaw(`(${knexCountSubQuery.sql}) > (?)`, knexCountSubQuery.bindings.concat([1]))
      .orWhereExists(knexSubQuery)
      .toSQL()

    const users = await query.exec()

    assert.deepEqual(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
    assert.lengthOf(users, 2)
  })

  test('define not clause', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column()
      declare userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }, { username: 'nikk' }])

    const [user0, user1] = await db.query().from('users').orderBy('id', 'asc')

    await db
      .insertQuery()
      .table('posts')
      .insert([
        {
          user_id: user0.id,
          title: 'Adonis 101',
        },
        {
          user_id: user0.id,
          title: 'Adonis 101',
        },
        {
          user_id: user0.id,
          title: 'Adonis 102',
        },
        {
          user_id: user1.id,
          title: 'Adonis 101',
        },
        {
          user_id: user1.id,
          title: 'Lucid 101',
        },
      ])

    User.boot()

    const query = User.query()
      .whereDoesntHave(
        'posts',
        ($query) => {
          $query.where('title', 'Adonis 101')
        },
        '>',
        1
      )
      .orWhereHas('posts', ($query) => {
        $query.where('title', 'Lucid 101')
      })

    const connection = db.connection()

    const { sql, bindings } = query.toSQL()

    const knexSubQuery = connection
      .knexQuery()
      .from('posts')
      .where((subquery) => subquery.where('title', 'Lucid 101'))
      .where((subquery) =>
        subquery.where('users.id', '=', connection.getReadClient().ref('posts.user_id'))
      )

    const knexCountSubQuery = connection
      .knexQuery()
      .from('posts')
      .count('*')
      .where((subquery) => subquery.where('title', 'Adonis 101'))
      .where((subquery) =>
        subquery.where('users.id', '=', connection.getReadClient().ref('posts.user_id'))
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .knexQuery()
      .from('users')
      .whereRaw(`not (${knexCountSubQuery.sql}) > (?)`, knexCountSubQuery.bindings.concat([1]))
      .orWhereExists(knexSubQuery)
      .toSQL()

    const users = await query.exec()

    assert.deepEqual(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
    assert.lengthOf(users, 1)
    assert.equal(users[0].username, 'nikk')
  })

  test('define or not clause', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column()
      declare userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }, { username: 'nikk' }])

    const [user0, user1] = await db.query().from('users').orderBy('id', 'asc')

    await db
      .insertQuery()
      .table('posts')
      .insert([
        {
          user_id: user0.id,
          title: 'Adonis 101',
        },
        {
          user_id: user0.id,
          title: 'Adonis 101',
        },
        {
          user_id: user0.id,
          title: 'Adonis 102',
        },
        {
          user_id: user1.id,
          title: 'Adonis 101',
        },
        {
          user_id: user1.id,
          title: 'Lucid 101',
        },
      ])

    User.boot()

    const query = User.query()
      .whereHas(
        'posts',
        ($query) => {
          $query.where('title', 'Adonis 101')
        },
        '>',
        1
      )
      .orWhereDoesntHave('posts', ($query) => {
        $query.where('title', 'Lucid 101')
      })

    const connection = db.connection()

    const { sql, bindings } = query.toSQL()

    const knexSubQuery = connection
      .knexQuery()
      .from('posts')
      .where((subquery) => subquery.where('title', 'Lucid 101'))
      .where((subquery) =>
        subquery.where('users.id', '=', connection.getReadClient().ref('posts.user_id'))
      )

    const knexCountSubQuery = connection
      .knexQuery()
      .from('posts')
      .where((subquery) => subquery.where('title', 'Adonis 101'))
      .count('*')
      .where((subquery) =>
        subquery.where('users.id', '=', connection.getReadClient().ref('posts.user_id'))
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .knexQuery()
      .from('users')
      .whereRaw(`(${knexCountSubQuery.sql}) > (?)`, knexCountSubQuery.bindings.concat([1]))
      .orWhereNotExists(knexSubQuery)
      .toSQL()

    const users = await query.exec()

    assert.deepEqual(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
    assert.lengthOf(users, 1)
    assert.equal(users[0].username, 'virk')
  })
})

if (process.env.DB !== 'mysql_legacy') {
  test.group('Model | HasMany | Group Limit', (group) => {
    group.setup(async () => {
      await setup()
    })

    group.teardown(async () => {
      await cleanup()
    })

    group.each.teardown(async () => {
      await resetTables()
    })

    test('apply group limit', async ({ fs, assert }) => {
      const app = new AppFactory().create(fs.baseUrl, () => {})
      await app.init()
      const db = getDb()
      const adapter = ormAdapter(db)
      const BaseModel = getBaseModel(adapter)

      class Post extends BaseModel {
        @column()
        declare userId: number

        @column()
        declare title: string

        @column()
        declare createdAt: Date
      }

      class User extends BaseModel {
        @column({ isPrimary: true })
        declare id: number

        @hasMany(() => Post)
        declare posts: HasMany<typeof Post>
      }

      await db
        .insertQuery()
        .table('users')
        .insert([{ username: 'virk' }, { username: 'nikk' }])

      const [user0, user1] = await db.query().from('users')

      /**
       * User 1
       */
      await db
        .insertQuery()
        .table('posts')
        .insert([
          {
            user_id: user0.id,
            title: 'Adonis 101',
            created_at: new Date(),
          },
          {
            user_id: user0.id,
            title: 'Adonis 102',
            created_at: new Date(),
          },
          {
            user_id: user0.id,
            title: 'Adonis 103',
            created_at: new Date(),
          },
          {
            user_id: user0.id,
            title: 'Adonis 104',
            created_at: new Date(),
          },
          {
            user_id: user0.id,
            title: 'Adonis 105',
            created_at: new Date(),
          },
        ])

      /**
       * User 2
       */
      await db
        .insertQuery()
        .table('posts')
        .insert([
          {
            user_id: user1.id,
            title: 'Lucid 101',
            created_at: new Date(),
          },
          {
            user_id: user1.id,
            title: 'Lucid 102',
            created_at: new Date(),
          },
          {
            user_id: user1.id,
            title: 'Lucid 103',
            created_at: new Date(),
          },
          {
            user_id: user1.id,
            title: 'Lucid 104',
            created_at: new Date(),
          },
          {
            user_id: user1.id,
            title: 'Lucid 105',
            created_at: new Date(),
          },
        ])

      User.boot()

      const users = await User.query().preload('posts', (query) => query.groupLimit(2))
      assert.lengthOf(users, 2)

      assert.lengthOf(users[0].posts, 2)
      assert.equal(users[0].posts[0].title, 'Adonis 105')
      assert.exists(users[0].posts[0].createdAt)
      assert.equal(users[0].posts[1].title, 'Adonis 104')
      assert.exists(users[0].posts[1].createdAt)

      assert.lengthOf(users[1].posts, 2)
      assert.equal(users[1].posts[0].title, 'Lucid 105')
      assert.exists(users[1].posts[0].createdAt)
      assert.equal(users[1].posts[1].title, 'Lucid 104')
      assert.exists(users[1].posts[1].createdAt)
    })

    test('apply group limit with additional constraints', async ({ fs, assert }) => {
      const app = new AppFactory().create(fs.baseUrl, () => {})
      await app.init()
      const db = getDb()
      const adapter = ormAdapter(db)
      const BaseModel = getBaseModel(adapter)

      class Post extends BaseModel {
        @column()
        declare userId: number

        @column()
        declare title: string

        @column()
        declare createdAt: Date
      }

      class User extends BaseModel {
        @column({ isPrimary: true })
        declare id: number

        @hasMany(() => Post)
        declare posts: HasMany<typeof Post>
      }

      await db
        .insertQuery()
        .table('users')
        .insert([{ username: 'virk' }, { username: 'nikk' }])

      const [user0, user1] = await db.query().from('users')

      /**
       * User 1
       */
      await db
        .insertQuery()
        .table('posts')
        .insert([
          {
            user_id: user0.id,
            title: 'Adonis 101',
            created_at: new Date(),
          },
          {
            user_id: user0.id,
            title: 'Adonis 102',
          },
          {
            user_id: user0.id,
            title: 'Adonis 103',
          },
          {
            user_id: user0.id,
            title: 'Adonis 104',
          },
          {
            user_id: user0.id,
            title: 'Adonis 105',
            created_at: new Date(),
          },
        ])

      /**
       * User 2
       */
      await db
        .insertQuery()
        .table('posts')
        .insert([
          {
            user_id: user1.id,
            title: 'Lucid 101',
            created_at: new Date(),
          },
          {
            user_id: user1.id,
            title: 'Lucid 102',
          },
          {
            user_id: user1.id,
            title: 'Lucid 103',
            created_at: new Date(),
          },
          {
            user_id: user1.id,
            title: 'Lucid 104',
            created_at: new Date(),
          },
          {
            user_id: user1.id,
            title: 'Lucid 105',
          },
        ])

      User.boot()

      const users = await User.query().preload('posts', (query) => {
        query.whereNotNull('created_at').groupLimit(2)
      })

      assert.lengthOf(users, 2)
      assert.lengthOf(users[0].posts, 2)
      assert.equal(users[0].posts[0].title, 'Adonis 105')
      assert.exists(users[0].posts[0].createdAt)
      assert.equal(users[0].posts[1].title, 'Adonis 101')
      assert.exists(users[0].posts[1].createdAt)

      assert.lengthOf(users[1].posts, 2)
      assert.equal(users[1].posts[0].title, 'Lucid 104')
      assert.exists(users[1].posts[0].createdAt)
      assert.equal(users[1].posts[1].title, 'Lucid 103')
      assert.exists(users[0].posts[1].createdAt)
    })

    test('apply group limit and select custom columns', async ({ fs, assert }) => {
      const app = new AppFactory().create(fs.baseUrl, () => {})
      await app.init()
      const db = getDb()
      const adapter = ormAdapter(db)
      const BaseModel = getBaseModel(adapter)

      class Post extends BaseModel {
        @column()
        declare userId: number

        @column()
        declare title: string

        @column()
        declare createdAt: Date
      }

      class User extends BaseModel {
        @column({ isPrimary: true })
        declare id: number

        @hasMany(() => Post)
        declare posts: HasMany<typeof Post>
      }

      await db
        .insertQuery()
        .table('users')
        .insert([{ username: 'virk' }, { username: 'nikk' }])

      const [user0, user1] = await db.query().from('users')

      /**
       * User 1
       */
      await db
        .insertQuery()
        .table('posts')
        .insert([
          {
            user_id: user0.id,
            title: 'Adonis 101',
          },
          {
            user_id: user0.id,
            title: 'Adonis 102',
          },
          {
            user_id: user0.id,
            title: 'Adonis 103',
          },
          {
            user_id: user0.id,
            title: 'Adonis 104',
          },
          {
            user_id: user0.id,
            title: 'Adonis 105',
          },
        ])

      /**
       * User 2
       */
      await db
        .insertQuery()
        .table('posts')
        .insert([
          {
            user_id: user1.id,
            title: 'Lucid 101',
          },
          {
            user_id: user1.id,
            title: 'Lucid 102',
          },
          {
            user_id: user1.id,
            title: 'Lucid 103',
          },
          {
            user_id: user1.id,
            title: 'Lucid 104',
          },
          {
            user_id: user1.id,
            title: 'Lucid 105',
          },
        ])

      User.boot()

      const users = await User.query().preload('posts', (query) => {
        query.select('title').groupLimit(2)
      })

      assert.lengthOf(users, 2)
      assert.lengthOf(users[0].posts, 2)
      assert.isUndefined(users[0].posts[0].createdAt)
      assert.isUndefined(users[0].posts[1].createdAt)

      assert.lengthOf(users[1].posts, 2)
      assert.isUndefined(users[1].posts[0].createdAt)
      assert.isUndefined(users[1].posts[1].createdAt)
    })

    test('define custom order by clause', async ({ fs, assert }) => {
      const app = new AppFactory().create(fs.baseUrl, () => {})
      await app.init()
      const db = getDb()
      const adapter = ormAdapter(db)
      const BaseModel = getBaseModel(adapter)

      class Post extends BaseModel {
        @column()
        declare userId: number

        @column()
        declare title: string

        @column()
        declare createdAt: Date
      }

      class User extends BaseModel {
        @column({ isPrimary: true })
        declare id: number

        @hasMany(() => Post)
        declare posts: HasMany<typeof Post>
      }

      await db
        .insertQuery()
        .table('users')
        .insert([{ username: 'virk' }, { username: 'nikk' }])

      const [user0, user1] = await db.query().from('users')

      const now = DateTime.now()

      /**
       * User 1
       */
      await db
        .insertQuery()
        .table('posts')
        .insert([
          {
            user_id: user0.id,
            title: 'Adonis 101',
            created_at: now.toISO(),
          },
          {
            user_id: user0.id,
            title: 'Adonis 102',
            created_at: now.plus({ seconds: 1 }).toISO(),
          },
          {
            user_id: user0.id,
            title: 'Adonis 103',
            created_at: now.plus({ seconds: 2 }).toISO(),
          },
          {
            user_id: user0.id,
            title: 'Adonis 104',
            created_at: now.plus({ seconds: 3 }).toISO(),
          },
          {
            user_id: user0.id,
            title: 'Adonis 105',
            created_at: now.plus({ seconds: 4 }).toISO(),
          },
        ])

      /**
       * User 2
       */
      await db
        .insertQuery()
        .table('posts')
        .insert([
          {
            user_id: user1.id,
            title: 'Lucid 101',
            created_at: now.toISO(),
          },
          {
            user_id: user1.id,
            title: 'Lucid 102',
            created_at: now.plus({ seconds: 1 }).toISO(),
          },
          {
            user_id: user1.id,
            title: 'Lucid 103',
            created_at: now.plus({ seconds: 2 }).toISO(),
          },
          {
            user_id: user1.id,
            title: 'Lucid 104',
            created_at: now.plus({ seconds: 3 }).toISO(),
          },
          {
            user_id: user1.id,
            title: 'Lucid 105',
            created_at: now.plus({ seconds: 4 }).toISO(),
          },
        ])

      User.boot()

      const users = await User.query().preload('posts', (query) => {
        query.groupLimit(2).groupOrderBy('created_at', 'asc')
      })
      assert.lengthOf(users, 2)

      assert.lengthOf(users[0].posts, 2)
      assert.equal(users[0].posts[0].title, 'Adonis 101')
      assert.exists(users[0].posts[0].createdAt)
      assert.equal(users[0].posts[1].title, 'Adonis 102')
      assert.exists(users[0].posts[1].createdAt)

      assert.lengthOf(users[1].posts, 2)
      assert.equal(users[1].posts[0].title, 'Lucid 101')
      assert.exists(users[1].posts[0].createdAt)
      assert.equal(users[1].posts[1].title, 'Lucid 102')
      assert.exists(users[1].posts[1].createdAt)
    })

    test('apply standard limit when not eagerloading', async ({ fs, assert }) => {
      const app = new AppFactory().create(fs.baseUrl, () => {})
      await app.init()
      const db = getDb()
      const adapter = ormAdapter(db)
      const BaseModel = getBaseModel(adapter)

      class Post extends BaseModel {
        @column()
        declare userId: number

        @column()
        declare title: string

        @column()
        declare createdAt: Date
      }

      class User extends BaseModel {
        @column({ isPrimary: true })
        declare id: number

        @hasMany(() => Post)
        declare posts: HasMany<typeof Post>
      }

      await db
        .insertQuery()
        .table('users')
        .insert([{ username: 'virk' }, { username: 'nikk' }])
      const [user0] = await db.query().from('users')

      /**
       * User 1
       */
      await db
        .insertQuery()
        .table('posts')
        .insert([
          {
            user_id: user0.id,
            title: 'Adonis 101',
            created_at: new Date(),
          },
          {
            user_id: user0.id,
            title: 'Adonis 102',
            created_at: new Date(),
          },
          {
            user_id: user0.id,
            title: 'Adonis 103',
            created_at: new Date(),
          },
          {
            user_id: user0.id,
            title: 'Adonis 104',
            created_at: new Date(),
          },
          {
            user_id: user0.id,
            title: 'Adonis 105',
            created_at: new Date(),
          },
        ])

      User.boot()

      const user = await User.firstOrFail()
      const { sql, bindings } = user.related('posts').query().groupLimit(2).toSQL()
      const { sql: knexSql, bindings: knexBindings } = db
        .query()
        .from('posts')
        .where('user_id', user.id)
        .limit(2)
        .toSQL()

      assert.equal(sql, knexSql)
      assert.deepEqual(bindings, knexBindings)
    })

    test('apply standard order by when not eagerloading', async ({ fs, assert }) => {
      const app = new AppFactory().create(fs.baseUrl, () => {})
      await app.init()
      const db = getDb()
      const adapter = ormAdapter(db)
      const BaseModel = getBaseModel(adapter)

      class Post extends BaseModel {
        @column()
        declare userId: number

        @column()
        declare title: string

        @column()
        declare createdAt: Date
      }

      class User extends BaseModel {
        @column({ isPrimary: true })
        declare id: number

        @hasMany(() => Post)
        declare posts: HasMany<typeof Post>
      }

      await db
        .insertQuery()
        .table('users')
        .insert([{ username: 'virk' }, { username: 'nikk' }])
      const [user0] = await db.query().from('users')

      /**
       * User 1
       */
      await db
        .insertQuery()
        .table('posts')
        .insert([
          {
            user_id: user0.id,
            title: 'Adonis 101',
            created_at: new Date(),
          },
          {
            user_id: user0.id,
            title: 'Adonis 102',
            created_at: new Date(),
          },
          {
            user_id: user0.id,
            title: 'Adonis 103',
            created_at: new Date(),
          },
          {
            user_id: user0.id,
            title: 'Adonis 104',
            created_at: new Date(),
          },
          {
            user_id: user0.id,
            title: 'Adonis 105',
            created_at: new Date(),
          },
        ])

      User.boot()

      const user = await User.firstOrFail()
      const { sql, bindings } = user
        .related('posts')
        .query()
        .groupLimit(2)
        .groupOrderBy('id', 'desc')
        .toSQL()
      const { sql: knexSql, bindings: knexBindings } = db
        .query()
        .from('posts')
        .where('user_id', user.id)
        .limit(2)
        .orderBy('id', 'desc')
        .toSQL()

      assert.equal(sql, knexSql)
      assert.deepEqual(bindings, knexBindings)
    })

    test('preload with group limit', async ({ fs, assert }) => {
      const app = new AppFactory().create(fs.baseUrl, () => {})
      await app.init()
      const db = getDb()
      const adapter = ormAdapter(db)
      const BaseModel = getBaseModel(adapter)

      class Comment extends BaseModel {
        @column({ isPrimary: true })
        declare id: number

        @column()
        declare postId: number

        @column()
        declare body: string
      }

      class Post extends BaseModel {
        @column({ isPrimary: true })
        declare id: number

        @column()
        declare userId: number

        @column()
        declare title: string

        @column()
        declare createdAt: Date

        @hasMany(() => Comment)
        declare comments: HasMany<typeof Comment>
      }

      class User extends BaseModel {
        @column({ isPrimary: true })
        declare id: number

        @hasMany(() => Post)
        declare posts: HasMany<typeof Post>
      }

      await db
        .insertQuery()
        .table('users')
        .insert([{ username: 'virk' }, { username: 'nikk' }])

      const [user0, user1] = await db.query().from('users')

      /**
       * User 1
       */
      await db
        .insertQuery()
        .table('posts')
        .multiInsert([
          {
            user_id: user0.id,
            title: 'Adonis 101',
            created_at: new Date(),
          },
          {
            user_id: user0.id,
            title: 'Adonis 102',
          },
          {
            user_id: user0.id,
            title: 'Adonis 103',
          },
          {
            user_id: user0.id,
            title: 'Adonis 104',
          },
          {
            user_id: user0.id,
            title: 'Adonis 105',
            created_at: new Date(),
          },
        ])

      /**
       * User 2
       */
      await db
        .insertQuery()
        .table('posts')
        .multiInsert([
          {
            user_id: user1.id,
            title: 'Lucid 101',
            created_at: new Date(),
          },
          {
            user_id: user1.id,
            title: 'Lucid 102',
          },
          {
            user_id: user1.id,
            title: 'Lucid 103',
            created_at: new Date(),
          },
          {
            user_id: user1.id,
            title: 'Lucid 104',
            created_at: new Date(),
          },
          {
            user_id: user1.id,
            title: 'Lucid 105',
          },
        ])

      User.boot()
      const posts = await Post.all()

      await Promise.all(
        posts.map((post) => {
          return post
            .related('comments')
            .createMany([{ body: 'Nice post' }, { body: 'Great post' }])
        })
      )

      const users = await User.query().preload('posts', (query) => {
        query.whereNotNull('created_at').groupLimit(2).preload('comments')
      })

      assert.lengthOf(users, 2)
      assert.lengthOf(users[0].posts, 2)
      assert.lengthOf(users[0].posts[0].comments, 2)
      assert.lengthOf(users[0].posts[1].comments, 2)

      assert.lengthOf(users[1].posts, 2)
      assert.lengthOf(users[1].posts[0].comments, 2)
      assert.lengthOf(users[1].posts[1].comments, 2)
    })

    test('pass sideloaded data after applying group limit', async ({ fs, assert }) => {
      const app = new AppFactory().create(fs.baseUrl, () => {})
      await app.init()
      const db = getDb()
      const adapter = ormAdapter(db)
      const BaseModel = getBaseModel(adapter)

      class Comment extends BaseModel {
        @column({ isPrimary: true })
        declare id: number

        @column()
        declare postId: number

        @column()
        declare body: string
      }

      class Post extends BaseModel {
        @column({ isPrimary: true })
        declare id: number

        @column()
        declare userId: number

        @column()
        declare title: string

        @column()
        declare createdAt: Date

        @hasMany(() => Comment)
        declare comments: HasMany<typeof Comment>
      }

      class User extends BaseModel {
        @column({ isPrimary: true })
        declare id: number

        @hasMany(() => Post)
        declare posts: HasMany<typeof Post>
      }

      await db
        .insertQuery()
        .table('users')
        .insert([{ username: 'virk' }, { username: 'nikk' }])

      const [user0, user1] = await db.query().from('users')

      /**
       * User 1
       */
      await db
        .insertQuery()
        .table('posts')
        .multiInsert([
          {
            user_id: user0.id,
            title: 'Adonis 101',
            created_at: new Date(),
          },
          {
            user_id: user0.id,
            title: 'Adonis 102',
          },
          {
            user_id: user0.id,
            title: 'Adonis 103',
          },
          {
            user_id: user0.id,
            title: 'Adonis 104',
          },
          {
            user_id: user0.id,
            title: 'Adonis 105',
            created_at: new Date(),
          },
        ])

      /**
       * User 2
       */
      await db
        .insertQuery()
        .table('posts')
        .multiInsert([
          {
            user_id: user1.id,
            title: 'Lucid 101',
            created_at: new Date(),
          },
          {
            user_id: user1.id,
            title: 'Lucid 102',
          },
          {
            user_id: user1.id,
            title: 'Lucid 103',
            created_at: new Date(),
          },
          {
            user_id: user1.id,
            title: 'Lucid 104',
            created_at: new Date(),
          },
          {
            user_id: user1.id,
            title: 'Lucid 105',
          },
        ])

      User.boot()
      const posts = await Post.all()

      await Promise.all(
        posts.map((post) => {
          return post
            .related('comments')
            .createMany([{ body: 'Nice post' }, { body: 'Great post' }])
        })
      )

      const users = await User.query().preload('posts', (query) => {
        query.whereNotNull('created_at').groupLimit(2).preload('comments').sideload({ foo: 'bar' })
      })

      assert.lengthOf(users, 2)
      assert.lengthOf(users[0].posts, 2)
      assert.lengthOf(users[0].posts[0].comments, 2)
      assert.lengthOf(users[0].posts[1].comments, 2)
      assert.deepEqual(users[0].posts[1].comments[0].$sideloaded, { foo: 'bar' })
      assert.deepEqual(users[0].posts[1].comments[1].$sideloaded, { foo: 'bar' })

      assert.lengthOf(users[1].posts, 2)
      assert.lengthOf(users[1].posts[0].comments, 2)
      assert.lengthOf(users[1].posts[1].comments, 2)
      assert.deepEqual(users[1].posts[1].comments[0].$sideloaded, { foo: 'bar' })
      assert.deepEqual(users[1].posts[1].comments[1].$sideloaded, { foo: 'bar' })
    })
  })
}

test.group('Model | HasMany | save', (group) => {
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

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare title: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    const user = new User()
    user.username = 'virk'
    await user.save()

    const post = new Post()
    post.title = 'Adonis 101'

    await user.related('posts').save(post)

    assert.isTrue(post.$isPersisted)
    assert.equal(user.id, post.userId)

    const totalUsers = await db.query().from('users').count('*', 'total')
    const totalPosts = await db.query().from('posts').count('*', 'total')

    assert.equal(totalUsers[0].total, 1)
    assert.equal(totalPosts[0].total, 1)
  })
})

test.group('Model | HasMany | saveMany', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('save many related instances', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare title: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    const user = new User()
    user.username = 'virk'
    await user.save()

    const post = new Post()
    post.title = 'Adonis 101'

    const post1 = new Post()
    post1.title = 'Lucid 101'

    await user.related('posts').saveMany([post, post1])

    assert.isTrue(post.$isPersisted)
    assert.equal(user.id, post.userId)

    assert.isTrue(post1.$isPersisted)
    assert.equal(user.id, post1.userId)

    const totalUsers = await db.query().from('users').count('*', 'total')
    const totalPosts = await db.query().from('posts').count('*', 'total')

    assert.equal(totalUsers[0].total, 1)
    assert.equal(totalPosts[0].total, 2)
  })

  test('wrap save many calls inside transaction', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    assert.plan(6)

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare title: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
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

  test('use parent model transaction when exists', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare title: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    const trx = await db.transaction()
    const user = new User()
    user.$trx = trx
    user.username = 'virk'

    const post = new Post()
    post.title = 'Adonis 101'

    try {
      await user.related('posts').saveMany([post])
    } catch (error) {
      console.log(error)
    }

    assert.isFalse(user.$trx.isCompleted)
    await trx.rollback()

    const totalUsers = await db.query().from('users').count('*', 'total')
    const totalPosts = await db.query().from('posts').count('*', 'total')

    assert.equal(totalUsers[0].total, 0)
    assert.equal(totalPosts[0].total, 0)
    assert.isUndefined(user.$trx)
    assert.isUndefined(post.$trx)
  })
})

test.group('Model | HasMany | create', (group) => {
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

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare title: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    const user = new User()
    user.username = 'virk'
    await user.save()

    const post = await user.related('posts').create({ title: 'Adonis 101' })

    assert.isTrue(post.$isPersisted)
    assert.equal(user.id, post.userId)

    const totalUsers = await db.query().from('users').count('*', 'total')
    const totalPosts = await db.query().from('posts').count('*', 'total')

    assert.equal(totalUsers[0].total, 1)
    assert.equal(totalPosts[0].total, 1)
  })
})

test.group('Model | HasMany | createMany', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('create many related instances', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare title: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
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

    assert.isTrue(post.$isPersisted)
    assert.equal(user.id, post.userId)

    assert.isTrue(post1.$isPersisted)
    assert.equal(user.id, post1.userId)

    const totalUsers = await db.query().from('users').count('*', 'total')
    const totalPosts = await db.query().from('posts').count('*', 'total')

    assert.equal(totalUsers[0].total, 1)
    assert.equal(totalPosts[0].total, 2)
  })

  test('wrap create many calls inside transaction', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    assert.plan(4)

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare title: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
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
    assert.isUndefined(user.$trx)
  })

  test('use parent model transaction when already exists', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare title: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    const trx = await db.transaction()
    const user = new User()
    user.$trx = trx
    user.username = 'virk'

    const [post] = await user.related('posts').createMany([{ title: 'Adonis 101' }])
    assert.isFalse(user.$trx.isCompleted)
    await trx.rollback()

    const totalUsers = await db.query().from('users').count('*', 'total')
    const totalPosts = await db.query().from('posts').count('*', 'total')

    assert.equal(totalUsers[0].total, 0)
    assert.equal(totalPosts[0].total, 0)
    assert.isUndefined(user.$trx)
    assert.isUndefined(post.$trx)
  })
})

test.group('Model | HasMany | firstOrCreate', (group) => {
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

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare title: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    const user = new User()
    user.username = 'virk'
    await user.save()

    await db.insertQuery().table('posts').insert({ title: 'Lucid 101' })
    const post = await user.related('posts').firstOrCreate(
      {},
      {
        title: 'Lucid 101',
      }
    )

    assert.isTrue(post.$isPersisted)
    assert.isTrue(post.$isLocal)
    assert.equal(user.id, post.userId)
    assert.equal(post.title, 'Lucid 101')

    const posts = await db.query().from('posts').orderBy('id', 'asc')
    assert.lengthOf(posts, 2)
    assert.equal(posts[1].user_id, user.id)
  })

  test('return existing instance vs creating one', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare title: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    const user = new User()
    user.username = 'virk'
    await user.save()

    await db.insertQuery().table('posts').insert({ title: 'Lucid 101', user_id: user.id })
    const post = await user.related('posts').firstOrCreate(
      {},
      {
        title: 'Adonis 101',
      }
    )

    assert.isTrue(post.$isPersisted)
    assert.isFalse(post.$isLocal)
    assert.equal(user.id, post.userId)
    assert.equal(post.title, 'Lucid 101')

    const posts = await db.query().from('posts').orderBy('id', 'asc')
    assert.lengthOf(posts, 1)
    assert.equal(posts[0].user_id, user.id)
  })
})

test.group('Model | HasMany | updateOrCreate', (group) => {
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

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare title: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    const user = new User()
    user.username = 'virk'
    await user.save()

    await db.insertQuery().table('posts').insert({ title: 'Lucid 101' })
    const post = await user.related('posts').updateOrCreate(
      {},
      {
        title: 'Adonis 101',
      }
    )

    assert.isTrue(post.$isPersisted)
    assert.isTrue(post.$isLocal)
    assert.equal(user.id, post.userId)
    assert.equal(post.title, 'Adonis 101')

    const posts = await db.query().from('posts').orderBy('id', 'asc')
    assert.lengthOf(posts, 2)
    assert.equal(posts[1].user_id, user.id)
  })

  test('update existing instance vs creating one', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare title: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    const user = new User()
    user.username = 'virk'
    await user.save()

    await db.insertQuery().table('posts').insert({ title: 'Lucid 101', user_id: user.id })
    const post = await user.related('posts').updateOrCreate(
      {},
      {
        title: 'Adonis 101',
      }
    )

    assert.isTrue(post.$isPersisted)
    assert.isFalse(post.$isLocal)
    assert.equal(user.id, post.userId)
    assert.equal(post.title, 'Adonis 101')

    const posts = await db.query().from('posts').orderBy('id', 'asc')
    assert.lengthOf(posts, 1)
    assert.equal(posts[0].user_id, user.id)
    assert.equal(posts[0].title, 'Adonis 101')
  })
})

test.group('Model | HasMany | fetchOrCreateMany', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test("create related instance when there aren't any existing row", async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare title: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    const user = new User()
    user.username = 'virk'
    await user.save()

    await db.insertQuery().table('posts').insert({ title: 'Lucid 101' })
    const [post] = await user.related('posts').fetchOrCreateMany([
      {
        title: 'Lucid 101',
      },
    ])

    assert.isTrue(post.$isPersisted)
    assert.isTrue(post.$isLocal)
    assert.equal(user.id, post.userId)
    assert.equal(post.title, 'Lucid 101')

    const posts = await db.query().from('posts').orderBy('id', 'asc')
    assert.lengthOf(posts, 2)
    assert.isNull(posts[0].user_id)
    assert.equal(posts[1].user_id, user.id)
  })

  test('return existing instance vs creating one', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare title: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    const user = new User()
    user.username = 'virk'
    await user.save()

    await db
      .insertQuery()
      .table('posts')
      .multiInsert([
        { title: 'Lucid 101', user_id: user.id },
        { title: 'Lucid 102', user_id: user.id + 1 },
      ])

    const [post, post1] = await user.related('posts').fetchOrCreateMany(
      [
        {
          title: 'Lucid 101',
        },
        {
          title: 'Lucid 102',
        },
      ],
      ['title']
    )

    assert.isTrue(post.$isPersisted)
    assert.isFalse(post.$isLocal)
    assert.equal(user.id, post.userId)
    assert.equal(post.title, 'Lucid 101')

    assert.isTrue(post1.$isPersisted)
    assert.isTrue(post1.$isLocal)
    assert.equal(user.id, post1.userId)
    assert.equal(post1.title, 'Lucid 102')

    const posts = await db.query().from('posts').orderBy('id', 'asc')
    assert.lengthOf(posts, 3)
    assert.equal(posts[0].user_id, user.id)
    assert.equal(posts[1].user_id, user.id + 1)
    assert.equal(posts[2].user_id, user.id)
  })
})

test.group('Model | HasMany | fetchOrCreateMany', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test("create related instance when there aren't any existing row", async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare title: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    const user = new User()
    user.username = 'virk'
    await user.save()

    await db.insertQuery().table('posts').insert({ title: 'Lucid 101' })
    const [post] = await user.related('posts').updateOrCreateMany([
      {
        title: 'Lucid 101',
      },
    ])

    assert.isTrue(post.$isPersisted)
    assert.isTrue(post.$isLocal)
    assert.equal(user.id, post.userId)
    assert.equal(post.title, 'Lucid 101')

    const posts = await db.query().from('posts').orderBy('id', 'asc')
    assert.lengthOf(posts, 2)
    assert.isNull(posts[0].user_id)
    assert.equal(posts[1].user_id, user.id)
  })

  test('update existing instance vs creating one', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare title: string

      @column()
      declare isPublished: boolean
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    const user = new User()
    user.username = 'virk'
    await user.save()

    await db
      .insertQuery()
      .table('posts')
      .multiInsert([
        { title: 'Lucid 101', user_id: user.id, is_published: false },
        { title: 'Lucid 102', user_id: user.id + 1, is_published: false },
      ])

    const [post, post1] = await user.related('posts').updateOrCreateMany(
      [
        {
          title: 'Lucid 101',
          isPublished: true,
        },
        {
          title: 'Lucid 102',
          isPublished: true,
        },
      ],
      ['title']
    )

    assert.isTrue(post.$isPersisted)
    assert.isFalse(post.$isLocal)
    assert.equal(user.id, post.userId)
    assert.equal(post.title, 'Lucid 101')
    assert.isTrue(!!post.isPublished)

    assert.isTrue(post1.$isPersisted)
    assert.isTrue(post1.$isLocal)
    assert.equal(user.id, post1.userId)
    assert.equal(post1.title, 'Lucid 102')
    assert.isTrue(!!post1.isPublished)

    const posts = await db.query().from('posts').orderBy('id', 'asc')
    assert.lengthOf(posts, 3)
    assert.equal(posts[0].user_id, user.id)
    assert.isTrue(!!posts[0].is_published)

    assert.equal(posts[1].user_id, user.id + 1)
    assert.isFalse(!!posts[1].is_published)

    assert.equal(posts[2].user_id, user.id)
    assert.isTrue(!!posts[2].is_published)
  })
})

test.group('Model | HasMany | paginate', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('paginate using related model query builder instance', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column()
      declare userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    User.boot()
    User.$getRelation('posts')!.boot()

    const [row] = await db
      .table<{ id: number } | number>('users')
      .insert({ username: 'virk' })
      .returning('id')

    await db.table('posts').multiInsert(getPosts(18, typeof row === 'number' ? row : row.id))

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
      perPage: 5,
      currentPage: 1,
      lastPage: 4,
      firstPage: 1,
      firstPageUrl: '/posts?page=1',
      lastPageUrl: '/posts?page=4',
      nextPageUrl: '/posts?page=2',
      previousPageUrl: null,
    })
  })

  test('disallow paginate during preload', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    assert.plan(1)

    class Post extends BaseModel {
      @column()
      declare userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    User.boot()
    User.$getRelation('posts')!.boot()

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

test.group('Model | HasMany | clone', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('clone related model query builder', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column()
      declare userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    User.boot()
    User.$getRelation('posts')!.boot()

    await db.table('users').insert({ username: 'virk' }).returning('id')

    const user = await User.find(1)
    const clonedQuery = user!.related('posts').query().clone()
    assert.instanceOf(clonedQuery, HasManyQueryBuilder)
  })
})

test.group('Model | HasMany | scopes', (group) => {
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

    class Post extends BaseModel {
      @column()
      declare userId: number

      @column()
      declare title: string

      static adonisOnly = scope((query) => {
        query.where('title', 'Adonis 101')
      })
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    User.boot()
    User.$getRelation('posts')!.boot()

    const [row] = await db
      .table<{ id: number } | number>('users')
      .insert({ username: 'virk' })
      .returning('id')

    await db
      .insertQuery()
      .table('posts')
      .insert({ user_id: typeof row === 'number' ? row : row.id, title: 'Lucid 101' })
    await db
      .insertQuery()
      .table('posts')
      .insert({ user_id: typeof row === 'number' ? row : row.id, title: 'Adonis 101' })

    const user = await User.query()
      .preload('posts', (query) => {
        query.apply((scopes) => scopes.adonisOnly())
      })
      .firstOrFail()

    const userWithoutScope = await User.query().preload('posts').firstOrFail()

    assert.lengthOf(user.posts, 1)
    assert.lengthOf(userWithoutScope.posts, 2)
    assert.equal(user.posts[0].title, 'Adonis 101')
  })

  test('apply scopes on related query', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column()
      declare userId: number

      @column()
      declare title: string

      static adonisOnly = scope((query) => {
        query.where('title', 'Adonis 101')
      })
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    User.boot()
    User.$getRelation('posts')!.boot()

    const [row] = await db
      .table<{ id: number } | number>('users')
      .insert({ username: 'virk' })
      .returning('id')

    await db
      .insertQuery()
      .table('posts')
      .insert({ user_id: typeof row === 'number' ? row : row.id, title: 'Lucid 101' })
    await db
      .insertQuery()
      .table('posts')
      .insert({ user_id: typeof row === 'number' ? row : row.id, title: 'Adonis 101' })

    const user = await User.findOrFail(1)

    const posts = await user
      .related('posts')
      .query()
      .apply((scopes) => scopes.adonisOnly())
    const postsWithoutScope = await user.related('posts').query()

    assert.lengthOf(posts, 1)
    assert.lengthOf(postsWithoutScope, 2)
    assert.equal(posts[0].title, 'Adonis 101')
  })
})

test.group('Model | HasMany | onQuery', (group) => {
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

    class Post extends BaseModel {
      @column()
      declare userId: number

      @column()
      declare title: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasMany(() => Post, {
        onQuery: (query) => query.where('title', 'Adonis 101'),
      })
      declare posts: HasMany<typeof Post>
    }

    User.boot()
    User.$getRelation('posts')!.boot()

    const [row] = await db
      .table<{ id: number } | number>('users')
      .insert({ username: 'virk' })
      .returning('id')

    await db
      .insertQuery()
      .table('posts')
      .insert({ user_id: typeof row === 'number' ? row : row.id, title: 'Lucid 101' })
    await db
      .insertQuery()
      .table('posts')
      .insert({ user_id: typeof row === 'number' ? row : row.id, title: 'Adonis 101' })

    const user = await User.query().preload('posts').firstOrFail()
    assert.lengthOf(user.posts, 1)
    assert.equal(user.posts[0].title, 'Adonis 101')
  })

  test('do not invoke onQuery method on preloading subqueries', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    assert.plan(3)

    class Post extends BaseModel {
      @column()
      declare userId: number

      @column()
      declare title: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasMany(() => Post, {
        onQuery: (query) => {
          assert.isTrue(true)
          query.where('title', 'Adonis 101')
        },
      })
      declare posts: HasMany<typeof Post>
    }

    User.boot()
    User.$getRelation('posts')!.boot()

    const [row] = await db
      .table<{ id: number } | number>('users')
      .insert({ username: 'virk' })
      .returning('id')
    await db
      .insertQuery()
      .table('posts')
      .insert({ user_id: typeof row === 'number' ? row : row.id, title: 'Lucid 101' })
    await db
      .insertQuery()
      .table('posts')
      .insert({ user_id: typeof row === 'number' ? row : row.id, title: 'Adonis 101' })

    const user = await User.query()
      .preload('posts', (query) => query.where(() => {}))
      .firstOrFail()
    assert.lengthOf(user.posts, 1)
    assert.equal(user.posts[0].title, 'Adonis 101')
  })

  test('invoke onQuery method on related query', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column()
      declare userId: number

      @column()
      declare title: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasMany(() => Post, {
        onQuery: (query) => query.where('title', 'Adonis 101'),
      })
      declare posts: HasMany<typeof Post>
    }

    User.boot()
    User.$getRelation('posts')!.boot()

    const [row] = await db
      .table<{ id: number } | number>('users')
      .insert({ username: 'virk' })
      .returning('id')
    await db
      .insertQuery()
      .table('posts')
      .insert({ user_id: typeof row === 'number' ? row : row.id, title: 'Lucid 101' })
    await db
      .insertQuery()
      .table('posts')
      .insert({ user_id: typeof row === 'number' ? row : row.id, title: 'Adonis 101' })

    const user = await User.findOrFail(1)

    const posts = await user.related('posts').query()
    assert.lengthOf(posts, 1)
    assert.equal(posts[0].title, 'Adonis 101')
  })

  test('do not invoke onQuery method on related query subqueries', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column()
      declare userId: number

      @column()
      declare title: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasMany(() => Post, {
        onQuery: (query) => query.where('title', 'Adonis 101'),
      })
      declare posts: HasMany<typeof Post>
    }

    User.boot()
    User.$getRelation('posts')!.boot()

    const [row] = await db
      .table<{ id: number } | number>('users')
      .insert({ username: 'virk' })
      .returning('id')
    await db
      .insertQuery()
      .table('posts')
      .insert({ user_id: typeof row === 'number' ? row : row.id, title: 'Lucid 101' })
    await db
      .insertQuery()
      .table('posts')
      .insert({ user_id: typeof row === 'number' ? row : row.id, title: 'Adonis 101' })

    const user = await User.findOrFail(1)

    const { sql, bindings } = user
      .related('posts')
      .query()
      .where((query) => {
        query.whereNotNull('created_at')
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = db
      .connection()
      .from('posts')
      .where((query) => {
        query.where('title', 'Adonis 101').where((subquery) => subquery.whereNotNull('created_at'))
      })
      .where((query) => {
        query.where('user_id', 1)
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })
})

test.group('Model | HasMany | delete', (group) => {
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

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare title: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    const user = new User()
    user.username = 'virk'
    await user.save()

    const post = await user.related('posts').create({ title: 'Adonis 101' })
    const { sql, bindings } = user.related('posts').query().del().toSQL()

    const { sql: rawSql, bindings: rawBindings } = db
      .from('posts')
      .where('user_id', post.id)
      .del()
      .toSQL()

    assert.deepEqual(bindings, rawBindings)
    assert.deepEqual(sql, rawSql)
  })
})
