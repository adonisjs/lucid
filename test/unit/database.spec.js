'use strict'

/**
 * adonis-lucid
 * Copyright(c) 2015-2015 Harminder Virk
 * MIT Licensed
*/

/* global describe, it*/
const Database = require('../../src/Database')
const path = require('path')
const chai = require('chai')
const expect = chai.expect

let alternateConnection = {
  client: 'sqlite3',
  connection: {
    filename: path.join(__dirname, './storage/connection.sqlite3')
  }
}

let Config = {
  get: function (name) {
    if (name === 'database.new') {
      return alternateConnection
    } else if(name === 'database.connection') {
      return 'sqlite'
    }
    else {
      return {
        client: 'sqlite3',
        connection: {
          filename: path.join(__dirname, './storage/test.sqlite3')
        }
      }
    }
  }
}

describe('Database', function () {
  it('should make connection with sqlite database', function () {
    const db = new Database(Config)
    expect(db.client.config.client).to.equal('sqlite3')
  })

  it('should be able to switch connections using connection method', function (done) {
    const db = new Database(Config)
    db.connection('new')
      .table('accounts')
      .then(function (accounts) {
        expect(accounts).to.be.an('array')
        done()
      }).catch(done)
  })
})
