'use strict'

const path = require('path')
const chai = require('chai')
const expect = chai.expect
const co = require('co')
const Database = require('../../src/Database')
const manageDb = require('../unit/blueprints/manage')
const blueprint = require('./blueprints/model-blueprint')
const Model = require('../../src/Orm/Proxy/Model')
const Ioc = require('adonis-fold').Ioc

let Config = {
  get: function(name){
    if(name === 'database.connection') {
      return 'sqlite'
    }
    return {
      client: 'sqlite3',
      connection: {
        filename: path.join(__dirname,'./storage/blog.sqlite3')
      },
      debug: false
    }
  }
}

const db = new Database(Config)

class User extends Model{
  posts(){
    return this.hasMany('App/Model/Post')
  }
}

User.database = db
User = User.extend()

class Post extends Model{
  user(){
    return this.belongsTo('App/Model/User')
  }
}

Post.database = db
Post = Post.extend()

Ioc.bind('App/Model/Post', function () {
  return Post
})

Ioc.bind('App/Model/User', function () {
  return User
})

describe('Database Implementation', function () {

  before(function (done) {
    manageDb
      .make(path.join(__dirname, './storage/blog.sqlite3'))
      .then(function () {
        return blueprint.setup(db)
      })
      .then (function () {
        done()
      })
      .catch(done)
  })

  after(function (done) {
    blueprint
    .tearDown(db)
    .then(function () {
      return manageDb.remove(path.join(__dirname, './storage/blog.sqlite3'))
    })
    .then (function () {
      done()
    }).catch(done)
  })

  it('should create a new user and attach a new post to given user', function (done) {

    const user = new User()
    user.username = 'virk'
    user.email = 'foo@bar.com'
    user.password = 'foobar'

    co(function * () {
      yield user.create()

      yield user.posts().create({post_title:'Hello world',post_body:'Hello world as body',post_status:'draft'})
      const userPosts = yield user.posts().fetch()
      expect(userPosts.size()).to.equal(1)
      expect(userPosts.first().post_title).to.equal('Hello world')
      expect(userPosts.first().user_id).to.equal(user.attributes.id)

    }).then(function () {
      done()
    }).catch(done)

  })


  it('should create a new post and assign it to existing user', function (done) {

    co(function * () {
      const user = yield User.find(1)

      const post = new Post({post_title:'Hi world',post_body:'Hello world as body',post_status:'draft'})
      post.user().associate(user)

      yield post.create()
      const postUser = yield post.user().fetch()
      expect(postUser.toJSON()).to.be.an('object')
      expect(postUser.get('id')).to.equal(user.attributes.id)

    }).then(function () {
      done()
    }).catch(done)

  })

  it('should disassociate existing post from a user', function (done) {

    co(function * () {
      const user = yield User.find(1)
      const post = yield Post.find(2)
      post.user().dissociate()

      yield post.update()
      const postUser = yield post.user().fetch()
      expect(postUser.toJSON()).to.be.an('object')
      expect(Object.keys(postUser.toJSON())).to.have.length(0)

    }).then(function () {
      done()
    }).catch(done)

  })

})
