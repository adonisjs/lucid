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

Posts.database = db
Posts = Posts.extend()

let user_id = null
let instanceUserId = null
let postId = null

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
          expect(user.id).not.to.equal(undefined)
        }).value()
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

  context('User Posts', function () {

    let userid = null

    it('should be able to save a new post', function (done) {

      User
      .create({username:'postuser'})
      .then (function (user) {
        userid = user[0]
        return Posts.create({user_id:userid,post_title:'foo',post_body:'bar'})
      })
      .then(function (post) {
        postId = post[0]
        return Posts.where('id',postId).fetch()
      })
      .then(function (post) {
        expect(post.first().user_id).to.equal(userid)
        done()
      }).catch(done)
    })

    it('should be able to fetch all posts', function (done) {

      Posts
      .all()
      .then (function (posts) {
        posts.each(function (post) {
          expect(post.id).not.to.equal(undefined)
        }).value()
        done()
      }).catch(done)

    })

    it('should be able update a given post', function (done) {

      Posts
      .where('id',postId)
      .update({post_title:'baz'})
      .then (function () {
        return Posts.where('id',postId).fetch()
      })
      .then (function (post) {
        expect(post.first().post_title).to.equal('baz')
        done()
      }).catch(done)

    })

    it('should be able to soft delete posts using user id', function (done) {

      Posts
      .where('user_id',userid)
      .delete()
      .then (function () {
        return Posts.where('user_id',userid).fetch()
      })
      .then(function (post) {
        expect(post.size()).to.equal(0)
        done()
      }).catch(done)

    })

  })

})
