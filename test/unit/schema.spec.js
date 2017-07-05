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
const path = require('path')
const fs = require('fs-extra')
const { ioc } = require('@adonisjs/fold')
const { Config, setupResolver } = require('@adonisjs/sink')
const Schema = require('../../src/Schema')
const helpers = require('./helpers')
const DatabaseManager = require('../../src/Database/Manager')

test.group('Schema', (group) => {
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

  group.after(async () => {
    await helpers.dropTables(ioc.use('Database'))
    try {
      await fs.remove(path.join(__dirname, './tmp'))
    } catch (error) {
      if (process.platform !== 'win32' || error.code !== 'EBUSY') {
        throw error
      }
    }
  }).timeout(0)

  test('run schema methods using schema instance', (assert) => {
    class UserSchema extends Schema {
    }
    const userSchema = new UserSchema()
    assert.doesNotThrow(userSchema.createTable)
  })

  test('create table', async (assert) => {
    class UserSchema extends Schema {
    }
    const userSchema = new UserSchema()
    await userSchema.create('schema_users', (table) => {
      table.increments()
    })
    const hasTable = await userSchema.hasTable('schema_users')
    assert.isTrue(hasTable)
    await userSchema.drop('schema_users')
  })

  test('should have access to knex fn', async (assert) => {
    class UserSchema extends Schema {
    }
    const userSchema = new UserSchema()
    assert.isDefined(userSchema.fn.now)
  })
})
