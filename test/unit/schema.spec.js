'use strict'

/**
 * adonis-lucid
 * Copyright(c) 2014-2015 Harminder Virk
 * MIT Licensed
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
    expect(user.store).to.be.an('object')
    expect(user.store.createTable).to.be.an('object')
    expect(user.store.createTable.key).to.equal('users')
    expect(user.store.createTable.callback).to.be.a('function')
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
    expect(user.store).to.be.an('object')
    expect(user.store.createTable).to.be.an('object')
    expect(user.store.table).to.be.an('object')
  })

  it('should be able to define actions inside down method', function () {
    class User extends Schema {
      down () {
        this.drop('users', function (table) {})
      }
    }

    const user = new User()
    user.down()
    expect(user.store).to.be.an('object')
    expect(user.store.dropTable).to.be.an('object')
    expect(user.store.dropTable.key).to.equal('users')
    expect(user.store.dropTable.callback).to.be.a('function')
  })
})
