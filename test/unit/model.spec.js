'use strict'

const path = require('path')
const chai = require('chai')
const expect = chai.expect
const co = require('co')
const Database = require('../../src/Database')
const Model = require('../../src/Orm/Proxy/Model')
const StaticProxy = require('../../src/Orm/Proxy/Static')

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
        filename: path.join(__dirname,'./storage/test.sqlite3')
      },
      debug: false
    }
  }
}

const db = new Database(Env,Config)

describe('Model', function () {

  it('should be an instance of Model', function () {

    class User extends Model{

      static get table(){
        return 'users'
      }
    }

    User.database = db; User = User.extend()
    const user = new User()
    expect(user instanceof Model).to.equal(true)

  })

  it('should be able to define properties as model attributes', function () {

    class User extends Model{

      static get table(){
        return 'users'
      }
    }

    User.database = db; User = User.extend()
    const user = new User()
    user.username = 'anku'
    expect(user.attributes.username).to.equal('anku')

  })

  it('should be able to write custom method using query chain' , function () {

    class User extends Model{

      active(){
        return this.where('status','active')
      }

    }
    User.database = db; User = User.extend()
    expect(User.active().toSQL().sql).to.equal('select * from "users" where "status" = ?')

  })

  it('should be able to write scopedMethods and user defined query chain', function () {

    class User extends Model{

      scopeActive(query){
        query.where('status','active')
      }

      scopeIsAdult(query){
        query.where('age','>',22)
      }

    }

    User.database = db; User = User.extend()
    expect(User.active().is_adult().toSQL().sql).to.equal('select * from "users" where "status" = ? and "age" > ?')

  })


  it('should be able to fetch model attributes', function () {

    class User extends Model{

      static get table(){
        return 'users'
      }

    }

    User.database = db; User = User.extend()
    const user = new User()
    user.username = 'anku'
    expect(user.attributes.username).to.equal(user.username)

  })


  it('should create row inside database using model attributes with create command', function () {

    class User extends Model{

      static get table(){
        return 'users'
      }

      static get timestamps(){
        return false;
      }

    }

    User.database = db; User = User.extend()
    const user = new User()
    user.username = 'anku'
    expect(user.create().toSQL().sql).to.equal('insert into "users" ("username") values (?)')
    expect(user.create().toSQL().bindings).deep.equal(['anku'])

  })

  it('should be able to define getters while fetching values ', function (done) {

    let username = null

    class User extends Model{

      static get table(){
        return 'users'
      }

      getUsername(value){
        return username = value.toUpperCase()
      }

    }

    User.database = db; User = User.extend()

    User
    .where('id',1)
    .fetch()
    .then (function (values){
      expect(values.first().username).to.equal(username)
      done()
    }).catch(done)

  })

  it('should be able to use getters when single row is returned from database', function (done) {

    let username = null

    class User extends Model{

      static get table(){
        return 'users'
      }

      getUsername(value){
        return username = value.toUpperCase()
      }

    }

    User.database = db; User = User.extend()

    User
    .where('id',1)
    .fetch()
    .then (function (values){
      expect(values.first().username).to.equal(username)
      done()
    }).catch(done)

  })

  it('should be able to define setters while saving values' , function () {

    class User extends Model{

      static get table(){
        return 'users'
      }

      setUsername(value){
        return value.toLowerCase()
      }

    }

    User.database = db; User = User.extend()
    const user = new User()

    user.username = 'AMAN'
    expect(user.username).to.equal('aman')

  })

  it('should be able to use setters when defined attributes inside constructor', function () {

    class User extends Model{

      static get table(){
        return 'users'
      }

      setUsername(value){
        return value.toLowerCase()
      }

    }

    User.database = db; User = User.extend()

    const user = new User({username:'AMAN'})
    expect(user.username).to.equal('aman')

  })

  it('should throw an error when trying to initiate model with bulk values', function () {

    class User extends Model{

      static get table(){
        return 'users'
      }

      setUsername(value){
        return value.toLowerCase()
      }

    }

    User.database = db; User = User.extend()

    const fn = function () {
      return new User([{username:'something'},{username:'someotherthing'}])
    }
    expect(fn).to.throw(/Cannot initiate model/);

  })

  it('should mutate values for those whose getters are defined' , function (done) {

    class User extends Model{

      getUsername(value){
        return value.toUpperCase()
      }

    }

    User.database = db;
    User = User.extend()

    User
    .where('id',1)
    .fetch()
    .then (function (user) {
      expect(user.first().username).to.equal('NIKK')
      done()
    }).catch(done)

  })

  it('should mutate values when initiating model using find method', function (done) {

    class User extends Model{
      getUsername(value){
        return value.toUpperCase()
      }
    }

    User.database = db
    User = User.extend()

    User
    .find(1)
    .then (function (user) {
      expect(user.username).to.equal('NIKK')
      done()
    }).catch(done)

  })

  it('should insert mutated values inside database using create method directly' , function () {

    class User extends Model{

      static get table(){
        return 'users'
      }

      static get timestamps(){
        return false;
      }

      setUsername(value){
        return value.toLowerCase()
      }

    }

    User.database = db; User = User.extend()
    const user = new User()

    let create = user.create([{username:'FOO'},{username:'BAR'}])
    expect(create.toSQL().bindings).deep.equal(['foo','bar'])

  })

  it('should insert mutated values inside database using static create method', function () {

    class User extends Model{

      static get table(){
        return 'users'
      }

      static get timestamps(){
        return false;
      }

      setUsername(value){
        return value.toLowerCase()
      }

    }

    User.database = db; User = User.extend()
    let create = User.create([{username:'FOO'},{username:'BAR'}])
    expect(create.toSQL().bindings).deep.equal(['foo','bar'])

  })

  it('should return instance of model , when using static find method' , function (done) {

    class User extends Model{

      static get table(){
        return 'users'
      }

    }

    User.database = db; User = User.extend()

    User
    .find(1)
    .then(function (user) {
      expect(user instanceof User).to.equal(true)
      done()
    }).catch(done)

  })

  it('should return instance of model using static find method and should be able to update properties using instance', function (done) {

    class User extends Model{

      static get table(){
        return 'users'
      }
    }

    User.database = db; User = User.extend()

    User
    .find(1)
    .then(function (user) {
      user.username = 'amanvirk'
      let bindings = user.update().toSQL().bindings
      let hasMatched = false
      bindings.forEach(function (binding){
        if(binding === 'amanvirk'){
          hasMatched = true
        }
      })
      if(!hasMatched){
        done(new Error('Unable to update name'))
      }else{
        done()
      }
    })
    .catch(done)

  })

  it('should be able to update rows using static update method' , function () {

    class User extends Model{

      static get table(){
        return 'users'
      }

      static get timestamps(){
        return false
      }
    }

    User.database = db; User = User.extend()
    let update = User.update({displayName:'foo'})
    expect(update.toSQL().sql).to.equal('update "users" set "displayName" = ?')
    expect(update.toSQL().bindings).deep.equal(['foo'])

  })

  it('should be able to bulk update rows using static update method and use setter method return value' , function () {

    class User extends Model{

      static get table(){
        return 'users'
      }

      setDisplayName(value){
        return value.toUpperCase()
      }

      static get timestamps(){
        return false
      }

    }

    User.database = db; User = User.extend()
    let update = User.update({displayName:'foo'})
    expect(update.toSQL().sql).to.equal('update "users" set "displayName" = ?')
    expect(update.toSQL().bindings).deep.equal(['FOO'])

  })


  it('should be able to update values when using model instance and should not re mutate values' , function (done) {

    class User extends Model{

      static get table(){
        return 'users'
      }

      setDisplayName(value){
        return 'bar-'+value
      }

    }

    User.database = db; User = User.extend()
    User
    .find(2)
    .then(function (user) {
      user.displayName = 'baz'
      const bindings = user.update().toSQL().bindings
      let hasMatched = false
      bindings.forEach(function (binding) {
        if(binding === 'bar-baz'){
          hasMatched = true
        }
      })
      if(!hasMatched){
        done(new Error('Unable to update value , mutation cycle took place for couple of times'))
      }else{
        done()
      }
    }).catch(done)

  })

  it('should be able to use soft deletes ', function (done) {

    class User extends Model{

      static get table(){
        return 'users'
      }

      static get softDeletes(){
        return 'deleted_at'
      }

    }

    User.database = db; User = User.extend()

    User
    .where('id',10)
    .fetch()
    .then (function (result) {
      expect(result.first().deleted_at).to.equal(null)
      done()
    }).catch(done)

  })

  it('should return empty collection when deleted_at is mentioned', function (done) {

    class User extends Model{

      static get table(){
        return 'users'
      }

      static get softDeletes(){
        return 'deleted_at'
      }

    }

    User.database = db; User = User.extend()

    User
    .where('id',11)
    .fetch()
    .then (function (result) {
      expect(result.size()).to.equal(0)
      done()
    }).catch(done)

  })

  it('should fetch soft deleted values when soft deletes have been disabled', function (done) {

    class User extends Model{

      static get table(){
        return 'users'
      }

      static get softDeletes(){
        return false
      }

    }

    User.database = db; User = User.extend()

    User
    .where('id',11)
    .fetch()
    .then (function (result) {
      expect(result.first().id).to.equal(11)
      done()
    }).catch(done)

  })


  it('should be able to fetch trashed items when using soft deletes', function (done) {

    class User extends Model{

      static get table(){
        return 'users'
      }

      static get softDeletes(){
        return 'deleted_at'
      }

    }

    User.database = db; User = User.extend()

    User
    .withTrashed()
    .where('id',11)
    .fetch()
    .then (function (result) {
      expect(result.first().id).to.equal(11)
      done()
    }).catch(done)

  })

  it('should be able to find value using primary key even when soft deletes are on', function (done) {

    class User extends Model{

      static get table(){
        return 'users'
      }

      static get softDeletes(){
        return 'deleted_at'
      }

    }

    User.database = db; User = User.extend()

    User
    .find(11)
    .then (function (user) {
      expect(user.deleted_at).not.to.equal(null)
      done()
    })
    .catch(done)

  })


  it('should be able to find where model instance is trashed or not', function (done) {

    class User extends Model{

      static get table(){
        return 'users'
      }

      static get softDeletes(){
        return 'deleted_at'
      }

    }

    User.database = db; User = User.extend()

    User
    .find(11)
    .then (function (user) {
      expect(user.isTrashed()).to.equal(true)
      done()
    })
    .catch(done)
  })

  it('should be soft delete rows when softDeletes is on', function () {

    class User extends Model{

      static get table(){
        return 'users'
      }

    }

    User.database = db; User = User.extend()

    const deleteQuery = User.where('id',2).delete().toSQL()
    expect(deleteQuery.sql).to.equal('update "users" set "deleted_at" = ? where "id" = ?')

  })


  it('should forceDelete rows even if softDeletes is enabled', function () {

    class User extends Model{

      static get table(){
        return 'users'
      }

    }

    User.database = db; User = User.extend()

    const deleteQuery = User.where('id',2).forceDelete().toSQL()
    expect(deleteQuery.sql).to.equal('delete from "users" where "id" = ?')
    expect(deleteQuery.bindings).deep.equal([2])

  })

  it('should be able to soft delete model instance', function (done) {

    class User extends Model{

      static get table(){
        return 'users'
      }
    }

    User.database = db; User = User.extend()

    User
    .find(1)
    .then (function (user) {
      let deleteQuery = user.delete().toSQL().sql
      expect(deleteQuery).to.equal('update "users" set "deleted_at" = ? where "id" = ?')
      done()
    }).catch(done)

  })

  it('should add created_at and updated_at timestamps when timestamps are enabled', function () {

    class User extends Model{

      static get table(){
        return 'users'
      }
    }

    User.database = db; User = User.extend()

    const createQuery = User.create({username:'foo'}).toSQL()
    expect(createQuery.sql).to.equal('insert into "users" ("created_at", "updated_at", "username") values (?, ?, ?)')

  })

  it('should be able to make table name when not mentioned', function () {

    class User extends Model{

    }

    User.database = db; User = User.extend()
    expect(User.table).to.equal('users')

  })

  it('should work without defining any attributes on model', function () {


    class User extends Model{

    }

    User.database = db; User = User.extend()
    expect(User.table).to.equal('users')
    expect(User.softDeletes).to.equal('deleted_at')
    expect(User.timestamps).to.equal(true)

  })


  it('should be able to define hidden fields , which will be excluded from results' , function (done) {

    class User extends Model{

      static get hidden(){
        return ['email']
      }

    }

    User.database = db; User = User.extend()

    User
    .where('id',1)
    .fetch()
    .then (function (user){
      expect(user.first().email).to.equal(undefined)
      done()
    }).catch(done)

  })


  it('should be able to define visible fields , which should get preference over hidden fields' , function (done) {

    class User extends Model{

      static get hidden(){
        return ['email']
      }

      static get visible(){
        return ['age']
      }

    }

    User.database = db; User = User.extend()

    User
    .where('id',1)
    .fetch()
    .then (function (user){
      expect(user.first().username).to.equal(undefined)
      expect(user.first().age).to.be.a('number')
      done()
    }).catch(done)

  })

  it('should not be able to update a model if it was not fetched ', function () {

    class User extends Model{
    }

    User.database = db; User = User.extend()
    const user = new User()

    const fn = function () {
      return user.update()
    }

    expect(fn).to.throw(/You cannot update/)

  })

  it('should not be able to delete a model if it was not fetched ', function () {

    class User extends Model{
    }

    User.database = db; User = User.extend()
    const user = new User()

    const fn = function () {
      return user.delete()
    }

    expect(fn).to.throw(/You cannot delete/)

  })


  it('should not be able to forceDelete a model if it was not fetched ', function () {

    class User extends Model{
    }

    User.database = db; User = User.extend()
    const user = new User()

    const fn = function () {
      return user.forceDelete()
    }

    expect(fn).to.throw(/You cannot delete/)

  })

  it('should not use existing query chain , when values for one is fetched', function (done) {

    class User extends Model{
    }

    let user1 = []

    User.database = db; User = User.extend()

    User
    .where('id',1)
    .fetch()
    .then (function (user) {
      user1 = user
      return User.where('id',2).fetch()
    })
    .then (function (user) {
      expect(user1.first().id).to.equal(1)
      expect(user.first().id).to.equal(2)
      done()
    })
    .catch(done)

  })

  it('should not use existing query chain , when new function is used while building another query' , function () {

    class User extends Model{
    }

    User.database = db; User = User.extend()

    let user1 = User.where('id',1)
    let user2 = User.new().where('id',2)

    expect(user1.toSQL().sql).to.equal('select * from "users" where "id" = ?')
    expect(user2.toSQL().sql).to.equal('select * from "users" where "id" = ?')

  })


})
