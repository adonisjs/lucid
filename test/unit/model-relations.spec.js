'use strict'

/*
|--------------------------------------------------------------------------
| EXPECTATIONS
|--------------------------------------------------------------------------
|
| Through these tests we are testing following expectations.
| 
| 1. should be able to use hasOne, belongsTo, hasMany, belongsToMany
|    relationship keywords. 
| 2. should be define query methods while defining relations. These
|    query methods will be ignored by insert/update/delete queries.
| 3. should be able to define pivot columns to be pulled for
|    pivot relations.
| 4. should be able to run query methods while fetching relational
|    models.
| 5. should be able to fetch relations for model instances.
|
|
*/

const path = require('path')
const chai = require('chai')
const expect = chai.expect
const co = require('co')
const Ioc = require('adonis-fold').Ioc
const Database = require('../../src/Database')
const Model = require('../../src/Orm/Proxy/Model')
const StaticProxy = require('../../src/Orm/Proxy/Static')
const _ = require('lodash')

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

describe('Model Relations', function () {

  context('hasOne', function () {
    it('should be able to define one to one relation using hasOne method', function(done) {

      /**
       * declaring phone model by
       * extending base model
       */
      class Phone extends Model{

      }

      /**
       * setting up model database, and 
       * extending its static object
       */
      Phone.database = db; Phone = Phone.extend()

      /**
       * binding model to the ioc container to be used
       * by relationship methods
       */
      Ioc.bind('App/Model/Phone', function() {
      	return Phone
      })

      /**
       * defining User model by extending 
       * based model
       */
      class User extends Model{

        /**
         * defining hasOne relationship on 
         * phoneModel via phone key
         * @method phone
         * @return {Object} 
         */
        phone(){
          return this.hasOne('App/Model/Phone')
        }

      }

      /**
       * setting up model database, and 
       * extending its static object
       */
      User.database = db; User = User.extend()

      co (function *() {

        /**
         * fetching all users and their associated 
         * phones
         */
        const user = yield User.with('phone').fetch()

        /**
         * test expectations
         */
        expect(user.first().phone).to.be.an('object')
        expect(user.first().phone).to.have.property('user_id')

      }).then(function () {
        done()
      }).catch(done)

    })
    
    it('should be able to define query chain while defining relation', function (done) {

      /**
       * declaring phone model by
       * extending base model
       */
      class Phone extends Model{

      }

      /**
       * setting up model database, and 
       * extending its static object
       */
      Phone.database = db; Phone = Phone.extend()

      /**
       * binding model to the ioc container to be used
       * by relationship methods
       */
      Ioc.bind('App/Model/Phone', function() {
        return Phone
      })

      /**
       * defining User model by extending 
       * based model
       */
      class User extends Model{

        /**
         * defining hasOne relationship on 
         * phoneModel via phone key
         * @method phone
         * @return {Object} 
         */
        phone(){
          return this.hasOne('App/Model/Phone').where('is_mobile',0)
        }

      }

      /**
       * setting up model database, and 
       * extending its static object
       */
      User.database = db; User = User.extend()

      co (function *() {

        /**
         * fetching all users and their associated 
         * phones
         */
        const user = yield User.with('phone').fetch()

        /**
         * test expectations
         */
        expect(user.first().phone).to.be.an('object')
        expect(Object.keys(user.first().phone).length).to.equal(0)

      }).then(function () {
        done()
      }).catch(done)      

    })
  
    it('should be able to run queries on relational models', function (done) {

      /**
       * declaring phone model by
       * extending base model
       */
      class Phone extends Model{

      }

      /**
       * setting up model database, and 
       * extending its static object
       */
      Phone.database = db; Phone = Phone.extend()

      /**
       * binding model to the ioc container to be used
       * by relationship methods
       */
      Ioc.bind('App/Model/Phone', function() {
        return Phone
      })

      /**
       * defining User model by extending 
       * based model
       */
      class User extends Model{

        /**
         * defining hasOne relationship on 
         * phoneModel via phone key
         * @method phone
         * @return {Object} 
         */
        phone(){
          return this.hasOne('App/Model/Phone')
        }

      }

      /**
       * setting up model database, and 
       * extending its static object
       */
      User.database = db; User = User.extend()

      co (function *() {

        /**
         * fetching all users and their associated 
         * phones
         */
        const user = yield User.with('phone').scope('phone', function (builder) {
          builder.where('is_mobile',0)
        }).fetch()

        /**
         * test expectations
         */
        expect(user.first().phone).to.be.an('object')
        expect(Object.keys(user.first().phone).length).to.equal(0)

      }).then(function () {
        done()
      }).catch(done)      

    })

    it('should be able to fetch relational model using model instance', function (done) {

      /**
       * declaring phone model by
       * extending base model
       */
      class Phone extends Model{

      }

      /**
       * setting up model database, and 
       * extending its static object
       */
      Phone.database = db; Phone = Phone.extend()

      /**
       * binding model to the ioc container to be used
       * by relationship methods
       */
      Ioc.bind('App/Model/Phone', function() {
        return Phone
      })

      /**
       * defining User model by extending 
       * based model
       */
      class User extends Model{

        /**
         * defining hasOne relationship on 
         * phoneModel via phone key
         * @method phone
         * @return {Object} 
         */
        phone(){
          return this.hasOne('App/Model/Phone')
        }

      }

      /**
       * setting up model database, and 
       * extending its static object
       */
      User.database = db; User = User.extend()

      co (function *() {

        /**
         * fetching all users and their associated 
         * phones
         */
        const user = yield User.find(1)
        const phone = yield user.phone().fetch();

        /**
         * test expectations
         */
        expect(phone.toJSON()).to.be.an('object')
        expect(phone.toJSON()).to.have.property('user_id')
        expect(phone.toJSON().user_id).to.equal(user.id)

      }).then(function () {
        done()
      }).catch(done)      

    })


    it('should be able to run query methods on defined on relation using model instance', function (done) {

      /**
       * declaring phone model by
       * extending base model
       */
      class Phone extends Model{

      }

      /**
       * setting up model database, and 
       * extending its static object
       */
      Phone.database = db; Phone = Phone.extend()

      /**
       * binding model to the ioc container to be used
       * by relationship methods
       */
      Ioc.bind('App/Model/Phone', function() {
        return Phone
      })

      /**
       * defining User model by extending 
       * based model
       */
      class User extends Model{

        /**
         * defining hasOne relationship on 
         * phoneModel via phone key
         * @method phone
         * @return {Object} 
         */
        phone(){
          return this.hasOne('App/Model/Phone').where('is_mobile',0)
        }

      }

      /**
       * setting up model database, and 
       * extending its static object
       */
      User.database = db; User = User.extend()

      co (function *() {

        /**
         * fetching all users and their associated 
         * phones
         */
        const user = yield User.find(1)
        const phone = yield user.phone().fetch();

        /**
         * test expectations
         */
        expect(phone.size()).to.equal(0)

      }).then(function () {
        done()
      }).catch(done)      

    })


    it('should be able to chain query methods on while fetching values for related model', function (done) {

      /**
       * declaring phone model by
       * extending base model
       */
      class Phone extends Model{

      }

      /**
       * setting up model database, and 
       * extending its static object
       */
      Phone.database = db; Phone = Phone.extend()

      /**
       * binding model to the ioc container to be used
       * by relationship methods
       */
      Ioc.bind('App/Model/Phone', function() {
        return Phone
      })

      /**
       * defining User model by extending 
       * based model
       */
      class User extends Model{

        /**
         * defining hasOne relationship on 
         * phoneModel via phone key
         * @method phone
         * @return {Object} 
         */
        phone(){
          return this.hasOne('App/Model/Phone')
        }

      }

      /**
       * setting up model database, and 
       * extending its static object
       */
      User.database = db; User = User.extend()

      co (function *() {

        /**
         * fetching all users and their associated 
         * phones
         */
        const user = yield User.find(1)
        const phone = yield user.phone().where('is_mobile',0).fetch();

        /**
         * test expectations
         */
        expect(phone.size()).to.equal(0)

      }).then(function () {
        done()
      }).catch(done)      

    })
  })

})
