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
const { Config, setupResolver } = require('@adonisjs/sink')
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
    setupResolver()
  })

  group.afterEach(async () => {
    ioc.restore()
    await ioc.use('Adonis/Src/Database').table('users').truncate()
    await ioc.use('Adonis/Src/Database').table('posts').truncate()
    await ioc.use('Adonis/Src/Database').table('post_user').truncate()
    await ioc.use('Adonis/Src/Database').table('followers').truncate()
    await ioc.use('Adonis/Src/Database').table('team_user').truncate()
    await ioc.use('Adonis/Src/Database').table('party_users').truncate()
    await ioc.use('Adonis/Src/Database').table('teams').truncate()
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
    PostUser._bootIfNotBooted()

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
    PostUser._bootIfNotBooted()

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
    PostUser._bootIfNotBooted()

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
    PostUser._bootIfNotBooted()

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

    assert.equal(userQuery.sql, helpers.formatQuery('select * from "users" where exists (select * from "posts" inner join "post_user" on "posts"."id" = "post_user"."post_id" where "users"."id" = "post_user"."user_id")'))
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
    assert.equal(userQuery.sql, helpers.formatQuery('select * from "users" where (select count(*) from "posts" inner join "post_user" on "posts"."id" = "post_user"."post_id" where "users"."id" = "post_user"."user_id") > ?'))
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
    assert.equal(userQuery.sql, helpers.formatQuery('select * from "users" where exists (select * from "posts" inner join "post_user" on "posts"."id" = "post_user"."post_id" where "post_user"."is_published" = ? and "users"."id" = "post_user"."user_id")'))
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
    assert.equal(userQuery.sql, helpers.formatQuery('select *, (select count(*) from "posts" inner join "post_user" on "posts"."id" = "post_user"."post_id" where "users"."id" = "post_user"."user_id") as "posts_count" from "users"'))
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
    PostUser._bootIfNotBooted()

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
    const pivotValues = await ioc.use('Database').table('post_user').orderBy('id', 'asc')
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
    const pivotValues = await ioc.use('Database').table('post_user').orderBy('id', 'asc')

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

  test('throw exception when saveMany doesn\'t receives an array', async (assert) => {
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
      assert.match(message, /E_INVALID_PARAMETER: belongsToMany.saveMany expects an array of related model instances instead received object/)
    }
  })

  test('throw exception when createMany doesn\'t receives an array', async (assert) => {
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
      assert.match(message, /E_INVALID_PARAMETER: belongsToMany.createMany expects an array of related model instances instead received object/)
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

  test('test aggregates and aggregate helpers', async (assert) => {
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
      { post_id: 19, user_id: 20 },
      { post_id: 19, user_id: 20 }, // Intentional duplicate for distinct tests
      { post_id: 19, user_id: 21 }
    ])

    const user = await User.find(20)
    let c = 0

    // count
    c = await user.posts().count('* as total')
    assert.equal(c[0].total, 3)
    c = await user.posts().getCount()
    assert.equal(c, 3)

    // countDistinct
    c = await user.posts().countDistinct('post_user.user_id as total')
    assert.equal(c[0].total, 1)
    c = await user.posts().getCountDistinct('pivot_user_id')
    assert.equal(c, 1)

    // sum
    c = await user.posts().sum('posts.id as total')
    assert.equal(c[0].total, 18 + 19 + 19)
    c = await user.posts().getSum('id')
    assert.equal(c, 18 + 19 + 19)

    // sumDistinct
    c = await user.posts().sumDistinct('posts.id as total')
    assert.equal(c[0].total, 18 + 19)
    c = await user.posts().getSumDistinct('id')
    assert.equal(c, 18 + 19)

    // avg
    c = await user.posts().avg('posts.id as total')
    assert.equal(parseInt(c[0].total), parseInt((18 + 19 + 19) / 3))
    c = await user.posts().getAvg('id')
    assert.equal(parseInt(c), parseInt((18 + 19 + 19) / 3))

    // avgDistinct
    c = await user.posts().avgDistinct('posts.id as total')
    assert.equal(parseInt(c[0].total), parseInt((18 + 19) / 2))
    c = await user.posts().getAvgDistinct('id')
    assert.equal(parseInt(c), parseInt((18 + 19) / 2))

    // min
    c = await user.posts().min('posts.id as total')
    assert.equal(c[0].total, 18)
    c = await user.posts().getMin('id')
    assert.equal(c, 18)

    // max
    c = await user.posts().max('posts.id as total')
    assert.equal(c[0].total, 19)
    c = await user.posts().getMax('id')
    assert.equal(c, 19)
  })

  test('count distinct on given field', async (assert) => {
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
    const postsCount = await user.posts().countDistinct('post_user.user_id as total')
    assert.include(postsCount[0], { 'total': helpers.formatNumber(1) })
  })

  test('withCount work fine with self relations', async (assert) => {
    class Follower extends Model {
    }

    class User extends Model {
      followers () {
        return this.belongsToMany(User, 'user_id', 'follower_id').pivotTable('followers')
      }
    }

    User._bootIfNotBooted()
    Follower._bootIfNotBooted()

    let userQuery = null
    User.onQuery((query) => (userQuery = query))

    await ioc.use('Database').table('users').insert([
      {
        username: 'virk'
      },
      {
        username: 'nikk'
      }
    ])

    await ioc.use('Database').table('followers').insert([
      {
        user_id: 1,
        follower_id: 2
      }
    ])

    const results = await User.query().withCount('followers').fetch()

    const expectedQuery = 'select *, (select count(*) from "users" as "sj_0" inner join "followers" on "sj_0"."id" = "followers"."follower_id" where "users"."id" = "followers"."user_id") as "followers_count" from "users"'

    assert.equal(results.first().$sideLoaded.followers_count, 1)
    assert.equal(results.last().$sideLoaded.followers_count, 0)
    assert.equal(userQuery.sql, helpers.formatQuery(expectedQuery))
  })

  test('withCount work fine with too much data', async (assert) => {
    class Follower extends Model {
    }

    class User extends Model {
      followers () {
        return this.belongsToMany(User, 'user_id', 'follower_id').pivotTable('followers')
      }
    }

    User._bootIfNotBooted()
    Follower._bootIfNotBooted()

    let userQuery = null
    User.onQuery((query) => (userQuery = query))

    await ioc.use('Database').table('users').insert([
      {
        username: 'virk'
      },
      {
        username: 'nikk'
      },
      {
        username: 'prasan'
      },
      {
        username: 'tushar'
      }
    ])

    await ioc.use('Database').table('followers').insert([
      {
        user_id: 1,
        follower_id: 2
      },
      {
        user_id: 1,
        follower_id: 3
      },
      {
        user_id: 2,
        follower_id: 3
      }
    ])

    const results = await User.query().withCount('followers').fetch()

    const expectedQuery = 'select *, (select count(*) from "users" as "sj_0" inner join "followers" on "sj_0"."id" = "followers"."follower_id" where "users"."id" = "followers"."user_id") as "followers_count" from "users"'

    assert.equal(results.first().$sideLoaded.followers_count, 2)
    assert.equal(results.rows[1].$sideLoaded.followers_count, 1)
    assert.equal(results.rows[2].$sideLoaded.followers_count, 0)
    assert.equal(results.last().$sideLoaded.followers_count, 0)
    assert.equal(userQuery.sql, helpers.formatQuery(expectedQuery))
  })

  test('withCount work fine with multiple relations', async (assert) => {
    class Follower extends Model {
    }

    class User extends Model {
      followers () {
        return this.belongsToMany(User, 'user_id', 'follower_id').pivotTable('followers')
      }

      following () {
        return this.belongsToMany(User, 'follower_id', 'user_id').pivotTable('followers')
      }
    }

    User._bootIfNotBooted()
    Follower._bootIfNotBooted()

    let userQuery = null
    User.onQuery((query) => (userQuery = query))

    await ioc.use('Database').table('users').insert([
      {
        username: 'virk'
      },
      {
        username: 'nikk'
      },
      {
        username: 'prasan'
      },
      {
        username: 'tushar'
      }
    ])

    await ioc.use('Database').table('followers').insert([
      {
        user_id: 1,
        follower_id: 2
      },
      {
        user_id: 1,
        follower_id: 3
      },
      {
        user_id: 2,
        follower_id: 3
      }
    ])

    const results = await User.query().withCount('following').withCount('followers').fetch()

    const expectedQuery = 'select *, (select count(*) from "users" as "sj_0" inner join "followers" on "sj_0"."id" = "followers"."user_id" where "users"."id" = "followers"."follower_id") as "following_count", (select count(*) from "users" as "sj_1" inner join "followers" on "sj_1"."id" = "followers"."follower_id" where "users"."id" = "followers"."user_id") as "followers_count" from "users"'

    assert.equal(results.first().$sideLoaded.followers_count, 2)
    assert.equal(results.first().$sideLoaded.following_count, 0)

    assert.equal(results.rows[1].$sideLoaded.followers_count, 1)
    assert.equal(results.rows[1].$sideLoaded.following_count, 1)

    assert.equal(results.rows[2].$sideLoaded.followers_count, 0)
    assert.equal(results.rows[2].$sideLoaded.following_count, 2)

    assert.equal(results.last().$sideLoaded.followers_count, 0)
    assert.equal(results.last().$sideLoaded.following_count, 0)
    assert.equal(userQuery.sql, helpers.formatQuery(expectedQuery))
  })

  test('sync pivot rows by dropping old and adding new', async (assert) => {
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

    await user.posts().attach([1])
    await user.posts().sync([2])
    const pivotValues = await ioc.use('Database').table('post_user')
    assert.lengthOf(pivotValues, 1)
    assert.equal(pivotValues[0].user_id, 1)
    assert.equal(pivotValues[0].post_id, 2)
  })

  test('define pivot model via ioc container string', (assert) => {
    class Post extends Model {
    }

    ioc.fake('App/Models/PostUser', () => {
      class PostUser extends Model {
      }
      PostUser._bootIfNotBooted()
      return PostUser
    })

    class User extends Model {
      posts () {
        return this.belongsToMany(Post).pivotModel('App/Models/PostUser')
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = new User()
    const userPosts = user.posts()
    assert.equal(userPosts.$pivotTable, 'post_users')
  })

  test('attach model via different primary key', async (assert) => {
    class Team extends Model {
    }

    class User extends Model {
      static get table () {
        return 'party_users'
      }

      teams () {
        return this.belongsToMany(Team, 'user_party_id', 'team_party_id', 'party_id', 'party_id')
      }
    }

    User._bootIfNotBooted()
    Team._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'
    user.party_id = 20
    await user.save()

    await user.teams().attach(10)
    const pivotValues = await ioc.use('Database').table('team_user')
    assert.lengthOf(pivotValues, 1)
    assert.equal(pivotValues[0].user_party_id, 20)
    assert.equal(pivotValues[0].team_party_id, 10)
  })

  test('create and attach model via different primary key', async (assert) => {
    class Team extends Model {
    }

    class User extends Model {
      static get table () {
        return 'party_users'
      }

      teams () {
        return this.belongsToMany(Team, 'user_party_id', 'team_party_id', 'party_id', 'party_id')
      }
    }

    User._bootIfNotBooted()
    Team._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'
    user.party_id = 20
    await user.save()

    await user.teams().create({ name: 'draculas', party_id: 10 })
    const pivotValues = await ioc.use('Database').table('team_user')
    assert.lengthOf(pivotValues, 1)
    assert.equal(pivotValues[0].user_party_id, 20)
    assert.equal(pivotValues[0].team_party_id, 10)
  })

  test('apply global scope on related model when eagerloading', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    Post.addGlobalScope(function (builder) {
      builder.where(`${builder.Model.table}.deleted_at`, null)
    })

    let postQuery = null
    Post.onQuery((query) => (postQuery = query))

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await User.query().with('posts').fetch()

    assert.equal(postQuery.sql, helpers.formatQuery('select "posts".*, "post_user"."post_id" as "pivot_post_id", "post_user"."user_id" as "pivot_user_id" from "posts" inner join "post_user" on "posts"."id" = "post_user"."post_id" where "post_user"."user_id" in (?, ?) and "posts"."deleted_at" is null'))
  })

  test('apply global scope on related model when called withCount', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    Post.addGlobalScope(function (builder) {
      builder.where(`${builder.Model.table}.deleted_at`, null)
    })

    let userQuery = null
    User.onQuery((query) => (userQuery = query))

    await User.query().withCount('posts').fetch()

    assert.equal(userQuery.sql, helpers.formatQuery('select *, (select count(*) from "posts" inner join "post_user" on "posts"."id" = "post_user"."post_id" where "users"."id" = "post_user"."user_id" and "posts"."deleted_at" is null) as "posts_count" from "users"'))
  })

  test('apply global scope on related model when called has', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    Post.addGlobalScope(function (builder) {
      builder.where(`${builder.Model.table}.deleted_at`, null)
    })

    let userQuery = null
    User.onQuery((query) => (userQuery = query))

    await User.query().has('posts').fetch()

    assert.equal(userQuery.sql, helpers.formatQuery('select * from "users" where exists (select * from "posts" inner join "post_user" on "posts"."id" = "post_user"."post_id" where "users"."id" = "post_user"."user_id" and "posts"."deleted_at" is null)'))
  })

  test('attach existing model inside transaction', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const trx = await ioc.use('Database').beginTransaction()

    const user = new User()
    user.username = 'virk'
    await user.save(trx)

    await user.posts().attach(1, null, trx)
    trx.rollback()

    const pivotValues = await ioc.use('Database').table('post_user')
    assert.lengthOf(pivotValues, 0)
  })

  test('sync data inside a transaction', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const trx = await ioc.use('Database').beginTransaction()

    const user = new User()
    user.username = 'virk'
    await user.save(trx)

    await user.posts().sync(1, null, trx)
    trx.rollback()

    const pivotValues = await ioc.use('Database').table('post_user')
    assert.lengthOf(pivotValues, 0)
  })

  test('attach data inside transaction using custom pivotModel', async (assert) => {
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

    const trx = await ioc.use('Database').beginTransaction()

    const user = new User()
    user.username = 'virk'
    await user.save(trx)

    await user.posts().attach(1, null, trx)
    trx.rollback()

    const pivotValues = await ioc.use('Database').table('post_user')
    assert.lengthOf(pivotValues, 0)
  })

  test('sync data inside transaction using custom pivotModel', async (assert) => {
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

    const trx = await ioc.use('Database').beginTransaction()

    const user = new User()
    user.username = 'virk'
    await user.save(trx)

    await user.posts().sync(1, null, trx)
    trx.rollback()

    const pivotValues = await ioc.use('Database').table('post_user')
    assert.lengthOf(pivotValues, 0)
  })

  test('work fine when foreign key value is 0', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    await ioc.use('Database').table('users').insert({ id: 0, username: 'virk' })
    await ioc.use('Database').table('posts').insert({ id: 1, title: 'Adonis 101' })
    await ioc.use('Database').table('post_user').insert({ post_id: 1, user_id: 0 })

    const user = await User.find(0)
    const posts = await user.posts().fetch()
    assert.equal(posts.first().getRelated('pivot').user_id, 0)
  })

  test('eagerload when foreign key value is 0', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    await ioc.use('Database').table('users').insert({ id: 0, username: 'virk' })
    await ioc.use('Database').table('posts').insert({ id: 1, title: 'Adonis 101' })
    await ioc.use('Database').table('post_user').insert({ post_id: 1, user_id: 0 })

    const user = await User.query().with('posts').first()
    assert.instanceOf(user.getRelated('posts').first(), Post)
  })

  test('save related when foreign key value is 0', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    await ioc.use('Database').table('users').insert({ id: 0, username: 'virk' })

    const user = await User.find(0)
    await user.posts().create({ title: 'Adonis 101' })

    const posts = await ioc.use('Database').table('posts')
    assert.lengthOf(posts, 1)
    assert.equal(posts[0].title, 'Adonis 101')

    const pivotRow = await ioc.use('Database').table('post_user')
    assert.lengthOf(pivotRow, 1)
    assert.equal(pivotRow[0].user_id, 0)
    assert.equal(pivotRow[0].post_id, posts[0].id)
  })

  test('update related when foreign key value is 0', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    await ioc.use('Database').table('users').insert({ id: 0, username: 'virk' })
    await ioc.use('Database').table('posts').insert({ id: 1, title: 'Adonis 101' })
    await ioc.use('Database').table('post_user').insert({ post_id: 1, user_id: 0 })

    const user = await User.find(0)
    await user.posts().update({ title: 'Adonis 102' })

    const posts = await ioc.use('Database').table('posts')
    assert.equal(posts[0].title, 'Adonis 102')
  })

  test('serialize when foreign key is 0', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    await ioc.use('Database').table('users').insert({ id: 0, username: 'virk' })
    await ioc.use('Database').table('posts').insert({ id: 1, title: 'Adonis 101' })
    await ioc.use('Database').table('post_user').insert({ post_id: 1, user_id: 0 })

    const user = await User.query().with('posts').first()
    assert.equal(user.toJSON().posts[0].pivot.user_id, 0)
  })

  test('attach related when foreign key 0', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    await ioc.use('Database').table('users').insert({ id: 0, username: 'virk' })
    await ioc.use('Database').table('posts').insert({ id: 1, title: 'Adonis 101' })

    const user = await User.find(0)
    await user.posts().attach([1])

    const pivotRow = await ioc.use('Database').table('post_user')
    assert.lengthOf(pivotRow, 1)
    assert.equal(pivotRow[0].user_id, 0)
    assert.equal(pivotRow[0].post_id, 1)
  })

  test('detach related when foreign key 0', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    await ioc.use('Database').table('users').insert({ id: 0, username: 'virk' })
    await ioc.use('Database').table('posts').insert({ id: 1, title: 'Adonis 101' })
    await ioc.use('Database').table('post_user').insert({ post_id: 1, user_id: 0 })

    const user = await User.find(0)
    await user.posts().detach([1])

    const posts = await ioc.use('Database').table('posts')
    assert.lengthOf(posts, 1)

    const pivotRow = await ioc.use('Database').table('post_user')
    assert.lengthOf(pivotRow, 0)
  })

  test('apply hooks from pivotModel when saving a new record', async (assert) => {
    class Post extends Model {
    }

    class PostUser extends Model {
      static get table () {
        return 'post_user'
      }

      static boot () {
        super.boot()
        this.addHook('beforeCreate', (modelInstance) => {
          modelInstance.is_published = true
        })
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

    const user = new User()
    user.username = 'virk'
    await user.save()

    const post = await user.posts().create({
      title: 'Adonis 101'
    })

    const postUser = await ioc.use('Database').table('post_user').first()

    assert.isOk(postUser.is_published)
    assert.isOk(post.getRelated('pivot').is_published)
  })

  test('apply hooks from pivotModel when attach a new record', async (assert) => {
    class Post extends Model {
    }

    class PostUser extends Model {
      static get table () {
        return 'post_user'
      }

      static boot () {
        super.boot()
        this.addHook('beforeCreate', (modelInstance) => {
          modelInstance.is_published = true
        })
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

    const user = new User()
    user.username = 'virk'
    await user.save()

    await user.posts().attach([1])
    const postUser = await ioc.use('Database').table('post_user').first()
    assert.isOk(postUser.is_published)
  })

  test('apply global scopes when fetching related records', async (assert) => {
    class Post extends Model {
    }

    class PostUser extends Model {
      static get table () {
        return 'post_user'
      }

      static boot () {
        super.boot()
        this.addGlobalScope((query) => {
          query.wherePivot('is_published', true)
        })
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

    let postsQuery = null
    Post.onQuery((query) => (postsQuery = query))

    await ioc.use('Database').table('users').insert({ username: 'virk' })
    await ioc.use('Database').table('posts').insert({ title: 'Adonis 101' })
    await ioc.use('Database').table('post_user').insert({ post_id: 1, user_id: 1 })

    const user = await User.find(1)
    await user.posts().fetch()

    assert.equal(helpers.formatQuery(postsQuery.sql), helpers.formatQuery('select "posts".*, "post_user"."post_id" as "pivot_post_id", "post_user"."user_id" as "pivot_user_id" from "posts" inner join "post_user" on "posts"."id" = "post_user"."post_id" where "post_user"."user_id" = ? and "post_user"."is_published" = ?'))
  })

  test('apply global scopes when eagerloading related records', async (assert) => {
    class Post extends Model {
    }

    class PostUser extends Model {
      static get table () {
        return 'post_user'
      }

      static boot () {
        super.boot()
        this.addGlobalScope((query) => {
          query.wherePivot('is_published', true)
        })
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

    let postsQuery = null
    Post.onQuery((query) => (postsQuery = query))

    await ioc.use('Database').table('users').insert({ username: 'virk' })
    await ioc.use('Database').table('posts').insert({ title: 'Adonis 101' })
    await ioc.use('Database').table('post_user').insert({ post_id: 1, user_id: 1 })

    await User.query().with('posts').first(1)

    assert.equal(helpers.formatQuery(postsQuery.sql), helpers.formatQuery('select "posts".*, "post_user"."post_id" as "pivot_post_id", "post_user"."user_id" as "pivot_user_id" from "posts" inner join "post_user" on "posts"."id" = "post_user"."post_id" where "post_user"."user_id" in (?) and "post_user"."is_published" = ?'))
  })

  test('on save do not add returning statement when withPrimaryKey is false (pg only)', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post).pivotPrimaryKey(false)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    let postsQuery = null
    ioc.use('Database').on('query', (query) => (postsQuery = query))

    await ioc.use('Database').table('users').insert({ username: 'virk' })

    const user = await User.find(1)
    await user.posts().create({ title: 'Adonis 101' })

    assert.equal(postsQuery.sql, helpers.formatQuery('insert into "post_user" ("post_id", "user_id") values (?, ?)'))
  })

  test('get an array of ids for the related model', async (assert) => {
    class Post extends Model {
      users () {
        return this.belongsToMany(User)
      }
    }

    class PostUser extends Model {
      static get table () {
        return 'post_user'
      }
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()
    PostUser._bootIfNotBooted()

    let postsQuery = null
    Post.onQuery((query) => (postsQuery = query))

    await ioc.use('Database').table('users').insert({ username: 'virk' })
    await ioc.use('Database').table('posts').insert([
      { id: 1, title: 'Adonis 101' },
      { id: 2, title: 'Adonis 102' },
      { id: 3, title: 'Adonis 103' }
    ])
    await ioc.use('Database').table('post_user').insert([
      { post_id: 1, user_id: 1 },
      { post_id: 2, user_id: 1 }
    ])

    const user = await User.find(1)
    const postIds = await user.posts().ids()

    assert.equal(postsQuery.sql, helpers.formatQuery('select "posts"."id" from "posts" inner join "post_user" on "posts"."id" = "post_user"."post_id" where "post_user"."user_id" = ?'))

    assert.deepEqual(postIds, [1, 2])
  })

  test('apply global scope on pivate model when called withCount', async (assert) => {
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
    PostUser._bootIfNotBooted()
    Post._bootIfNotBooted()

    PostUser.addGlobalScope(function (builder) {
      builder.where(`${builder.$pivotModel.table}.deleted_at`, null)
    })

    let userQuery = null
    User.onQuery((query) => (userQuery = query))
    await User.query().withCount('posts').fetch()

    assert.equal(userQuery.sql, helpers.formatQuery('select *, (select count(*) from "posts" inner join "post_user" on "posts"."id" = "post_user"."post_id" where "users"."id" = "post_user"."user_id" and "post_user"."deleted_at" is null) as "posts_count" from "users"'))
  })

  test('apply global scope on pivot model when called has', async (assert) => {
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

    PostUser.addGlobalScope(function (builder) {
      builder.where(`${builder.$pivotModel.table}.deleted_at`, null)
    })

    let userQuery = null
    User.onQuery((query) => (userQuery = query))

    await User.query().has('posts').fetch()

    assert.equal(userQuery.sql, helpers.formatQuery('select * from "users" where exists (select * from "posts" inner join "post_user" on "posts"."id" = "post_user"."post_id" where "users"."id" = "post_user"."user_id" and "post_user"."deleted_at" is null)'))
  })

  test('hide \'pivot\' attribute when added \'$pivot\' into hidden field list', async (assert) => {
    class Post extends Model {
    }

    class PostUser extends Model {
      static get hidden () {
        return ['$pivot']
      }

      static get table () {
        return 'post_user'
      }
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
          .pivotModel(PostUser)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()
    PostUser._bootIfNotBooted()

    await ioc.use('Database').table('users').insert({ id: 2, username: 'virk' })
    await ioc.use('Database').table('posts').insert([{ title: 'Adonis 101' }, { title: 'Lucid 101' }])
    await ioc.use('Database').table('post_user').insert([
      { post_id: 1, user_id: 2, is_published: true },
      { post_id: 2, user_id: 2 }
    ])

    const user = await User.find(2)
    const userPosts = await user.posts().fetch()

    assert.notProperty(userPosts.toJSON()[0], 'pivot')
    assert.notProperty(userPosts.toJSON()[1], 'pivot')
  })

  test('hide \'pivot\' attribute when passed false to \'pivotAttribute()\' in relationship', async (assert) => {
    class Post extends Model {
    }

    class PostUser extends Model {
      static get table () {
        return 'post_user'
      }
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
          .pivotModel(PostUser)
          .pivotAttribute(false)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()
    PostUser._bootIfNotBooted()

    await ioc.use('Database').table('users').insert({ id: 2, username: 'virk' })
    await ioc.use('Database').table('posts').insert([{ title: 'Adonis 101' }, { title: 'Lucid 101' }])
    await ioc.use('Database').table('post_user').insert([
      { post_id: 1, user_id: 2, is_published: true },
      { post_id: 2, user_id: 2 }
    ])

    const user = await User.find(2)
    const userPosts = await user.posts().fetch()

    assert.notProperty(userPosts.toJSON()[0], 'pivot')
    assert.notProperty(userPosts.toJSON()[1], 'pivot')
  })

  test('hide \'pivot\' attribute when return false on \'pivotAttribute()\' static method in pivot model', async (assert) => {
    class Post extends Model {
    }

    class PostUser extends Model {
      static get table () {
        return 'post_user'
      }

      static get pivotAttribute () {
        return false
      }
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
          .pivotModel(PostUser)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()
    PostUser._bootIfNotBooted()

    await ioc.use('Database').table('users').insert({ id: 2, username: 'virk' })
    await ioc.use('Database').table('posts').insert([{ title: 'Adonis 101' }, { title: 'Lucid 101' }])
    await ioc.use('Database').table('post_user').insert([
      { post_id: 1, user_id: 2, is_published: true },
      { post_id: 2, user_id: 2 }
    ])

    const user = await User.find(2)
    const userPosts = await user.posts().fetch()

    assert.notProperty(userPosts.toJSON()[0], 'pivot')
    assert.notProperty(userPosts.toJSON()[1], 'pivot')
  })

  test('rename \'pivot\' attribute when passed string to \'.pivotAttribute()\' in relationship', async (assert) => {
    class Post extends Model {
    }

    class PostUser extends Model {
      static get table () {
        return 'post_user'
      }
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
          .pivotModel(PostUser)
          .pivotAttribute('renamed_pivot')
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()
    PostUser._bootIfNotBooted()

    await ioc.use('Database').table('users').insert({ id: 2, username: 'virk' })
    await ioc.use('Database').table('posts').insert([{ title: 'Adonis 101' }, { title: 'Lucid 101' }])
    await ioc.use('Database').table('post_user').insert([
      { post_id: 1, user_id: 2, is_published: true },
      { post_id: 2, user_id: 2 }
    ])

    const user = await User.find(2)
    const userPosts = await user.posts().fetch()

    assert.property(userPosts.toJSON()[0], 'renamed_pivot')
    assert.property(userPosts.toJSON()[1], 'renamed_pivot')
  })

  test('rename \'pivot\' attribute when returns string on \'pivotAttribute()\' static method in pivot model', async (assert) => {
    class Post extends Model {
    }

    class PostUser extends Model {
      static get pivotAttribute () {
        return 'renamed_pivot'
      }

      static get table () {
        return 'post_user'
      }
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
          .pivotModel(PostUser)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()
    PostUser._bootIfNotBooted()

    await ioc.use('Database').table('users').insert({ id: 2, username: 'virk' })
    await ioc.use('Database').table('posts').insert([{ title: 'Adonis 101' }, { title: 'Lucid 101' }])
    await ioc.use('Database').table('post_user').insert([
      { post_id: 1, user_id: 2, is_published: true },
      { post_id: 2, user_id: 2 }
    ])

    const user = await User.find(2)
    const userPosts = await user.posts().fetch()

    assert.property(userPosts.toJSON()[0], 'renamed_pivot')
    assert.property(userPosts.toJSON()[1], 'renamed_pivot')
  })

  test('expect pivot attribute name is \'pivot\' when passing true to \'.pivotAttribute()\' in relationship.', (assert) => {
    class Post extends Model {
    }

    class PostUser extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
          .pivotModel(PostUser)
          .pivotAttribute(true)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()
    PostUser._bootIfNotBooted()

    const user = new User()
    const userPosts = user.posts()
    assert.equal(userPosts.$pivotAttribute, 'pivot')
  })

})
