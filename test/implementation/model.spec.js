'use strict'

const path = require('path')
const chai = require('chai')
const expect = chai.expect
const Database = require('../../src/Database')
const Model = require('../../src/Orm/Proxy/Model')

let Env = {
  get: function(){
    return 'sqlite'
  }
}

let Config = {
  get: function(name){
    return {
      client: 'sqlite3',
      connection: {
        filename: path.join(__dirname,'./storage/blog.sqlite3')
      },
      debug: false
    }
  }
}

const db = new Database(Env,Config)

class User extends Model{

  getUsername(value){
    return value.toUpperCase()
  }

}

User.database = db
User = User.extend()


class Posts extends Model{
}

describe('Database Implementation', function () {

  context('Users', function () {

    it('should be able to create a new user using static create method', function (done) {

      const userData = {
        username: 'virk',
        email: 'virk@adonisjs.com',
        password: 'foobar'
      }

      let user_id = null

      User
      .create(userData)
      .then (function (user) {
        user_id = user[0]
        return User.where('id',user_id).fetch()
      })
      .then (function (user){
        expect(user.first().username).to.equal('VIRK')
        done()
      })
      .catch(done)

    })

  })

})
