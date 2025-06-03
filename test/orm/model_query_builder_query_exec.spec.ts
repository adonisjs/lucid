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

  Post.boot()
  User.boot()

  ModelQueryBuilder.macro(
    'execQuery' as keyof ModelQueryBuilder,
    async function (this: ModelQueryBuilder) {
      this.applyWhere()
      const isWriteQuery = this.isWriteQuery()

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

      if (isWriteQuery || !this.wrapResultsToModelInstances) {
        if (isWriteQuery) {
          cacheTags.pop()
          const cacheKey = cacheTags.join(':')
          fakeCache.forEach((_, key) => {
            if (key.startsWith(cacheKey)) {
              fakeCache.delete(key)
            }
          })
        }
        return Array.isArray(rows) ? rows : [rows]
      }

      const modelInstances = this.convertRowsToModelInstances(rows)

      if (!isWriteQuery) {
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

test.group('Model query builder execQuery', (group) => {
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

    const users = await User.createMany([
      {
        username: 'virk',
      },
      {
        username: 'nikk',
      },
    ])

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

    // It breaks here, because related().create doesn't call execQuery, so it don't clears the cache
    assert.lengthOf(fakeCache, 0)
  })
})
