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
import { HasManyThrough } from '@ioc:Adonis/Lucid/Orm'

import { hasManyThrough, column } from '../../src/Orm/Decorators'
import { ormAdapter, getBaseModel, setup, cleanup, resetTables, getDb, getProfiler } from '../../test-helpers'

let db: ReturnType<typeof getDb>
let BaseModel: ReturnType<typeof getBaseModel>

test.group('Model | Has Many Through | Options', (group) => {
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

      class Post extends BaseModel {
      }
      Post.boot()

      class Country extends BaseModel {
        @hasManyThrough([() => Post, () => User])
        public posts: HasManyThrough<Post>
      }
      Country.boot()

      Country.$getRelation('posts').boot()
    } catch ({ message }) {
      assert.equal(
        message,
        'E_MISSING_MODEL_ATTRIBUTE: "Country.posts" expects "id" to exist on "Country" model, but is missing',
      )
    }
  })

  test('raise error when foreignKey is missing', (assert) => {
    assert.plan(1)

    try {
      class User extends BaseModel {
      }
      User.boot()

      class Post extends BaseModel {
      }
      Post.boot()

      class Country extends BaseModel {
        @column({ isPrimary: true })
        public id: number

        @hasManyThrough([() => Post, () => User])
        public posts: HasManyThrough<Post>
      }
      Country.boot()

      Country.$getRelation('posts').boot()
    } catch ({ message }) {
      assert.equal(
        message,
        'E_MISSING_MODEL_ATTRIBUTE: "Country.posts" expects "countryId" to exist on "User" model, but is missing',
      )
    }
  })

  test('raise error when through local key is missing', (assert) => {
    assert.plan(1)

    try {
      class User extends BaseModel {
        @column()
        public countryId: number
      }
      User.boot()

      class Post extends BaseModel {
      }
      Post.boot()

      class Country extends BaseModel {
        @column({ isPrimary: true })
        public id: number

        @hasManyThrough([() => Post, () => User])
        public posts: HasManyThrough<Post>
      }
      Country.boot()

      Country.$getRelation('posts').boot()
    } catch ({ message }) {
      assert.equal(
        message,
        'E_MISSING_MODEL_ATTRIBUTE: "Country.posts" expects "id" to exist on "User" model, but is missing',
      )
    }
  })

  test('raise error when through foreign key is missing', (assert) => {
    assert.plan(1)

    try {
      class User extends BaseModel {
        @column({ isPrimary: true })
        public id: number

        @column()
        public countryId: number
      }
      User.boot()

      class Post extends BaseModel {
      }
      Post.boot()

      class Country extends BaseModel {
        @column({ isPrimary: true })
        public id: number

        @hasManyThrough([() => Post, () => User])
        public posts: HasManyThrough<Post>
      }
      Country.boot()

      Country.$getRelation('posts').boot()
    } catch ({ message }) {
      assert.equal(
        message,
        'E_MISSING_MODEL_ATTRIBUTE: "Country.posts" expects "userId" to exist on "Post" model, but is missing',
      )
    }
  })

  test('compute all required keys', (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column()
      public userId: number
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasManyThrough([() => Post, () => User])
      public posts: HasManyThrough<Post>
    }

    Country.boot()

    const relation = Country.$getRelation('posts')
    relation.boot()

    assert.equal(relation['localKey'], 'id')
    assert.equal(relation['localCastAsKey'], 'id')

    assert.equal(relation['foreignKey'], 'countryId')
    assert.equal(relation['foreignCastAsKey'], 'country_id')

    assert.equal(relation['throughLocalKey'], 'id')
    assert.equal(relation['throughLocalCastAsKey'], 'id')

    assert.equal(relation['throughForeignKey'], 'userId')
    assert.equal(relation['throughForeignCastAsKey'], 'user_id')
  })

  test('compute custom keys', (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public uid: number

      @column()
      public countryUid: number
    }
    User.boot()

    class Post extends BaseModel {
      @column()
      public userUid: number
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      public uid: number

      @hasManyThrough([() => Post, () => User], {
        throughForeignKey: 'userUid',
        throughLocalKey: 'uid',
        foreignKey: 'countryUid',
        localKey: 'uid',
      })
      public posts: HasManyThrough<Post>
    }

    Country.boot()

    const relation = Country.$getRelation('posts')
    relation.boot()

    assert.equal(relation['localKey'], 'uid')
    assert.equal(relation['localCastAsKey'], 'uid')

    assert.equal(relation['foreignKey'], 'countryUid')
    assert.equal(relation['foreignCastAsKey'], 'country_uid')

    assert.equal(relation['throughLocalKey'], 'uid')
    assert.equal(relation['throughLocalCastAsKey'], 'uid')

    assert.equal(relation['throughForeignKey'], 'userUid')
    assert.equal(relation['throughForeignCastAsKey'], 'user_uid')
  })
})

test.group('Model | Has Many Through | Set Relations', (group) => {
  group.before(async () => {
    db = getDb()
    BaseModel = getBaseModel(ormAdapter(db))
  })

  test('set related model instance', (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column()
      public userId: number
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasManyThrough([() => Post, () => User])
      public posts: HasManyThrough<Post>
    }

    Country.boot()
    Country.$getRelation('posts').boot()

    const country = new Country()
    const post = new Post()

    Country.$getRelation('posts').$setRelated(country, [post])
    assert.deepEqual(country.posts, [post])
  })

  test('push related model instance', (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column()
      public userId: number
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasManyThrough([() => Post, () => User])
      public posts: HasManyThrough<Post>
    }

    Country.boot()
    Country.$getRelation('posts').boot()

    const country = new Country()
    const post = new Post()
    const post1 = new Post()

    Country.$getRelation('posts').$setRelated(country, [post])
    Country.$getRelation('posts').$pushRelated(country, [post1])
    assert.deepEqual(country.posts, [post, post1])
  })

  test('set many of related instances', (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column()
      public userId: number
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasManyThrough([() => Post, () => User])
      public posts: HasManyThrough<Post>
    }

    Country.boot()
    Country.$getRelation('posts').boot()

    const country = new Country()
    country.fill({ id: 1 })

    const country1 = new Country()
    country1.fill({ id: 2 })

    const country2 = new Country()
    country2.fill({ id: 3 })

    const post = new Post()
    post.fill({ userId: 1 })
    post.$extras = {
      through_country_id: 1,
    }

    const post1 = new Post()
    post1.fill({ userId: 2 })
    post1.$extras = {
      through_country_id: 2,
    }

    const post2 = new Post()
    post2.fill({ userId: 3 })
    post2.$extras = {
      through_country_id: 1,
    }

    Country.$getRelation('posts').$setRelatedForMany([country, country1, country2], [post, post1, post2])
    assert.deepEqual(country.posts, [post, post2])
    assert.deepEqual(country1.posts, [post1])
    assert.deepEqual(country2.posts, [] as any)
  })
})

test.group('Model | Has Many Through | bulk operations', (group) => {
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

      @column()
      public countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column()
      public userId: number
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasManyThrough([() => Post, () => User])
      public posts: HasManyThrough<Post>
    }

    Country.boot()
    await db.table('countries').insert({ name: 'India' })

    const country = await Country.find(1)
    const { sql, bindings } = country!.related('posts').query().toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.connection()
      .getWriteClient()
      .from('posts')
      .select('posts.*', 'users.country_id as through_country_id')
      .innerJoin('users', 'users.id', 'posts.user_id')
      .where('users.country_id', 1)
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('generate correct sql for selecting many related rows', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column()
      public userId: number
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasManyThrough([() => Post, () => User])
      public posts: HasManyThrough<Post>
    }

    Country.boot()
    await db.table('countries').multiInsert([
      { name: 'India' },
      { name: 'UK' },
    ])

    const countries = await Country.all()
    Country.$getRelation('posts').boot()

    const related = Country.$getRelation('posts').client(countries, db.connection())
    const { sql, bindings } = related.query().toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.connection()
      .getWriteClient()
      .from('posts')
      .select('posts.*', 'users.country_id as through_country_id')
      .innerJoin('users', 'users.id', 'posts.user_id')
      .whereIn('users.country_id', [2, 1])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('generate correct sql for updating related rows', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column()
      public userId: number
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasManyThrough([() => Post, () => User])
      public posts: HasManyThrough<Post>
    }

    Country.boot()
    await db.table('countries').insert({ name: 'India' })

    const country = await Country.find(1)
    const now = new Date()

    const { sql, bindings } = country!.related('posts').query().update({
      updated_at: now,
    }).toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.connection()
      .getWriteClient()
      .from('posts')
      .update({ updated_at: now })
      .whereIn('posts.user_id', (builder) => {
        builder.from('users').where('users.country_id', 1)
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('generate correct sql for updating many related rows', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column()
      public userId: number
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasManyThrough([() => Post, () => User])
      public posts: HasManyThrough<Post>
    }

    Country.boot()
    await db.table('countries').multiInsert([
      { name: 'India' },
      { name: 'UK' },
    ])

    const countries = await Country.all()
    Country.$getRelation('posts').boot()

    const now = new Date()
    const related = Country.$getRelation('posts').client(countries, db.connection())

    const { sql, bindings } = related.query().update({
      updated_at: now,
    }).toSQL()
    const { sql: knexSql, bindings: knexBindings } = db.connection()
      .getWriteClient()
      .from('posts')
      .update({ updated_at: now })
      .whereIn('posts.user_id', (builder) => {
        builder.from('users').whereIn('users.country_id', [2, 1])
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('generate correct sql for deleting related rows', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column()
      public userId: number
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasManyThrough([() => Post, () => User])
      public posts: HasManyThrough<Post>
    }

    Country.boot()
    await db.table('countries').insert({ name: 'India' })

    const country = await Country.find(1)
    const { sql, bindings } = country!.related('posts').query().del().toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.connection()
      .getWriteClient()
      .from('posts')
      .del()
      .whereIn('posts.user_id', (builder) => {
        builder.from('users').where('users.country_id', 1)
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('generate correct sql for deleting many related rows', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column()
      public userId: number
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasManyThrough([() => Post, () => User])
      public posts: HasManyThrough<Post>
    }

    Country.boot()
    await db.table('countries').multiInsert([
      { name: 'India' },
      { name: 'UK' },
    ])

    const countries = await Country.all()
    Country.$getRelation('posts').boot()

    const related = Country.$getRelation('posts').client(countries, db.connection())

    const { sql, bindings } = related.query().del().toSQL()
    const { sql: knexSql, bindings: knexBindings } = db.connection()
      .getWriteClient()
      .from('posts')
      .del()
      .whereIn('posts.user_id', (builder) => {
        builder.from('users').whereIn('users.country_id', [2, 1])
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })
})

test.group('Model | Has Many Through | preload', (group) => {
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

  test('preload through relationships', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public title: string
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasManyThrough([() => Post, () => User])
      public posts: HasManyThrough<Post>
    }
    Country.boot()

    await db.insertQuery().table('countries').insert([{ name: 'India' }])

    await db.insertQuery().table('users').insert([
      { username: 'virk', country_id: 1 },
      { username: 'nikk', country_id: 1 },
    ])

    await db.insertQuery().table('posts').insert([
      { title: 'Adonis 101', user_id: 1 },
      { title: 'Lucid 101', user_id: 1 },
      { title: 'Adonis5', user_id: 2 },
    ])

    const countries = await Country.query().preload('posts')
    assert.lengthOf(countries, 1)
    assert.lengthOf(countries[0].posts, 3)
    assert.equal(countries[0].posts[0].title, 'Adonis 101')
    assert.equal(countries[0].posts[0].$extras.through_country_id, 1)

    assert.equal(countries[0].posts[1].title, 'Lucid 101')
    assert.equal(countries[0].posts[1].$extras.through_country_id, 1)

    assert.equal(countries[0].posts[2].title, 'Adonis5')
    assert.equal(countries[0].posts[2].$extras.through_country_id, 1)
  })

  test('preload many relationships', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public title: string
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasManyThrough([() => Post, () => User])
      public posts: HasManyThrough<Post>
    }
    Country.boot()

    await db.insertQuery().table('countries').insert([{ name: 'India' }, { name: 'USA' }])

    await db.insertQuery().table('users').insert([
      { username: 'virk', country_id: 1 },
      { username: 'nikk', country_id: 2 },
    ])

    await db.insertQuery().table('posts').insert([
      { title: 'Adonis 101', user_id: 1 },
      { title: 'Lucid 101', user_id: 1 },
      { title: 'Adonis5', user_id: 2 },
    ])

    const countries = await Country.query().preload('posts')
    assert.lengthOf(countries, 2)
    assert.lengthOf(countries[0].posts, 2)
    assert.lengthOf(countries[1].posts, 1)

    assert.equal(countries[0].posts[0].title, 'Adonis 101')
    assert.equal(countries[0].posts[0].$extras.through_country_id, 1)

    assert.equal(countries[0].posts[1].title, 'Lucid 101')
    assert.equal(countries[0].posts[1].$extras.through_country_id, 1)

    assert.equal(countries[1].posts[0].title, 'Adonis5')
    assert.equal(countries[1].posts[0].$extras.through_country_id, 2)
  })

  test('preload many relationships using model instance', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public title: string
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasManyThrough([() => Post, () => User])
      public posts: HasManyThrough<Post>
    }
    Country.boot()

    await db.insertQuery().table('countries').insert([{ name: 'India' }, { name: 'USA' }])

    await db.insertQuery().table('users').insert([
      { username: 'virk', country_id: 1 },
      { username: 'nikk', country_id: 2 },
    ])

    await db.insertQuery().table('posts').insert([
      { title: 'Adonis 101', user_id: 1 },
      { title: 'Lucid 101', user_id: 1 },
      { title: 'Adonis5', user_id: 2 },
    ])

    const countries = await Country.query().orderBy('id', 'asc')
    assert.lengthOf(countries, 2)

    await countries[0].preload('posts')
    await countries[1].preload('posts')

    assert.lengthOf(countries[0].posts, 2)
    assert.lengthOf(countries[1].posts, 1)

    assert.equal(countries[0].posts[0].title, 'Adonis 101')
    assert.equal(countries[0].posts[0].$extras.through_country_id, 1)

    assert.equal(countries[0].posts[1].title, 'Lucid 101')
    assert.equal(countries[0].posts[1].$extras.through_country_id, 1)

    assert.equal(countries[1].posts[0].title, 'Adonis5')
    assert.equal(countries[1].posts[0].$extras.through_country_id, 2)
  })

  test('cherry pick columns during preload', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public title: string
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasManyThrough([() => Post, () => User])
      public posts: HasManyThrough<Post>
    }
    Country.boot()

    await db.insertQuery().table('countries').insert([{ name: 'India' }, { name: 'USA' }])

    await db.insertQuery().table('users').insert([
      { username: 'virk', country_id: 1 },
      { username: 'nikk', country_id: 2 },
    ])

    await db.insertQuery().table('posts').insert([
      { title: 'Adonis 101', user_id: 1 },
      { title: 'Lucid 101', user_id: 1 },
      { title: 'Adonis5', user_id: 2 },
    ])

    const countries = await Country.query().preload('posts', (builder) => {
      builder.select('title')
    })

    assert.lengthOf(countries, 2)
    assert.lengthOf(countries[0].posts, 2)
    assert.lengthOf(countries[1].posts, 1)

    assert.equal(countries[0].posts[0].title, 'Adonis 101')
    assert.deepEqual(countries[0].posts[0].$extras, { through_country_id: 1 })

    assert.equal(countries[0].posts[1].title, 'Lucid 101')
    assert.deepEqual(countries[0].posts[1].$extras, { through_country_id: 1 })

    assert.equal(countries[1].posts[0].title, 'Adonis5')
    assert.deepEqual(countries[1].posts[0].$extras, { through_country_id: 2 })
  })

  test('raise error when local key is not selected', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public title: string
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasManyThrough([() => Post, () => User])
      public posts: HasManyThrough<Post>
    }
    Country.boot()

    await db.insertQuery().table('countries').insert([{ name: 'India' }, { name: 'USA' }])

    await db.insertQuery().table('users').insert([
      { username: 'virk', country_id: 1 },
      { username: 'nikk', country_id: 2 },
    ])

    await db.insertQuery().table('posts').insert([
      { title: 'Adonis 101', user_id: 1 },
      { title: 'Lucid 101', user_id: 1 },
      { title: 'Adonis5', user_id: 2 },
    ])

    try {
      await Country.query().select('name').preload('posts')
    } catch ({ message }) {
      assert.equal(message, 'Cannot preload "posts", value of "Country.id" is undefined')
    }
  })

  test('pass relationship metadata to the profiler', async (assert) => {
    assert.plan(1)

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public title: string
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasManyThrough([() => Post, () => User])
      public posts: HasManyThrough<Post>
    }
    Country.boot()

    await db.insertQuery().table('countries').insert([{ name: 'India' }])

    await db.insertQuery().table('users').insert([
      { username: 'virk', country_id: 1 },
      { username: 'nikk', country_id: 1 },
    ])

    await db.insertQuery().table('posts').insert([
      { title: 'Adonis 101', user_id: 1 },
      { title: 'Lucid 101', user_id: 1 },
      { title: 'Adonis5', user_id: 2 },
    ])

    const profiler = getProfiler(true)

    let profilerPacketIndex = 0
    profiler.process((packet) => {
      if (profilerPacketIndex === 1) {
        assert.deepEqual(packet.data.relation, {
          model: 'Country',
          relatedModel: 'Post',
          throughModel: 'User',
          relation: 'hasManyThrough',
        })
      }
      profilerPacketIndex++
    })

    await Country.query({ profiler }).preload('posts')
  })
})
