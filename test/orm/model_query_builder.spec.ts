/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { AppFactory } from '@adonisjs/core/factories/app'

import { column, hasMany } from '../../src/orm/decorators/index.js'
import { scope } from '../../src/orm/base_model/index.js'
import { ModelQueryBuilder } from '../../src/orm/query_builder/index.js'
import {
  getDb,
  setup,
  cleanup,
  ormAdapter,
  resetTables,
  getBaseModel,
} from '../../test-helpers/index.js'
import type { HasMany } from '../../src/types/relations.js'
import { type ModelQueryBuilderContract } from '../../src/types/model.js'

test.group('Model query builder', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('get instance of query builder for the given model', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string
    }

    assert.instanceOf(User.query(), ModelQueryBuilder)
  })

  test('pre select the table for the query builder instance', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string
    }

    assert.equal((User.query().knexQuery as any)['_single'].table, 'users')
  })

  test('execute select queries', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }, { username: 'nikk' }])

    const users = await User.query().where('username', 'virk')
    assert.lengthOf(users, 1)
    assert.instanceOf(users[0], User)
    assert.deepEqual(users[0].$attributes, { id: 1, username: 'virk' })
  })

  test('rewrite deterministic encrypted where clauses', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    BaseModel.useEncryption({
      encrypt: (value, options) =>
        options?.deterministic
          ? `det:${options?.driver || 'default'}:${value}`
          : `enc:${options?.driver || 'default'}:${value}`,
      decrypt: (value) => String(value).replace(/^(enc:|det:)/, ''),
      blindIndex: (value, { purpose }) => `blind:${purpose}:${value}`,
      blindIndexes: () => ({}),
    })

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column.encrypted({ deterministic: true, driver: 'det-v1' })
      declare email: string
    }

    const { sql, bindings } = User.query().where('email', 'virk@adonisjs.com').toSQL()

    const { sql: knexSql, bindings: knexBindings } = db
      .connection()
      .getWriteClient()
      .from('users')
      .where('email', 'det:det-v1:virk@adonisjs.com')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('do not rewrite joined table columns that match encrypted model column names', async ({
    fs,
    assert,
  }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    BaseModel.useEncryption({
      encrypt: (value, options) =>
        options?.deterministic
          ? `det:${options?.driver || 'default'}:${value}`
          : `enc:${options?.driver || 'default'}:${value}`,
      decrypt: (value) => String(value).replace(/^(enc:|det:)/, ''),
      blindIndex: (value, { purpose }) => `blind:${purpose}:${value}`,
      blindIndexes: () => ({}),
    })

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column.encrypted({ deterministic: true, driver: 'det-v1' })
      declare email: string
    }

    const { sql, bindings } = User.query()
      .join('contacts', 'contacts.user_id', 'users.id')
      .where('contacts.email', 'virk@adonisjs.com')
      .where('users.email', 'virk@adonisjs.com')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = db
      .connection()
      .getWriteClient()
      .from('users')
      .join('contacts', 'contacts.user_id', 'users.id')
      .where('contacts.email', 'virk@adonisjs.com')
      .where('users.email', 'det:det-v1:virk@adonisjs.com')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('rewrite blind encrypted where and whereIn clauses', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    BaseModel.useEncryption({
      encrypt: (value, options) => `enc:${options?.driver || 'default'}:${value}`,
      decrypt: (value) => String(value).replace(/^enc:/, ''),
      blindIndex: (value, { purpose, driver }) =>
        `blind:${driver || 'default'}:${purpose}:${value}`,
      blindIndexes: () => ({}),
    })

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column.encrypted({
        driver: 'enc-v1',
        blind: { columnName: 'email_blind', purpose: 'users:email' },
      })
      declare email: string
    }

    const { sql, bindings } = User.query()
      .where({ email: 'virk@adonisjs.com' })
      .whereIn('email', ['virk@adonisjs.com', 'nikk@adonisjs.com'])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = db
      .connection()
      .getWriteClient()
      .from('users')
      .where('email_blind', 'blind:enc-v1:users:email:virk@adonisjs.com')
      .whereIn('email_blind', [
        'blind:enc-v1:users:email:virk@adonisjs.com',
        'blind:enc-v1:users:email:nikk@adonisjs.com',
      ])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('rewrite blind encrypted where to whereIn when blindIndexes returns multiple values', async ({
    fs,
    assert,
  }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    BaseModel.useEncryption({
      encrypt: (value, options) => `enc:${options?.driver || 'default'}:${value}`,
      decrypt: (value) => String(value).replace(/^enc:/, ''),
      blindIndex: (value, { purpose, driver }) =>
        `blind:${driver || 'default'}:${purpose}:${value}:single`,
      blindIndexes: (value, options) => [
        `blind:${options?.driver || 'default'}:${options?.purpose}:${value}:new`,
        `blind:${options?.driver || 'default'}:${options?.purpose}:${value}:old`,
      ],
    })

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column.encrypted({
        driver: 'enc-v1',
        blind: { columnName: 'email_blind', purpose: 'users:email' },
      })
      declare email: string
    }

    const { sql, bindings } = User.query().where('email', 'virk@adonisjs.com').toSQL()

    const { sql: knexSql, bindings: knexBindings } = db
      .connection()
      .getWriteClient()
      .from('users')
      .whereIn('email_blind', [
        'blind:enc-v1:users:email:virk@adonisjs.com:new',
        'blind:enc-v1:users:email:virk@adonisjs.com:old',
      ])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('raise when using non equality operators on deterministic encrypted columns', async ({
    fs,
    assert,
  }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    BaseModel.useEncryption({
      encrypt: (value, options) => (options?.deterministic ? `det:${value}` : `enc:${value}`),
      decrypt: (value) => String(value).replace(/^(enc:|det:)/, ''),
      blindIndex: (value, { purpose }) => `blind:${purpose}:${value}`,
      blindIndexes: () => ({}),
    })

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column.encrypted({ deterministic: true })
      declare email: string
    }

    assert.throws(
      () => User.query().whereLike('email', '%virk%'),
      'Cannot use "whereLike" on encrypted column "User.email". Only equality-based queries are supported'
    )
  })

  test('encrypt encrypted column values when performing updates', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    BaseModel.useEncryption({
      encrypt: (value, options) => `enc:${options?.driver || 'default'}:${value}`,
      decrypt: (value) => String(value).replace(/^enc:/, ''),
      blindIndex: (value, { purpose, driver }) =>
        `blind:${driver || 'default'}:${purpose}:${value}`,
      blindIndexes: () => ({}),
    })

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @column.encrypted({ driver: 'enc-v1' })
      declare email: string
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }])

    await User.query().where('username', 'virk').update({ email: 'virk@adonisjs.com' })

    const user = await db.from('users').where('username', 'virk').first()
    assert.equal(user!.email, 'enc:enc-v1:virk@adonisjs.com')
  })

  test('sync blind index when updating blind encrypted columns', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    BaseModel.useEncryption({
      encrypt: (value, options) => `enc:${options?.driver || 'default'}:${value}`,
      decrypt: (value) => String(value).replace(/^enc:/, ''),
      blindIndex: (value, { purpose, driver }) =>
        `blind:${driver || 'default'}:${purpose}:${value}`,
      blindIndexes: () => ({}),
    })

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column.encrypted({
        driver: 'enc-v1',
        blind: { columnName: 'email_blind', purpose: 'users:email' },
      })
      declare email: string
    }

    const { sql, bindings } = User.query()
      .where('id', 1)
      .update({ email: 'virk@adonisjs.com' })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = db
      .connection()
      .getWriteClient()
      .from('users')
      .where('id', 1)
      .update({
        email: 'enc:enc-v1:virk@adonisjs.com',
        email_blind: 'blind:enc-v1:users:email:virk@adonisjs.com',
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('prefer computed blind index over manual blind column updates regardless of key order', async ({
    fs,
    assert,
  }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    BaseModel.useEncryption({
      encrypt: (value, options) => `enc:${options?.driver || 'default'}:${value}`,
      decrypt: (value) => String(value).replace(/^enc:/, ''),
      blindIndex: (value, { purpose, driver }) =>
        `blind:${driver || 'default'}:${purpose}:${value}`,
      blindIndexes: () => ({}),
    })

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @column.encrypted({
        driver: 'enc-v1',
        blind: { columnName: 'email_blind', purpose: 'users_encrypted:email' },
      })
      declare email: string
    }
    User.table = 'users_encrypted'

    await db
      .insertQuery()
      .table('users_encrypted')
      .insert([{ username: 'virk' }])

    await User.query().where('username', 'virk').update({
      email_blind: 'manual:first',
      email: 'virk@adonisjs.com',
    })

    let user = await db.from('users_encrypted').where('username', 'virk').first()
    assert.equal(user!.email, 'enc:enc-v1:virk@adonisjs.com')
    assert.equal(user!.email_blind, 'blind:enc-v1:users_encrypted:email:virk@adonisjs.com')

    await User.query().where('username', 'virk').update({
      email: 'nikk@adonisjs.com',
      email_blind: 'manual:second',
    })

    user = await db.from('users_encrypted').where('username', 'virk').first()
    assert.equal(user!.email, 'enc:enc-v1:nikk@adonisjs.com')
    assert.equal(user!.email_blind, 'blind:enc-v1:users_encrypted:email:nikk@adonisjs.com')
  })

  test('pass custom connection to the model instance', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }, { username: 'nikk' }])

    const users = await User.query({ connection: 'secondary' }).where('username', 'virk')
    assert.lengthOf(users, 1)
    assert.instanceOf(users[0], User)
    assert.deepEqual(users[0].$attributes, { id: 1, username: 'virk' })
    assert.deepEqual(users[0].$options!.connection, 'secondary')
  })

  test('pass sideloaded attributes to the model instance', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }, { username: 'nikk' }])

    const users = await User.query({ connection: 'secondary' })
      .where('username', 'virk')
      .sideload({ loggedInUser: { id: 1 } })

    assert.lengthOf(users, 1)
    assert.instanceOf(users[0], User)
    assert.deepEqual(users[0].$attributes, { id: 1, username: 'virk' })
    assert.deepEqual(users[0].$sideloaded, { loggedInUser: { id: 1 } })
  })

  test('perform update using model query builder', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }, { username: 'nikk' }])

    const rows = await User.query().where('username', 'virk').update({ username: 'hvirk' })
    assert.lengthOf(rows, 1)
    assert.deepEqual(rows, [1])

    const user = await db.from('users').where('username', 'hvirk').first()
    assert.equal(user!.username, 'hvirk')
  })

  test('perform increment using model query builder', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk', points: 1 }])

    const rows = await User.query().where('username', 'virk').increment('points', 1)
    assert.lengthOf(rows, 1)
    assert.deepEqual(rows, [1])

    const user = await db.from('users').where('username', 'virk').first()
    assert.equal(user!.points, 2)
  })

  test('perform decrement using model query builder', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk', points: 3 }])

    const rows = await User.query().where('username', 'virk').decrement('points', 1)
    assert.lengthOf(rows, 1)
    assert.deepEqual(rows, [1])

    const user = await db.from('users').where('username', 'virk').first()
    assert.equal(user!.points, 2)
  })

  test('delete in bulk', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }, { username: 'nikk' }])

    const rows = await User.query().where('username', 'virk').del()
    assert.lengthOf(rows, 1)
    assert.deepEqual(rows, [1])

    const user = await db.from('users').where('username', 'virk').first()
    assert.isNull(user)
  })

  test('clone query builder', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string
    }

    const query = User.query()
    const clonedQuery = query.clone()
    assert.instanceOf(clonedQuery, ModelQueryBuilder)
  })

  test('clone query builder with internal flags', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string
    }

    const query = User.query().groupBy('id')
    const clonedQuery = query.clone()
    assert.isTrue(clonedQuery.hasGroupBy)
  })

  test('pass sideloaded data to cloned query', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk', points: 3 }])

    const query = User.query().sideload({ username: 'virk' })
    const user = await query.clone().firstOrFail()
    assert.deepEqual(user.$sideloaded, { username: 'virk' })
  })

  test('clone query builder with preload', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column()
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

    const user = await User.create({ username: 'virk' })
    const posts = await user
      .related('posts')
      .createMany([{ title: 'Adonis 101' }, { title: 'Lucid 101' }])

    const query = User.query().preload('posts')
    const clone = await query.clone().firstOrFail()
    assert.isArray(clone.posts)
    assert.equal(clone.posts.length, posts.length)
  })

  test('clone query builder with preload', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column()
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

    const user = await User.create({ username: 'virk' })
    await user.related('posts').createMany([{ title: 'Adonis 101' }, { title: 'Lucid 101' }])

    const query = User.query()
    const queryCloned = query.clone()

    query.preload('posts')
    const clone = await queryCloned.firstOrFail()
    const users = await query.firstOrFail()

    assert.isUndefined(clone.posts)
    assert.lengthOf(users.posts, 2)
  })

  test('apply scopes', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      static active = scope((query) => {
        query.where('is_active', true)
      })
    }

    const { sql, bindings } = User.query()
      .apply((scopes) => {
        scopes.active()
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = db
      .connection()
      .getWriteClient()
      .from('users')
      .where('is_active', true)
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('apply scopes inside a sub query', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      static active = scope((query) => {
        query.where('is_active', true)
      })
    }

    const { sql, bindings } = User.query()
      .where((builder) => {
        builder.apply((scopes) => scopes.active())
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = db
      .connection()
      .getWriteClient()
      .from('users')
      .where((builder) => builder.where('is_active', true))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('make aggregate queries with the model query builder', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }, { username: 'nikk' }])

    const users = await User.query().count('* as total')
    assert.equal(Number(users[0].$extras.total), 2)
  })

  test('apply relationship constraints when using sub query', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column()
      declare userId: number | null

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

    const users = await User.createMany([
      {
        username: 'virk',
      },
      {
        username: 'nikk',
      },
    ])

    for (let user of users) {
      await user.related('posts').create({ title: 'Test' })
    }

    const posts = await Post.query().whereIn('id', users[0].related('posts').query().select('id'))

    assert.lengthOf(posts, 1)
  })

  test('define custom type for sideloaded', async ({ fs, expectTypeOf }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    type Sideload = { test: boolean }

    class User extends BaseModel {
      declare $sideloaded: Sideload

      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string
    }

    type Query = ModelQueryBuilderContract<typeof User>

    expectTypeOf<Query['sideloaded']>().toEqualTypeOf<Sideload>()
  })
})
