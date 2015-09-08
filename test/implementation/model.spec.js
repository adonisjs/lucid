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

let user_id = null
let instanceUserId = null

describe('Database Implementation', function () {

  context('Users', function () {

    it('should be able to create a new user using static create method', function (done) {

      const userData = {
        username: 'virk',
        email: 'virk@adonisjs.com',
        password: 'foobar'
      }

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

    it('should be able to fetch all users', function (done) {

      User
      .select('*')
      .fetch()
      .then (function (users) {
        users.each(function (user){
          expect(user.id).not.to.be('undefined')
        })
        done()
      })
      .catch(done)

    })

    it('should be able to update selected user', function (done) {

      User
      .where('id',user_id)
      .update({username:'foo'})
      .then (function () {
        return User.where('id',user_id).fetch()
      })
      .then (function (user) {
        expect(user.first().username).to.equal('FOO')
        done()
      }).catch(done)

    })

    it('should be able to soft delete a given user', function (done) {

      User
      .where('id',user_id)
      .delete()
      .then (function () {
        return User.where('id',user_id).fetch()
      })
      .then (function (user){
        expect(user.size()).to.equal(0)
        done()
      }).catch(done)

    })

    it('should be able to fetch soft deleted entries', function (done) {

      User
      .where('id',user_id)
      .delete()
      .then (function () {
        return User.withTrashed().where('id',user_id).fetch()
      })
      .then (function (user){
        expect(user.first().username).to.equal('FOO')
        done()
      }).catch(done)

    })

    it('should be able to forceDelete entires', function (done) {

      User
      .where('id',user_id)
      .forceDelete()
      .then (function () {
        return User.withTrashed().where('id',user_id).fetch()
      })
      .then (function (user){
        expect(user.size()).to.equal(0)
        done()
      }).catch(done)

    })

  })

  context('Database instance', function () {

    it('should be able to insert values using model instance', function (done){

      const user = new User({username:'virk'})

      user
      .create()
      .then (function (user) {
        instanceUserId = user[0]
        return User.where('id',instanceUserId).fetch()
      }).then(function (user) {
        expect(user.first().username).to.equal('VIRK')
        done()
      }).catch(done)

    })

    it('should be able to update values using model instance', function (done){

      User
      .find(instanceUserId)
      .then (function (user) {
        user.username = 'bar'
        return user.update()
      })
      .then (function () {
        return User.where('id',instanceUserId).fetch()
      }).then(function (user) {
        expect(user.first().username).to.equal('BAR')
        done()
      }).catch(done)

    })


    it('should be able to soft delete row using model instance', function (done){

      User
      .find(instanceUserId)
      .then (function (user) {
        return user.delete()
      })
      .then (function () {
        return User.where('id',instanceUserId).fetch()
      }).then(function (user) {
        expect(user.size()).to.equal(0)
        done()
      }).catch(done)

    })

    it('should be able to find soft deleted values and return true while checking is softDeleted', function (done) {

      User
      .find(instanceUserId)
      .then (function (user) {
        expect(user.isTrashed()).to.equal(true)
        done()
      }).catch(done)

    })

    it('should be able to forceDelete model instance', function (done) {

      User
      .find(instanceUserId)
      .then (function (user){
        return user.forceDelete()
      }).then (function () {
        return User.where('id',instanceUserId).fetch()
      }).then (function (user) {
        expect(user.size()).to.equal(0)
        done()
      }).catch(done)

    })

  })

})
