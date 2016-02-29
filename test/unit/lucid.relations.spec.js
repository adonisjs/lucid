'use strict'

/**
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/* global describe, it, after, before, context */
const Model = require('../../src/Lucid/Model')
const Database = require('../../src/Database')
const chai = require('chai')
const expect = chai.expect
const filesFixtures = require('./fixtures/files')
const relationFixtures = require('./fixtures/relations')
const config = require('./helpers/config')
const HasOne = require('../../src/Lucid/Relations/HasOne')
const queryHelpers = require('./helpers/query')
require('co-mocha')

describe('Relations', function () {
  before(function * () {
    Database._setConfigProvider(config)
    yield filesFixtures.createDir()
    yield relationFixtures.up(Database)
  })

  after(function * () {
    yield relationFixtures.down(Database)
    Database.close()
  })

  context('HasOne', function () {
    it('should return an instance of HasOne when relation method has been called', function () {
      class Account extends Model {
      }
      class Supplier extends Model {
        account () {
          return this.hasOne(Account)
        }
      }
      const supplier = new Supplier()
      expect(supplier.account() instanceof HasOne).to.equal(true)
    })

    it('should be able to call methods on related model', function () {
      class Account extends Model {
      }
      class Supplier extends Model {
        account () {
          return this.hasOne(Account)
        }
      }
      const supplier = new Supplier()
      expect(supplier.account().where).to.be.a('function')
    })

    it('should be able to fetch results from related model', function () {
      class Account extends Model {
      }
      class Supplier extends Model {
        account () {
          return this.hasOne(Account)
        }
      }
      const supplier = new Supplier()
      const sql = supplier.account().where('name', 'joana').toSQL()
      expect(queryHelpers.formatQuery(sql.sql)).to.equal(queryHelpers.formatQuery('select * from "accounts" where "name" = ?'))
      expect(sql.bindings).deep.equal(['joana'])
    })

    it('should be able to define query methods inside the relation defination', function () {
      class Account extends Model {
      }
      class Supplier extends Model {
        account () {
          return this.hasOne(Account).where('name', 'joana')
        }
      }
      const supplier = new Supplier()
      const sql = supplier.account().toSQL()
      expect(queryHelpers.formatQuery(sql.sql)).to.equal(queryHelpers.formatQuery('select * from "accounts" where "name" = ?'))
      expect(sql.bindings).deep.equal(['joana'])
    })

    it('should be able to extend query methods defined inside the relation defination', function () {
      class Account extends Model {
      }
      class Supplier extends Model {
        account () {
          return this.hasOne(Account).where('name', 'joana')
        }
      }
      const supplier = new Supplier()
      const sql = supplier.account().where('age', 22).toSQL()
      expect(queryHelpers.formatQuery(sql.sql)).to.equal(queryHelpers.formatQuery('select * from "accounts" where "name" = ? and "age" = ?'))
      expect(sql.bindings).deep.equal(['joana', 22])
    })

    it('should throw an error when target model has not been saved and calling fetch on related model', function * () {
      class Account extends Model {
      }
      class Supplier extends Model {
        account () {
          return this.hasOne(Account).where('name', 'joana')
        }
      }
      const supplier = new Supplier()
      try {
        yield supplier.account().where('age', 22).fetch()
        expect(true).to.equal(false)
      } catch (e) {
        expect(e.message).to.match(/cannot fetch related model from an unsaved model instance/)
      }
    })

    it('should be able to fetch related model from a saved instance', function * () {
      const savedSupplier = yield relationFixtures.createRecords(Database, 'suppliers', {name: 'redtape'})
      yield relationFixtures.createRecords(Database, 'accounts', {name: 'redtape', supplier_id: savedSupplier[0]})
      let relatedQuery = null
      let parentQuery = null
      class Account extends Model {
        static boot () {
          super.boot()
          this.onQuery(function (query) {
            relatedQuery = query
          })
        }
      }
      class Supplier extends Model {
        account () {
          return this.hasOne(Account)
        }
        static boot () {
          super.boot()
          this.onQuery(function (query) {
            parentQuery = query
          })
        }
      }
      Supplier.boot()
      Account.boot()
      const supplier = yield Supplier.find(savedSupplier[0])
      expect(supplier instanceof Supplier).to.equal(true)
      const account = yield supplier.account().fetch()
      expect(account instanceof Account).to.equal(true)
      expect(account.name).to.equal('redtape')
      expect(account.supplier_id).to.equal(supplier.id)
      expect(queryHelpers.formatQuery(parentQuery.sql)).to.equal(queryHelpers.formatQuery('select * from "suppliers" where "id" = ? limit ?'))
      expect(queryHelpers.formatQuery(relatedQuery.sql)).to.equal(queryHelpers.formatQuery('select * from "accounts" where "supplier_id" = ? limit ?'))
      expect(parentQuery.bindings).deep.equal([1, 1])
      expect(relatedQuery.bindings).deep.equal([1, 1])
      yield relationFixtures.truncate(Database, 'suppliers')
      yield relationFixtures.truncate(Database, 'accounts')
    })

    it('should be able to eager load relation', function * () {
      const savedSupplier = yield relationFixtures.createRecords(Database, 'suppliers', {name: 'redtape'})
      yield relationFixtures.createRecords(Database, 'accounts', {name: 'redtape', supplier_id: savedSupplier[0]})
      let relatedQuery = null
      let parentQuery = null
      class Account extends Model {
        static boot () {
          super.boot()
          this.onQuery(function (query) {
            relatedQuery = query
          })
        }
      }
      class Supplier extends Model {
        account () {
          return this.hasOne(Account)
        }
        static boot () {
          super.boot()
          this.onQuery(function (query) {
            parentQuery = query
          })
        }
      }
      Account.bootIfNotBooted()
      Supplier.bootIfNotBooted()
      const account = yield Supplier.prototype.account().eagerLoad(savedSupplier[0])
      expect(account).to.be.an('object')
      expect(account['1']).to.be.an('object')
      expect(account['1'].supplier_id).to.equal(savedSupplier[0])
      expect(parentQuery).to.equal(null)
      expect(queryHelpers.formatQuery(relatedQuery.sql)).to.equal(queryHelpers.formatQuery('select * from "accounts" where "supplier_id" in (?)'))
      expect(relatedQuery.bindings).deep.equal([1])
      yield relationFixtures.truncate(Database, 'suppliers')
      yield relationFixtures.truncate(Database, 'accounts')
    })

    it('should be able to eager load relation for multiple values', function * () {
      const savedSupplier = yield relationFixtures.createRecords(Database, 'suppliers', {name: 'redtape'})
      yield relationFixtures.createRecords(Database, 'accounts', {name: 'redtape', supplier_id: savedSupplier[0]})
      let relatedQuery = null
      class Account extends Model {
        static boot () {
          super.boot()
          this.onQuery(function (query) {
            relatedQuery = query
          })
        }
      }
      class Supplier extends Model {
        account () {
          return this.hasOne(Account)
        }
      }
      Account.bootIfNotBooted()
      Supplier.bootIfNotBooted()
      const account = yield Supplier.prototype.account().eagerLoad([savedSupplier[0], 2, 3])
      expect(account).to.be.an('object')
      expect(account['1']).to.be.an('object')
      expect(account['1'].supplier_id).to.equal(savedSupplier[0])
      expect(account['2']).to.equal(undefined)
      expect(account['3']).to.equal(undefined)
      expect(queryHelpers.formatQuery(relatedQuery.sql)).to.equal(queryHelpers.formatQuery('select * from "accounts" where "supplier_id" in (?, ?, ?)'))
      expect(relatedQuery.bindings).deep.equal([1, 2, 3])
      yield relationFixtures.truncate(Database, 'suppliers')
      yield relationFixtures.truncate(Database, 'accounts')
    })

    it('should be able to eager load relation using static with method', function * () {
      const savedSupplier = yield relationFixtures.createRecords(Database, 'suppliers', {name: 'redtape'})
      yield relationFixtures.createRecords(Database, 'accounts', {name: 'redtape', supplier_id: savedSupplier[0]})
      let parentQuery = null
      let relatedQuery = null
      class Account extends Model {
        static boot () {
          super.boot()
          this.onQuery(function (query) {
            relatedQuery = query
          })
        }
      }
      class Supplier extends Model {
        account () {
          return this.hasOne(Account)
        }
        static boot () {
          super.boot()
          this.onQuery(function (query) {
            parentQuery = query
          })
        }
      }
      Supplier.bootIfNotBooted()
      Account.bootIfNotBooted()
      let supplier = yield Supplier.query().with('account').first()
      supplier = supplier.toJSON()
      expect(supplier.account).to.be.an('object')
      expect(supplier.account.supplier_id).to.equal(supplier.id)
      expect(queryHelpers.formatQuery(parentQuery.sql)).to.equal(queryHelpers.formatQuery('select * from "suppliers" limit ?'))
      expect(queryHelpers.formatQuery(relatedQuery.sql)).to.equal(queryHelpers.formatQuery('select * from "accounts" where "supplier_id" in (?)'))
      expect(parentQuery.bindings).deep.equal([1])
      expect(relatedQuery.bindings).deep.equal([1])
      yield relationFixtures.truncate(Database, 'suppliers')
      yield relationFixtures.truncate(Database, 'accounts')
    })

    it('should return null when unable to fetch related results', function * () {
      yield relationFixtures.createRecords(Database, 'suppliers', {name: 'redtape'})
      class Account extends Model {
      }
      class Supplier extends Model {
        account () {
          return this.hasOne(Account)
        }
      }
      let supplier = yield Supplier.query().with('account').first()
      supplier = supplier.toJSON()
      expect(supplier.account).to.equal(null)
      yield relationFixtures.truncate(Database, 'suppliers')
    })

    it('should throw an error when trying to find undefined relation', function * () {
      yield relationFixtures.createRecords(Database, 'suppliers', {name: 'redtape'})
      class Supplier extends Model {
      }
      try {
        yield Supplier.query().with('profiles').first()
      } catch (e) {
        expect(e.name).to.equal('ModelRelationNotFound')
        expect(e.message).to.match(/cannot find profiles as a relation/i)
      }
      yield relationFixtures.truncate(Database, 'suppliers')
    })

    it('should do not even try to load relations when values from parent model are empty', function * () {
      let relatedQuery = null
      class Supplier extends Model {
      }
      const supplier = yield Supplier.query().with('profiles').first()
      expect(relatedQuery).to.equal(null)
      expect(supplier).to.equal(null)
    })

    it('should be able to resolve relations for multiple rows', function * () {
      yield relationFixtures.createRecords(Database, 'suppliers', [{name: 'redtape'}, {name: 'nike'}, {name: 'bata'}])
      yield relationFixtures.createRecords(Database, 'accounts', [{name: 'redtape', supplier_id: 1}, {name: 'nike', supplier_id: 2}, {name: 'bata', supplier_id: 3}])
      let relatedQuery = null
      let parentQuery = null
      class Account extends Model {
        static boot () {
          super.boot()
          this.onQuery(function (query) {
            relatedQuery = query
          })
        }
      }
      class Supplier extends Model {
        static boot () {
          super.boot()
          this.onQuery(function (query) {
            parentQuery = query
          })
        }
        account () {
          return this.hasOne(Account)
        }
      }
      Account.bootIfNotBooted()
      Supplier.bootIfNotBooted()
      const suppliers = yield Supplier.query().with('account').fetch()
      expect(queryHelpers.formatQuery(parentQuery.sql)).to.equal(queryHelpers.formatQuery('select * from "suppliers"'))
      expect(queryHelpers.formatQuery(relatedQuery.sql)).to.equal(queryHelpers.formatQuery('select * from "accounts" where "supplier_id" in (?, ?, ?)'))
      expect(relatedQuery.bindings).deep.equal([1, 2, 3])
      suppliers.each(function (supplier) {
        expect(supplier.id).to.equal(supplier.get('account').supplier_id)
      })
      yield relationFixtures.truncate(Database, 'suppliers')
      yield relationFixtures.truncate(Database, 'accounts')
    })

    it('should be able to resolve relations with different foriegnKey', function * () {
      yield relationFixtures.createRecords(Database, 'suppliers', {name: 'redtape'})
      yield relationFixtures.createRecords(Database, 'all_accounts', {name: 'redtape', supplier_regid: 1})
      let relatedQuery = null
      let parentQuery = null
      class Account extends Model {
        static boot () {
          super.boot()
          this.onQuery(function (query) {
            relatedQuery = query
          })
        }
        static get table () {
          return 'all_accounts'
        }
      }
      class Supplier extends Model {
        static boot () {
          super.boot()
          this.onQuery(function (query) {
            parentQuery = query
          })
        }
        account () {
          return this.hasOne(Account, 'id', 'supplier_regid')
        }
      }
      Account.bootIfNotBooted()
      Supplier.bootIfNotBooted()
      const supplier = yield Supplier.query().with('account').first()
      expect(queryHelpers.formatQuery(parentQuery.sql)).to.equal(queryHelpers.formatQuery('select * from "suppliers" limit ?'))
      expect(queryHelpers.formatQuery(relatedQuery.sql)).to.equal(queryHelpers.formatQuery('select * from "all_accounts" where "supplier_regid" in (?)'))
      expect(relatedQuery.bindings).deep.equal([1])
      expect(supplier.id.toString()).to.equal(supplier.get('account').supplier_regid)
      yield relationFixtures.truncate(Database, 'suppliers')
      yield relationFixtures.truncate(Database, 'all_accounts')
    })

    it('should be able to resolve relations with different primary and foriegnKey', function * () {
      yield relationFixtures.createRecords(Database, 'all_suppliers', {name: 'redtape', regid: 'rd'})
      yield relationFixtures.createRecords(Database, 'all_accounts', {name: 'redtape', supplier_regid: 'rd'})
      let relatedQuery = null
      let parentQuery = null
      class Account extends Model {
        static boot () {
          super.boot()
          this.onQuery(function (query) {
            relatedQuery = query
          })
        }
        static get table () {
          return 'all_accounts'
        }
      }
      class Supplier extends Model {
        static boot () {
          super.boot()
          this.onQuery(function (query) {
            parentQuery = query
          })
        }
        account () {
          return this.hasOne(Account, 'regid', 'supplier_regid')
        }
        static get table () {
          return 'all_suppliers'
        }
      }
      Account.bootIfNotBooted()
      Supplier.bootIfNotBooted()
      const supplier = yield Supplier.query().with('account').first()
      expect(queryHelpers.formatQuery(parentQuery.sql)).to.equal(queryHelpers.formatQuery('select * from "all_suppliers" limit ?'))
      expect(queryHelpers.formatQuery(relatedQuery.sql)).to.equal(queryHelpers.formatQuery('select * from "all_accounts" where "supplier_regid" in (?)'))
      expect(relatedQuery.bindings).deep.equal(['rd'])
      expect(supplier.regid).to.equal(supplier.get('account').supplier_regid)
      yield relationFixtures.truncate(Database, 'all_suppliers')
      yield relationFixtures.truncate(Database, 'all_accounts')
    })

    it('should be able to resolve multiple relations', function * () {
      yield relationFixtures.createRecords(Database, 'suppliers', {name: 'bata'})
      yield relationFixtures.createRecords(Database, 'accounts', {name: 'bata', supplier_id: 1})
      yield relationFixtures.createRecords(Database, 'head_offices', {location: 'hollywood', supplier_id: 1})

      let accountQuery = null
      let headOfficeQuery = null
      let parentQuery = null
      class HeadOffice extends Model {
        static boot () {
          super.boot()
          this.onQuery(function (query) {
            headOfficeQuery = query
          })
        }
      }

      class Account extends Model {
        static boot () {
          super.boot()
          this.onQuery(function (query) {
            accountQuery = query
          })
        }
      }

      class Supplier extends Model {
        static boot () {
          super.boot()
          this.onQuery(function (query) {
            parentQuery = query
          })
        }
        headoffice () {
          return this.hasOne(HeadOffice)
        }
        account () {
          return this.hasOne(Account)
        }
      }

      HeadOffice.bootIfNotBooted()
      Account.bootIfNotBooted()
      Supplier.bootIfNotBooted()

      const supplier = yield Supplier.query().with(['account', 'headoffice']).first()
      expect(queryHelpers.formatQuery(parentQuery.sql)).to.equal(queryHelpers.formatQuery('select * from "suppliers" limit ?'))
      expect(queryHelpers.formatQuery(accountQuery.sql)).to.equal(queryHelpers.formatQuery('select * from "accounts" where "supplier_id" in (?)'))
      expect(queryHelpers.formatQuery(headOfficeQuery.sql)).to.equal(queryHelpers.formatQuery('select * from "head_offices" where "supplier_id" in (?)'))
      expect(parentQuery.bindings).deep.equal([1])
      expect(accountQuery.bindings).deep.equal([1])
      expect(headOfficeQuery.bindings).deep.equal([1])
      expect(supplier.id).to.equal(supplier.get('account').supplier_id).to.equal(supplier.get('headoffice').supplier_id)
      expect(supplier.toJSON()).to.have.property('account').to.be.an('object').not.to.equal(null)
      expect(supplier.toJSON()).to.have.property('headoffice').to.be.an('object').not.to.equal(null)
      yield relationFixtures.truncate(Database, 'suppliers')
      yield relationFixtures.truncate(Database, 'accounts')
      yield relationFixtures.truncate(Database, 'head_offices')
    })

    it('should be able to resolve nested relations', function * () {
      const savedSupplier = yield relationFixtures.createRecords(Database, 'suppliers', {name: 'nike', id: 23})
      const savedAccount = yield relationFixtures.createRecords(Database, 'accounts', {name: 'nike', supplier_id: savedSupplier[0], id: 4})
      yield relationFixtures.createRecords(Database, 'profiles', {profile_name: 'Do it', account_id: savedAccount[0]})

      let accountQuery = null
      let profileQuery = null
      let parentQuery = null

      class Profile extends Model {
        static boot () {
          super.boot()
          this.onQuery(function (query) {
            profileQuery = query
          })
        }
      }

      class Account extends Model {
        static boot () {
          super.boot()
          this.onQuery(function (query) {
            accountQuery = query
          })
        }
        profile () {
          return this.hasOne(Profile)
        }
      }

      class Supplier extends Model {
        static boot () {
          super.boot()
          this.onQuery(function (query) {
            parentQuery = query
          })
        }
        account () {
          return this.hasOne(Account)
        }
      }

      Supplier.bootIfNotBooted()
      Account.bootIfNotBooted()
      Profile.bootIfNotBooted()

      const supplier = yield Supplier.query().with('account.profile').first()
      expect(queryHelpers.formatQuery(parentQuery.sql)).to.equal(queryHelpers.formatQuery('select * from "suppliers" limit ?'))
      expect(queryHelpers.formatQuery(accountQuery.sql)).to.equal(queryHelpers.formatQuery('select * from "accounts" where "supplier_id" in (?)'))
      expect(queryHelpers.formatQuery(profileQuery.sql)).to.equal(queryHelpers.formatQuery('select * from "profiles" where "account_id" in (?)'))
      expect(parentQuery.bindings).deep.equal([1])
      expect(accountQuery.bindings).deep.equal([23])
      expect(profileQuery.bindings).deep.equal([4])
      expect(supplier.id).to.equal(supplier.get('account').supplier_id)
      expect(supplier.get('account').id).to.equal(supplier.get('account').get('profile').account_id)
      yield relationFixtures.truncate(Database, 'suppliers')
      yield relationFixtures.truncate(Database, 'accounts')
      yield relationFixtures.truncate(Database, 'profiles')
    })

    it('should be able to add query constraints to relation defination', function * () {
      const savedSupplier = yield relationFixtures.createRecords(Database, 'suppliers', {name: 'nike'})
      yield relationFixtures.createRecords(Database, 'accounts', {name: 'nike', supplier_id: savedSupplier[0]})
      let accountQuery = null
      class Account extends Model {
        static boot () {
          super.boot()
          this.onQuery(function (query) {
            accountQuery = query
          })
        }
      }
      class Supplier extends Model {
        account () {
          return this.hasOne(Account).where('name', 'missingname')
        }
      }
      Account.bootIfNotBooted()
      Supplier.bootIfNotBooted()
      yield Supplier.query().with('account').first()
      expect(queryHelpers.formatQuery(accountQuery.sql)).to.equal(queryHelpers.formatQuery('select * from "accounts" where "name" = ? and "supplier_id" in (?)'))
      expect(accountQuery.bindings).deep.equal(['missingname', 1])
      yield relationFixtures.truncate(Database, 'suppliers')
      yield relationFixtures.truncate(Database, 'accounts')
    })

    it('should add eagerLoad relations to query builder instance when with is called', function () {
      class Account extends Model {}
      const accountQuery = Account.query().with('profile')
      expect(accountQuery.eagerLoad).deep.equal({withRelations: ['profile'], withNestedRelations: {}, relationsScope: {}, nestedRelationsScope: {}})
    })

    it('should add nested eagerLoad relations to query builder instance when with is called', function () {
      class Account extends Model {}
      const accountQuery = Account.query().with('profile', 'user.history.pages', 'room.keys')
      expect(accountQuery.eagerLoad).deep.equal({
        withRelations: ['profile', 'user', 'room'],
        withNestedRelations: {
          user: ['history.pages'],
          room: ['keys']
        },
        relationsScope: {},
        nestedRelationsScope: {}
      })
    })

    it('should add scopes to query builder instance when scope method is called', function () {
      class Account extends Model {}
      const accountQuery = Account.query().with('profile').scope('profile', function () {})
      expect(accountQuery.eagerLoad.withRelations).deep.equal(['profile'])
      expect(accountQuery.eagerLoad.withNestedRelations).deep.equal({})
      expect(accountQuery.eagerLoad.relationsScope.profile).to.be.a('function')
      expect(accountQuery.eagerLoad.nestedRelationsScope).deep.equal({})
    })

    it('should add nested scopes to query builder instance when scope method is called', function () {
      class Account extends Model {}
      const accountQuery = Account
        .query()
        .with('profile', 'user.history.pages', 'room.keys')
        .scope('profile', function () {})
        .scope('user.history.pages', function () {})
        .scope('room.keys', function () {})
      expect(accountQuery.eagerLoad.withRelations).deep.equal(['profile', 'user', 'room'])
      expect(accountQuery.eagerLoad.withNestedRelations).deep.equal({user: ['history.pages'], room: ['keys']})
      expect(accountQuery.eagerLoad.relationsScope.profile).to.be.a('function')
      expect(accountQuery.eagerLoad.relationsScope.user).to.equal(undefined)
      expect(accountQuery.eagerLoad.relationsScope.room).to.equal(undefined)
      expect(accountQuery.eagerLoad.nestedRelationsScope.user['history.pages']).to.be.a('function')
      expect(accountQuery.eagerLoad.nestedRelationsScope.room['keys']).to.be.a('function')
    })

    it('should be able to add runtime constraints to relation defination', function * () {
      const savedSupplier = yield relationFixtures.createRecords(Database, 'suppliers', {name: 'nike'})
      yield relationFixtures.createRecords(Database, 'accounts', {name: 'nike', supplier_id: savedSupplier[0]})
      let accountQuery = null
      class Account extends Model {
        static boot () {
          super.boot()
          this.onQuery(function (query) {
            accountQuery = query
          })
        }
      }
      class Supplier extends Model {
        account () {
          return this.hasOne(Account).where('name', 'missingname')
        }
      }
      Account.bootIfNotBooted()
      Supplier.bootIfNotBooted()
      yield Supplier.query().with('account').scope('account', function (query) {
        query.orWhere('name', 'nike')
      }).first()
      expect(queryHelpers.formatQuery(accountQuery.sql)).to.equal(queryHelpers.formatQuery('select * from "accounts" where "name" = ? or "name" = ? and "supplier_id" in (?)'))
      expect(accountQuery.bindings).deep.equal(['missingname', 'nike', 1])
      yield relationFixtures.truncate(Database, 'suppliers')
      yield relationFixtures.truncate(Database, 'accounts')
      yield relationFixtures.truncate(Database, 'suppliers')
      yield relationFixtures.truncate(Database, 'accounts')
    })

    it('should be able to add runtime constraints to nested relations', function * () {
      const savedSupplier = yield relationFixtures.createRecords(Database, 'suppliers', {name: 'nike', id: 23})
      const savedAccount = yield relationFixtures.createRecords(Database, 'accounts', {name: 'nike', supplier_id: savedSupplier[0], id: 4})
      yield relationFixtures.createRecords(Database, 'profiles', {profile_name: 'Do it', account_id: savedAccount[0]})

      let accountQuery = null
      let profileQuery = null
      let parentQuery = null

      class Profile extends Model {
        static boot () {
          super.boot()
          this.onQuery(function (query) {
            profileQuery = query
          })
        }
      }

      class Account extends Model {
        static boot () {
          super.boot()
          this.onQuery(function (query) {
            accountQuery = query
          })
        }
        profile () {
          return this.hasOne(Profile)
        }
      }

      class Supplier extends Model {
        static boot () {
          super.boot()
          this.onQuery(function (query) {
            parentQuery = query
          })
        }
        account () {
          return this.hasOne(Account)
        }
      }

      Supplier.bootIfNotBooted()
      Account.bootIfNotBooted()
      Profile.bootIfNotBooted()

      yield Supplier.query()
        .with('account.profile')
        .scope('account', (query) => query.where('name', 'nike'))
        .scope('account.profile', (query) => query.where('profile_name', 'do not do it'))
        .first()

      expect(queryHelpers.formatQuery(parentQuery.sql)).to.equal(queryHelpers.formatQuery('select * from "suppliers" limit ?'))
      expect(queryHelpers.formatQuery(accountQuery.sql)).to.equal(queryHelpers.formatQuery('select * from "accounts" where "name" = ? and "supplier_id" in (?)'))
      expect(queryHelpers.formatQuery(profileQuery.sql)).to.equal(queryHelpers.formatQuery('select * from "profiles" where "profile_name" = ? and "account_id" in (?)'))
      expect(accountQuery.bindings).deep.equal(['nike', 23])
      expect(profileQuery.bindings).deep.equal(['do not do it', 4])
      yield relationFixtures.truncate(Database, 'suppliers')
      yield relationFixtures.truncate(Database, 'accounts')
      yield relationFixtures.truncate(Database, 'profiles')
    })

    it('should be able to save related model instance', function * (done) {
      class Account extends Model {
      }
      class Supplier extends Model {
        account () {
          return this.hasOne(Account)
        }
      }
      Supplier.bootIfNotBooted()
      Account.bootIfNotBooted()
      const supplier = new Supplier({name: 'reebok'})
      yield supplier.save()
      expect(supplier.id).not.to.equal(undefined)
      const account = new Account({name: 'ree'})
      yield supplier.account().save(account)
      expect(account.supplier_id).to.equal(supplier.id)
      yield relationFixtures.truncate(Database, 'suppliers')
      yield relationFixtures.truncate(Database, 'accounts')
      done()
    })

    it('should throw an when save object is not an instance of related model', function * () {
      class Account extends Model {
      }
      class Supplier extends Model {
        account () {
          return this.hasOne(Account)
        }
      }
      Supplier.bootIfNotBooted()
      Account.bootIfNotBooted()
      const supplier = new Supplier({name: 'reebok'})
      yield supplier.save()
      expect(supplier.id).not.to.equal(undefined)
      try {
        yield supplier.account().save({name: 're'})
        expect(true).to.equal(false)
      } catch (e) {
        expect(e.name).to.equal('ModelRelationSaveException')
        expect(e.message).to.match(/save accepts an instance of related model/i)
      }
      yield relationFixtures.truncate(Database, 'suppliers')
    })

    it('should throw an when actual model has not be saved', function * () {
      class Account extends Model {
      }
      class Supplier extends Model {
        account () {
          return this.hasOne(Account)
        }
      }
      Supplier.bootIfNotBooted()
      Account.bootIfNotBooted()
      const supplier = new Supplier({name: 'reebok'})
      const account = new Account({name: 'foo'})
      try {
        yield supplier.account().save(account)
        expect(true).to.equal(false)
      } catch (e) {
        expect(e.name).to.equal('ModelRelationSaveException')
        expect(e.message).to.match(/cannot save relation for an unsaved model instance/i)
      }
    })

    it('should be able to create related model using create method', function * () {
      class Account extends Model {
      }
      class Supplier extends Model {
        account () {
          return this.hasOne(Account)
        }
      }
      Supplier.bootIfNotBooted()
      Account.bootIfNotBooted()
      const supplier = new Supplier({name: 'reebok'})
      yield supplier.save()
      const account = yield supplier.account().create({name: 'bok'})
      expect(account instanceof Account)
      expect(account.supplier_id).to.equal(supplier.id)

      yield relationFixtures.truncate(Database, 'suppliers')
      yield relationFixtures.truncate(Database, 'accounts')
    })

    it('should be able to eagerLoad relations for a model instance', function * () {
      const savedSupplier = yield relationFixtures.createRecords(Database, 'suppliers', {name: 'nike'})
      yield relationFixtures.createRecords(Database, 'accounts', {name: 'nike', supplier_id: savedSupplier[0]})
      let accountQuery = null

      class Account extends Model {
        static boot () {
          super.boot()
          this.onQuery(function (query) {
            accountQuery = query
          })
        }
      }

      class Supplier extends Model {
        account () {
          return this.hasOne(Account)
        }
      }

      Account.bootIfNotBooted()

      const supplier = yield Supplier.find(savedSupplier[0])
      yield supplier.related('account').load()
      expect(queryHelpers.formatQuery(accountQuery.sql)).to.equal(queryHelpers.formatQuery('select * from "accounts" where "supplier_id" = ? limit ?'))
      expect(accountQuery.bindings).deep.equal([savedSupplier[0], 1])
      expect(supplier.get('account') instanceof Account).to.equal(true)
      yield relationFixtures.truncate(Database, 'suppliers')
      yield relationFixtures.truncate(Database, 'accounts')
    })

    it('should clean the eagerLoad chain for a given model instance', function * () {
      const savedSupplier = yield relationFixtures.createRecords(Database, 'suppliers', {name: 'nike'})
      yield relationFixtures.createRecords(Database, 'accounts', {name: 'nike', supplier_id: savedSupplier[0]})

      class Account extends Model {
      }

      class Supplier extends Model {
        account () {
          return this.hasOne(Account)
        }
      }
      const supplier = yield Supplier.find(savedSupplier[0])
      yield supplier.related('account').load()
      expect(supplier.eagerLoad.withRelations).deep.equal([])
      yield relationFixtures.truncate(Database, 'suppliers')
      yield relationFixtures.truncate(Database, 'accounts')
    })

    it('should set relations to the final object when toJSON is called', function * () {
      const savedSupplier = yield relationFixtures.createRecords(Database, 'suppliers', {name: 'nike'})
      yield relationFixtures.createRecords(Database, 'accounts', {name: 'nike', supplier_id: savedSupplier[0]})

      class Account extends Model {
      }

      class Supplier extends Model {
        account () {
          return this.hasOne(Account)
        }
      }
      const supplier = yield Supplier.find(savedSupplier[0])
      yield supplier.related('account').load()
      const jsoned = supplier.toJSON()
      expect(jsoned.account).to.be.an('object')
      expect(jsoned.account.supplier_id).to.equal(jsoned.id)
      yield relationFixtures.truncate(Database, 'suppliers')
      yield relationFixtures.truncate(Database, 'accounts')
    })
  })
})
