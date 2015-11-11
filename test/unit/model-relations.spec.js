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
*/

const path = require('path')
const chai = require('chai')
const expect = chai.expect
const blueprint = require('./blueprints/model-relations-blueprint')
const co = require('co')
const Ioc = require('adonis-fold').Ioc
const Database = require('../../src/Database')
const Model = require('../../src/Orm/Proxy/Model')
const StaticProxy = require('../../src/Orm/Proxy/Static')
const _ = require('lodash')

/**
 * mocking Env provider required by Database provider
 * @type {Object}
 */
let Env = {
  get: function(){
    return 'sqlite'
  }
}

/**
 * mocking config provider require by Database provider
 * @type {Object}
 */
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

/**
 * setting up a new instance of Database provider , require by
 * Lucid to make queries.
 * @type {Database}
 */
const db = new Database(Env,Config)

/**
 * Tests begins here
 */
describe('Model Relations', function () {

  before(function (done) {

    blueprint
    .setup(db)
    .then (function () {
      blueprint.seed(db)
    }).then(function () {
      done()
    }).catch(done)

  })

  after(function (done) {
    blueprint
    .tearDown(db)
    .then (function () {
      done()
    }).catch(done)
  })

  context('Fetch', function () {
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
          expect(user.size()).to.equal(2)
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
          const user = yield User.with('phone')
          .scope('phone', function (builder) {
            builder.where('is_mobile',0)
          })
          .fetch()

          /**
           * test expectations
           */
          expect(user.first().phone).to.be.an('object')
          expect(Object.keys(user.first().phone).length).to.equal(0)

        }).then(function () {
          done()
        }).catch(done)

      })

      it('should be able to fetch nested relations', function(done) {

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

        /**
         * binding model to the ioc container to be used
         * by relationship methods
         */
        Ioc.bind('App/Model/User', function() {
          return User
        })

        class Article extends Model{
          author(){
            return this.belongsTo('App/Model/User')
          }
        }

        /**
         * setting up model database, and
         * extending its static object
         */
        Article.database = db; Article = Article.extend()

        co (function *() {

          /**
           * fetching all users and their associated
           * phones
           */
          const articles = yield Article.with('author.phone').fetch()

          /**
           * test expectations
           */
          expect(articles.size()).to.equal(2)
          expect(articles.first().author).to.be.an('object')
          expect(articles.first().author.id).to.equal(articles.first().user_id)
          expect(articles.first().author.id).to.equal(articles.first().author.phone.user_id)
          expect(articles.first().user_id).to.equal(articles.first().author.phone.user_id)

        }).then(function () {
          done()
        }).catch(done)

      })

      it('should be able to fetch deep nested relations', function(done) {

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

        /**
         * binding model to the ioc container to be used
         * by relationship methods
         */
        Ioc.bind('App/Model/User', function() {
          return User
        })

        class Article extends Model{
          author(){
            return this.belongsTo('App/Model/User')
          }
        }

        /**
         * setting up model database, and
         * extending its static object
         */
        Article.database = db; Article = Article.extend()

        /**
         * binding model to the ioc container to be used
         * by relationship methods
         */
        Ioc.bind('App/Model/Article', function() {
          return Article
        })

        class Country extends Model{
          articles(){
            return this.hasMany('App/Model/Article')
          }
        }

        /**
         * setting up model database, and
         * extending its static object
         */
        Country.database = db; Country = Country.extend()


        co (function *() {

          /**
           * fetching all users and their associated
           * phones
           */
          const countries = yield Country.with('articles.author.phone').fetch()

          /**
           * test expectations
           */
          expect(countries.size()).to.equal(1)
          expect(countries.first().articles).to.be.an('array')
          expect(countries.first().articles[0].country_id).to.equal(countries.first().id)

        }).then(function () {
          done()
        }).catch(done)

      })

      it('should be able to define query methods for deep nested relations while defining relations', function(done) {

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
            return this.hasOne('App/Model/Phone').where('is_mobile',1)
          }

        }

        /**
         * setting up model database, and
         * extending its static object
         */
        User.database = db; User = User.extend()

        /**
         * binding model to the ioc container to be used
         * by relationship methods
         */
        Ioc.bind('App/Model/User', function() {
          return User
        })

        class Article extends Model{
          author(){
            return this.belongsTo('App/Model/User')
          }
        }

        /**
         * setting up model database, and
         * extending its static object
         */
        Article.database = db; Article = Article.extend()

        /**
         * binding model to the ioc container to be used
         * by relationship methods
         */
        Ioc.bind('App/Model/Article', function() {
          return Article
        })

        class Country extends Model{
          articles(){
            return this.hasMany('App/Model/Article')
          }
        }

        /**
         * setting up model database, and
         * extending its static object
         */
        Country.database = db; Country = Country.extend()


        co (function *() {

          /**
           * fetching all users and their associated
           * phones
           */
          const countries = yield Country.with('articles.author.phone').fetch()

          /**
           * test expectations
           */
          expect(countries.size()).to.equal(1)
          expect(countries.first().articles).to.be.an('array')
          expect(countries.first().articles[0].author).to.be.an('object')
          expect(countries.first().articles[0].author.phone).to.be.an('object')
          expect(countries.first().articles[0].author.phone.user_id).to.equal(undefined)

        }).then(function () {
          done()
        }).catch(done)

      })

      it('should be able to define query methods for deep nested relations while fetching relations', function(done) {

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

        /**
         * binding model to the ioc container to be used
         * by relationship methods
         */
        Ioc.bind('App/Model/User', function() {
          return User
        })

        class Article extends Model{
          author(){
            return this.belongsTo('App/Model/User')
          }
        }

        /**
         * setting up model database, and
         * extending its static object
         */
        Article.database = db; Article = Article.extend()

        /**
         * binding model to the ioc container to be used
         * by relationship methods
         */
        Ioc.bind('App/Model/Article', function() {
          return Article
        })

        class Country extends Model{
          articles(){
            return this.hasMany('App/Model/Article')
          }
        }

        /**
         * setting up model database, and
         * extending its static object
         */
        Country.database = db; Country = Country.extend()


        co (function *() {

          /**
           * fetching all users and their associated
           * phones
           */
          const countries = yield Country
            .with('articles.author.phone')
            .scope('articles.author.phone', function (builder) {
              builder.where('is_mobile',1)
            })
            .scope('articles', function (builder) {
              builder.where('article_title','Hello World')
            })
            .fetch()

          /**
           * test expectations
           */
          expect(countries.size()).to.equal(1)
          _.each(countries.first().articles, function (article) {
            expect(article.article_title).to.not.equal('Bye World')
          });
          expect(countries.first().articles).to.be.an('array')
          expect(countries.first().articles[0].author).to.be.an('object')
          expect(countries.first().articles[0].author.phone).to.be.an('object')
          expect(countries.first().articles[0].author.phone.user_id).to.equal(undefined)

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


      it('should be able to fetch nested model using model instance', function (done) {

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

        /**
         * binding model to the ioc container to be used
         * by relationship methods
         */
        Ioc.bind('App/Model/User', function() {
          return User
        })

        /**
         * declaring phone model by
         * extending base model
         */
        class Article extends Model{
          author(){
            return this.belongsTo('App/Model/User')
          }
        }

        /**
         * setting up model database, and
         * extending its static object
         */
        Article.database = db; Article = Article.extend()

        co (function *() {

          /**
           * fetching all users and their associated
           * phones
           */
          const article = yield Article.find(1)
          const author = yield article.author().with('phone').fetch();

          /**
           * test expectations
           */
          expect(author.toJSON()).to.be.an('object')
          expect(author.get('phone')).to.be.an('object')
          expect(author.get('phone.user_id')).to.equal(article.attributes.user_id)
          expect(author.get('phone.user_id')).to.equal(author.get('id'))

        }).then(function () {
          done()
        }).catch(done)

      })

    })

    context('belongsTo', function () {

      it('should be able to define one to one relation using belongsTo method', function(done) {

        /**
         * declaring phone model by
         * extending base model
         */
        class Phone extends Model{
          user() {
            return this.belongsTo('App/Model/User')
          }
        }

        /**
         * setting up model database, and
         * extending its static object
         */
        Phone.database = db; Phone = Phone.extend()

        /**
         * defining User model by extending
         * based model
         */
        class User extends Model{
        }

        /**
         * setting up model database, and
         * extending its static object
         */
        User.database = db; User = User.extend()

        /**
         * binding model to the ioc container to be used
         * by relationship methods
         */
        Ioc.bind('App/Model/User', function() {
          return User
        })


        co (function *() {

          /**
           * fetching all users and their associated
           * phones
           */
          const phone = yield Phone.with('user').fetch()

          /**
           * test expectations
           */
          expect(phone.first().user).to.be.an('object')
          expect(phone.first().user).to.have.property('id')
          expect(phone.first().user_id).to.equal(phone.first().user.id)

        }).then(function () {
          done()
        }).catch(done)

      })

      it('should be able to chain query methods when defining relationship', function(done) {

        /**
         * declaring phone model by
         * extending base model
         */
        class Phone extends Model{
          user() {
            return this.belongsTo('App/Model/User').where('status','inactive')
          }
        }

        /**
         * setting up model database, and
         * extending its static object
         */
        Phone.database = db; Phone = Phone.extend()

        /**
         * defining User model by extending
         * based model
         */
        class User extends Model{
        }

        /**
         * setting up model database, and
         * extending its static object
         */
        User.database = db; User = User.extend()

        /**
         * binding model to the ioc container to be used
         * by relationship methods
         */
        Ioc.bind('App/Model/User', function() {
          return User
        })


        co (function *() {

          /**
           * fetching all users and their associated
           * phones
           */
          const phone = yield Phone.with('user').fetch()

          /**
           * test expectations
           */
          expect(phone.first().user).to.be.an('object')
          expect(Object.keys(phone.first().user)).to.have.length(0)

        }).then(function () {
          done()
        }).catch(done)

      })


      it('should be able to define where clause on query builder while fetching relations', function(done) {

        /**
         * declaring phone model by
         * extending base model
         */
        class Phone extends Model{
          user() {
            return this.belongsTo('App/Model/User')
          }
        }

        /**
         * setting up model database, and
         * extending its static object
         */
        Phone.database = db; Phone = Phone.extend()

        /**
         * defining User model by extending
         * based model
         */
        class User extends Model{
        }

        /**
         * setting up model database, and
         * extending its static object
         */
        User.database = db; User = User.extend()

        /**
         * binding model to the ioc container to be used
         * by relationship methods
         */
        Ioc.bind('App/Model/User', function() {
          return User
        })


        co (function *() {

          /**
           * fetching all users and their associated
           * phones
           */
          const phone = yield Phone.with('user').scope('user', function (builder) {
            builder.where('status','inactive')
          }).fetch()

          /**
           * test expectations
           */
          expect(phone.first().user).to.be.an('object')
          expect(Object.keys(phone.first().user)).to.have.length(0)

        }).then(function () {
          done()
        }).catch(done)

      })

      it('should be able to fetch related models using model instance', function(done) {

        /**
         * declaring phone model by
         * extending base model
         */
        class Phone extends Model{
          user() {
            return this.belongsTo('App/Model/User')
          }
        }

        /**
         * setting up model database, and
         * extending its static object
         */
        Phone.database = db; Phone = Phone.extend()

        /**
         * defining User model by extending
         * based model
         */
        class User extends Model{
        }

        /**
         * setting up model database, and
         * extending its static object
         */
        User.database = db; User = User.extend()

        /**
         * binding model to the ioc container to be used
         * by relationship methods
         */
        Ioc.bind('App/Model/User', function() {
          return User
        })


        co (function *() {

          /**
           * fetching all users and their associated
           * phones
           */
          const phone = yield Phone.find(1)
          const user = yield phone.user().fetch();

          /**
           * test expectations
           */
          expect(user.toJSON()).to.be.an('object')
          expect(user.get('id')).to.equal(phone.attributes.id)

        }).then(function () {
          done()
        }).catch(done)

      })


      it('should be able to define query method on relation method when fetching related models using model instance', function(done) {

        /**
         * declaring phone model by
         * extending base model
         */
        class Phone extends Model{
          user() {
            return this.belongsTo('App/Model/User').where('status','inactive')
          }
        }

        /**
         * setting up model database, and
         * extending its static object
         */
        Phone.database = db; Phone = Phone.extend()

        /**
         * defining User model by extending
         * based model
         */
        class User extends Model{
        }

        /**
         * setting up model database, and
         * extending its static object
         */
        User.database = db; User = User.extend()

        /**
         * binding model to the ioc container to be used
         * by relationship methods
         */
        Ioc.bind('App/Model/User', function() {
          return User
        })


        co (function *() {

          /**
           * fetching all users and their associated
           * phones
           */
          const phone = yield Phone.find(1)
          const user = yield phone.user().fetch();

          /**
           * test expectations
           */
          expect(user.toJSON()).to.be.an('object')
          expect(user.size()).to.equal(0)
          expect(user.get('id')).to.equal(undefined)

        }).then(function () {
          done()
        }).catch(done)

      })


      it('should be able to run query method when fetching related models using model instance', function(done) {

        /**
         * declaring phone model by
         * extending base model
         */
        class Phone extends Model{
          user() {
            return this.belongsTo('App/Model/User')
          }
        }

        /**
         * setting up model database, and
         * extending its static object
         */
        Phone.database = db; Phone = Phone.extend()

        /**
         * defining User model by extending
         * based model
         */
        class User extends Model{
        }

        /**
         * setting up model database, and
         * extending its static object
         */
        User.database = db; User = User.extend()

        /**
         * binding model to the ioc container to be used
         * by relationship methods
         */
        Ioc.bind('App/Model/User', function() {
          return User
        })


        co (function *() {

          /**
           * fetching all users and their associated
           * phones
           */
          const phone = yield Phone.find(1)
          const user = yield phone.user().where('status','inactive').fetch();

          /**
           * test expectations
           */
          expect(user.toJSON()).to.be.an('object')
          expect(user.size()).to.equal(0)
          expect(user.get('id')).to.equal(undefined)

        }).then(function () {
          done()
        }).catch(done)

      })

    })

    context('hasMany', function () {

      it('should be able to define one to many relation using hasMany method', function(done) {

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
            return this.hasMany('App/Model/Phone')
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
          expect(user.first().phone).to.be.an('array')
          expect(user.first().phone[0]).to.have.property('user_id')

        }).then(function () {
          done()
        }).catch(done)

      })


      it('should be able to define query methods on relation defination', function(done) {

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
            return this.hasMany('App/Model/Phone').whereNotIn('is_mobile',[0,1])
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
          expect(user.first().phone).to.be.an('array')
          expect(user.first().phone).to.have.length(0)

        }).then(function () {
          done()
        }).catch(done)

      })

      it('should be able to define query methods using scope method while fetching relation', function(done) {

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
            return this.hasMany('App/Model/Phone')
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
            builder.whereNotIn('is_mobile',[0,1])
          }).fetch()

          /**
           * test expectations
           */
          expect(user.first().phone).to.be.an('array')
          expect(user.first().phone).to.have.length(0)

        }).then(function () {
          done()
        }).catch(done)

      })

      it('should be able fetch related models using model instance', function(done) {

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
            return this.hasMany('App/Model/Phone')
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
          const phone = yield user.phone().fetch()

          /**
           * test expectations
           */
          expect(phone.isArray()).to.equal(true)

        }).then(function () {
          done()
        }).catch(done)

      })


      it('should be able define query methods while defining relation and fetch values using model instance', function(done) {

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
            return this.hasMany('App/Model/Phone').whereNotIn('is_mobile',[0,1])
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
          const phone = yield user.phone().fetch()

          /**
           * test expectations
           */
          expect(phone.isArray()).to.equal(true)
          expect(phone.first()).to.equal(undefined)

        }).then(function () {
          done()
        }).catch(done)

      })

      it('should be able define query methods while fetching relation using model instance', function(done) {

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
            return this.hasMany('App/Model/Phone')
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
          const phone = yield user.phone().whereNotIn('is_mobile',[0,1]).fetch()

          /**
           * test expectations
           */
          expect(phone.isArray()).to.equal(true)
          expect(phone.first()).to.equal(undefined)

        }).then(function () {
          done()
        }).catch(done)

      })


      it('should be able define additional constraints as query methods while fetching relation using model instance', function(done) {

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
            return this.hasMany('App/Model/Phone')
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
          const phone = yield user.phone().first().fetch()

          /**
           * test expectations
           */
          expect(phone.toJSON()).to.be.an('object')
          expect(phone.get('user_id')).to.equal(user.id)

        }).then(function () {
          done()
        }).catch(done)

      })

    })

    context('belongsToMany', function () {

      it('should be able to define many to many relations using belongsToMany method', function (done) {

        /**
         * declaring phone model by
         * extending base model
         */
        class Book extends Model{

        }

        /**
         * setting up model database, and
         * extending its static object
         */
        Book.database = db; Book = Book.extend()

        /**
         * binding model to the ioc container to be used
         * by relationship methods
         */
        Ioc.bind('App/Model/Book', function() {
          return Book
        })

        /**
         * declaring phone model by
         * extending base model
         */
        class Author extends Model{

          books() {
            return this.belongsToMany('App/Model/Book')
          }
        }

        /**
         * setting up model database, and
         * extending its static object
         */
        Author.database = db; Author = Author.extend()


        co (function *() {

          /**
           * fetching all users and their associated
           * phones
           */
          const author = yield Author.with('books').fetch()
          /**
           * test expectations
           */
          expect(author.first().books).to.be.an('array')
          expect(author.first().books[0]).to.be.an('object')
          expect(author.first().books[0]._pivot_author_id).to.equal(author.first().id)

        }).then(function () {
          done()
        }).catch(done)

      })

      it('should be able to query methods while defining relationship', function (done) {

        /**
         * declaring phone model by
         * extending base model
         */
        class Book extends Model{

        }

        /**
         * setting up model database, and
         * extending its static object
         */
        Book.database = db; Book = Book.extend()

        /**
         * binding model to the ioc container to be used
         * by relationship methods
         */
        Ioc.bind('App/Model/Book', function() {
          return Book
        })

        /**
         * declaring phone model by
         * extending base model
         */
        class Author extends Model{

          books() {
            return this.belongsToMany('App/Model/Book').whereNot('book_title','Nodejs')
          }
        }

        /**
         * setting up model database, and
         * extending its static object
         */
        Author.database = db; Author = Author.extend()


        co (function *() {

          /**
           * fetching all users and their associated
           * phones
           */
          const author = yield Author.with('books').fetch()
          /**
           * test expectations
           */
          expect(author.first().books).to.be.an('array')
          _.each(author.first().books, function (book) {
            expect(book.book_title).not.to.equal('Nodejs')
          })

        }).then(function () {
          done()
        }).catch(done)

      })

      it('should be able to query methods while fetching relationship', function (done) {

        /**
         * declaring phone model by
         * extending base model
         */
        class Book extends Model{

        }

        /**
         * setting up model database, and
         * extending its static object
         */
        Book.database = db; Book = Book.extend()

        /**
         * binding model to the ioc container to be used
         * by relationship methods
         */
        Ioc.bind('App/Model/Book', function() {
          return Book
        })

        /**
         * declaring phone model by
         * extending base model
         */
        class Author extends Model{

          books() {
            return this.belongsToMany('App/Model/Book')
          }
        }

        /**
         * setting up model database, and
         * extending its static object
         */
        Author.database = db; Author = Author.extend()


        co (function *() {

          /**
           * fetching all users and their associated
           * phones
           */
          const author = yield Author.with('books').scope('books', function (builder) {
            builder.whereNot('book_title','Nodejs')
          }).fetch()
          /**
           * test expectations
           */
          expect(author.first().books).to.be.an('array')
          _.each(author.first().books, function (book) {
            expect(book.book_title).not.to.equal('Nodejs')
          })

        }).then(function () {
          done()
        }).catch(done)

      })


      it('should be able to define pivot table columns to fetch while fetching relationship', function (done) {

        /**
         * declaring phone model by
         * extending base model
         */
        class Book extends Model{

        }

        /**
         * setting up model database, and
         * extending its static object
         */
        Book.database = db; Book = Book.extend()

        /**
         * binding model to the ioc container to be used
         * by relationship methods
         */
        Ioc.bind('App/Model/Book', function() {
          return Book
        })

        /**
         * declaring phone model by
         * extending base model
         */
        class Author extends Model{

          books() {
            return this.belongsToMany('App/Model/Book').withPivot('is_primary')
          }
        }

        /**
         * setting up model database, and
         * extending its static object
         */
        Author.database = db; Author = Author.extend()


        co (function *() {

          /**
           * fetching all users and their associated
           * phones
           */
          const author = yield Author.with('books').fetch()
          /**
           * test expectations
           */
          expect(author.first().books).to.be.an('array')
          expect(author.first().books[0]).to.be.an('object')
          expect(author.first().books[0]._pivot_is_primary).not.to.equal(undefined)

        }).then(function () {
          done()
        }).catch(done)

      })

      it('should be able to fetch relational model values using model instance', function (done) {

        /**
         * declaring phone model by
         * extending base model
         */
        class Book extends Model{

        }

        /**
         * setting up model database, and
         * extending its static object
         */
        Book.database = db; Book = Book.extend()

        /**
         * binding model to the ioc container to be used
         * by relationship methods
         */
        Ioc.bind('App/Model/Book', function() {
          return Book
        })

        /**
         * declaring phone model by
         * extending base model
         */
        class Author extends Model{

          books() {
            return this.belongsToMany('App/Model/Book')
          }
        }

        /**
         * setting up model database, and
         * extending its static object
         */
        Author.database = db; Author = Author.extend()


        co (function *() {

          /**
           * fetching all users and their associated
           * phones
           */
          const author = yield Author.find(1)
          const authorBooks = yield author.books().fetch()
          /**
           * test expectations
           */
          expect(authorBooks.isArray()).to.equal(true)
          expect(authorBooks.first()).to.be.an('object')
          expect(authorBooks.first()._pivot_author_id).to.equal(author.attributes.id)
          expect(authorBooks.first()._pivot_is_primary).to.equal(undefined)

        }).then(function () {
          done()
        }).catch(done)

      })

      it('should be able to use query methods while defining relationship', function (done) {

        /**
         * declaring phone model by
         * extending base model
         */
        class Book extends Model{

        }

        /**
         * setting up model database, and
         * extending its static object
         */
        Book.database = db; Book = Book.extend()

        /**
         * binding model to the ioc container to be used
         * by relationship methods
         */
        Ioc.bind('App/Model/Book', function() {
          return Book
        })

        /**
         * declaring phone model by
         * extending base model
         */
        class Author extends Model{

          books() {
            return this.belongsToMany('App/Model/Book').whereNot('book_title','Nodejs')
          }
        }

        /**
         * setting up model database, and
         * extending its static object
         */
        Author.database = db; Author = Author.extend()


        co (function *() {

          /**
           * fetching all users and their associated
           * phones
           */
          const author = yield Author.find(1)
          const authorBooks = yield author.books().fetch()
          /**
           * test expectations
           */
          expect(authorBooks.isArray()).to.equal(true)
          authorBooks.each(function (book) {
            expect(book.book_title).not.to.equal('Nodejs')
          }).value()

        }).then(function () {
          done()
        }).catch(done)

      })


      it('should be able to use query methods while fetching related model data', function (done) {

        /**
         * declaring phone model by
         * extending base model
         */
        class Book extends Model{

        }

        /**
         * setting up model database, and
         * extending its static object
         */
        Book.database = db; Book = Book.extend()

        /**
         * binding model to the ioc container to be used
         * by relationship methods
         */
        Ioc.bind('App/Model/Book', function() {
          return Book
        })

        /**
         * declaring phone model by
         * extending base model
         */
        class Author extends Model{

          books() {
            return this.belongsToMany('App/Model/Book')
          }
        }

        /**
         * setting up model database, and
         * extending its static object
         */
        Author.database = db; Author = Author.extend()


        co (function *() {

          /**
           * fetching all users and their associated
           * phones
           */
          const author = yield Author.find(1)
          const authorBooks = yield author.books().whereNot('book_title','Nodejs').fetch()
          /**
           * test expectations
           */
          expect(authorBooks.isArray()).to.equal(true)
          authorBooks.each(function (book) {
            expect(book.book_title).not.to.equal('Nodejs')
          }).value()

        }).then(function () {
          done()
        }).catch(done)

      })


      it('should be able to fetch columns from pivot table using withPivot method', function (done) {

        /**
         * declaring phone model by
         * extending base model
         */
        class Book extends Model{

        }

        /**
         * setting up model database, and
         * extending its static object
         */
        Book.database = db; Book = Book.extend()

        /**
         * binding model to the ioc container to be used
         * by relationship methods
         */
        Ioc.bind('App/Model/Book', function() {
          return Book
        })

        /**
         * declaring phone model by
         * extending base model
         */
        class Author extends Model{

          books() {
            return this.belongsToMany('App/Model/Book').withPivot('is_primary')
          }
        }

        /**
         * setting up model database, and
         * extending its static object
         */
        Author.database = db; Author = Author.extend()


        co (function *() {

          /**
           * fetching all users and their associated
           * phones
           */
          const author = yield Author.find(1)
          const authorBooks = yield author.books().fetch()
          /**
           * test expectations
           */
          expect(authorBooks.isArray()).to.equal(true)
          expect(authorBooks.first()._pivot_is_primary).not.to.equal(undefined)

        }).then(function () {
          done()
        }).catch(done)

      })

      it('should be able to fetch columns from pivot table using withPivot method while fetching values', function (done) {

        /**
         * declaring phone model by
         * extending base model
         */
        class Book extends Model{

        }

        /**
         * setting up model database, and
         * extending its static object
         */
        Book.database = db; Book = Book.extend()

        /**
         * binding model to the ioc container to be used
         * by relationship methods
         */
        Ioc.bind('App/Model/Book', function() {
          return Book
        })

        /**
         * declaring phone model by
         * extending base model
         */
        class Author extends Model{

          books() {
            return this.belongsToMany('App/Model/Book')
          }
        }

        /**
         * setting up model database, and
         * extending its static object
         */
        Author.database = db; Author = Author.extend()


        co (function *() {

          /**
           * fetching all users and their associated
           * phones
           */
          const author = yield Author.find(1)
          const authorBooks = yield author.books().withPivot('is_primary').fetch()
          /**
           * test expectations
           */
          expect(authorBooks.isArray()).to.equal(true)
          expect(authorBooks.first()._pivot_is_primary).not.to.equal(undefined)

        }).then(function () {
          done()
        }).catch(done)

      })


      it('should work fine when defining relation on opposite model', function (done) {

        /**
         * declaring phone model by
         * extending base model
         */
        class Book extends Model{

          authors() {
            return this.belongsToMany('App/Model/Author')
          }

        }

        /**
         * setting up model database, and
         * extending its static object
         */
        Book.database = db; Book = Book.extend()

        /**
         * declaring phone model by
         * extending base model
         */
        class Author extends Model{

          books() {
            return this.belongsToMany('App/Model/Book')
          }
        }

        /**
         * setting up model database, and
         * extending its static object
         */
        Author.database = db; Author = Author.extend()

        /**
         * binding model to the ioc container to be used
         * by relationship methods
         */
        Ioc.bind('App/Model/Author', function() {
          return Author
        })

        co (function *() {

          /**
           * fetching all users and their associated
           * phones
           */
          const book = yield Book.find(1)
          const bookAuthors = yield book.authors().withPivot('is_primary').fetch()
          /**
           * test expectations
           */
          expect(bookAuthors.isArray()).to.equal(true)
          expect(bookAuthors.first()._pivot_book_id).to.equal(book.attributes.id)
          expect(bookAuthors.first()._pivot_is_primary).not.to.equal(undefined)

        }).then(function () {
          done()
        }).catch(done)
      })

      it('should be able to fetch related values when primary keys on host model is different than id', function (done){

        class Book extends Model{
          users () {
            return this.belongsToMany('App/Model/Operator', 'relation_table', 'relation_book_id', 'relation_user_id')
          }
          static get primaryKey() {
            return 'book_id'
          }
          static get table () {
            return 'cbooks'
          }
        }
        /**
         * setting up model database, and
         * extending its static object
         */
        Book.database = db; Book = Book.extend()

        class Operator extends Model{

          static get primaryKey () {
            return 'co_id'
          }

          static get table () {
            return 'chat_operators'
          }

        }

        /**
         * setting up model database, and
         * extending its static object
         */
        Operator.database = db; Operator = Operator.extend()
        /**
         * binding model to the ioc container to be used
         * by relationship methods
         */
        Ioc.bind('App/Model/Operator', function() {
          return Operator
        })

        co(function * () {
          const book = yield Book.first().with('users').fetch()
          const bookJson = book.toJSON()
          expect(bookJson.users).to.be.an('array')
          expect(bookJson.users[0]._pivot_relation_book_id).to.equal(bookJson.book_id)
          expect(bookJson.users[0]._pivot_relation_user_id).to.equal('1')
        }).then(function () {
          done()
        }).catch(done)
      })

      it('should be able to fetch related values when primary keys on host model is different than id using model instance', function (done){

        class Book extends Model{
          users () {
            return this.belongsToMany('App/Model/Operator', 'relation_table', 'relation_book_id', 'relation_user_id')
          }
          static get primaryKey() {
            return 'book_id'
          }
          static get table () {
            return 'cbooks'
          }
        }
        /**
         * setting up model database, and
         * extending its static object
         */
        Book.database = db; Book = Book.extend()

        class Operator extends Model{

          static get primaryKey () {
            return 'co_id'
          }

          static get table () {
            return 'chat_operators'
          }

        }

        /**
         * setting up model database, and
         * extending its static object
         */
        Operator.database = db; Operator = Operator.extend()
        /**
         * binding model to the ioc container to be used
         * by relationship methods
         */
        Ioc.bind('App/Model/Operator', function() {
          return Operator
        })

        co(function * () {
          const book = yield Book.find(1)
          const bookUser = yield book.users().fetch()
          const bookJson = bookUser.toJSON()
          expect(bookJson).to.be.an('array')
          expect(bookJson[0]._pivot_relation_book_id).to.equal(book.attributes.book_id)
          expect(bookJson[0]._pivot_relation_user_id).to.equal('1')
        }).then(function () {
          done()
        }).catch(done)
      })


    })

    context('Relational Expectations', function () {

      it('should not return values defined as hidden on relational model',function (done) {

        /**
         * declaring phone model by
         * extending base model
         */
        class Phone extends Model{
          static get hidden () {
            return ['phone_number']
          }
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
          expect(user.first().phone.phone_number).to.equal(undefined)

        }).then(function () {
          done()
        }).catch(done)

      })

      it('should only return values defined as visible on relational model',function (done) {

        /**
         * declaring phone model by
         * extending base model
         */
        class Phone extends Model{
          static get visible () {
            return ['is_mobile']
          }
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
          expect(user.first().phone.phone_number).to.equal(undefined)
          expect(user.first().phone.user_id).to.equal(undefined)

        }).then(function () {
          done()
        }).catch(done)

      })

      it('should transform values when getters are defined on relational model',function (done) {

        /**
         * declaring phone model by
         * extending base model
         */
        class Phone extends Model{

          getPhoneNumber(phone) {
            return phone.toString().replace(/(\d{3})(\d{3})(\d{4})/,'$1-$2-$3')
          }

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
          expect(user.first().phone.phone_number).to.match(/\d{3}-\d{3}-\d{4}/g)

        }).then(function () {
          done()
        }).catch(done)

      })
    })
  })

  context('Inserts', function () {

    context('hasOne', function () {

      it('should be able to insert related model with host model', function (done) {

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

        co(function *() {

          const user = yield User.find(1)
          yield user.phone().create({'phone_number':'1234567899'})

          const phone = yield Phone.where('phone_number','1234567899').first().fetch()
          expect(phone.get('user_id')).to.equal(1)

        }).then(function () {
          done()
        }).catch(done)

      })



      it('should throw an error when trying to associate on hasOne method', function (done) {

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

        co(function *() {

          const user = yield User.find(1)
          const phone = yield Phone.find(1)

          const fn = function () {
            return user.phone().associate(phone)
          }
          expect(fn).to.throw(/unable to call/)

        }).then(function () {
          done()
        }).catch(done)

      })

    })

    context('belongsTo', function () {

      it('should be able to insert related model under belongsTo relation', function (done) {

        /**
         * declaring phone model by
         * extending base model
         */
        class Phone extends Model{

          user () {
            return this.belongsTo('App/Model/User')
          }

        }

        /**
         * setting up model database, and
         * extending its static object
         */
        Phone.database = db; Phone = Phone.extend()

        /**
         * defining User model by extending
         * based model
         */
        class User extends Model{
        }
        /**
         * setting up model database, and
         * extending its static object
         */
        User.database = db; User = User.extend()

        /**
         * binding model to the ioc container to be used
         * by relationship methods
         */
        Ioc.bind('App/Model/User', function() {
          return User
        })


        co(function *() {

          const phone = new Phone({'phone_number': '9012910299'});
          const user = yield User.find(1);
          phone.user().associate(user)

          yield phone.create();

          const savedPhone = yield Phone.where('phone_number','9012910299').first().fetch()
          expect(savedPhone.get('user_id')).to.equal(1)


        }).then(function () {
          done()
        }).catch(done)

      })

      it('should be able to update existing belongsTo relation', function (done) {

        /**
         * declaring phone model by
         * extending base model
         */
        class Phone extends Model{

          user () {
            return this.belongsTo('App/Model/User')
          }

        }

        /**
         * setting up model database, and
         * extending its static object
         */
        Phone.database = db; Phone = Phone.extend()

        /**
         * defining User model by extending
         * based model
         */
        class User extends Model{
        }
        /**
         * setting up model database, and
         * extending its static object
         */
        User.database = db; User = User.extend()

        /**
         * binding model to the ioc container to be used
         * by relationship methods
         */
        Ioc.bind('App/Model/User', function() {
          return User
        })


        co(function *() {

          const phone = yield Phone.find(3)
          const user = yield User.find(2)
          phone.user().associate(user)

          yield phone.update();

          const savedPhone = yield Phone.where('phone_number',phone.attributes.phone_number).first().fetch()
          expect(savedPhone.get('user_id')).to.equal(2)


        }).then(function () {
          done()
        }).catch(done)

      })

      it('should be able to dissociate existing belongsTo relation', function (done) {

        /**
         * declaring phone model by
         * extending base model
         */
        class Phone extends Model{

          user () {
            return this.belongsTo('App/Model/User')
          }

        }

        /**
         * setting up model database, and
         * extending its static object
         */
        Phone.database = db; Phone = Phone.extend()

        /**
         * defining User model by extending
         * based model
         */
        class User extends Model{
        }
        /**
         * setting up model database, and
         * extending its static object
         */
        User.database = db; User = User.extend()

        /**
         * binding model to the ioc container to be used
         * by relationship methods
         */
        Ioc.bind('App/Model/User', function() {
          return User
        })


        co(function *() {

          const phone = yield Phone.find(3)
          const user = yield User.find(2)
          phone.user().dissociate()

          yield phone.update()

          const savedPhone = yield Phone.where('phone_number',phone.attributes.phone_number).first().fetch()
          expect(savedPhone.get('user_id')).to.equal(null)


        }).then(function () {
          done()
        }).catch(done)

      })

      it('should be able to update existing belongsTo relation but ignore additional where clauses', function (done) {

        /**
         * declaring phone model by
         * extending base model
         */
        class Phone extends Model{

          user () {
            return this.belongsTo('App/Model/User').where('username','bar')
          }

        }

        /**
         * setting up model database, and
         * extending its static object
         */
        Phone.database = db; Phone = Phone.extend()

        /**
         * defining User model by extending
         * based model
         */
        class User extends Model{
        }
        /**
         * setting up model database, and
         * extending its static object
         */
        User.database = db; User = User.extend()

        /**
         * binding model to the ioc container to be used
         * by relationship methods
         */
        Ioc.bind('App/Model/User', function() {
          return User
        })


        co(function *() {

          const phone = yield Phone.find(3)
          const user = yield User.find(2)
          phone.user().associate(user)

          yield phone.update();

          const savedPhone = yield Phone.where('phone_number',phone.attributes.phone_number).first().fetch()
          expect(savedPhone.get('user_id')).to.equal(2)


        }).then(function () {
          done()
        }).catch(done)

      })

      it('should be able to insert multiple related model under belongsTo relation', function (done) {

        /**
         * declaring phone model by
         * extending base model
         */
        class Phone extends Model{
          user () {
            return this.belongsTo('App/Model/User')
          }

          agencies () {
            return this.belongsTo('App/Model/Agency')
          }

        }

        /**
         * setting up model database, and
         * extending its static object
         */
        Phone.database = db; Phone = Phone.extend()

        /**
         * defining User model by extending
         * based model
         */
        class User extends Model{
        }
        /**
         * setting up model database, and
         * extending its static object
         */
        User.database = db; User = User.extend()

        class Agency extends Model{
        }

        Agency.database = db; Agency = Agency.extend()

        /**
         * binding model to the ioc container to be used
         * by relationship methods
         */
        Ioc.bind('App/Model/User', function() {
          return User
        })

        Ioc.bind('App/Model/Agency', function() {
          return Agency
        })


        co(function *() {

          const phone = new Phone({'phone_number': '0898889190'})
          const user = yield User.find(1);
          const agency = yield Agency.find(1);
          phone.user().associate(user)
          phone.agencies().associate(agency)

          yield phone.create();

          const savedPhone = yield Phone.where('phone_number','0898889190').first().fetch()
          expect(savedPhone.get('user_id')).to.equal(1)
          expect(savedPhone.get('agency_id')).to.equal(1)

        }).then(function () {
          done()
        }).catch(done)

      })


      it('should be able to call dissociate and associate together under single update', function (done) {

        /**
         * declaring phone model by
         * extending base model
         */
        class Phone extends Model{
          user () {
            return this.belongsTo('App/Model/User')
          }

          agencies () {
            return this.belongsTo('App/Model/Agency')
          }

        }

        /**
         * setting up model database, and
         * extending its static object
         */
        Phone.database = db; Phone = Phone.extend()

        /**
         * defining User model by extending
         * based model
         */
        class User extends Model{
        }
        /**
         * setting up model database, and
         * extending its static object
         */
        User.database = db; User = User.extend()

        class Agency extends Model{
        }

        Agency.database = db; Agency = Agency.extend()

        /**
         * binding model to the ioc container to be used
         * by relationship methods
         */
        Ioc.bind('App/Model/User', function() {
          return User
        })

        Ioc.bind('App/Model/Agency', function() {
          return Agency
        })


        co(function *() {

          const phone = yield Phone.find(4)
          const user = yield User.find(2)

          phone.user().associate(user)
          phone.agencies().dissociate()

          yield phone.update();

          const savedPhone = yield Phone.where('phone_number',phone.attributes.phone_number).first().fetch()
          expect(savedPhone.get('user_id')).to.equal(2)
          expect(savedPhone.get('agency_id')).to.equal(null)

        }).then(function () {
          done()
        }).catch(done)

      })

    })

    context('belongsToMany', function () {

      it('should be able to insert related model under belongsToMany relation', function (done) {

        /**
         * declaring phone model by
         * extending base model
         */
        class Book extends Model{
        }

        /**
         * setting up model database, and
         * extending its static object
         */
        Book.database = db; Book = Book.extend()

        /**
         * binding model to the ioc container to be used
         * by relationship methods
         */
        Ioc.bind('App/Model/Book', function() {
          return Book
        })


        /**
         * defining User model by extending
         * based model
         */
        class Author extends Model{
          books(){
            return this.belongsToMany('App/Model/Book')
          }
        }
        /**
         * setting up model database, and
         * extending its static object
         */
        Author.database = db; Author = Author.extend()

        co(function *() {

          const book = new Book({book_title:'Node for noobs'})
          yield book.create()

          const author = yield Author.find(1)
          yield author.books().attach(book.attributes.id)

          const authorBooks = yield author.books().where('books.book_title','Node for noobs').fetch()
          expect(authorBooks.toJSON()).to.be.an('array')
          expect(authorBooks.first().book_title).to.equal('Node for noobs')


        }).then(function () {
          done()
        }).catch(done)

      })

      it('should be able to insert related model with extra data under belongsToMany relation', function (done) {

        /**
         * declaring phone model by
         * extending base model
         */
        class Book extends Model{
        }

        /**
         * setting up model database, and
         * extending its static object
         */
        Book.database = db; Book = Book.extend()

        /**
         * binding model to the ioc container to be used
         * by relationship methods
         */
        Ioc.bind('App/Model/Book', function() {
          return Book
        })


        /**
         * defining User model by extending
         * based model
         */
        class Author extends Model{
          books(){
            return this.belongsToMany('App/Model/Book')
          }
        }
        /**
         * setting up model database, and
         * extending its static object
         */
        Author.database = db; Author = Author.extend()

        co(function *() {

          const book = new Book({book_title:'Node for experts'})
          yield book.create()

          const author = yield Author.find(1)
          yield author.books().attach(book.attributes.id, {is_primary:1})

          const authorBooks = yield author.books().where('books.book_title','Node for experts').withPivot('is_primary').fetch()
          expect(authorBooks.toJSON()).to.be.an('array')
          expect(authorBooks.first().book_title).to.equal('Node for experts')
          expect(authorBooks.first()._pivot_is_primary).to.equal(1)


        }).then(function () {
          done()
        }).catch(done)

      })

      it('should be able to delete related model under belongsToMany relation using relational model id', function (done) {

        /**
         * declaring phone model by
         * extending base model
         */
        class Book extends Model{
        }

        /**
         * setting up model database, and
         * extending its static object
         */
        Book.database = db; Book = Book.extend()

        /**
         * binding model to the ioc container to be used
         * by relationship methods
         */
        Ioc.bind('App/Model/Book', function() {
          return Book
        })


        /**
         * defining User model by extending
         * based model
         */
        class Author extends Model{
          books(){
            return this.belongsToMany('App/Model/Book')
          }
        }
        /**
         * setting up model database, and
         * extending its static object
         */
        Author.database = db; Author = Author.extend()

        co(function *() {

          const book = yield Book.find(3)

          const author = yield Author.find(1)
          yield author.books().detach(book.attributes.id)

          const authorBooks = yield author.books().fetch()
          expect(authorBooks.toJSON()).to.be.an('array')

          authorBooks.each(function (book) {
            expect(book._pivot_book_id).not.to.equal(3)
          }).value()


        }).then(function () {
          done()
        }).catch(done)

      })

     it('should be able to delete all related model under belongsToMany relation ', function (done) {

        /**
         * declaring phone model by
         * extending base model
         */
        class Book extends Model{
        }

        /**
         * setting up model database, and
         * extending its static object
         */
        Book.database = db; Book = Book.extend()

        /**
         * binding model to the ioc container to be used
         * by relationship methods
         */
        Ioc.bind('App/Model/Book', function() {
          return Book
        })


        /**
         * defining User model by extending
         * based model
         */
        class Author extends Model{
          books(){
            return this.belongsToMany('App/Model/Book')
          }
        }
        /**
         * setting up model database, and
         * extending its static object
         */
        Author.database = db; Author = Author.extend()

        co(function *() {

          const book = yield Book.find(3)

          const author = yield Author.find(1)
          yield author.books().detach()

          const authorBooks = yield author.books().fetch()
          expect(authorBooks.toJSON()).to.be.an('array')
          expect(authorBooks.size()).to.equal(0)

        }).then(function () {
          done()
        }).catch(done)

      })
    })

  })

})
