'use strict'

/*
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const test = require('japa')
const fs = require('fs-extra')
const path = require('path')
const { ioc } = require('@adonisjs/fold')
const { Config } = require('@adonisjs/sink')

const helpers = require('./helpers')
const Model = require('../../src/Lucid/Model')
const DatabaseManager = require('../../src/Database/Manager')
const VanillaSerializer = require('../../src/Lucid/Serializers/Vanilla')

test.group('Relations | Has Many Through - Has Many ', (group) => {
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
    await ioc.use('Adonis/Src/Database').table('countries').truncate()
    await ioc.use('Adonis/Src/Database').table('users').truncate()
    await ioc.use('Adonis/Src/Database').table('posts').truncate()
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

  test('create correct query', (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.hasMany(Post)
      }
    }

    class Country extends Model {
      posts () {
        return this.manyThrough(User, 'posts')
      }
    }

    User._bootIfNotBooted()
    Country._bootIfNotBooted()
    Post._bootIfNotBooted()

    const country = new Country()
    country.id = 1
    country.$persisted = true

    const query = country.posts().toSQL()
    assert.equal(query.sql, helpers.formatQuery('select "posts".* from "posts" inner join "users" on "users"."id" = "posts"."user_id" where "users"."country_id" = ?'))
  })

  test('define through fields', (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.hasMany(Post)
      }
    }

    class Country extends Model {
      posts () {
        return this.manyThrough(User, 'posts')
      }
    }

    User._bootIfNotBooted()
    Country._bootIfNotBooted()
    Post._bootIfNotBooted()

    const country = new Country()
    country.id = 1
    country.$persisted = true

    const query = country.posts().selectThrough('username').toSQL()
    assert.equal(query.sql, helpers.formatQuery('select "posts".*, "users"."username" as "through_username" from "posts" inner join "users" on "users"."id" = "posts"."user_id" where "users"."country_id" = ?'))
  })

  test('define related fields', (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.hasMany(Post)
      }
    }

    class Country extends Model {
      posts () {
        return this.manyThrough(User, 'posts')
      }
    }

    User._bootIfNotBooted()
    Country._bootIfNotBooted()
    Post._bootIfNotBooted()

    const country = new Country()
    country.id = 1
    country.$persisted = true

    const query = country.posts().selectRelated('title').select('name').toSQL()
    assert.equal(query.sql, helpers.formatQuery('select "countries"."name", "posts"."title" from "posts" inner join "users" on "users"."id" = "posts"."user_id" where "users"."country_id" = ?'))
  })

  test('fetch related row', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.hasMany(Post)
      }
    }

    class Country extends Model {
      posts () {
        return this.manyThrough(User, 'posts')
      }
    }

    User._bootIfNotBooted()
    Country._bootIfNotBooted()
    Post._bootIfNotBooted()

    await ioc.use('Database').table('countries').insert({ name: 'India', id: 2 })
    await ioc.use('Database').table('users').insert({ country_id: 2, id: 20, username: 'virk' })
    await ioc.use('Database').table('posts').insert({ user_id: 20, title: 'Adonis 101' })

    const country = await Country.find(2)
    const posts = await country.posts().fetch()
    assert.instanceOf(posts, VanillaSerializer)
    assert.equal(posts.size(), 1)
    assert.deepEqual(posts.toJSON(), [
      {
        id: 1,
        user_id: 20,
        title: 'Adonis 101',
        created_at: null,
        updated_at: null,
        deleted_at: null
      }
    ])
  })

  test('eagerload related rows', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.hasMany(Post)
      }
    }

    class Country extends Model {
      posts () {
        return this.manyThrough(User, 'posts')
      }
    }

    User._bootIfNotBooted()
    Country._bootIfNotBooted()
    Post._bootIfNotBooted()

    await ioc.use('Database').table('countries').insert({ name: 'India', id: 2 })
    await ioc.use('Database').table('users').insert({ country_id: 2, id: 20, username: 'virk' })
    await ioc.use('Database').table('posts').insert({ user_id: 20, title: 'Adonis 101' })

    const countries = await Country.query().with('posts', (builder) => {
      builder.selectThrough('id')
    }).fetch()

    assert.equal(countries.size(), 1)
    const country = countries.first()

    assert.instanceOf(country.getRelated('posts'), VanillaSerializer)
    assert.equal(country.getRelated('posts').size(), 1)
    assert.equal(country.getRelated('posts').toJSON()[0].__meta__.through_country_id, country.id)
  })

  test('limit parent rows based upon child rows', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.hasMany(Post)
      }
    }

    class Country extends Model {
      posts () {
        return this.manyThrough(User, 'posts')
      }
    }

    User._bootIfNotBooted()
    Country._bootIfNotBooted()
    Post._bootIfNotBooted()

    let countryQuery = null
    Country.onQuery((query) => (countryQuery = query))

    await ioc.use('Database').table('countries').insert({ name: 'India', id: 2 })

    await Country.query().has('posts').fetch()
    assert.equal(countryQuery.sql, helpers.formatQuery('select * from "countries" where exists (select * from "posts" inner join "users" on "users"."id" = "posts"."user_id" where countries.id = users.country_id)'))
  })

  test('limit parent rows based upon child rows count', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.hasMany(Post)
      }
    }

    class Country extends Model {
      posts () {
        return this.manyThrough(User, 'posts')
      }
    }

    User._bootIfNotBooted()
    Country._bootIfNotBooted()
    Post._bootIfNotBooted()

    let countryQuery = null
    Country.onQuery((query) => (countryQuery = query))

    await ioc.use('Database').table('countries').insert({ name: 'India', id: 2 })

    await Country.query().has('posts', '>', 1).fetch()
    assert.equal(countryQuery.sql, helpers.formatQuery('select * from "countries" where (select count(*) from "posts" inner join "users" on "users"."id" = "posts"."user_id" where countries.id = users.country_id) > ?'))
  })

  test('fetch only filtered parent rows', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.hasMany(Post)
      }
    }

    class Country extends Model {
      posts () {
        return this.manyThrough(User, 'posts')
      }
    }

    User._bootIfNotBooted()
    Country._bootIfNotBooted()
    Post._bootIfNotBooted()

    let countryQuery = null
    Country.onQuery((query) => (countryQuery = query))

    await ioc.use('Database').table('countries').insert([{ name: 'India', id: 2 }, { name: 'UK', id: 3 }])
    await ioc.use('Database').table('users').insert([{ country_id: 2, id: 20, username: 'virk' }, { country_id: 3, username: 'nikk' }])
    await ioc.use('Database').table('posts').insert({ user_id: 20, title: 'Adonis 101' })

    const countries = await Country.query().has('posts').fetch()
    assert.equal(countries.size(), 1)
    assert.equal(countries.first().name, 'India')
    assert.equal(countryQuery.sql, helpers.formatQuery('select * from "countries" where exists (select * from "posts" inner join "users" on "users"."id" = "posts"."user_id" where countries.id = users.country_id)'))
  })

  test('paginate only filtered parent rows', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.hasMany(Post)
      }
    }

    class Country extends Model {
      posts () {
        return this.manyThrough(User, 'posts')
      }
    }

    User._bootIfNotBooted()
    Country._bootIfNotBooted()
    Post._bootIfNotBooted()

    let countryQuery = null
    Country.onQuery((query) => (countryQuery = query))

    await ioc.use('Database').table('countries').insert([{ name: 'India', id: 2 }, { name: 'UK', id: 3 }])
    await ioc.use('Database').table('users').insert([{ country_id: 2, id: 20, username: 'virk' }, { country_id: 3, username: 'nikk' }])
    await ioc.use('Database').table('posts').insert({ user_id: 20, title: 'Adonis 101' })

    const countries = await Country.query().has('posts').paginate()
    assert.equal(countries.size(), 1)
    assert.equal(countries.first().name, 'India')
    assert.equal(countryQuery.sql, helpers.formatQuery('select * from "countries" where exists (select * from "posts" inner join "users" on "users"."id" = "posts"."user_id" where countries.id = users.country_id) limit ?'))
  })
})

test.group('Relations | Has Many Through - Belongs To', (group) => {
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
    await ioc.use('Adonis/Src/Database').table('countries').truncate()
    await ioc.use('Adonis/Src/Database').table('users').truncate()
    await ioc.use('Adonis/Src/Database').table('profiles').truncate()
  })

  group.after(async () => {
    await helpers.dropTables(ioc.use('Adonis/Src/Database'))
    try {
      await fs.remove(path.join(__dirname, './tmp'))
    } catch (error) {
      if (process.platform !== 'win32' || error.code !== 'EBUSY') {
        throw error
      }
    }
  }).timeout(0)

  test('create correct query', (assert) => {
    class User extends Model {
    }

    class Profile extends Model {
      user () {
        return this.belongsTo(User)
      }
    }

    class Country extends Model {
      users () {
        return this.manyThrough(Profile, 'user')
      }
    }

    User._bootIfNotBooted()
    Country._bootIfNotBooted()
    Profile._bootIfNotBooted()

    const country = new Country()
    country.id = 1
    country.$persisted = true

    const query = country.users().toSQL()
    assert.equal(query.sql, helpers.formatQuery('select "users".* from "users" inner join "profiles" on "profiles"."user_id" = "users"."id" where "profiles"."country_id" = ?'))
  })

  test('select related rows', async (assert) => {
    class User extends Model {
    }

    class Profile extends Model {
      user () {
        return this.belongsTo(User)
      }
    }

    class Country extends Model {
      users () {
        return this.manyThrough(Profile, 'user')
      }
    }

    User._bootIfNotBooted()
    Country._bootIfNotBooted()
    Profile._bootIfNotBooted()

    await ioc.use('Database').table('countries').insert([{ name: 'India', id: 2 }, { name: 'Uk', id: 3 }])

    await ioc.use('Database').table('users').insert([
      { username: 'virk' },
      { username: 'nikk' }
    ])

    await ioc.use('Database').table('profiles').insert([
      { user_id: 1, profile_name: 'Virk', country_id: 2 },
      { user_id: 1, profile_name: 'Virk', country_id: 3 },
      { user_id: 2, profile_name: 'Nikk', country_id: 2 }
    ])

    const india = await Country.find(2)
    const indianUsers = await india.users().fetch()
    assert.equal(indianUsers.size(), 2)
    assert.deepEqual(indianUsers.rows.map((user) => user.username), ['virk', 'nikk'])

    const uk = await Country.find(3)
    const ukUsers = await uk.users().fetch()
    assert.equal(ukUsers.size(), 1)
    assert.deepEqual(ukUsers.rows.map((user) => user.username), ['virk'])
  })

  test('eagerload related rows', async (assert) => {
    class User extends Model {
    }

    class Profile extends Model {
      user () {
        return this.belongsTo(User)
      }
    }

    class Country extends Model {
      users () {
        return this.manyThrough(Profile, 'user')
      }
    }

    User._bootIfNotBooted()
    Country._bootIfNotBooted()
    Profile._bootIfNotBooted()

    await ioc.use('Database').table('countries').insert([{ name: 'India', id: 2 }, { name: 'Uk', id: 3 }])

    await ioc.use('Database').table('users').insert([
      { username: 'virk' },
      { username: 'nikk' }
    ])

    await ioc.use('Database').table('profiles').insert([
      { user_id: 1, profile_name: 'Virk', country_id: 2 },
      { user_id: 1, profile_name: 'Virk', country_id: 3 },
      { user_id: 2, profile_name: 'Nikk', country_id: 2 }
    ])

    const countries = await Country.query().with('users').orderBy('id', 'asc').fetch()
    assert.equal(countries.size(), 2)
    assert.equal(countries.first().getRelated('users').size(), 2)
    assert.equal(countries.last().getRelated('users').size(), 1)
  })
})

test.group('Relations | Has Many Through - Belongs To Many', (group) => {
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
    await ioc.use('Adonis/Src/Database').table('categories').truncate()
    await ioc.use('Adonis/Src/Database').table('sections').truncate()
    await ioc.use('Adonis/Src/Database').table('posts').truncate()
    await ioc.use('Adonis/Src/Database').table('post_section').truncate()
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

  test('create correct query', (assert) => {
    class Post extends Model {
    }

    class Section extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    class Category extends Model {
      posts () {
        return this.manyThrough(Section, 'posts')
      }
    }

    Category._bootIfNotBooted()
    Section._bootIfNotBooted()
    Post._bootIfNotBooted()

    const category = new Category()
    category.id = 1
    category.$persisted = true

    const query = category.posts().toSQL()
    assert.equal(query.sql, helpers.formatQuery('select "posts".* from "posts" inner join "post_section" on "posts"."id" = "post_section"."post_id" inner join "sections" on "sections"."id" = "post_section"."section_id" where "sections"."category_id" = ?'))
  })

  test('selected related rows', async (assert) => {
    class Post extends Model {
    }

    class Section extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    class Category extends Model {
      posts () {
        return this.manyThrough(Section, 'posts')
      }
    }

    Category._bootIfNotBooted()
    Section._bootIfNotBooted()
    Post._bootIfNotBooted()

    await ioc.use('Database').table('categories').insert([{ name: 'Sql' }, { name: 'Javascript' }])
    await ioc.use('Database').table('sections').insert([
      { name: 'Loops', category_id: 2 },
      { name: 'Conditionals', category_id: 2 }
    ])
    await ioc.use('Database').table('posts').insert({ title: 'For each loop' })
    await ioc.use('Database').table('post_section').insert({ post_id: 1, section_id: 1 })

    const js = await Category.find(2)
    const posts = await js.posts().fetch()
    assert.equal(posts.size(), 1)
    assert.equal(posts.rows[0].title, 'For each loop')
  })

  test('eagerload related rows', async (assert) => {
    class Post extends Model {
    }

    class Section extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    class Category extends Model {
      posts () {
        return this.manyThrough(Section, 'posts')
      }
    }

    Category._bootIfNotBooted()
    Section._bootIfNotBooted()
    Post._bootIfNotBooted()

    await ioc.use('Database').table('categories').insert([{ name: 'Sql' }, { name: 'Javascript' }])

    await ioc.use('Database').table('sections').insert([
      { name: 'Loops', category_id: 2 },
      { name: 'Conditionals', category_id: 2 },
      { name: 'Transactions', category_id: 1 }
    ])

    await ioc.use('Database').table('posts').insert([{ title: 'For each loop' }, { title: 'Transactions 101' }])

    await ioc.use('Database').table('post_section').insert([
      { post_id: 1, section_id: 1 },
      { post_id: 2, section_id: 3 }
    ])

    const categories = await Category.query().with('posts').orderBy('id', 'asc').fetch()
    assert.instanceOf(categories, VanillaSerializer)
    assert.equal(categories.size(), 2)
    assert.equal(categories.last().getRelated('posts').size(), 1)
    assert.equal(categories.last().getRelated('posts').toJSON()[0].title, 'For each loop')
    assert.equal(categories.first().getRelated('posts').size(), 1)
    assert.equal(categories.first().getRelated('posts').toJSON()[0].title, 'Transactions 101')
  })

  test('add constraints when eager loading', async (assert) => {
    class Post extends Model {
    }

    class Section extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    class Category extends Model {
      posts () {
        return this.manyThrough(Section, 'posts')
      }
    }

    Category._bootIfNotBooted()
    Section._bootIfNotBooted()
    Post._bootIfNotBooted()

    let postsQuery = null
    Post.onQuery((query) => (postsQuery = query))

    await ioc.use('Database').table('categories').insert([{ name: 'Sql' }, { name: 'Javascript' }])

    await ioc.use('Database').table('sections').insert([
      { name: 'Loops', category_id: 2, is_active: true },
      { name: 'Conditionals', category_id: 2, is_active: true },
      { name: 'Transactions', category_id: 1 }
    ])

    await ioc.use('Database').table('posts').insert([{ title: 'For each loop' }, { title: 'Transactions 101' }])

    await ioc.use('Database').table('post_section').insert([
      { post_id: 1, section_id: 1 },
      { post_id: 2, section_id: 3 }
    ])

    const categories = await Category.query().with('posts', (builder) => {
      builder.where('sections.is_active', true)
    }).orderBy('id', 'asc').fetch()

    assert.equal(postsQuery.sql, helpers.formatQuery('select "posts".*, "sections"."category_id" as "through_category_id" from "posts" inner join "post_section" on "posts"."id" = "post_section"."post_id" inner join "sections" on "sections"."id" = "post_section"."section_id" where "sections"."is_active" = ? and "sections"."category_id" in (?, ?)'))
    assert.instanceOf(categories, VanillaSerializer)
    assert.equal(categories.size(), 2)
    assert.equal(categories.last().getRelated('posts').size(), 1)
    assert.equal(categories.last().getRelated('posts').toJSON()[0].title, 'For each loop')
    assert.equal(categories.first().getRelated('posts').size(), 0)
  })

  test('fetch related row via IoC container binding', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.hasMany('App/Models/Post')
      }
    }

    ioc.fake('App/Models/Post', () => Post)
    ioc.fake('App/Models/User', () => User)

    class Country extends Model {
      posts () {
        return this.manyThrough('App/Models/User', 'posts')
      }
    }

    User._bootIfNotBooted()
    Country._bootIfNotBooted()
    Post._bootIfNotBooted()

    await ioc.use('Database').table('countries').insert({ name: 'India', id: 2 })
    await ioc.use('Database').table('users').insert({ country_id: 2, id: 20, username: 'virk' })
    await ioc.use('Database').table('posts').insert({ user_id: 20, title: 'Adonis 101' })

    const country = await Country.find(2)
    const posts = await country.posts().fetch()
    assert.instanceOf(posts, VanillaSerializer)
    assert.equal(posts.size(), 1)
    assert.deepEqual(posts.toJSON(), [
      {
        id: 1,
        user_id: 20,
        title: 'Adonis 101',
        created_at: null,
        updated_at: null,
        deleted_at: null
      }
    ])
  })
})
