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
import { HasMany } from '@ioc:Adonis/Lucid/Relations'
import { column, hasMany } from '../../src/Orm/Decorators'

import {
  setup,
  getDb,
  cleanup,
  ormAdapter,
  resetTables,
  getBaseModel,
  getFactoryModel,
} from '../../test-helpers'

let db: ReturnType<typeof getDb>
let BaseModel: ReturnType<typeof getBaseModel>
const FactoryModel = getFactoryModel()

test.group('Factory | HasMany | make', (group) => {
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

  test('make model with relationship', async (assert) => {
    class Post extends BaseModel {
      @column()
      public id: number

      @column()
      public userId: number

      @column()
      public title: string
    }
    Post.boot()

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number = 0

      @hasMany(() => Post)
      public posts: HasMany<typeof Post>
    }

    const postFactory = new FactoryModel(Post, () => {
      return {
        title: 'Adonis 101',
      }
    }).build()

    const factory = new FactoryModel(User, () => {
      return {}
    })
      .relation('posts', () => postFactory)
      .build()

    const user = await factory.with('posts').makeStubbed()

    assert.isFalse(user.$isPersisted)
    assert.exists(user.id)
    assert.lengthOf(user.posts, 1)

    assert.instanceOf(user.posts[0], Post)
    assert.exists(user.posts[0].id)
    assert.isFalse(user.posts[0].$isPersisted)
    assert.equal(user.posts[0].userId, user.id)
  })

  test('pass custom attributes to relationship', async (assert) => {
    class Post extends BaseModel {
      @column()
      public userId: number

      @column()
      public title: string
    }
    Post.boot()

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number = 0

      @hasMany(() => Post)
      public posts: HasMany<typeof Post>
    }

    const postFactory = new FactoryModel(Post, () => {
      return {
        title: 'Adonis 101',
      }
    }).build()

    const factory = new FactoryModel(User, () => {
      return {}
    })
      .relation('posts', () => postFactory)
      .build()

    const user = await factory
      .with('posts', 1, (related) => related.merge({ title: 'Lucid 101' }))
      .makeStubbed()

    assert.isFalse(user.$isPersisted)
    assert.lengthOf(user.posts, 1)
    assert.instanceOf(user.posts[0], Post)
    assert.isFalse(user.posts[0].$isPersisted)
    assert.equal(user.posts[0].userId, user.id)
    assert.equal(user.posts[0].title, 'Lucid 101')
  })

  test('make many relationship', async (assert) => {
    class Post extends BaseModel {
      @column()
      public userId: number

      @column()
      public title: string
    }
    Post.boot()

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number = 0

      @hasMany(() => Post)
      public posts: HasMany<typeof Post>
    }

    const postFactory = new FactoryModel(Post, () => {
      return {
        title: 'Adonis 101',
      }
    }).build()

    const factory = new FactoryModel(User, () => {
      return {}
    })
      .relation('posts', () => postFactory)
      .build()

    const user = await factory
      .with('posts', 2, (related) => related.merge({ title: 'Lucid 101' }))
      .makeStubbed()

    assert.isFalse(user.$isPersisted)
    assert.lengthOf(user.posts, 2)
    assert.instanceOf(user.posts[0], Post)
    assert.isFalse(user.posts[0].$isPersisted)
    assert.isFalse(user.posts[1].$isPersisted)
    assert.equal(user.posts[0].userId, user.id)
    assert.equal(user.posts[1].userId, user.id)
    assert.equal(user.posts[0].title, 'Lucid 101')
    assert.equal(user.posts[1].title, 'Lucid 101')
  })
})

test.group('Factory | HasMany | create', (group) => {
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

  test('create model with relationship', async (assert) => {
    class Post extends BaseModel {
      @column()
      public userId: number

      @column()
      public title: string
    }
    Post.boot()

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number = 0

      @hasMany(() => Post)
      public posts: HasMany<typeof Post>
    }

    const postFactory = new FactoryModel(Post, () => {
      return {
        title: 'Adonis 101',
      }
    }).build()

    const factory = new FactoryModel(User, () => {
      return {}
    })
      .relation('posts', () => postFactory)
      .build()

    const user = await factory.with('posts').create()

    assert.isTrue(user.$isPersisted)
    assert.lengthOf(user.posts, 1)
    assert.instanceOf(user.posts[0], Post)
    assert.isTrue(user.posts[0].$isPersisted)
    assert.equal(user.posts[0].userId, user.id)
  })

  test('pass custom attributes to relationship', async (assert) => {
    class Post extends BaseModel {
      @column()
      public userId: number

      @column()
      public title: string
    }
    Post.boot()

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number = 0

      @hasMany(() => Post)
      public posts: HasMany<typeof Post>
    }

    const postFactory = new FactoryModel(Post, () => {
      return {
        title: 'Adonis 101',
      }
    }).build()

    const factory = new FactoryModel(User, () => {
      return {}
    })
      .relation('posts', () => postFactory)
      .build()

    const user = await factory
      .with('posts', 1, (related) => related.merge({ title: 'Lucid 101' }))
      .create()

    assert.isTrue(user.$isPersisted)
    assert.lengthOf(user.posts, 1)
    assert.instanceOf(user.posts[0], Post)
    assert.isTrue(user.posts[0].$isPersisted)
    assert.equal(user.posts[0].userId, user.id)
    assert.equal(user.posts[0].title, 'Lucid 101')
  })

  test('create many relationship', async (assert) => {
    class Post extends BaseModel {
      @column()
      public userId: number

      @column()
      public title: string
    }
    Post.boot()

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number = 0

      @hasMany(() => Post)
      public posts: HasMany<typeof Post>
    }

    const postFactory = new FactoryModel(Post, () => {
      return {
        title: 'Adonis 101',
      }
    }).build()

    const factory = new FactoryModel(User, () => {
      return {}
    })
      .relation('posts', () => postFactory)
      .build()

    const user = await factory
      .with('posts', 2, (related) => related.merge({ title: 'Lucid 101' }))
      .create()

    assert.isTrue(user.$isPersisted)
    assert.lengthOf(user.posts, 2)
    assert.instanceOf(user.posts[0], Post)
    assert.isTrue(user.posts[0].$isPersisted)
    assert.equal(user.posts[0].userId, user.id)
    assert.equal(user.posts[0].title, 'Lucid 101')
    assert.instanceOf(user.posts[1], Post)
    assert.isTrue(user.posts[1].$isPersisted)
    assert.equal(user.posts[1].userId, user.id)
    assert.equal(user.posts[1].title, 'Lucid 101')
  })

  test('create relationship with custom foreign key', async (assert) => {
    class Post extends BaseModel {
      @column({ columnName: 'user_id' })
      public authorId: number

      @column()
      public title: string
    }
    Post.boot()

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number = 0

      @hasMany(() => Post, { foreignKey: 'authorId' })
      public posts: HasMany<typeof Post>
    }

    const postFactory = new FactoryModel(Post, () => {
      return {
        title: 'Adonis 101',
      }
    }).build()

    const factory = new FactoryModel(User, () => {
      return {}
    })
      .relation('posts', () => postFactory)
      .build()

    const user = await factory
      .with('posts', 1, (related) => related.merge({ title: 'Lucid 101' }))
      .create()

    assert.isTrue(user.$isPersisted)
    assert.lengthOf(user.posts, 1)
    assert.instanceOf(user.posts[0], Post)
    assert.isTrue(user.posts[0].$isPersisted)
    assert.equal(user.posts[0].authorId, user.id)
    assert.equal(user.posts[0].title, 'Lucid 101')
  })

  test('rollback changes on error', async (assert) => {
    assert.plan(3)

    class Post extends BaseModel {
      @column()
      public userId: number

      @column()
      public title: string
    }
    Post.boot()

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number = 0

      @hasMany(() => Post)
      public posts: HasMany<typeof Post>
    }

    const postFactory = new FactoryModel(Post, () => {
      return {}
    }).build()

    const factory = new FactoryModel(User, () => {
      return {}
    })
      .relation('posts', () => postFactory)
      .build()

    try {
      await factory.with('posts').create()
    } catch (error) {
      assert.exists(error)
    }

    const users = await db.from('users').exec()
    const posts = await db.from('posts').exec()

    assert.lengthOf(users, 0)
    assert.lengthOf(posts, 0)
  })
})
