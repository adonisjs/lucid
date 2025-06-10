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

import {
  afterDelete,
  afterSave,
  belongsTo,
  column,
  hasMany,
} from '../../src/orm/decorators/index.js'
import { ModelQueryBuilder } from '../../src/orm/query_builder/index.js'
import {
  getDb,
  setup,
  cleanup,
  ormAdapter,
  resetTables,
  getBaseModel,
} from '../../test-helpers/index.js'
import type { BelongsTo, HasMany } from '../../src/types/relations.js'
import { base64 } from '@poppinss/utils'
import { QueryRunner } from '../../src/query_runner/index.js'
import { FileSystem } from '@japa/file-system'
import { LucidRow } from '../../src/types/model.js'

const setupCache = async (fs: FileSystem) => {
  const fakeCache = new Map<string, LucidRow | LucidRow[]>()

  const app = new AppFactory().create(fs.baseUrl, () => {})
  await app.init()
  const db = getDb()
  const adapter = ormAdapter(db)
  const BaseModel = getBaseModel(adapter)

  class Cacheable extends BaseModel {
    private static clearCache(model: typeof Cacheable) {
      const cacheTags = [(model.constructor as typeof Cacheable).table]
      const cacheKey = cacheTags.join(':')
      fakeCache.forEach((_, key) => {
        if (key.startsWith(cacheKey)) {
          fakeCache.delete(key)
        }
      })
    }

    @afterSave()
    static afterSaveCache = Cacheable.clearCache

    @afterDelete()
    static afterDeleteCache = Cacheable.clearCache
  }

  class Post extends Cacheable {
    @column()
    declare userId: number | null

    @column()
    declare title: string

    @belongsTo(() => User)
    declare user: BelongsTo<typeof User>
  }

  class User extends Cacheable {
    @column({ isPrimary: true })
    declare id: number

    @column()
    declare username: string

    @hasMany(() => Post)
    declare posts: HasMany<typeof Post>
  }

  Post.boot()
  User.boot()

  ModelQueryBuilder.macro(
    'execQuery' as keyof ModelQueryBuilder,
    async function (this: ModelQueryBuilder) {
      this.applyWhere()
      const isWhereExists = (this as any).whereStack.find((wheres: [any]) =>
        wheres.find((where: any) => where.method === 'whereExists')
      )
      const isWriteQuery = isWhereExists || this.isWriteQuery()

      const cacheTags = [this.model.table]
      cacheTags.push(base64.urlEncode(this.toQuery()))

      if (!isWriteQuery) {
        const cacheKey = cacheTags.join(':')
        let cachedData = fakeCache.get(cacheKey)

        if (cachedData) {
          let data = cachedData

          if (!Array.isArray(data)) data = [data]

          if (this.wrapResultsToModelInstances) {
            return this.convertRowsToModelInstances(data)
          } else {
            return data
          }
        }
      }

      const queryData = Object.assign(this.getQueryData(), this.customReporterData)
      const rows = await new QueryRunner(this.client, this.debugQueries, queryData).run(
        this.knexQuery
      )

      if (isWriteQuery) {
        cacheTags.pop()
        const cacheKey = cacheTags.join(':')
        fakeCache.forEach((_, key) => {
          if (key.startsWith(cacheKey)) {
            fakeCache.delete(key)
          }
        })
      }

      if ((isWriteQuery && !isWhereExists) || !this.wrapResultsToModelInstances) {
        return Array.isArray(rows) ? rows : [rows]
      }

      const modelInstances = this.convertRowsToModelInstances(rows)

      if (!isWriteQuery || isWhereExists) {
        const cacheKey = cacheTags.join(':')
        fakeCache.set(cacheKey, modelInstances)
      }

      await this.preloadFromModels(modelInstances)

      return modelInstances
    }
  )

  return {
    fakeCache,
    Post,
    User,
  }
}

test.group('Model QueryBuilder execQuery', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  group.each.disableTimeout()

  test('apply relationship constraints when using sub query', async ({ fs, assert }) => {
    const { fakeCache, Post, User } = await setupCache(fs)

    const users = await User.createMany([{ username: 'virk' }, { username: 'nikk' }])

    assert.lengthOf(fakeCache, 0)

    for (let user of users) {
      await user.related('posts').create({ title: 'Test' })
    }

    const postsQuery = Post.query().whereIn('id', users[0].related('posts').query().select('id'))

    const posts = await postsQuery

    assert.lengthOf(fakeCache, 1)

    const newPosts = await postsQuery

    assert.lengthOf(fakeCache, 1)
    assert.deepEqual(posts, newPosts)

    await users[0].related('posts').create({ title: 'Test 2' })
    assert.lengthOf(fakeCache, 0)

    await users[0].load('posts')
    assert.lengthOf(fakeCache, 1)

    await users[0].load('posts')
    assert.lengthOf(fakeCache, 1)

    const userFirst = await User.query().preload('posts').firstOrFail()
    assert.lengthOf(fakeCache, 3)

    const userLast = await User.query().preload('posts').where('id', userFirst.id).firstOrFail()
    assert.lengthOf(fakeCache, 4)
    assert.deepEqual(userFirst.posts, userLast.posts)

    await userLast.related('posts').create({ title: 'Test 3' })
    assert.lengthOf(fakeCache, 2)
  })

  test('caches a simple query and reuses the result', async ({ fs, assert }) => {
    const { fakeCache, User } = await setupCache(fs)

    await User.create({ username: 'virk' })

    const firstCall = await User.query().where('username', 'virk')
    assert.lengthOf(firstCall, 1)
    assert.lengthOf(fakeCache, 1)

    const secondCall = await User.query().where('username', 'virk')
    assert.lengthOf(secondCall, 1)
    assert.lengthOf(fakeCache, 1)

    assert.deepEqual(firstCall, secondCall)
  })

  test('clears cache after deleting a record', async ({ fs, assert }) => {
    const { fakeCache, User } = await setupCache(fs)

    const user = await User.create({ username: 'virk' })

    await User.query().where('username', 'virk')
    assert.lengthOf(fakeCache, 1)

    await user.delete()
    assert.lengthOf(fakeCache, 0)
  })

  test('preload does not create duplicate cache entries', async ({ fs, assert }) => {
    const { fakeCache, User } = await setupCache(fs)

    const user = await User.create({ username: 'virk' })
    await user.related('posts').create({ title: 'Test' })

    await User.query().preload('posts')
    assert.lengthOf(fakeCache, 2)

    await User.query().preload('posts')
    assert.lengthOf(fakeCache, 2)
  })

  test('distinct queries create separate cache entries', async ({ fs, assert }) => {
    const { fakeCache, User } = await setupCache(fs)

    await User.createMany([{ username: 'virk' }, { username: 'nikk' }])

    await User.query().where('username', 'virk')
    await User.query().where('username', 'nikk')

    assert.lengthOf(fakeCache, 2)
  })

  test('write queries do not use cache and invalidate it', async ({ fs, assert }) => {
    const { fakeCache, User } = await setupCache(fs)

    await User.create({ username: 'virk' })

    await User.query().where('username', 'virk')
    assert.lengthOf(fakeCache, 1)

    await User.query().where('username', 'virk').update({ username: 'updated' })
    assert.lengthOf(fakeCache, 0)
  })

  test('cache is invalidated on update', async ({ fs, assert }) => {
    const { fakeCache, User } = await setupCache(fs)

    await User.create({ username: 'virk' })
    assert.equal(fakeCache.size, 0)

    const userQuery = User.query().where('username', 'virk')

    const user = await userQuery.firstOrFail()
    assert.equal(fakeCache.size, 1)

    await userQuery.firstOrFail()
    assert.equal(fakeCache.size, 1)

    user.username = 'virk-updated'
    await user.save()
    assert.equal(fakeCache.size, 0)

    const updatedUser = await User.query().where('username', 'virk-updated').first()
    assert.isNotNull(updatedUser)
    assert.equal(updatedUser!.username, 'virk-updated')
    assert.equal(fakeCache.size, 1)
  })

  test('cache is invalidated on delete', async ({ fs, assert }) => {
    const { fakeCache, User } = await setupCache(fs)

    const user = await User.create({ username: 'ephemere' })
    assert.equal(fakeCache.size, 0)

    const userQuery = User.query().where('username', 'ephemere')

    await userQuery.firstOrFail()
    assert.equal(fakeCache.size, 1)

    await user.delete()
    assert.equal(fakeCache.size, 0)

    const deletedUser = await userQuery.first()
    assert.isNull(deletedUser)
    assert.equal(fakeCache.size, 1)
  })

  test('different queries create different cache entries', async ({ fs, assert }) => {
    const { fakeCache, User } = await setupCache(fs)

    await User.createMany([{ username: 'one' }, { username: 'two' }])
    assert.equal(fakeCache.size, 0)

    await User.query().where('username', 'one').first()
    assert.equal(fakeCache.size, 1)

    await User.query().where('username', 'two').first()
    assert.equal(fakeCache.size, 2)

    await User.all()
    assert.equal(fakeCache.size, 3)

    await User.query().where('username', 'one').first()
    assert.equal(fakeCache.size, 3)
  })

  test('paginated queries are cached separately', async ({ fs, assert }) => {
    const { fakeCache, User } = await setupCache(fs)

    await User.createMany(Array.from({ length: 5 }, (_, i) => ({ username: `user${i + 1}` })))
    assert.equal(fakeCache.size, 0)

    await User.query().forPage(1, 2)
    assert.equal(fakeCache.size, 1)

    await User.query().forPage(2, 2)
    assert.equal(fakeCache.size, 2)

    await User.query().forPage(1, 2)
    assert.equal(fakeCache.size, 2)
  })

  test('aggregate queries do not interact with model instance cache', async ({ fs, assert }) => {
    const { fakeCache, User } = await setupCache(fs)

    await User.createMany([{ username: 'a' }, { username: 'b' }])
    assert.equal(fakeCache.size, 0)

    await User.all()
    assert.equal(fakeCache.size, 1)

    const count = await User.query().count('* as total')
    assert.equal(count[0].$extras.total, 2)

    assert.equal(fakeCache.size, 2)
  })

  test('caches separate entries for queries with different orderBy clauses', async ({
    fs,
    assert,
  }) => {
    const { fakeCache, User } = await setupCache(fs)

    await User.createMany([{ username: 'b' }, { username: 'a' }])
    assert.equal(fakeCache.size, 0)

    await User.query().orderBy('username', 'asc')
    assert.equal(fakeCache.size, 1)

    await User.query().orderBy('username', 'desc')
    assert.equal(fakeCache.size, 2)
  })

  test('caches query with multiple preloads separately', async ({ fs, assert }) => {
    const { fakeCache, User } = await setupCache(fs)

    const user = await User.create({ username: 'multi' })
    await user.related('posts').create({ title: 'Post' })

    await User.query().preload('posts')
    assert.equal(fakeCache.size, 2)

    await User.query().preload('posts')
    assert.equal(fakeCache.size, 2)

    await User.query().preload('posts')
    assert.equal(fakeCache.size, 2)
  })

  test('queries with joins do not reuse the same cache as simple queries', async ({
    fs,
    assert,
  }) => {
    const { fakeCache, User } = await setupCache(fs)

    const user = await User.create({ username: 'withJoin' })
    await user.related('posts').create({ title: 'Join Post' })

    await User.query().where('username', 'withJoin')
    assert.equal(fakeCache.size, 1)

    await User.query().innerJoin('posts', 'users.id', 'posts.user_id').select('users.*')
    assert.equal(fakeCache.size, 2)
  })

  test('caches results from whereHas queries', async ({ fs, assert }) => {
    const { fakeCache, User, Post } = await setupCache(fs)

    const user = await User.create({ username: 'related' })

    await user.related('posts').create({ title: 'Has Post' })
    const newPost = await user.related('posts').create({ title: 'Delete Post' })

    await User.query()
      .preload('posts')
      .whereHas('posts', () => {})
      .firstOrFail()
    assert.equal(fakeCache.size, 2)

    await User.query()
      .preload('posts')
      .whereHas('posts', () => {})
      .firstOrFail()
    assert.equal(fakeCache.size, 2)

    await Post.query().where('userId', newPost.userId!).where('title', newPost.title!).delete()
    assert.equal(fakeCache.size, 1)

    const userHas = await User.query()
      .whereHas('posts', () => {})
      .preload('posts')
      .firstOrFail()
    assert.equal(fakeCache.size, 2)

    const correctUser = await User.query().where('id', userHas.id).preload('posts').firstOrFail()
    assert.deepEqual(userHas.posts, correctUser.posts)
    assert.equal(fakeCache.size, 3)

    await user.related('posts').create({ title: 'New Post' })
    assert.equal(fakeCache.size, 2)
  })

  test('bulk deletes invalidate all relevant cache entries', async ({ fs, assert }) => {
    const { fakeCache, User } = await setupCache(fs)

    await User.createMany([{ username: 'bulk1' }, { username: 'bulk2' }])

    await User.query().where('username', 'bulk1')
    await User.query().where('username', 'bulk2')
    assert.equal(fakeCache.size, 2)

    await User.query().delete()
    assert.equal(fakeCache.size, 0)
  })

  test('calling refresh', async ({ fs, assert }) => {
    const { fakeCache, User } = await setupCache(fs)

    const user = await User.create({ username: 'refreshable' })

    await User.query().where('username', 'refreshable').first()
    assert.equal(fakeCache.size, 1)

    await user.refresh()
    assert.equal(fakeCache.size, 2)
  })
})
