'use strict'

const Database = require('../../src/Database')
const path = require('path')
const chai = require('chai')
const expect = chai.expect

let Env = {
  get: function(){
    return 'sqlite'
  }
}

let Config = {
  get: function(){
    return {
      client: 'sqlite3',
      connection: {
        filename: path.join(__dirname,'./storage/test.sqlite3')
      }
    }
  }
}

describe('Database', function () {

  it('should make connection with sqlite database', function () {

    const db = new Database(Env,Config)
    expect(db.client.config.client).to.equal('sqlite3')

  })

})
