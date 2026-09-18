/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { setImmediate } from 'node:timers/promises'
import { column, hasMany } from '../../src/orm/decorators/index.js'
import type { HasMany } from '../../src/types/relations.js'
import type { ModelQueryBuilderContract } from '../../src/types/model.js'
import {
  setup,
  cleanup,
  resetTables,
  getDb,
  getBaseModel,
  ormAdapter,
} from '../../test-helpers/index.js'

test.group('Preloader | query concurrency', (group) => {
  group.setup(() => setup())
  group.teardown(() => cleanup())
  group.each.teardown(() => resetTables())

  test('load {entrypoint} relations with transaction={transaction}')
    .with([
      { entrypoint: 'query', transaction: true },
      { entrypoint: 'instance', transaction: true },
      { entrypoint: 'query', transaction: false },
      { entrypoint: 'instance', transaction: false },
    ])
    .run(async ({ assert }, { entrypoint, transaction }) => {
      const db = getDb()
      const BaseModel = getBaseModel(ormAdapter(db))

      class Comment extends BaseModel {
        @column({ isPrimary: true })
        declare id: number

        @column()
        declare postId: number
      }

      class Post extends BaseModel {
        @column({ isPrimary: true })
        declare id: number

        @column()
        declare userId: number

        @hasMany(() => Comment)
        declare comments: HasMany<typeof Comment>

        @hasMany(() => Comment)
        declare otherComments: HasMany<typeof Comment>
      }

      class User extends BaseModel {
        @column({ isPrimary: true })
        declare id: number

        @hasMany(() => Post)
        declare posts: HasMany<typeof Post>

        @hasMany(() => Post)
        declare otherPosts: HasMany<typeof Post>

        @hasMany(() => Post)
        declare morePosts: HasMany<typeof Post>
      }

      await db.table('users').insert({ id: 1, username: 'virk' })
      await db.table('posts').insert({ id: 1, user_id: 1, title: 'Hello' })
      await db.table('comments').insert({ post_id: 1, body: 'Hello' })

      const trx = transaction ? await db.transaction() : undefined
      const client = trx || db.connection()
      let activeQueries = 0
      let maxActiveQueries = 0

      if (transaction) {
        const knexClient = client.getWriteClient().client
        const executeQuery = knexClient.query.bind(knexClient)
        knexClient.query = async (...args: any[]) => {
          activeQueries++
          maxActiveQueries = Math.max(maxActiveQueries, activeQueries)
          try {
            // Keep the query pending long enough to detect overlapping submissions on any driver.
            await setImmediate()
            return await executeQuery(...args)
          } finally {
            activeQueries--
          }
        }
      }

      const preload = (query: ModelQueryBuilderContract<typeof Post>) => {
        query.preload('comments').preload('otherComments')
        if (!transaction) {
          const executeQuery = query.exec.bind(query)
          query.exec = async () => {
            activeQueries++
            maxActiveQueries = Math.max(maxActiveQueries, activeQueries)
            try {
              await setImmediate()
              return await executeQuery()
            } finally {
              activeQueries--
            }
          }
        }
      }

      try {
        const query = User.query({ client })
        if (entrypoint === 'query') {
          query
            .preload('posts', preload)
            .preload('otherPosts', preload)
            .preload('morePosts', preload)
        }
        const user = await query.firstOrFail()
        if (entrypoint === 'instance') {
          await user.load((loader) => {
            loader.load('posts', preload).load('otherPosts', preload).load('morePosts', preload)
          })
        }

        assert.equal(maxActiveQueries, transaction ? 1 : 3)
        assert.equal(activeQueries, 0)
        for (const posts of [user.posts, user.otherPosts, user.morePosts]) {
          assert.lengthOf(posts, 1)
          assert.lengthOf(posts[0].comments, 1)
          assert.lengthOf(posts[0].otherComments, 1)
        }
      } finally {
        await trx?.rollback()
      }
    })
})
