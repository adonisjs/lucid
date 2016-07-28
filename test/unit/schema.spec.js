'use strict'

/**
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/* global describe, it */
const Schema = require('../../src/Schema')
const chai = require('chai')
const expect = chai.expect

describe('Schema', function () {
  it('should be able to use method create to define schema', function () {
    class User extends Schema {
      up () {
        this.create('users', function (table) {})
      }
    }

    const user = new User()
    user.up()
    expect(user.actions).to.be.an('array')
    expect(user.actions[0].key).to.equal('users')
    expect(user.actions[0].callback).to.be.a('function')
    expect(user.actions[0].action).to.equal('createTable')
  })

  it('should be able to define multiple actions inside up method', function () {
    class User extends Schema {
      up () {
        this.create('users', function (table) {})
        this.table('users', function (table) {})
      }
    }

    const user = new User()
    user.up()
    expect(user.actions).to.be.an('array')
    expect(user.actions).to.have.length(2)
    expect(user.actions[0].action).to.equal('createTable')
    expect(user.actions[1].action).to.equal('table')
  })

  it('should be able to define actions inside down method', function () {
    class User extends Schema {
      down () {
        this.drop('users', function (table) {})
      }
    }

    const user = new User()
    user.down()
    expect(user.actions).to.be.an('array')
    expect(user.actions[0].key).to.equal('users')
    expect(user.actions[0].callback).to.be.a('function')
    expect(user.actions[0].action).to.equal('dropTable')
  })

  it('should be able to define multiple actions inside down method', function () {
    class User extends Schema {
      down () {
        this.drop('users', function () {})
        this.table('accounts', function () {})
      }
    }
    const user = new User()
    user.down()
    expect(user.actions).to.be.an('array')
    expect(user.actions[0].key).to.equal('users')
    expect(user.actions[1].key).to.equal('accounts')
    expect(user.actions[0].action).to.equal('dropTable')
    expect(user.actions[1].action).to.equal('table')
  })
})
