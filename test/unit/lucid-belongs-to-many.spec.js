'use strict'

/*
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

require('../../lib/iocResolver').setFold(require('@adonisjs/fold'))
const test = require('japa')
const fs = require('fs-extra')
const path = require('path')
const { ioc } = require('@adonisjs/fold')
const { Config } = require('@adonisjs/sink')
const moment = require('moment')

const helpers = require('./helpers')
const Model = require('../../src/Lucid/Model')
const DatabaseManager = require('../../src/Database/Manager')

test.group('Relations | Belongs To Many', (group) => {
  group.before(async () => {
    ioc.singleton('Adonis/Src/Database', function () {
      const config = new Config()
      config.set('database', {
        connection: 'testing',
        testing: helpers.getConfig()
      })
      return new DatabaseManager(config)
    })
    ioc.alias('Adonis/Src/Database', 'Database')

    await fs.ensureDir(path.join(__dirname, './tmp'))
    await helpers.createTables(ioc.use('Adonis/Src/Database'))
  })

  group.afterEach(async () => {
    ioc.restore()
    await ioc.use('Adonis/Src/Database').table('users').truncate()
    await ioc.use('Adonis/Src/Database').table('posts').truncate()
    await ioc.use('Adonis/Src/Database').table('post_user').truncate()
  })

  group.after(async () => {
    await helpers.dropTables(ioc.use('Adonis/Src/Database'))
    ioc.use('Database').close()
    try {
      await fs.remove(path.join(__dirname, './tmp'))
    } catch (error) {
      if (process.platform !== 'win32' || error.code !== 'EBUSY') {
        throw error
      }
    }
  }).timeout(0)

  test('configure table name from model names', (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = new User()
    const userPosts = user.posts()
    assert.equal(userPosts._pivot.table, 'post_user')
  })

  test('define different table name', (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post).pivotTable('my_posts')
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = new User()
    const userPosts = user.posts()
    assert.equal(userPosts._pivot.table, 'my_posts')
  })

  test('fetch table name from pivotModel', (assert) => {
    class Post extends Model {
    }

    class PostUser extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post).pivotModel(PostUser)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = new User()
    const userPosts = user.posts()
    assert.equal(userPosts.$pivotTable, 'post_users')
  })

  test('set timestamps to true', (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post).withTimestamps()
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = new User()
    const userPosts = user.posts()
    assert.isTrue(userPosts._pivot.withTimestamps)
  })

  test('throw exception when pivotModel is defined and calling pivotTable', (assert) => {
    class Post extends Model {
    }

    class PostUser extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post).pivotModel(PostUser).pivotTable()
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = new User()
    const fn = () => user.posts()
    assert.throw(fn, 'E_INVALID_RELATION_METHOD: Cannot call pivotTable since pivotModel has been defined')
  })

  test('throw exception when pivotModel is defined and calling withTimestamps', (assert) => {
    class Post extends Model {
    }

    class PostUser extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post).pivotModel(PostUser).withTimestamps()
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = new User()
    const fn = () => user.posts()
    assert.throw(fn, 'E_INVALID_RELATION_METHOD: Cannot call withTimestamps since pivotModel has been defined')
  })

  test('define pivot fields to be selected', (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post).withPivot('is_published')
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = new User()
    const userPosts = user.posts()
    assert.deepEqual(userPosts._pivot.withFields, ['is_published'])
  })

  test('define multiple pivot fields to be selected', (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post).withPivot('is_published').withPivot('deleted_at')
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = new User()
    const userPosts = user.posts()
    assert.deepEqual(userPosts._pivot.withFields, ['is_published', 'deleted_at'])
  })

  test('define multiple pivot fields defined as an array', (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post).withPivot(['is_published', 'deleted_at'])
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = new User()
    const userPosts = user.posts()
    assert.deepEqual(userPosts._pivot.withFields, ['is_published', 'deleted_at'])
  })

  test('define pivot model', (assert) => {
    class Post extends Model {
    }

    class PostUser extends Model {}

    class User extends Model {
      posts () {
        return this.belongsToMany(Post).pivotModel(PostUser)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = new User()
    const userPosts = user.posts()
    assert.deepEqual(userPosts._PivotModel, PostUser)
  })

  test('make right join query with default settings', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = new User()
    user.id = 1
    user.$persisted = true
    const postQuery = user.posts().toSQL()
    assert.equal(postQuery.sql, helpers.formatQuery('select "posts".*, "post_user"."post_id" as "pivot_post_id", "post_user"."user_id" as "pivot_user_id" from "posts" inner join "post_user" on "posts"."id" = "post_user"."post_id" where "post_user"."user_id" = ?'))
  })

  test('make right join query with different foreign key', (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post, 'my_user_id')
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = new User()
    user.id = 1
    user.$persisted = true
    const postQuery = user.posts().toSQL()
    assert.equal(postQuery.sql, helpers.formatQuery('select "posts".*, "post_user"."post_id" as "pivot_post_id", "post_user"."my_user_id" as "pivot_my_user_id" from "posts" inner join "post_user" on "posts"."id" = "post_user"."post_id" where "post_user"."my_user_id" = ?'))
  })

  test('make right join query with different related foreign key', (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post, 'my_user_id', 'my_post_id')
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = new User()
    user.id = 1
    user.$persisted = true
    const postQuery = user.posts().toSQL()
    assert.equal(postQuery.sql, helpers.formatQuery('select "posts".*, "post_user"."my_post_id" as "pivot_my_post_id", "post_user"."my_user_id" as "pivot_my_user_id" from "posts" inner join "post_user" on "posts"."id" = "post_user"."my_post_id" where "post_user"."my_user_id" = ?'))
  })

  test('make right join query with different primary key', (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post, 'my_user_id', 'my_post_id', 'uuid')
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = new User()
    user.uuid = 1
    user.$persisted = true
    const postQuery = user.posts().toSQL()
    assert.equal(postQuery.sql, helpers.formatQuery('select "posts".*, "post_user"."my_post_id" as "pivot_my_post_id", "post_user"."my_user_id" as "pivot_my_user_id" from "posts" inner join "post_user" on "posts"."id" = "post_user"."my_post_id" where "post_user"."my_user_id" = ?'))
  })

  test('make right join query with different related primary key', (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post, 'my_user_id', 'my_post_id', 'id', 'uuid')
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = new User()
    user.id = 1
    user.$persisted = true
    const postQuery = user.posts().toSQL()
    assert.equal(postQuery.sql, helpers.formatQuery('select "posts".*, "post_user"."my_post_id" as "pivot_my_post_id", "post_user"."my_user_id" as "pivot_my_user_id" from "posts" inner join "post_user" on "posts"."uuid" = "post_user"."my_post_id" where "post_user"."my_user_id" = ?'))
  })

  test('make right join query and select extra pivot columns', (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post).withPivot('is_published')
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = new User()
    user.id = 1
    user.$persisted = true
    const postQuery = user.posts().toSQL()
    assert.equal(postQuery.sql, helpers.formatQuery('select "posts".*, "post_user"."post_id" as "pivot_post_id", "post_user"."user_id" as "pivot_user_id", "post_user"."is_published" as "pivot_is_published" from "posts" inner join "post_user" on "posts"."id" = "post_user"."post_id" where "post_user"."user_id" = ?'))
  })

  test('fetch related rows', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post).withPivot('is_published')
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    await ioc.use('Database').table('users').insert({ username: 'virk' })
    await ioc.use('Database').table('posts').insert([{ title: 'Adonis 101' }, { title: 'Lucid 101' }])
    await ioc.use('Database').table('post_user').insert({ post_id: 1, user_id: 1 })

    const user = await User.find(1)
    const posts = await user.posts().fetch()
    assert.equal(posts.size(), 1)
    assert.equal(posts.first().title, 'Adonis 101')
  })

  test('fetch first related rows', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post).withPivot('is_published')
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    await ioc.use('Database').table('users').insert({ username: 'virk' })
    await ioc.use('Database').table('posts').insert([{ title: 'Adonis 101' }, { title: 'Lucid 101' }])
    await ioc.use('Database').table('post_user').insert({ post_id: 1, user_id: 1 })

    const user = await User.find(1)
    const post = await user.posts().first()
    assert.equal(post.title, 'Adonis 101')
  })

  test('add constraints on pivot table', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post).withPivot('is_published')
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    await ioc.use('Database').table('users').insert({ username: 'virk' })
    await ioc.use('Database').table('posts').insert([{ title: 'Adonis 101' }, { title: 'Lucid 101' }])
    await ioc.use('Database').table('post_user').insert([
      { post_id: 1, user_id: 1, is_published: true },
      { post_id: 2, user_id: 1 }
    ])

    const user = await User.find(1)
    const posts = await user.posts().wherePivot('is_published', true).fetch()
    assert.equal(posts.size(), 1)
    assert.equal(posts.first().title, 'Adonis 101')
    assert.deepEqual(posts.first().getRelated('pivot').$attributes, {
      post_id: 1,
      user_id: 1,
      is_published: helpers.formatBoolean(true)
    })
  })

  test('properly convert related model toJSON', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post).withPivot('is_published')
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    await ioc.use('Database').table('users').insert({ username: 'virk' })
    await ioc.use('Database').table('posts').insert([{ title: 'Adonis 101' }, { title: 'Lucid 101' }])
    await ioc.use('Database').table('post_user').insert([
      { post_id: 1, user_id: 1, is_published: true },
      { post_id: 2, user_id: 1 }
    ])

    const user = await User.find(1)
    const posts = await user.posts().where('post_user.is_published', true).fetch()
    const json = posts.toJSON()
    assert.deepEqual(json, [
      {
        id: 1,
        title: 'Adonis 101',
        user_id: null,
        created_at: null,
        deleted_at: null,
        updated_at: null,
        pivot: {
          post_id: 1,
          user_id: 1,
          is_published: helpers.formatBoolean(true)
        }
      }
    ])
  })

  test('eagerload related rows', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post).withPivot('is_published')
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    await ioc.use('Database').table('users').insert({ id: 20, username: 'virk' })
    await ioc.use('Database').table('posts').insert({ id: 18, title: 'Adonis 101' })
    await ioc.use('Database').table('post_user').insert({ post_id: 18, user_id: 20 })

    const users = await User.query().with('posts').fetch()
    assert.equal(users.size(), 1)
    assert.equal(users.first().getRelated('posts').size(), 1)
    assert.equal(users.first().getRelated('posts').first().title, 'Adonis 101')
  })

  test('eagerload related rows for multiple parent rows', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post).withPivot('is_published')
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    await ioc.use('Database').table('users').insert([{ id: 20, username: 'virk' }, { id: 10, username: 'nikk' }])
    await ioc.use('Database').table('posts').insert([{ id: 18, title: 'Adonis 101' }, { id: 19, title: 'Lucid 101' }])
    await ioc.use('Database').table('post_user').insert([
      { post_id: 18, user_id: 20 },
      { post_id: 18, user_id: 10 },
      { post_id: 19, user_id: 20 }
    ])

    const users = await User.query().with('posts').orderBy('id', 'asc').fetch()
    assert.equal(users.size(), 2)
    assert.equal(users.last().username, 'virk')
    assert.equal(users.last().id, 20)
    assert.equal(users.last().getRelated('posts').size(), 2)
    assert.equal(users.first().getRelated('posts').first().title, 'Adonis 101')
    assert.equal(users.last().getRelated('posts').first().title, 'Adonis 101')
    assert.equal(users.last().getRelated('posts').last().title, 'Lucid 101')
  })

  test('lazily eagerload', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post).withPivot('is_published')
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    await ioc.use('Database').table('users').insert([{ id: 20, username: 'virk' }, { id: 10, username: 'nikk' }])
    await ioc.use('Database').table('posts').insert([{ id: 18, title: 'Adonis 101' }, { id: 19, title: 'Lucid 101' }])
    await ioc.use('Database').table('post_user').insert([
      { post_id: 18, user_id: 20 },
      { post_id: 18, user_id: 10 },
      { post_id: 19, user_id: 20 }
    ])

    const user = await User.find(20)
    await user.load('posts')
    assert.equal(user.getRelated('posts').size(), 2)
    assert.equal(user.getRelated('posts').first().title, 'Adonis 101')
    assert.equal(user.getRelated('posts').last().title, 'Lucid 101')
  })

  test('paginate and load related rows', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post).withPivot('is_published')
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    await ioc.use('Database').table('users').insert([{ id: 20, username: 'virk' }, { id: 10, username: 'nikk' }])
    await ioc.use('Database').table('posts').insert([{ id: 18, title: 'Adonis 101' }, { id: 19, title: 'Lucid 101' }])
    await ioc.use('Database').table('post_user').insert([
      { post_id: 18, user_id: 20 },
      { post_id: 18, user_id: 10 },
      { post_id: 19, user_id: 20 }
    ])

    const users = await User.query().with('posts').orderBy('id', 'asc').paginate()
    assert.equal(users.size(), 2)
    assert.deepEqual(users.pages, { total: helpers.formatNumber(2), perPage: 20, page: 1, lastPage: 1 })
    assert.equal(users.last().getRelated('posts').size(), 2)
    assert.equal(users.first().getRelated('posts').size(), 1)
  })

  test('add runtime constraints when eagerloading', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    let postQuery = null
    Post.onQuery((query) => (postQuery = query))

    await ioc.use('Database').table('users').insert([{ id: 20, username: 'virk' }, { id: 10, username: 'nikk' }])
    await ioc.use('Database').table('posts').insert([{ id: 18, title: 'Adonis 101' }, { id: 19, title: 'Lucid 101' }])
    await ioc.use('Database').table('post_user').insert([
      { post_id: 18, user_id: 20 },
      { post_id: 18, user_id: 10 },
      { post_id: 19, user_id: 20 }
    ])

    const users = await User.query().with('posts', (builder) => {
      builder.where('post_user.is_published', true)
    }).paginate()
    assert.equal(users.size(), 2)
    assert.deepEqual(users.pages, { total: helpers.formatNumber(2), perPage: 20, page: 1, lastPage: 1 })
    assert.equal(users.last().getRelated('posts').size(), 0)
    assert.equal(users.first().getRelated('posts').size(), 0)
    assert.equal(postQuery.sql, helpers.formatQuery('select "posts".*, "post_user"."post_id" as "pivot_post_id", "post_user"."user_id" as "pivot_user_id" from "posts" inner join "post_user" on "posts"."id" = "post_user"."post_id" where "post_user"."is_published" = ? and "post_user"."user_id" in (?, ?)'))
  })

  test('limit parent records using has', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    let userQuery = null
    User.onQuery((query) => (userQuery = query))

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').table('posts').insert([{ title: 'Adonis 101' }])
    await ioc.use('Database').table('post_user').insert([{ post_id: 1, user_id: 1 }])

    const users = await User.query().has('posts').fetch()
    assert.equal(users.size(), 1)
    assert.equal(users.first().username, 'virk')
    assert.equal(userQuery.sql, helpers.formatQuery('select * from "users" where exists (select * from "posts" inner join "post_user" on "posts"."id" = "post_user"."post_id" where users.id = post_user.user_id)'))
  })

  test('limit parent records using has and count constraints', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    let userQuery = null
    User.onQuery((query) => (userQuery = query))

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').table('posts').insert([{ title: 'Adonis 101' }])
    await ioc.use('Database').table('post_user').insert([{ post_id: 1, user_id: 1 }])

    const users = await User.query().has('posts', '>', 1).fetch()
    assert.equal(users.size(), 0)
    assert.equal(userQuery.sql, helpers.formatQuery('select * from "users" where (select count(*) from "posts" inner join "post_user" on "posts"."id" = "post_user"."post_id" where users.id = post_user.user_id) > ?'))
  })

  test('add extra constraints via whereHas', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    let userQuery = null
    User.onQuery((query) => (userQuery = query))

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').table('posts').insert({ title: 'Adonis 101' })
    await ioc.use('Database').table('post_user').insert([
      { post_id: 1, user_id: 1, is_published: true },
      { post_id: 1, user_id: 2 }
    ])

    const users = await User.query().whereHas('posts', (builder) => {
      builder.where('post_user.is_published', true)
    }).fetch()
    assert.equal(users.size(), 1)
    assert.equal(userQuery.sql, helpers.formatQuery('select * from "users" where exists (select * from "posts" inner join "post_user" on "posts"."id" = "post_user"."post_id" where "post_user"."is_published" = ? and users.id = post_user.user_id)'))
  })

  test('get related model count via withCount', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    let userQuery = null
    User.onQuery((query) => (userQuery = query))

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').table('posts').insert([{ title: 'Adonis 101' }, { title: 'Lucid 101' }])
    await ioc.use('Database').table('post_user').insert([
      { post_id: 1, user_id: 1 },
      { post_id: 2, user_id: 1 },
      { post_id: 1, user_id: 2 }
    ])

    const users = await User.query().withCount('posts').fetch()
    assert.equal(users.size(), 2)
    assert.deepEqual(users.first().$sideLoaded, { posts_count: helpers.formatNumber(2) })
    assert.deepEqual(users.last().$sideLoaded, { posts_count: helpers.formatNumber(1) })
    assert.equal(userQuery.sql, helpers.formatQuery('select *, (select count(*) from "posts" inner join "post_user" on "posts"."id" = "post_user"."post_id" where users.id = post_user.user_id) as "posts_count" from "users"'))
  })

  test('get constraints to withCount', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').table('posts').insert([{ title: 'Adonis 101' }, { title: 'Lucid 101' }])
    await ioc.use('Database').table('post_user').insert([
      { post_id: 1, user_id: 1, is_published: true },
      { post_id: 2, user_id: 1 },
      { post_id: 1, user_id: 2 }
    ])

    const users = await User.query().withCount('posts as published_posts', (builder) => {
      builder.where('post_user.is_published', true)
    }).withCount('posts as all_posts').fetch()

    assert.equal(users.size(), 2)

    assert.deepEqual(users.first().$sideLoaded, {
      all_posts: helpers.formatNumber(2),
      published_posts: helpers.formatNumber(1)
    })

    assert.deepEqual(users.last().$sideLoaded, {
      all_posts: helpers.formatNumber(1),
      published_posts: helpers.formatNumber(0)
    })
  })

  test('cast timestamps', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post).withPivot(['created_at', 'updated_at'])
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    await ioc.use('Database').table('users').insert({ username: 'virk' })
    await ioc.use('Database').table('posts').insert({ title: 'Adonis 101' })
    await ioc.use('Database').table('post_user').insert([
      { post_id: 1, user_id: 1, is_published: true, created_at: new Date(), updated_at: new Date() }
    ])

    const user = await User.query().with('posts').first()
    const json = user.toJSON()
    assert.isTrue(moment(json.posts[0].pivot.created_at, 'YYYY-MM-DD HH:mm:ss', true).isValid())
    assert.isTrue(moment(json.posts[0].pivot.updated_at, 'YYYY-MM-DD HH:mm:ss', true).isValid())
  })

  test('call pivotModel getters when casting timestamps', async (assert) => {
    class Post extends Model {
    }

    class PostUser extends Model {
      static get table () {
        return 'post_user'
      }

      getCreatedAt (date) {
        return date.format('YYYY-MM-DD')
      }

      getUpdatedAt (date) {
        return date.format('YYYY-MM-DD')
      }
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post).pivotModel(PostUser).withPivot(['created_at', 'updated_at'])
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    await ioc.use('Database').table('users').insert({ username: 'virk' })
    await ioc.use('Database').table('posts').insert({ title: 'Adonis 101' })
    await ioc.use('Database').table('post_user').insert([
      { post_id: 1, user_id: 1, is_published: true, created_at: new Date(), updated_at: new Date() }
    ])

    const user = await User.query().with('posts').first()
    const json = user.toJSON()
    assert.isTrue(moment(json.posts[0].pivot.created_at, 'YYYY-MM-DD', true).isValid())
    assert.isTrue(moment(json.posts[0].pivot.updated_at, 'YYYY-MM-DD', true).isValid())
  })

  test('save related model', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    await ioc.use('Database').table('users').insert({ id: 2, username: 'virk' })
    const user = await User.find(2)

    const post = new Post()
    post.title = 'Adonis 101'

    await user.posts().save(post)
    assert.isTrue(post.$persisted)
    assert.equal(post.getRelated('pivot').post_id, 1)
    assert.equal(post.getRelated('pivot').user_id, 2)

    const pivotValues = await ioc.use('Database').table('post_user')
    assert.lengthOf(pivotValues, 1)
    assert.equal(pivotValues[0].post_id, 1)
    assert.equal(pivotValues[0].user_id, 2)
    assert.isNull(pivotValues[0].created_at)
    assert.isNull(pivotValues[0].updated_at)
  })

  test('save related model with timestamps', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post).withTimestamps()
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    await ioc.use('Database').table('users').insert({ id: 2, username: 'virk' })
    const user = await User.find(2)

    const post = new Post()
    post.title = 'Adonis 101'

    await user.posts().save(post)
    assert.isTrue(post.$persisted)
    assert.equal(post.getRelated('pivot').post_id, 1)
    assert.equal(post.getRelated('pivot').user_id, 2)

    const pivotValues = await ioc.use('Database').table('post_user')
    assert.lengthOf(pivotValues, 1)
    assert.equal(pivotValues[0].post_id, 1)
    assert.equal(pivotValues[0].user_id, 2)
    assert.isTrue(moment(pivotValues[0].created_at, 'YYYY-MM-DD HH:mm:ss', true).isValid())
    assert.isTrue(moment(pivotValues[0].updated_at, 'YYYY-MM-DD HH:mm:ss', true).isValid())
  })

  test('execute setters when pivotModel in play', async (assert) => {
    class Post extends Model {
    }

    class PostUser extends Model {
      static get table () {
        return 'post_user'
      }

      setCreatedAt () {
        return moment().format('YYYY-MM-DD')
      }
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post).pivotModel(PostUser)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()
    PostUser._bootIfNotBooted()

    await ioc.use('Database').table('users').insert({ id: 2, username: 'virk' })
    const user = await User.find(2)

    const post = new Post()
    post.title = 'Adonis 101'

    await user.posts().save(post)
    assert.isTrue(post.$persisted)
    assert.equal(post.getRelated('pivot').post_id, 1)
    assert.equal(post.getRelated('pivot').user_id, 2)

    const pivotValues = await ioc.use('Database').table('post_user')
    assert.lengthOf(pivotValues, 1)
    assert.equal(pivotValues[0].post_id, 1)
    assert.equal(pivotValues[0].user_id, 2)
    assert.isTrue(moment(pivotValues[0].created_at, 'YYYY-MM-DD', true).isValid())
    assert.isTrue(moment(pivotValues[0].updated_at, 'YYYY-MM-DD HH:mm:ss', true).isValid())
  })

  test('save pivot values to database', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    await ioc.use('Database').table('users').insert({ id: 2, username: 'virk' })
    const user = await User.find(2)

    const post = new Post()
    post.title = 'Adonis 101'

    await user.posts().save(post, (pivotModel) => (pivotModel.is_published = true))
    assert.isTrue(post.$persisted)
    assert.equal(post.getRelated('pivot').post_id, 1)
    assert.equal(post.getRelated('pivot').user_id, 2)
    assert.equal(post.getRelated('pivot').is_published, true)

    const pivotValues = await ioc.use('Database').table('post_user')
    assert.lengthOf(pivotValues, 1)
    assert.equal(pivotValues[0].post_id, 1)
    assert.equal(pivotValues[0].user_id, 2)
    assert.equal(pivotValues[0].is_published, 1)
  })

  test('persist parent model to db is not persisted already', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'
    assert.isFalse(user.$persisted)

    const post = new Post()
    post.title = 'Adonis 101'
    assert.isFalse(post.$persisted)

    await user.posts().save(post)
    assert.isTrue(post.$persisted)
    assert.isTrue(user.$persisted)

    const pivotCount = await ioc.use('Database').table('post_user').count('* as total')
    const usersCount = await ioc.use('Database').table('users').count('* as total')
    const postsCount = await ioc.use('Database').table('posts').count('* as total')
    assert.equal(pivotCount[0].total, helpers.formatNumber(1))
    assert.equal(usersCount[0].total, helpers.formatNumber(1))
    assert.equal(postsCount[0].total, helpers.formatNumber(1))
  })

  test('attach existing model', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'
    await user.save()

    await user.posts().attach(1)
    const pivotValues = await ioc.use('Database').table('post_user')
    assert.lengthOf(pivotValues, 1)
    assert.equal(pivotValues[0].user_id, 1)
    assert.equal(pivotValues[0].post_id, 1)
  })

  test('attach existing model with pivot values', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'
    await user.save()

    await user.posts().attach(1, (pivotModel) => (pivotModel.is_published = true))
    const pivotValues = await ioc.use('Database').table('post_user')
    assert.lengthOf(pivotValues, 1)
    assert.equal(pivotValues[0].user_id, 1)
    assert.equal(pivotValues[0].post_id, 1)
    assert.equal(pivotValues[0].is_published, 1)
  })

  test('attach multiple existing models', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'
    await user.save()

    await user.posts().attach([1, 2, 3])
    const pivotValues = await ioc.use('Database').table('post_user')
    assert.lengthOf(pivotValues, 3)
    assert.equal(pivotValues[0].user_id, 1)
    assert.equal(pivotValues[0].post_id, 1)
    assert.equal(pivotValues[1].user_id, 1)
    assert.equal(pivotValues[1].post_id, 2)
    assert.equal(pivotValues[2].user_id, 1)
    assert.equal(pivotValues[2].post_id, 3)
  })

  test('attach multiple existing models with pivotValues', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'
    await user.save()

    await user.posts().attach([1, 2, 3], (pivotModel) => (pivotModel.is_published = true))
    const pivotValues = await ioc.use('Database').table('post_user')
    assert.lengthOf(pivotValues, 3)
    assert.equal(pivotValues[0].user_id, 1)
    assert.equal(pivotValues[0].post_id, 1)
    assert.equal(pivotValues[0].is_published, 1)
    assert.equal(pivotValues[1].user_id, 1)
    assert.equal(pivotValues[1].post_id, 2)
    assert.equal(pivotValues[1].is_published, 1)
    assert.equal(pivotValues[2].user_id, 1)
    assert.equal(pivotValues[2].post_id, 3)
    assert.equal(pivotValues[2].is_published, 1)
  })

  test('attach different pivot values to each pivot row', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'
    await user.save()

    await user.posts().attach([1, 2, 3], (pivotModel) => {
      if (pivotModel.post_id === 1) {
        pivotModel.is_published = true
      } else {
        pivotModel.is_published = false
      }
    })
    const pivotValues = await ioc.use('Database').table('post_user')
    assert.lengthOf(pivotValues, 3)
    assert.equal(pivotValues[0].user_id, 1)
    assert.equal(pivotValues[0].post_id, 1)
    assert.equal(pivotValues[0].is_published, 1)
    assert.equal(pivotValues[1].user_id, 1)
    assert.equal(pivotValues[1].post_id, 2)
    assert.equal(pivotValues[1].is_published, 0)
    assert.equal(pivotValues[2].user_id, 1)
    assert.equal(pivotValues[2].post_id, 3)
    assert.equal(pivotValues[2].is_published, 0)
  })

  test('save many related rows with different pivot values', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'

    const post = new Post()
    post.title = 'Adonis 101'

    const lucid = new Post()
    lucid.title = 'Lucid 101'

    await user.posts().saveMany([post, lucid], (pivotModel) => {
      if (pivotModel.post_id === 1) {
        pivotModel.is_published = true
      } else {
        pivotModel.is_published = false
      }
    })
    assert.isTrue(user.$persisted)
    assert.isTrue(post.$persisted)
    assert.equal(post.getRelated('pivot').post_id, 1)
    assert.equal(post.getRelated('pivot').user_id, 1)
    assert.equal(post.getRelated('pivot').is_published, true)

    assert.isTrue(lucid.$persisted)
    assert.equal(lucid.getRelated('pivot').post_id, 2)
    assert.equal(lucid.getRelated('pivot').user_id, 1)
    assert.equal(lucid.getRelated('pivot').is_published, false)
  })

  test('attach different pivot values to each pivot row', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'
    await user.save()

    await user.posts().attach([1, 2, 3], (pivotModel) => {
      if (pivotModel.post_id === 1) {
        pivotModel.is_published = true
      } else {
        pivotModel.is_published = false
      }
    })
    const pivotValues = await ioc.use('Database').table('post_user')
    assert.lengthOf(pivotValues, 3)
    assert.equal(pivotValues[0].user_id, 1)
    assert.equal(pivotValues[0].post_id, 1)
    assert.equal(pivotValues[0].is_published, 1)
    assert.equal(pivotValues[1].user_id, 1)
    assert.equal(pivotValues[1].post_id, 2)
    assert.equal(pivotValues[1].is_published, 0)
    assert.equal(pivotValues[2].user_id, 1)
    assert.equal(pivotValues[2].post_id, 3)
    assert.equal(pivotValues[2].is_published, 0)
  })

  test('create related row', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'

    const post = await user.posts().create({ title: 'Adonis 101' })
    assert.isTrue(post.$persisted)
    assert.equal(post.id, 1)
    assert.equal(post.title, 'Adonis 101')
    assert.equal(post.getRelated('pivot').post_id, 1)
    assert.equal(post.getRelated('pivot').user_id, 1)
  })

  test('create many related rows', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'

    const posts = await user.posts().createMany([{ title: 'Adonis 101' }, { title: 'Lucid 101' }])
    assert.isTrue(posts[0].$persisted)
    assert.equal(posts[0].id, 1)
    assert.equal(posts[0].getRelated('pivot').post_id, 1)
    assert.equal(posts[0].getRelated('pivot').user_id, 1)

    assert.isTrue(posts[1].$persisted)
    assert.equal(posts[1].id, 2)
    assert.equal(posts[1].getRelated('pivot').post_id, 2)
    assert.equal(posts[1].getRelated('pivot').user_id, 1)
  })

  test('attach should not attach duplicate records', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = await User.create({ username: 'virk' })
    const post = await Post.create({ title: 'Adonis 101' })
    await user.posts().attach(post.id)
    await user.posts().attach(post.id)
    const pivotValues = await ioc.use('Database').table('post_user')
    assert.lengthOf(pivotValues, 1)
  })

  test('attach should grow the private pivotInstances array', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = await User.create({ username: 'virk' })
    const post = await Post.create({ title: 'Adonis 101' })
    const userPosts = user.posts()
    await userPosts.attach(post.id)
    assert.lengthOf(userPosts._existingPivotInstances, 1)
    const cachedPost = await userPosts.attach(post.id)
    assert.deepEqual(cachedPost[0], userPosts._existingPivotInstances[0])
    assert.lengthOf(userPosts._existingPivotInstances, 1)
    const pivotValues = await ioc.use('Database').table('post_user')
    assert.lengthOf(pivotValues, 1)
  })

  test('attach look in the database and ignore existing relations', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post).withPivot('is_published')
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = await User.create({ username: 'virk', id: 2 })
    const post = await Post.create({ title: 'Adonis 101' })
    await ioc.use('Database').table('post_user').insert({ post_id: 1, user_id: 2 })
    const userPost = user.posts()
    await userPost.attach(post.id)
    const pivotValues = await ioc.use('Database').table('post_user')
    assert.lengthOf(pivotValues, 1)
  })

  test('attach using explicit pivotModel', async (assert) => {
    class Post extends Model {
    }

    class PostUser extends Model {
      static get table () {
        return 'post_user'
      }
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post).pivotModel(PostUser)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()
    PostUser._bootIfNotBooted()

    let postQuery = null
    PostUser.onQuery((query) => (postQuery = query))

    const user = await User.create({ username: 'virk', id: 2 })
    const post = await Post.create({ title: 'Adonis 101' })
    await ioc.use('Database').table('post_user').insert({ post_id: 1, user_id: 2 })
    const userPost = user.posts()
    await userPost.attach(post.id)
    assert.instanceOf(userPost._existingPivotInstances[0], PostUser)
    const pivotValues = await ioc.use('Database').table('post_user')
    assert.lengthOf(pivotValues, 1)
    assert.equal(postQuery.sql, helpers.formatQuery('select "post_id", "user_id" from "post_user" where "user_id" = ?'))
  })

  test('save should not attach existing relations', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = await User.create({ username: 'virk', id: 2 })
    const post = await Post.create({ title: 'Adonis 101' })
    await ioc.use('Database').table('post_user').insert({ user_id: 2, post_id: 1 })
    await user.posts().save(post)
    const postsCount = await ioc.use('Database').table('posts')
    const pivotCount = await ioc.use('Database').table('post_user')
    assert.lengthOf(postsCount, 1)
    assert.lengthOf(pivotCount, 1)
  })

  test('detach existing relations', async (assert) => {
    class Post extends Model {
    }

    class PostUser extends Model {
      static get table () {
        return 'post_user'
      }
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post).pivotModel(PostUser)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()
    PostUser._bootIfNotBooted()

    let postQuery = null
    PostUser.onQuery((query) => (postQuery = query))

    const user = await User.create({ username: 'virk', id: 2 })
    const post = await Post.create({ title: 'Adonis 101' })
    const userPost = user.posts()
    await userPost.attach(post.id)
    await userPost.detach()
    const postsCount = await ioc.use('Database').table('posts')
    const pivotCount = await ioc.use('Database').table('post_user')
    assert.lengthOf(postsCount, 1)
    assert.lengthOf(pivotCount, 0)
    assert.lengthOf(userPost._existingPivotInstances, 0)
    assert.equal(postQuery.sql, helpers.formatQuery('delete from "post_user" where "user_id" = ?'))
  })

  test('detach only specific existing relations', async (assert) => {
    class Post extends Model {
    }

    class PostUser extends Model {
      static get table () {
        return 'post_user'
      }
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post).pivotModel(PostUser)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()
    PostUser._bootIfNotBooted()

    let postQuery = null
    PostUser.onQuery((query) => (postQuery = query))

    const user = await User.create({ username: 'virk', id: 2 })
    await Post.create({ title: 'Adonis 101' })
    await Post.create({ title: 'Lucid 101' })
    const userPost = user.posts()
    await userPost.attach([1, 2])
    await userPost.detach(1)
    const postsCount = await ioc.use('Database').table('posts')
    const pivotCount = await ioc.use('Database').table('post_user')
    assert.lengthOf(postsCount, 2)
    assert.lengthOf(pivotCount, 1)
    assert.lengthOf(userPost._existingPivotInstances, 1)
    assert.equal(userPost._existingPivotInstances[0].post_id, 2)
    assert.equal(postQuery.sql, helpers.formatQuery('delete from "post_user" where "user_id" = ? and "post_id" in (?)'))
  })

  test('delete existing relation', async (assert) => {
    class Post extends Model {
    }

    class PostUser extends Model {
      static get table () {
        return 'post_user'
      }
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post).pivotModel(PostUser)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()
    PostUser._bootIfNotBooted()

    let postUserQuery = null
    let postQuery = null
    PostUser.onQuery((query) => (postUserQuery = query))
    Post.onQuery((query) => (postQuery = query))

    const user = await User.create({ username: 'virk', id: 2 })
    await Post.create({ title: 'Adonis 101' })
    await Post.create({ title: 'Lucid 101' })
    await user.posts().attach([1, 2])
    await user.posts().where('posts.id', 1).delete()
    const postsCount = await ioc.use('Database').table('posts')
    const postUserCount = await ioc.use('Database').table('post_user')
    assert.lengthOf(postsCount, 1)
    assert.lengthOf(postUserCount, 1)
    assert.equal(postQuery.sql, helpers.formatQuery('delete from "posts" where "id" in (?)'))
    assert.equal(postUserQuery.sql, helpers.formatQuery('delete from "post_user" where "user_id" = ? and "post_id" in (?)'))
  })

  test('update existing relation', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    let postQuery = null
    Post.onQuery((query) => (postQuery = query))

    const user = await User.create({ username: 'virk', id: 2 })
    await Post.create({ title: 'Adonis 101' })
    await Post.create({ title: 'Lucid 101' })
    await user.posts().attach([1, 2])
    await user.posts().where('posts.id', 1).update({ title: 'Adonis 102' })
    const post = await ioc.use('Database').table('posts').where('id', 1)
    assert.equal(post[0].title, 'Adonis 102')
    assert.equal(postQuery.sql, helpers.formatQuery('update "posts" set "title" = ?, "updated_at" = ? where "id" in (?)'))
  })

  test('throw exception when saveMany doesn\'t  receives an array', async (assert) => {
    assert.plan(1)

    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'

    const post = new Post()
    post.title = 'Adonis 101'

    try {
      await user.posts().saveMany(post)
    } catch ({ message }) {
      assert.equal(message, 'E_INVALID_PARAMETER: belongsToMany.saveMany expects an array of related model instances instead received object')
    }
  })

  test('throw exception when createMany doesn\'t  receives an array', async (assert) => {
    assert.plan(1)

    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'

    try {
      await user.posts().createMany({})
    } catch ({ message }) {
      assert.equal(message, 'E_INVALID_PARAMETER: belongsToMany.createMany expects an array of related model instances instead received object')
    }
  })

  test('select few fields from related model when eagerloading', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    let postQuery = null
    Post.onQuery((query) => (postQuery = query))

    await ioc.use('Database').table('users').insert({ id: 20, username: 'virk' })
    await ioc.use('Database').table('posts').insert({ id: 18, title: 'Adonis 101' })
    await ioc.use('Database').table('post_user').insert({ post_id: 18, user_id: 20 })

    await User.query().with('posts', (builder) => {
      builder.select('title')
    }).fetch()

    assert.equal(postQuery.sql, helpers.formatQuery('select "posts"."title", "post_user"."post_id" as "pivot_post_id", "post_user"."user_id" as "pivot_user_id" from "posts" inner join "post_user" on "posts"."id" = "post_user"."post_id" where "post_user"."user_id" in (?)'))
  })

  test('select few fields from related model', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    let postQuery = null
    Post.onQuery((query) => (postQuery = query))

    await ioc.use('Database').table('users').insert({ id: 20, username: 'virk' })
    await ioc.use('Database').table('posts').insert({ id: 18, title: 'Adonis 101' })
    await ioc.use('Database').table('post_user').insert({ post_id: 18, user_id: 20 })

    const user = await User.find(20)
    await user.posts().select('title').fetch()

    assert.equal(postQuery.sql, helpers.formatQuery('select "posts"."title", "post_user"."post_id" as "pivot_post_id", "post_user"."user_id" as "pivot_user_id" from "posts" inner join "post_user" on "posts"."id" = "post_user"."post_id" where "post_user"."user_id" = ?'))
  })

  test('belongsToMany work fine with IoC container binding', async (assert) => {
    class Post extends Model {
    }

    ioc.fake('App/Models/Post', () => Post)

    class User extends Model {
      posts () {
        return this.belongsToMany('App/Models/Post')
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = new User()
    user.id = 1
    user.$persisted = true
    const postQuery = user.posts().toSQL()
    assert.equal(postQuery.sql, helpers.formatQuery('select "posts".*, "post_user"."post_id" as "pivot_post_id", "post_user"."user_id" as "pivot_user_id" from "posts" inner join "post_user" on "posts"."id" = "post_user"."post_id" where "post_user"."user_id" = ?'))
  })

  test('bind custom callback for eagerload query', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    let postQuery = null
    Post.onQuery((query) => (postQuery = query))

    await ioc.use('Database').table('users').insert([{ id: 20, username: 'virk' }, { id: 10, username: 'nikk' }])
    await ioc.use('Database').table('posts').insert([{ id: 18, title: 'Adonis 101' }, { id: 19, title: 'Lucid 101' }])
    await ioc.use('Database').table('post_user').insert([
      { post_id: 18, user_id: 20 },
      { post_id: 18, user_id: 10 },
      { post_id: 19, user_id: 20 }
    ])

    await User.query().with('posts', (builder) => {
      builder.eagerLoadQuery(function (query, fk, values) {
        builder._selectFields()
        builder._makeJoinQuery()
        builder.whereInPivot(fk, values)
      })
    }).fetch()

    assert.equal(postQuery.sql, helpers.formatQuery('select "posts".*, "post_user"."post_id" as "pivot_post_id", "post_user"."user_id" as "pivot_user_id" from "posts" inner join "post_user" on "posts"."id" = "post_user"."post_id" where "post_user"."user_id" in (?, ?)'))
  })

  test('do not select all rows for a counts query', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    await ioc.use('Database').table('users').insert({ id: 20, username: 'virk' })
    await ioc.use('Database').table('posts').insert([{ id: 18, title: 'Adonis 101' }, { id: 19, title: 'Lucid 101' }])
    await ioc.use('Database').table('post_user').insert([
      { post_id: 18, user_id: 20 },
      { post_id: 19, user_id: 20 }
    ])

    const user = await User.find(20)
    const postsCount = await user.posts().count('* as total')
    assert.deepEqual(postsCount, [{ 'total': 2 }])
  })
})
