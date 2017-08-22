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
const _ = require('lodash')
const path = require('path')
const Database = require('../../src/Database')
const Validator = require('../../src/Validator')
const helpers = require('./helpers')
const message = 'unique validation failed'

test.group('Validator | Unique', (group) => {
  group.before(async () => {
    await fs.ensureDir(path.join(__dirname, './tmp'))
    this.database = new Database(helpers.getConfig())
    await helpers.createTables(this.database)
  })

  group.beforeEach(async () => {
    await this.database.truncate('users')
  })

  group.after(async () => {
    await helpers.dropTables(this.database)
    this.database.close()
    try {
      await fs.remove(path.join(__dirname, './tmp'))
    } catch (error) {
      if (process.platform !== 'win32' || error.code !== 'EBUSY') {
        throw error
      }
    }
  }).timeout(0)

  test('pass validation when row is found', async (assert) => {
    const validator = new Validator(this.database)
    const result = await validator.unique({ email: 'foo@bar.com' }, 'email', message, ['users'], _.get)
    assert.equal(result, 'validation passed')
  })

  test('skip validation when data does not have field', async (assert) => {
    const validator = new Validator(this.database)
    const result = await validator.unique({}, 'email', message, ['users'], _.get)
    assert.equal(result, 'validation skipped')
  })

  test('throw exception when there is a row', async (assert) => {
    assert.plan(1)
    const validator = new Validator(this.database)
    await this.database.table('users').insert({ username: 'foo' })
    try {
      await validator.unique({ username: 'foo' }, 'username', message, ['users'], _.get)
    } catch (error) {
      assert.equal(error, 'unique validation failed')
    }
  })

  test('pass when whereNot key/value pairs are passed', async (assert) => {
    const validator = new Validator(this.database)
    await this.database.table('users').insert({ username: 'foo' })
    const args = ['users', 'username', 'id', 1]
    const result = await validator.unique({ username: 'foo' }, 'username', message, args, _.get)
    assert.equal(result, 'validation passed')
  })
})
