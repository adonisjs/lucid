/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import type { HasManyThrough } from '../../adonis-typings/relations.js'

import { scope } from '../../src/orm/base_model/index.js'
import { hasManyThrough, column } from '../../src/orm/decorators/index.js'
import { HasManyThroughQueryBuilder } from '../../src/orm/relations/has_many_through/query_builder.js'
import {
  ormAdapter,
  getBaseModel,
  setup,
  cleanup,
  resetTables,
  getDb,
} from '../../test-helpers/index.js'
import { AppFactory } from '@adonisjs/core/factories/app'

test.group('Model | Has Many Through | Options', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  test('raise error when localKey is missing', async ({ fs, assert }) => {
    assert.plan(1)

    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    try {
      class User extends BaseModel {}
      User.boot()

      class Post extends BaseModel {}
      Post.boot()

      class Country extends BaseModel {
        @hasManyThrough([() => Post, () => User])
        declare posts: HasManyThrough<typeof Post>
      }
      Country.boot()

      Country.$getRelation('posts')!.boot()
    } catch ({ message }) {
      assert.equal(
        message,
        'E_MISSING_MODEL_ATTRIBUTE: "Country.posts" expects "id" to exist on "Country" model, but is missing'
      )
    }
  })

  test('raise error when foreignKey is missing', async ({ fs, assert }) => {
    assert.plan(1)

    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    try {
      class User extends BaseModel {}
      User.boot()

      class Post extends BaseModel {}
      Post.boot()

      class Country extends BaseModel {
        @column({ isPrimary: true })
        declare id: number

        @hasManyThrough([() => Post, () => User])
        declare posts: HasManyThrough<typeof Post>
      }

      Country.boot()
      Country.$getRelation('posts')!.boot()
    } catch ({ message }) {
      assert.equal(
        message,
        'E_MISSING_MODEL_ATTRIBUTE: "Country.posts" expects "countryId" to exist on "User" model, but is missing'
      )
    }
  })

  test('raise error when through local key is missing', async ({ fs, assert }) => {
    assert.plan(1)

    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    try {
      class User extends BaseModel {
        @column()
        declare countryId: number
      }
      User.boot()

      class Post extends BaseModel {}
      Post.boot()

      class Country extends BaseModel {
        @column({ isPrimary: true })
        declare id: number

        @hasManyThrough([() => Post, () => User])
        declare posts: HasManyThrough<typeof Post>
      }

      Country.boot()
      Country.$getRelation('posts')!.boot()
    } catch ({ message }) {
      assert.equal(
        message,
        'E_MISSING_MODEL_ATTRIBUTE: "Country.posts" expects "id" to exist on "User" model, but is missing'
      )
    }
  })

  test('raise error when through foreign key is missing', async ({ fs, assert }) => {
    assert.plan(1)

    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    try {
      class User extends BaseModel {
        @column({ isPrimary: true })
        declare id: number

        @column()
        declare countryId: number
      }
      User.boot()

      class Post extends BaseModel {}
      Post.boot()

      class Country extends BaseModel {
        @column({ isPrimary: true })
        declare id: number

        @hasManyThrough([() => Post, () => User])
        declare posts: HasManyThrough<typeof Post>
      }

      Country.boot()
      Country.$getRelation('posts')!.boot()
    } catch ({ message }) {
      assert.equal(
        message,
        'E_MISSING_MODEL_ATTRIBUTE: "Country.posts" expects "userId" to exist on "Post" model, but is missing'
      )
    }
  })

  test('compute all required keys', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column()
      declare userId: number
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasManyThrough([() => Post, () => User])
      declare posts: HasManyThrough<typeof Post>
    }

    Country.boot()

    const relation = Country.$getRelation('posts')!
    relation.boot()

    assert.equal(relation['localKey'], 'id')
    assert.equal(relation['localKeyColumnName'], 'id')

    assert.equal(relation['foreignKey'], 'countryId')
    assert.equal(relation['foreignKeyColumnName'], 'country_id')

    assert.equal(relation['throughLocalKey'], 'id')
    assert.equal(relation['throughLocalKeyColumnName'], 'id')

    assert.equal(relation['throughForeignKey'], 'userId')
    assert.equal(relation['throughForeignKeyColumnName'], 'user_id')
  })

  test('compute custom keys', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare uid: number

      @column()
      declare countryUid: number
    }
    User.boot()

    class Post extends BaseModel {
      @column()
      declare userUid: number
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      declare uid: number

      @hasManyThrough([() => Post, () => User], {
        throughForeignKey: 'userUid',
        throughLocalKey: 'uid',
        foreignKey: 'countryUid',
        localKey: 'uid',
      })
      declare posts: HasManyThrough<typeof Post>
    }

    Country.boot()

    const relation = Country.$getRelation('posts')!
    relation.boot()

    assert.equal(relation['localKey'], 'uid')
    assert.equal(relation['localKeyColumnName'], 'uid')

    assert.equal(relation['foreignKey'], 'countryUid')
    assert.equal(relation['foreignKeyColumnName'], 'country_uid')

    assert.equal(relation['throughLocalKey'], 'uid')
    assert.equal(relation['throughLocalKeyColumnName'], 'uid')

    assert.equal(relation['throughForeignKey'], 'userUid')
    assert.equal(relation['throughForeignKeyColumnName'], 'user_uid')
  })

  test('clone relationship instance with options', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare uid: number

      @column()
      declare countryUid: number
    }
    User.boot()

    class Post extends BaseModel {
      @column()
      declare userUid: number
    }
    Post.boot()

    class BaseCountry extends BaseModel {
      @column({ isPrimary: true })
      declare uid: number

      @hasManyThrough([() => Post, () => User], {
        throughForeignKey: 'userUid',
        throughLocalKey: 'uid',
        foreignKey: 'countryUid',
        localKey: 'uid',
      })
      declare posts: HasManyThrough<typeof Post>
    }

    class Country extends BaseCountry {}
    Country.boot()

    const relation = Country.$getRelation('posts')!
    relation.boot()

    assert.deepEqual(relation.model, Country)

    assert.equal(relation['localKey'], 'uid')
    assert.equal(relation['localKeyColumnName'], 'uid')

    assert.equal(relation['foreignKey'], 'countryUid')
    assert.equal(relation['foreignKeyColumnName'], 'country_uid')

    assert.equal(relation['throughLocalKey'], 'uid')
    assert.equal(relation['throughLocalKeyColumnName'], 'uid')

    assert.equal(relation['throughForeignKey'], 'userUid')
    assert.equal(relation['throughForeignKeyColumnName'], 'user_uid')
  })
})

test.group('Model | Has Many Through | Set Relations', (group) => {
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
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column()
      declare userId: number
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasManyThrough([() => Post, () => User])
      declare posts: HasManyThrough<typeof Post>
    }

    Country.boot()
    Country.$getRelation('posts')!.boot()

    const country = new Country()
    const post = new Post()

    Country.$getRelation('posts')!.setRelated(country, [post])
    assert.deepEqual(country.posts, [post])
  })

  test('push related model instance', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column()
      declare userId: number
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasManyThrough([() => Post, () => User])
      declare posts: HasManyThrough<typeof Post>
    }

    Country.boot()
    Country.$getRelation('posts')!.boot()

    const country = new Country()
    const post = new Post()
    const post1 = new Post()

    Country.$getRelation('posts')!.setRelated(country, [post])
    Country.$getRelation('posts')!.pushRelated(country, [post1])
    assert.deepEqual(country.posts, [post, post1])
  })

  test('set many of related instances', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column()
      declare userId: number
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasManyThrough([() => Post, () => User])
      declare posts: HasManyThrough<typeof Post>
    }

    Country.boot()
    Country.$getRelation('posts')!.boot()

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

    Country.$getRelation('posts')!.setRelatedForMany(
      [country, country1, country2],
      [post, post1, post2]
    )
    assert.deepEqual(country.posts, [post, post2])
    assert.deepEqual(country1.posts, [post1])
    assert.deepEqual(country2.posts, [] as any)
  })
})

test.group('Model | Has Many Through | bulk operations', (group) => {
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
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column()
      declare userId: number
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasManyThrough([() => Post, () => User])
      declare posts: HasManyThrough<typeof Post>
    }

    Country.boot()
    await db.table('countries').insert({ name: 'India' })

    const country = await Country.find(1)
    const { sql, bindings } = country!.related('posts').query().toSQL()

    const { sql: knexSql, bindings: knexBindings } = db
      .connection()
      .getWriteClient()
      .from('posts')
      .select('posts.*', 'users.country_id as through_country_id')
      .innerJoin('users', 'users.id', 'posts.user_id')
      .where('users.country_id', 1)
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('generate correct sql for selecting many related rows', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column()
      declare userId: number
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasManyThrough([() => Post, () => User])
      declare posts: HasManyThrough<typeof Post>
    }

    Country.boot()
    await db.table('countries').multiInsert([{ name: 'India' }, { name: 'UK' }])

    const countries = await Country.all()
    Country.$getRelation('posts')!.boot()

    const query = Country.$getRelation('posts')!.eagerQuery(countries, db.connection())
    const { sql, bindings } = query.toSQL()

    const { sql: knexSql, bindings: knexBindings } = db
      .connection()
      .getWriteClient()
      .from('posts')
      .select('posts.*', 'users.country_id as through_country_id')
      .innerJoin('users', 'users.id', 'posts.user_id')
      .whereIn('users.country_id', [2, 1])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('generate correct sql for updating related rows', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column()
      declare userId: number
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasManyThrough([() => Post, () => User])
      declare posts: HasManyThrough<typeof Post>
    }

    Country.boot()
    await db.table('countries').insert({ name: 'India' })

    const country = await Country.find(1)
    const now = new Date()

    const { sql, bindings } = country!
      .related('posts')
      .query()
      .update({
        updated_at: now,
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = db
      .connection()
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

  test('generate correct sql for deleting related rows', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column()
      declare userId: number
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasManyThrough([() => Post, () => User])
      declare posts: HasManyThrough<typeof Post>
    }

    Country.boot()
    await db.table('countries').insert({ name: 'India' })

    const country = await Country.find(1)
    const { sql, bindings } = country!.related('posts').query().del().toSQL()

    const { sql: knexSql, bindings: knexBindings } = db
      .connection()
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
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column()
      declare userId: number
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasManyThrough([() => Post, () => User])
      declare posts: HasManyThrough<typeof Post>
    }

    Country.boot()
    Country.$getRelation('posts')!.boot()

    const { sql, bindings } = Country.$getRelation('posts')!.subQuery(db.connection()).toSQL()
    const { sql: knexSql, bindings: knexBindings } = db
      .connection()
      .knexQuery()
      .from('posts')
      .innerJoin('users', 'users.id', 'posts.user_id')
      .where('countries.id', '=', db.connection().getReadClient().ref('users.country_id'))
      .toSQL()

    assert.deepEqual(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('create aggregate query', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column()
      declare userId: number
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasManyThrough([() => Post, () => User])
      declare posts: HasManyThrough<typeof Post>
    }

    Country.boot()
    Country.$getRelation('posts')!.boot()

    const { sql, bindings } = Country.$getRelation('posts')!
      .subQuery(db.connection())
      .count('* as total')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = db
      .connection()
      .knexQuery()
      .from('posts')
      .count('* as total')
      .innerJoin('users', 'users.id', 'posts.user_id')
      .where('countries.id', '=', db.connection().getReadClient().ref('users.country_id'))
      .toSQL()

    assert.deepEqual(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('allow selecting custom columns', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column()
      declare userId: number
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasManyThrough([() => Post, () => User])
      declare posts: HasManyThrough<typeof Post>
    }

    Country.boot()
    Country.$getRelation('posts')!.boot()

    const { sql, bindings } = Country.$getRelation('posts')!
      .subQuery(db.connection())
      .select('title', 'is_published')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = db
      .connection()
      .knexQuery()
      .from('posts')
      .select('posts.title', 'posts.is_published')
      .innerJoin('users', 'users.id', 'posts.user_id')
      .where('countries.id', '=', db.connection().getReadClient().ref('users.country_id'))
      .toSQL()

    assert.deepEqual(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('generate correct self relationship subquery', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare countryId: number
    }
    User.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      /**
       * Funny relationship, but just ignore it
       */
      @hasManyThrough([() => Country, () => User])
      declare countries: HasManyThrough<typeof Country>
    }

    Country.boot()
    Country.$getRelation('countries')!.boot()

    const { sql, bindings } = Country.$getRelation('countries')!
      .subQuery(db.connection())
      .select('name')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = db
      .connection()
      .knexQuery()
      .from('countries as adonis_temp_0')
      .select('adonis_temp_0.name')
      .innerJoin('users', 'users.id', 'adonis_temp_0.user_id')
      .where('countries.id', '=', db.connection().getReadClient().ref('users.country_id'))
      .toSQL()

    assert.deepEqual(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('raise exception when trying to execute the query', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column()
      declare userId: number
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasManyThrough([() => Post, () => User])
      declare posts: HasManyThrough<typeof Post>
    }

    Country.boot()
    Country.$getRelation('posts')!.boot()

    const exec = () => Country.$getRelation('posts')!.subQuery(db.connection())['exec']()
    const paginate = () => Country.$getRelation('posts')!.subQuery(db.connection())['paginate'](1)
    const update = () => Country.$getRelation('posts')!.subQuery(db.connection())['update']({})
    const del = () => Country.$getRelation('posts')!.subQuery(db.connection())['del']()
    const first = () => Country.$getRelation('posts')!.subQuery(db.connection())['first']()
    const firstOrFail = () =>
      Country.$getRelation('posts')!.subQuery(db.connection())['firstOrFail']()

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
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column()
      declare userId: number

      @column()
      declare isPublished: boolean
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasManyThrough([() => Post, () => User], {
        onQuery: (query) => query.where('isPublished', true),
      })
      declare posts: HasManyThrough<typeof Post>
    }

    Country.boot()
    Country.$getRelation('posts')!.boot()

    const { sql, bindings } = Country.$getRelation('posts')!.subQuery(db.connection()).toSQL()
    const { sql: knexSql, bindings: knexBindings } = db
      .connection()
      .knexQuery()
      .from('posts')
      .innerJoin('users', 'users.id', 'posts.user_id')
      .where('is_published', true)
      .where('countries.id', '=', db.connection().getReadClient().ref('users.country_id'))
      .toSQL()

    assert.deepEqual(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })
})

test.group('Model | Has Many Through | aggregates', (group) => {
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
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column()
      declare userId: number
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasManyThrough([() => Post, () => User])
      declare posts: HasManyThrough<typeof Post>
    }

    Country.boot()
    await db.table('countries').insert({ name: 'India' })
    await db.table('users').insert({
      username: 'virk',
      country_id: 1,
    })

    await db.table('posts').multiInsert([
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
        title: 'Profiler 101',
      },
    ])

    const country = await Country.find(1)
    const total = await country!.related('posts').query().count('* as total')
    assert.deepEqual(Number(total[0].$extras.total), 2)
  })

  test('select extra columns with count', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column()
      declare userId: number
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasManyThrough([() => Post, () => User])
      declare posts: HasManyThrough<typeof Post>
    }

    Country.boot()
    await db.table('countries').insert({ name: 'India' })
    await db.table('users').insert({
      username: 'virk',
      country_id: 1,
    })

    await db.table('posts').multiInsert([
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
        title: 'Profiler 101',
      },
    ])

    const country = await Country.find(1)
    const total = await country!
      .related('posts')
      .query()
      .select('title')
      .groupBy('posts.title')
      .count('* as total')

    assert.lengthOf(total, 2)
    assert.deepEqual(Number(total[0].$extras.total), 1)
    assert.equal(total[0].$extras.title, 'Adonis 101')
    assert.deepEqual(Number(total[0].$extras.total), 1)
    assert.equal(total[1].$extras.title, 'Lucid 101')
  })
})

test.group('Model | Has Many Through | preload', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('preload through relationships', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare title: string
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasManyThrough([() => Post, () => User])
      declare posts: HasManyThrough<typeof Post>
    }
    Country.boot()

    await db
      .insertQuery()
      .table('countries')
      .insert([{ name: 'India' }])

    await db
      .insertQuery()
      .table('users')
      .insert([
        { username: 'virk', country_id: 1 },
        { username: 'nikk', country_id: 1 },
      ])

    await db
      .insertQuery()
      .table('posts')
      .insert([
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

  test('preload many relationships', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare title: string
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasManyThrough([() => Post, () => User])
      declare posts: HasManyThrough<typeof Post>
    }
    Country.boot()

    await db
      .insertQuery()
      .table('countries')
      .insert([{ name: 'India' }, { name: 'USA' }])

    await db
      .insertQuery()
      .table('users')
      .insert([
        { username: 'virk', country_id: 1 },
        { username: 'nikk', country_id: 2 },
      ])

    await db
      .insertQuery()
      .table('posts')
      .insert([
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

  test('preload many relationships using model instance', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare title: string
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasManyThrough([() => Post, () => User])
      declare posts: HasManyThrough<typeof Post>
    }
    Country.boot()

    await db
      .insertQuery()
      .table('countries')
      .insert([{ name: 'India' }, { name: 'USA' }])

    await db
      .insertQuery()
      .table('users')
      .insert([
        { username: 'virk', country_id: 1 },
        { username: 'nikk', country_id: 2 },
      ])

    await db
      .insertQuery()
      .table('posts')
      .insert([
        { title: 'Adonis 101', user_id: 1 },
        { title: 'Lucid 101', user_id: 1 },
        { title: 'Adonis5', user_id: 2 },
      ])

    const countries = await Country.query().orderBy('id', 'asc')
    assert.lengthOf(countries, 2)

    await countries[0].load('posts')
    await countries[1].load('posts')

    assert.lengthOf(countries[0].posts, 2)
    assert.lengthOf(countries[1].posts, 1)

    assert.equal(countries[0].posts[0].title, 'Adonis 101')
    assert.equal(countries[0].posts[0].$extras.through_country_id, 1)

    assert.equal(countries[0].posts[1].title, 'Lucid 101')
    assert.equal(countries[0].posts[1].$extras.through_country_id, 1)

    assert.equal(countries[1].posts[0].title, 'Adonis5')
    assert.equal(countries[1].posts[0].$extras.through_country_id, 2)
  })

  test('cherry pick columns during preload', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare title: string
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasManyThrough([() => Post, () => User])
      declare posts: HasManyThrough<typeof Post>
    }
    Country.boot()

    await db
      .insertQuery()
      .table('countries')
      .insert([{ name: 'India' }, { name: 'USA' }])

    await db
      .insertQuery()
      .table('users')
      .insert([
        { username: 'virk', country_id: 1 },
        { username: 'nikk', country_id: 2 },
      ])

    await db
      .insertQuery()
      .table('posts')
      .insert([
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

  test('raise error when local key is not selected', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare title: string
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasManyThrough([() => Post, () => User])
      declare posts: HasManyThrough<typeof Post>
    }
    Country.boot()

    await db
      .insertQuery()
      .table('countries')
      .insert([{ name: 'India' }, { name: 'USA' }])

    await db
      .insertQuery()
      .table('users')
      .insert([
        { username: 'virk', country_id: 1 },
        { username: 'nikk', country_id: 2 },
      ])

    await db
      .insertQuery()
      .table('posts')
      .insert([
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

  test('do not run preload query when parent rows are empty', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare title: string
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasManyThrough([() => Post, () => User])
      declare posts: HasManyThrough<typeof Post>
    }
    Country.boot()

    const countries = await Country.query().preload('posts', () => {
      throw new Error('not expected to be here')
    })
    assert.lengthOf(countries, 0)
  })
})

test.group('Model | Has Many Through | withCount', (group) => {
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
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare title: string
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasManyThrough([() => Post, () => User])
      declare posts: HasManyThrough<typeof Post>
    }
    Country.boot()

    await db
      .insertQuery()
      .table('countries')
      .insert([{ name: 'India' }, { name: 'Switzerland' }])

    await db
      .insertQuery()
      .table('users')
      .multiInsert([
        { username: 'virk', country_id: 1 },
        { username: 'nikk', country_id: 1 },
        { username: 'romain', country_id: 2 },
        { username: 'joe', country_id: 2 },
      ])

    await db
      .insertQuery()
      .table('posts')
      .multiInsert([
        { title: 'Adonis 101', user_id: 1 },
        { title: 'Lucid 101', user_id: 1 },
        { title: 'Adonis5', user_id: 2 },
        { title: 'Validations 101', user_id: 3 },
        { title: 'Assets 101', user_id: 4 },
      ])

    const countries = await Country.query().withCount('posts').orderBy('id', 'asc')

    assert.lengthOf(countries, 2)
    assert.equal(countries[0].$extras.posts_count, 3)
    assert.equal(countries[1].$extras.posts_count, 2)
  })

  test('apply constraints to the withCount subquery', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare title: string
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasManyThrough([() => Post, () => User])
      declare posts: HasManyThrough<typeof Post>
    }
    Country.boot()

    await db
      .insertQuery()
      .table('countries')
      .insert([{ name: 'India' }, { name: 'Switzerland' }])

    await db
      .insertQuery()
      .table('users')
      .multiInsert([
        { username: 'virk', country_id: 1 },
        { username: 'nikk', country_id: 1 },
        { username: 'romain', country_id: 2 },
        { username: 'joe', country_id: 2 },
      ])

    await db
      .insertQuery()
      .table('posts')
      .multiInsert([
        { title: 'Adonis 101', user_id: 1 },
        { title: 'Lucid 101', user_id: 1 },
        { title: 'Adonis5', user_id: 2 },
        { title: 'Validations 101', user_id: 3 },
        { title: 'Assets 101', user_id: 4 },
      ])

    const countries = await Country.query()
      .withCount('posts', (query) => {
        query.whereIn('title', ['Adonis 101', 'Assets 101'])
      })
      .orderBy('id', 'asc')

    assert.lengthOf(countries, 2)
    assert.equal(countries[0].$extras.posts_count, 1)
    assert.equal(countries[1].$extras.posts_count, 1)
  })

  test('allow subquery to have custom aggregates', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare title: string
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasManyThrough([() => Post, () => User])
      declare posts: HasManyThrough<typeof Post>
    }
    Country.boot()

    await db
      .insertQuery()
      .table('countries')
      .insert([{ name: 'India' }, { name: 'Switzerland' }])

    await db
      .insertQuery()
      .table('users')
      .multiInsert([
        { username: 'virk', country_id: 1 },
        { username: 'nikk', country_id: 1 },
        { username: 'romain', country_id: 2 },
        { username: 'joe', country_id: 2 },
      ])

    await db
      .insertQuery()
      .table('posts')
      .multiInsert([
        { title: 'Adonis 101', user_id: 1 },
        { title: 'Lucid 101', user_id: 1 },
        { title: 'Adonis5', user_id: 2 },
        { title: 'Validations 101', user_id: 3 },
        { title: 'Assets 101', user_id: 4 },
      ])

    const countries = await Country.query()
      .withAggregate('posts', (query) => {
        query.countDistinct('posts.user_id').as('postsCount')
      })
      .orderBy('id', 'asc')

    assert.lengthOf(countries, 2)
    assert.equal(countries[0].$extras.postsCount, 2)
    assert.equal(countries[1].$extras.postsCount, 2)
  })

  test('allow cherry picking columns', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare title: string
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare name: string

      @hasManyThrough([() => Post, () => User])
      declare posts: HasManyThrough<typeof Post>
    }
    Country.boot()

    await db
      .insertQuery()
      .table('countries')
      .insert([{ name: 'India' }, { name: 'Switzerland' }])

    await db
      .insertQuery()
      .table('users')
      .multiInsert([
        { username: 'virk', country_id: 1 },
        { username: 'nikk', country_id: 1 },
        { username: 'romain', country_id: 2 },
        { username: 'joe', country_id: 2 },
      ])

    await db
      .insertQuery()
      .table('posts')
      .multiInsert([
        { title: 'Adonis 101', user_id: 1 },
        { title: 'Lucid 101', user_id: 1 },
        { title: 'Adonis5', user_id: 2 },
        { title: 'Validations 101', user_id: 3 },
        { title: 'Assets 101', user_id: 4 },
      ])

    const countries = await Country.query().select('name').withCount('posts').orderBy('id', 'asc')

    assert.lengthOf(countries, 2)
    assert.deepEqual(countries[0].$attributes, { name: 'India' })
    assert.deepEqual(countries[1].$attributes, { name: 'Switzerland' })
  })

  test('define custom alias for the count', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare title: string
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare name: string

      @hasManyThrough([() => Post, () => User])
      declare posts: HasManyThrough<typeof Post>
    }
    Country.boot()

    await db
      .insertQuery()
      .table('countries')
      .insert([{ name: 'India' }, { name: 'Switzerland' }])

    await db
      .insertQuery()
      .table('users')
      .multiInsert([
        { username: 'virk', country_id: 1 },
        { username: 'nikk', country_id: 1 },
        { username: 'romain', country_id: 2 },
        { username: 'joe', country_id: 2 },
      ])

    await db
      .insertQuery()
      .table('posts')
      .multiInsert([
        { title: 'Adonis 101', user_id: 1 },
        { title: 'Lucid 101', user_id: 1 },
        { title: 'Adonis5', user_id: 2 },
        { title: 'Validations 101', user_id: 3 },
        { title: 'Assets 101', user_id: 4 },
      ])

    const countries = await Country.query()
      .select('name')
      .withCount('posts', (query) => {
        query.as('countryPosts')
      })
      .orderBy('id', 'asc')

    assert.lengthOf(countries, 2)
    assert.deepEqual(Number(countries[0].$extras.countryPosts), 3)
    assert.deepEqual(Number(countries[1].$extras.countryPosts), 2)
  })

  test('lazy load relationship rows', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare title: string
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasManyThrough([() => Post, () => User])
      declare posts: HasManyThrough<typeof Post>
    }
    Country.boot()

    await db
      .insertQuery()
      .table('countries')
      .insert([{ name: 'India' }])

    await db
      .insertQuery()
      .table('users')
      .multiInsert([
        { username: 'virk', country_id: 1 },
        { username: 'nikk', country_id: 1 },
      ])

    await db
      .insertQuery()
      .table('posts')
      .multiInsert([
        { title: 'Adonis 101', user_id: 1 },
        { title: 'Lucid 101', user_id: 1 },
        { title: 'Adonis5', user_id: 2 },
        { title: 'Validations 101', user_id: 3 },
        { title: 'Assets 101', user_id: 4 },
      ])

    const country = await Country.query().orderBy('id', 'asc').firstOrFail()
    await country.loadCount('posts')

    assert.equal(Number(country.$extras.posts_count), 3)
  })

  test('apply constraints to the loadCount subquery', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare title: string
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasManyThrough([() => Post, () => User])
      declare posts: HasManyThrough<typeof Post>
    }
    Country.boot()

    await db
      .insertQuery()
      .table('countries')
      .insert([{ name: 'India' }, { name: 'Switzerland' }])

    await db
      .insertQuery()
      .table('users')
      .multiInsert([
        { username: 'virk', country_id: 1 },
        { username: 'nikk', country_id: 1 },
      ])

    await db
      .insertQuery()
      .table('posts')
      .multiInsert([
        { title: 'Adonis 101', user_id: 1 },
        { title: 'Lucid 101', user_id: 1 },
        { title: 'Adonis5', user_id: 2 },
        { title: 'Validations 101', user_id: 3 },
        { title: 'Assets 101', user_id: 4 },
      ])

    const country = await Country.query().orderBy('id', 'asc').firstOrFail()
    await country.loadCount('posts', (query) => {
      query.whereIn('title', ['Adonis 101', 'Assets 101'])
    })

    assert.equal(country.$extras.posts_count, 1)
  })
})

test.group('Model | Has Many Through | has', (group) => {
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
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare title: string
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare name: string

      @hasManyThrough([() => Post, () => User])
      declare posts: HasManyThrough<typeof Post>
    }
    Country.boot()

    await db
      .insertQuery()
      .table('countries')
      .insert([{ name: 'India' }, { name: 'Switzerland' }])

    await db
      .insertQuery()
      .table('users')
      .multiInsert([
        { username: 'virk', country_id: 1 },
        { username: 'nikk', country_id: 1 },
        { username: 'romain', country_id: 2 },
        { username: 'joe', country_id: 2 },
      ])

    await db
      .insertQuery()
      .table('posts')
      .multiInsert([
        { title: 'Adonis 101', user_id: 1 },
        { title: 'Lucid 101', user_id: 1 },
        { title: 'Adonis5', user_id: 2 },
      ])

    const countries = await Country.query().has('posts').orderBy('id', 'asc')

    assert.lengthOf(countries, 1)
    assert.equal(countries[0].name, 'India')
  })

  test('define expected number of rows', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare title: string
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare name: string

      @hasManyThrough([() => Post, () => User])
      declare posts: HasManyThrough<typeof Post>
    }
    Country.boot()

    await db
      .insertQuery()
      .table('countries')
      .insert([{ name: 'India' }, { name: 'Switzerland' }])

    await db
      .insertQuery()
      .table('users')
      .multiInsert([
        { username: 'virk', country_id: 1 },
        { username: 'nikk', country_id: 1 },
        { username: 'romain', country_id: 2 },
        { username: 'joe', country_id: 2 },
      ])

    await db
      .insertQuery()
      .table('posts')
      .multiInsert([
        { title: 'Adonis 101', user_id: 1 },
        { title: 'Lucid 101', user_id: 1 },
        { title: 'Adonis5', user_id: 2 },
        { title: 'Validations 101', user_id: 3 },
        { title: 'Assets 101', user_id: 4 },
      ])

    const countries = await Country.query().has('posts', '>', 2).orderBy('id', 'asc')

    assert.lengthOf(countries, 1)
    assert.equal(countries[0].name, 'India')
  })
})

test.group('Model | Has Many Through | whereHas', (group) => {
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
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare title: string
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare name: string

      @hasManyThrough([() => Post, () => User])
      declare posts: HasManyThrough<typeof Post>
    }
    Country.boot()

    await db
      .insertQuery()
      .table('countries')
      .insert([{ name: 'India' }, { name: 'Switzerland' }])

    await db
      .insertQuery()
      .table('users')
      .multiInsert([
        { username: 'virk', country_id: 1 },
        { username: 'nikk', country_id: 1 },
        { username: 'romain', country_id: 2 },
        { username: 'joe', country_id: 2 },
      ])

    await db
      .insertQuery()
      .table('posts')
      .multiInsert([
        { title: 'Adonis 101', user_id: 1, is_published: false },
        { title: 'Lucid 101', user_id: 1, is_published: true },
        { title: 'Adonis5', user_id: 2, is_published: true },
        { title: 'Validations 101', user_id: 3, is_published: false },
        { title: 'Assets 101', user_id: 4, is_published: false },
      ])

    const countries = await Country.query()
      .whereHas('posts', (query) => {
        query.where('is_published', true)
      })
      .orderBy('id', 'asc')

    assert.lengthOf(countries, 1)
    assert.equal(countries[0].name, 'India')
  })

  test('define expected number of rows', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare title: string
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare name: string

      @hasManyThrough([() => Post, () => User])
      declare posts: HasManyThrough<typeof Post>
    }
    Country.boot()

    await db
      .insertQuery()
      .table('countries')
      .insert([{ name: 'India' }, { name: 'Switzerland' }])

    await db
      .insertQuery()
      .table('users')
      .multiInsert([
        { username: 'virk', country_id: 1 },
        { username: 'nikk', country_id: 1 },
        { username: 'romain', country_id: 2 },
        { username: 'joe', country_id: 2 },
      ])

    await db
      .insertQuery()
      .table('posts')
      .multiInsert([
        { title: 'Adonis 101', user_id: 1, is_published: false },
        { title: 'Lucid 101', user_id: 1, is_published: true },
        { title: 'Adonis5', user_id: 2, is_published: true },
        { title: 'Validations 101', user_id: 3, is_published: true },
        { title: 'Assets 101', user_id: 4, is_published: false },
      ])

    const countries = await Country.query()
      .whereHas(
        'posts',
        (query) => {
          query.where('is_published', true)
        },
        '>',
        1
      )
      .orderBy('id', 'asc')

    assert.lengthOf(countries, 1)
    assert.equal(countries[0].name, 'India')
  })
})

if (process.env.DB !== 'mysql_legacy') {
  test.group('Model | Has Many Through | Group Limit', (group) => {
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
      const BaseModel = getBaseModel(adapter, app)

      class User extends BaseModel {
        @column({ isPrimary: true })
        declare id: number

        @column()
        declare countryId: number
      }
      User.boot()

      class Post extends BaseModel {
        @column({ isPrimary: true })
        declare id: number

        @column()
        declare userId: number

        @column()
        declare title: string
      }
      Post.boot()

      class Country extends BaseModel {
        @column({ isPrimary: true })
        declare id: number

        @hasManyThrough([() => Post, () => User])
        declare posts: HasManyThrough<typeof Post>
      }
      Country.boot()

      await db
        .insertQuery()
        .table('countries')
        .insert([{ name: 'India' }, { name: 'Switzerland' }])

      await db
        .insertQuery()
        .table('users')
        .insert([
          { username: 'virk', country_id: 1 },
          { username: 'nikk', country_id: 1 },
          { username: 'romain', country_id: 2 },
        ])

      /**
       * Country 1 posts
       */
      await db
        .insertQuery()
        .table('posts')
        .insert([
          { title: 'Adonis 101', user_id: 1 },
          { title: 'Adonis 102', user_id: 1 },
          { title: 'Adonis 103', user_id: 2 },
          { title: 'Adonis 104', user_id: 2 },
          { title: 'Adonis 105', user_id: 1 },
        ])

      /**
       * Country 2 posts
       */
      await db
        .insertQuery()
        .table('posts')
        .insert([
          { title: 'Lucid 101', user_id: 3 },
          { title: 'Lucid 102', user_id: 3 },
          { title: 'Lucid 103', user_id: 3 },
          { title: 'Lucid 104', user_id: 3 },
          { title: 'Lucid 105', user_id: 3 },
        ])

      const countries = await Country.query().preload('posts', (query) => query.groupLimit(2))
      assert.lengthOf(countries, 2)

      assert.lengthOf(countries[0].posts, 2)
      assert.equal(countries[0].posts[0].title, 'Adonis 105')
      assert.equal(countries[0].posts[0].$extras.through_country_id, 1)
      assert.equal(countries[0].posts[1].title, 'Adonis 104')
      assert.equal(countries[0].posts[1].$extras.through_country_id, 1)

      assert.lengthOf(countries[1].posts, 2)
      assert.equal(countries[1].posts[0].title, 'Lucid 105')
      assert.equal(countries[1].posts[0].$extras.through_country_id, 2)
      assert.equal(countries[1].posts[1].title, 'Lucid 104')
      assert.equal(countries[1].posts[1].$extras.through_country_id, 2)
    })

    test('apply group limit with custom constraints', async ({ fs, assert }) => {
      const app = new AppFactory().create(fs.baseUrl, () => {})
      await app.init()
      const db = getDb()
      const adapter = ormAdapter(db)
      const BaseModel = getBaseModel(adapter, app)

      class User extends BaseModel {
        @column({ isPrimary: true })
        declare id: number

        @column()
        declare countryId: number
      }
      User.boot()

      class Post extends BaseModel {
        @column({ isPrimary: true })
        declare id: number

        @column()
        declare userId: number

        @column()
        declare title: string
      }
      Post.boot()

      class Country extends BaseModel {
        @column({ isPrimary: true })
        declare id: number

        @hasManyThrough([() => Post, () => User])
        declare posts: HasManyThrough<typeof Post>
      }
      Country.boot()

      await db
        .insertQuery()
        .table('countries')
        .insert([{ name: 'India' }, { name: 'Switzerland' }])

      await db
        .insertQuery()
        .table('users')
        .insert([
          { username: 'virk', country_id: 1 },
          { username: 'nikk', country_id: 1 },
          { username: 'romain', country_id: 2 },
        ])

      /**
       * Country 1 posts
       */
      await db
        .insertQuery()
        .table('posts')
        .insert([
          { title: 'Adonis 101', user_id: 1, created_at: new Date() },
          { title: 'Adonis 102', user_id: 1 },
          { title: 'Adonis 103', user_id: 2 },
          { title: 'Adonis 104', user_id: 2, created_at: new Date() },
          { title: 'Adonis 105', user_id: 1 },
        ])

      /**
       * Country 2 posts
       */
      await db
        .insertQuery()
        .table('posts')
        .insert([
          { title: 'Lucid 101', user_id: 3 },
          { title: 'Lucid 102', user_id: 3, created_at: new Date() },
          { title: 'Lucid 103', user_id: 3, created_at: new Date() },
          { title: 'Lucid 104', user_id: 3 },
          { title: 'Lucid 105', user_id: 3, created_at: new Date() },
        ])

      const countries = await Country.query().preload('posts', (query) => {
        query.groupLimit(2).whereNotNull('posts.created_at')
      })
      assert.lengthOf(countries, 2)

      assert.lengthOf(countries[0].posts, 2)
      assert.equal(countries[0].posts[0].title, 'Adonis 104')
      assert.equal(countries[0].posts[0].$extras.through_country_id, 1)
      assert.equal(countries[0].posts[1].title, 'Adonis 101')
      assert.equal(countries[0].posts[1].$extras.through_country_id, 1)

      assert.lengthOf(countries[1].posts, 2)
      assert.equal(countries[1].posts[0].title, 'Lucid 105')
      assert.equal(countries[1].posts[0].$extras.through_country_id, 2)
      assert.equal(countries[1].posts[1].title, 'Lucid 103')
      assert.equal(countries[1].posts[1].$extras.through_country_id, 2)
    })

    test('apply group limit and cherry pick fields', async ({ fs, assert }) => {
      const app = new AppFactory().create(fs.baseUrl, () => {})
      await app.init()
      const db = getDb()
      const adapter = ormAdapter(db)
      const BaseModel = getBaseModel(adapter, app)

      class User extends BaseModel {
        @column({ isPrimary: true })
        declare id: number

        @column()
        declare countryId: number
      }
      User.boot()

      class Post extends BaseModel {
        @column({ isPrimary: true })
        declare id: number

        @column()
        declare userId: number

        @column()
        declare title: string

        @column()
        declare createdAt: Date
      }
      Post.boot()

      class Country extends BaseModel {
        @column({ isPrimary: true })
        declare id: number

        @hasManyThrough([() => Post, () => User])
        declare posts: HasManyThrough<typeof Post>
      }
      Country.boot()

      await db
        .insertQuery()
        .table('countries')
        .insert([{ name: 'India' }, { name: 'Switzerland' }])

      await db
        .insertQuery()
        .table('users')
        .insert([
          { username: 'virk', country_id: 1 },
          { username: 'nikk', country_id: 1 },
          { username: 'romain', country_id: 2 },
        ])

      /**
       * Country 1 posts
       */
      await db
        .insertQuery()
        .table('posts')
        .insert([
          { title: 'Adonis 101', user_id: 1, created_at: new Date() },
          { title: 'Adonis 102', user_id: 1 },
          { title: 'Adonis 103', user_id: 2 },
          { title: 'Adonis 104', user_id: 2, created_at: new Date() },
          { title: 'Adonis 105', user_id: 1 },
        ])

      /**
       * Country 2 posts
       */
      await db
        .insertQuery()
        .table('posts')
        .insert([
          { title: 'Lucid 101', user_id: 3 },
          { title: 'Lucid 102', user_id: 3, created_at: new Date() },
          { title: 'Lucid 103', user_id: 3, created_at: new Date() },
          { title: 'Lucid 104', user_id: 3 },
          { title: 'Lucid 105', user_id: 3, created_at: new Date() },
        ])

      const countries = await Country.query().preload('posts', (query) => {
        query.groupLimit(2).select('title')
      })
      assert.lengthOf(countries, 2)

      assert.lengthOf(countries[0].posts, 2)
      assert.equal(countries[0].posts[0].title, 'Adonis 105')
      assert.isUndefined(countries[0].posts[0].createdAt)
      assert.equal(countries[0].posts[0].$extras.through_country_id, 1)
      assert.equal(countries[0].posts[1].title, 'Adonis 104')
      assert.isUndefined(countries[0].posts[1].createdAt)
      assert.equal(countries[0].posts[1].$extras.through_country_id, 1)

      assert.lengthOf(countries[1].posts, 2)
      assert.equal(countries[1].posts[0].title, 'Lucid 105')
      assert.isUndefined(countries[1].posts[0].createdAt)
      assert.equal(countries[1].posts[0].$extras.through_country_id, 2)
      assert.equal(countries[1].posts[1].title, 'Lucid 104')
      assert.isUndefined(countries[1].posts[1].createdAt)
      assert.equal(countries[1].posts[1].$extras.through_country_id, 2)
    })

    test('apply group limit with custom order', async ({ fs, assert }) => {
      const app = new AppFactory().create(fs.baseUrl, () => {})
      await app.init()
      const db = getDb()
      const adapter = ormAdapter(db)
      const BaseModel = getBaseModel(adapter, app)

      class User extends BaseModel {
        @column({ isPrimary: true })
        declare id: number

        @column()
        declare countryId: number
      }
      User.boot()

      class Post extends BaseModel {
        @column({ isPrimary: true })
        declare id: number

        @column()
        declare userId: number

        @column()
        declare title: string

        @column()
        declare createdAt: Date
      }
      Post.boot()

      class Country extends BaseModel {
        @column({ isPrimary: true })
        declare id: number

        @hasManyThrough([() => Post, () => User])
        declare posts: HasManyThrough<typeof Post>
      }
      Country.boot()

      await db
        .insertQuery()
        .table('countries')
        .insert([{ name: 'India' }, { name: 'Switzerland' }])

      await db
        .insertQuery()
        .table('users')
        .insert([
          { username: 'virk', country_id: 1 },
          { username: 'nikk', country_id: 1 },
          { username: 'romain', country_id: 2 },
        ])

      /**
       * Country 1 posts
       */
      await db
        .insertQuery()
        .table('posts')
        .insert([
          { title: 'Adonis 101', user_id: 1, created_at: new Date() },
          { title: 'Adonis 102', user_id: 1 },
          { title: 'Adonis 103', user_id: 2 },
          { title: 'Adonis 104', user_id: 2, created_at: new Date() },
          { title: 'Adonis 105', user_id: 1 },
        ])

      /**
       * Country 2 posts
       */
      await db
        .insertQuery()
        .table('posts')
        .insert([
          { title: 'Lucid 101', user_id: 3 },
          { title: 'Lucid 102', user_id: 3, created_at: new Date() },
          { title: 'Lucid 103', user_id: 3, created_at: new Date() },
          { title: 'Lucid 104', user_id: 3 },
          { title: 'Lucid 105', user_id: 3, created_at: new Date() },
        ])

      const countries = await Country.query().preload('posts', (query) => {
        query.groupLimit(2).groupOrderBy('posts.title', 'asc')
      })
      assert.lengthOf(countries, 2)

      assert.lengthOf(countries[0].posts, 2)
      assert.equal(countries[0].posts[0].title, 'Adonis 101')
      assert.isDefined(countries[0].posts[0].createdAt)
      assert.equal(countries[0].posts[0].$extras.through_country_id, 1)
      assert.equal(countries[0].posts[1].title, 'Adonis 102')
      assert.isDefined(countries[0].posts[1].createdAt)
      assert.equal(countries[0].posts[1].$extras.through_country_id, 1)

      assert.lengthOf(countries[1].posts, 2)
      assert.equal(countries[1].posts[0].title, 'Lucid 101')
      assert.isDefined(countries[1].posts[0].createdAt)
      assert.equal(countries[1].posts[0].$extras.through_country_id, 2)
      assert.equal(countries[1].posts[1].title, 'Lucid 102')
      assert.isDefined(countries[1].posts[1].createdAt)
      assert.equal(countries[1].posts[1].$extras.through_country_id, 2)
    })

    test('apply standard limit when not eagerloading', async ({ fs, assert }) => {
      const app = new AppFactory().create(fs.baseUrl, () => {})
      await app.init()
      const db = getDb()
      const adapter = ormAdapter(db)
      const BaseModel = getBaseModel(adapter, app)

      class User extends BaseModel {
        @column({ isPrimary: true })
        declare id: number

        @column()
        declare countryId: number
      }
      User.boot()

      class Post extends BaseModel {
        @column({ isPrimary: true })
        declare id: number

        @column()
        declare userId: number

        @column()
        declare title: string
      }
      Post.boot()

      class Country extends BaseModel {
        @column({ isPrimary: true })
        declare id: number

        @hasManyThrough([() => Post, () => User])
        declare posts: HasManyThrough<typeof Post>
      }
      Country.boot()

      await db
        .insertQuery()
        .table('countries')
        .insert([{ name: 'India' }])

      await db
        .insertQuery()
        .table('users')
        .insert([
          { username: 'virk', country_id: 1 },
          { username: 'nikk', country_id: 1 },
        ])

      /**
       * Country 1 posts
       */
      await db
        .insertQuery()
        .table('posts')
        .insert([
          { title: 'Adonis 101', user_id: 1 },
          { title: 'Adonis 102', user_id: 1 },
          { title: 'Adonis 103', user_id: 2 },
          { title: 'Adonis 104', user_id: 2 },
          { title: 'Adonis 105', user_id: 1 },
        ])

      const country = await Country.firstOrFail()
      const { sql, bindings } = country.related('posts').query().groupLimit(2).toSQL()
      const { sql: knexSql, bindings: knexBindings } = db
        .query()
        .from('posts')
        .select('posts.*', 'users.country_id as through_country_id')
        .innerJoin('users', 'users.id', 'posts.user_id')
        .where('users.country_id', 1)
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
      const BaseModel = getBaseModel(adapter, app)

      class User extends BaseModel {
        @column({ isPrimary: true })
        declare id: number

        @column()
        declare countryId: number
      }
      User.boot()

      class Post extends BaseModel {
        @column({ isPrimary: true })
        declare id: number

        @column()
        declare userId: number

        @column()
        declare title: string
      }
      Post.boot()

      class Country extends BaseModel {
        @column({ isPrimary: true })
        declare id: number

        @hasManyThrough([() => Post, () => User])
        declare posts: HasManyThrough<typeof Post>
      }
      Country.boot()

      await db
        .insertQuery()
        .table('countries')
        .insert([{ name: 'India' }])

      await db
        .insertQuery()
        .table('users')
        .insert([
          { username: 'virk', country_id: 1 },
          { username: 'nikk', country_id: 1 },
        ])

      /**
       * Country 1 posts
       */
      await db
        .insertQuery()
        .table('posts')
        .insert([
          { title: 'Adonis 101', user_id: 1 },
          { title: 'Adonis 102', user_id: 1 },
          { title: 'Adonis 103', user_id: 2 },
          { title: 'Adonis 104', user_id: 2 },
          { title: 'Adonis 105', user_id: 1 },
        ])

      const country = await Country.firstOrFail()
      const { sql, bindings } = country
        .related('posts')
        .query()
        .groupLimit(2)
        .groupOrderBy('users.country_id', 'desc')
        .toSQL()

      const { sql: knexSql, bindings: knexBindings } = db
        .query()
        .from('posts')
        .select('posts.*', 'users.country_id as through_country_id')
        .innerJoin('users', 'users.id', 'posts.user_id')
        .where('users.country_id', 1)
        .limit(2)
        .orderBy('users.country_id', 'desc')
        .toSQL()

      assert.equal(sql, knexSql)
      assert.deepEqual(bindings, knexBindings)
    })
  })
}

test.group('Model | Has Many Through | pagination', (group) => {
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
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column()
      declare userId: number
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasManyThrough([() => Post, () => User])
      declare posts: HasManyThrough<typeof Post>
    }
    Country.boot()

    await db.table('countries').multiInsert([{ name: 'India' }, { name: 'Switzerland' }])
    await db.table('users').multiInsert([
      {
        username: 'virk',
        country_id: 1,
      },
      {
        username: 'nikk',
        country_id: 1,
      },
      {
        username: 'romain',
        country_id: 2,
      },
    ])

    await db.table('posts').multiInsert([
      {
        title: 'Adonis 101',
        user_id: 1,
      },
      {
        title: 'Lucid 101',
        user_id: 1,
      },
      {
        title: 'Design 101',
        user_id: 2,
      },
      {
        title: 'Dev 101',
        user_id: 3,
      },
    ])

    const country = await Country.find(1)
    const posts = await country!.related('posts').query().paginate(1, 2)
    posts.baseUrl('/posts')

    assert.lengthOf(posts.all(), 2)
    assert.instanceOf(posts.all()[0], Post)
    assert.notProperty(posts.all()[0].$extras, 'total')
    assert.equal(posts.perPage, 2)
    assert.equal(posts.currentPage, 1)
    assert.equal(posts.lastPage, 2)
    assert.isTrue(posts.hasPages)
    assert.isTrue(posts.hasMorePages)
    assert.isFalse(posts.isEmpty)
    assert.equal(posts.total, 3)
    assert.isTrue(posts.hasTotal)
    assert.deepEqual(posts.getMeta(), {
      total: 3,
      per_page: 2,
      current_page: 1,
      last_page: 2,
      first_page: 1,
      first_page_url: '/posts?page=1',
      last_page_url: '/posts?page=2',
      next_page_url: '/posts?page=2',
      previous_page_url: null,
    })
  })

  test('disallow paginate during preload', async ({ fs, assert }) => {
    assert.plan(1)

    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column()
      declare userId: number
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasManyThrough([() => Post, () => User])
      declare posts: HasManyThrough<typeof Post>
    }
    Country.boot()

    await db.table('countries').insert({ name: 'India' })

    try {
      await Country.query().preload('posts', (query) => query.paginate(1))
    } catch ({ message }) {
      assert.equal(message, 'Cannot paginate relationship "posts" during preload')
    }
  })
})

test.group('Model | Has Many Through | clone', (group) => {
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
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column()
      declare userId: number
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasManyThrough([() => Post, () => User])
      declare posts: HasManyThrough<typeof Post>
    }
    Country.boot()

    await db.table('countries').multiInsert([{ name: 'India' }, { name: 'Switzerland' }])
    await db.table('users').multiInsert([
      {
        username: 'virk',
        country_id: 1,
      },
      {
        username: 'nikk',
        country_id: 1,
      },
      {
        username: 'romain',
        country_id: 2,
      },
    ])

    await db.table('posts').multiInsert([
      {
        title: 'Adonis 101',
        user_id: 1,
      },
      {
        title: 'Lucid 101',
        user_id: 1,
      },
      {
        title: 'Design 101',
        user_id: 2,
      },
      {
        title: 'Dev 101',
        user_id: 3,
      },
    ])

    const country = await Country.find(1)
    const clonedQuery = country!.related('posts').query().clone()
    assert.instanceOf(clonedQuery, HasManyThroughQueryBuilder)
  })
})

test.group('Model | Has Many Through | scopes', (group) => {
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
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column()
      declare userId: number

      @column()
      declare title: string

      static adonisOnly = scope((query) => {
        query.where('title', 'Adonis 101')
      })
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasManyThrough([() => Post, () => User])
      declare posts: HasManyThrough<typeof Post>
    }
    Country.boot()

    await db.table('countries').multiInsert([{ name: 'India' }, { name: 'Switzerland' }])
    await db.table('users').multiInsert([
      {
        username: 'virk',
        country_id: 1,
      },
      {
        username: 'nikk',
        country_id: 1,
      },
      {
        username: 'romain',
        country_id: 2,
      },
    ])

    await db.table('posts').multiInsert([
      {
        title: 'Adonis 101',
        user_id: 1,
      },
      {
        title: 'Lucid 101',
        user_id: 1,
      },
      {
        title: 'Design 101',
        user_id: 2,
      },
      {
        title: 'Dev 101',
        user_id: 3,
      },
    ])

    const country = await Country.query()
      .where('id', 1)
      .preload('posts', (query) => {
        query.apply((scopes) => scopes.adonisOnly())
      })
      .firstOrFail()

    const countryWithoutScope = await Country.query().where('id', 1).preload('posts').firstOrFail()

    assert.lengthOf(country.posts, 1)
    assert.lengthOf(countryWithoutScope.posts, 3)
    assert.equal(country.posts[0].title, 'Adonis 101')
  })

  test('apply scopes on related query', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column()
      declare userId: number

      @column()
      declare title: string

      static adonisOnly = scope((query) => {
        query.where('title', 'Adonis 101')
      })
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasManyThrough([() => Post, () => User])
      declare posts: HasManyThrough<typeof Post>
    }
    Country.boot()

    await db.table('countries').multiInsert([{ name: 'India' }, { name: 'Switzerland' }])
    await db.table('users').multiInsert([
      {
        username: 'virk',
        country_id: 1,
      },
      {
        username: 'nikk',
        country_id: 1,
      },
      {
        username: 'romain',
        country_id: 2,
      },
    ])

    await db.table('posts').multiInsert([
      {
        title: 'Adonis 101',
        user_id: 1,
      },
      {
        title: 'Lucid 101',
        user_id: 1,
      },
      {
        title: 'Design 101',
        user_id: 2,
      },
      {
        title: 'Dev 101',
        user_id: 3,
      },
    ])

    const country = await Country.findOrFail(1)
    const posts = await country
      .related('posts')
      .query()
      .apply((scopes) => scopes.adonisOnly())
    const postsWithoutScope = await country.related('posts').query()

    assert.lengthOf(posts, 1)
    assert.lengthOf(postsWithoutScope, 3)
    assert.equal(posts[0].title, 'Adonis 101')
  })
})

test.group('Model | Has Many Through | onQuery', (group) => {
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
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column()
      declare userId: number

      @column()
      declare title: string
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasManyThrough([() => Post, () => User], {
        onQuery: (query) => query.where('title', 'Adonis 101'),
      })
      declare posts: HasManyThrough<typeof Post>
    }
    Country.boot()

    await db.table('countries').multiInsert([{ name: 'India' }, { name: 'Switzerland' }])
    await db.table('users').multiInsert([
      {
        username: 'virk',
        country_id: 1,
      },
      {
        username: 'nikk',
        country_id: 1,
      },
      {
        username: 'romain',
        country_id: 2,
      },
    ])

    await db.table('posts').multiInsert([
      {
        title: 'Adonis 101',
        user_id: 1,
      },
      {
        title: 'Lucid 101',
        user_id: 1,
      },
      {
        title: 'Design 101',
        user_id: 2,
      },
      {
        title: 'Dev 101',
        user_id: 3,
      },
    ])

    const country = await Country.query().where('id', 1).preload('posts').firstOrFail()
    assert.lengthOf(country.posts, 1)
    assert.equal(country.posts[0].title, 'Adonis 101')
  })

  test('do not invoke onQuery method on preloading subqueries', async ({ fs, assert }) => {
    assert.plan(3)

    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column()
      declare userId: number

      @column()
      declare title: string
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasManyThrough([() => Post, () => User], {
        onQuery: (query) => {
          assert.isTrue(true)
          query.where('title', 'Adonis 101')
        },
      })
      declare posts: HasManyThrough<typeof Post>
    }
    Country.boot()

    await db.table('countries').multiInsert([{ name: 'India' }, { name: 'Switzerland' }])
    await db.table('users').multiInsert([
      {
        username: 'virk',
        country_id: 1,
      },
      {
        username: 'nikk',
        country_id: 1,
      },
      {
        username: 'romain',
        country_id: 2,
      },
    ])

    await db.table('posts').multiInsert([
      {
        title: 'Adonis 101',
        user_id: 1,
      },
      {
        title: 'Lucid 101',
        user_id: 1,
      },
      {
        title: 'Design 101',
        user_id: 2,
      },
      {
        title: 'Dev 101',
        user_id: 3,
      },
    ])

    const country = await Country.query()
      .where('id', 1)
      .preload('posts', (query) => query.where({}))
      .firstOrFail()

    assert.lengthOf(country.posts, 1)
    assert.equal(country.posts[0].title, 'Adonis 101')
  })

  test('invoke onQuery method on related query builder', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column()
      declare userId: number

      @column()
      declare title: string
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasManyThrough([() => Post, () => User], {
        onQuery: (query) => query.where('title', 'Adonis 101'),
      })
      declare posts: HasManyThrough<typeof Post>
    }
    Country.boot()

    await db.table('countries').multiInsert([{ name: 'India' }, { name: 'Switzerland' }])
    await db.table('users').multiInsert([
      {
        username: 'virk',
        country_id: 1,
      },
      {
        username: 'nikk',
        country_id: 1,
      },
      {
        username: 'romain',
        country_id: 2,
      },
    ])

    await db.table('posts').multiInsert([
      {
        title: 'Adonis 101',
        user_id: 1,
      },
      {
        title: 'Lucid 101',
        user_id: 1,
      },
      {
        title: 'Design 101',
        user_id: 2,
      },
      {
        title: 'Dev 101',
        user_id: 3,
      },
    ])

    const country = await Country.findOrFail(1)
    const posts = await country.related('posts').query()

    assert.lengthOf(posts, 1)
    assert.equal(posts[0].title, 'Adonis 101')
  })

  test('do not invoke onQuery method on related query builder subqueries', async ({
    fs,
    assert,
  }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column()
      declare userId: number

      @column()
      declare title: string
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasManyThrough([() => Post, () => User], {
        onQuery: (query) => query.where('title', 'Adonis 101'),
      })
      declare posts: HasManyThrough<typeof Post>
    }
    Country.boot()

    await db.table('countries').multiInsert([{ name: 'India' }, { name: 'Switzerland' }])
    await db.table('users').multiInsert([
      {
        username: 'virk',
        country_id: 1,
      },
      {
        username: 'nikk',
        country_id: 1,
      },
      {
        username: 'romain',
        country_id: 2,
      },
    ])

    await db.table('posts').multiInsert([
      {
        title: 'Adonis 101',
        user_id: 1,
      },
      {
        title: 'Lucid 101',
        user_id: 1,
      },
      {
        title: 'Design 101',
        user_id: 2,
      },
      {
        title: 'Dev 101',
        user_id: 3,
      },
    ])

    const country = await Country.findOrFail(1)
    const { sql, bindings } = country
      .related('posts')
      .query()
      .where((query) => query.whereNotNull('created_at'))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = db
      .connection()
      .from('posts')
      .select('posts.*', 'users.country_id as through_country_id')
      .innerJoin('users', 'users.id', 'posts.user_id')
      .where('title', 'Adonis 101')
      .where((query) => query.whereNotNull('created_at'))
      .where('users.country_id', 1)
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })
})
