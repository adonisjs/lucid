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

const helpers = require('./helpers')
const Model = require('../../src/Lucid/Model')
const DatabaseManager = require('../../src/Database/Manager')

test.group('Aggregates | Count', (group) => {
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
    await helpers.createTables(ioc.use('Database'))
    setupResolver()
  })

  group.afterEach(async () => {
    await ioc.use('Database').table('users').truncate()
    await ioc.use('Database').table('my_users').truncate()
  })

  group.after(async () => {
    await helpers.dropTables(ioc.use('Database'))
    ioc.use('Database').close()
    try {
      await fs.remove(path.join(__dirname, './tmp'))
    } catch (error) {
      if (process.platform !== 'win32' || error.code !== 'EBUSY') {
        throw error
      }
    }
  }).timeout(0)

  test('getCount', async (assert) => {
    class User extends Model { }
    User._bootIfNotBooted()
    await User.create({ username: 'u1' })
    await User.create({ username: 'u2' })
    await User.create({ username: 'u3' })
    const c1 = (await User.query().count('username as total'))[0].total
    const c2 = await User.query().getCount()
    const c3 = await User.getCount()
    assert.isTrue(c1 === c2 && c2 === c3)
  })

  test('getCountDistinct', async (assert) => {
    class User extends Model { }
    User._bootIfNotBooted()
    await User.create({ username: 'u1' })
    await User.create({ username: 'u1' }) // Intentional duplicate
    await User.create({ username: 'u3' })
    const c1 = (await User.query().countDistinct('username as total'))[0].total
    const c2 = await User.query().getCountDistinct('username')
    const c3 = await User.getCountDistinct('username')
    assert.isTrue(c1 === c2 && c2 === c3)
  })

  test('getAvg', async (assert) => {
    class User extends Model { }
    User._bootIfNotBooted()
    await User.create({ username: 'u1' })
    await User.create({ username: 'u2' })
    await User.create({ username: 'u3' })
    const c1 = (await User.query().avg('id as total'))[0].total
    const c2 = await User.query().getAvg('id')
    const c3 = await User.getAvg('id')
    assert.isTrue(c1 === c2 && c2 === c3)
  })

  test('getAvgDistinct', async (assert) => {
    class User extends Model { }
    User._bootIfNotBooted()
    await User.create({ username: 'u1' })
    await User.create({ username: 'u2' })
    await User.create({ username: 'u3' })
    const c1 = (await User.query().avgDistinct('id as total'))[0].total
    const c2 = await User.query().getAvgDistinct('id')
    const c3 = await User.getAvgDistinct('id')
    assert.isTrue(c1 === c2 && c2 === c3)
  })

  test('sum get', async (assert) => {
    class User extends Model { }
    User._bootIfNotBooted()
    await User.create({ username: 'u1' })
    await User.create({ username: 'u2' })
    await User.create({ username: 'u3' })
    const c1 = (await User.query().sum('id as total'))[0].total
    const c2 = await User.query().getSum('id')
    const c3 = await User.getSum('id')
    assert.isTrue(c1 === c2 && c2 === c3)
  })

  test('getSumDistinct', async (assert) => {
    class User extends Model { }
    User._bootIfNotBooted()
    await User.create({ username: 'u1' })
    await User.create({ username: 'u2' })
    await User.create({ username: 'u3' })
    const c1 = (await User.query().sumDistinct('id as total'))[0].total
    const c2 = await User.query().getSumDistinct('id')
    const c3 = await User.getSumDistinct('id')
    assert.isTrue(c1 === c2 && c2 === c3)
  })

  test('min get', async (assert) => {
    class User extends Model { }
    User._bootIfNotBooted()
    await User.create({ username: 'u1' })
    await User.create({ username: 'u2' })
    await User.create({ username: 'u3' })
    const c1 = (await User.query().min('id as total'))[0].total
    const c2 = await User.query().getMin('id')
    const c3 = await User.getMin('id')
    assert.isTrue(c1 === c2 && c2 === c3)
  })

  test('max get', async (assert) => {
    class User extends Model { }
    User._bootIfNotBooted()
    await User.create({ username: 'u1' })
    await User.create({ username: 'u2' })
    await User.create({ username: 'u3' })
    const c1 = (await User.query().max('id as total'))[0].total
    const c2 = await User.query().getMax('id')
    const c3 = await User.getMax('id')
    assert.isTrue(c1 === c2 && c2 === c3)
  })
})
