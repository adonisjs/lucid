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
const HasMany = require('../../src/Lucid/Relations/HasMany')
const BelongsTo = require('../../src/Lucid/Relations/BelongsTo')
const BelongsToMany = require('../../src/Lucid/Relations/BelongsToMany')
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
        expect(e.message).to.match(/cannot fetch related model from an unsaved model instance/i)
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
      expect(parentQuery.bindings).deep.equal(queryHelpers.formatBindings([1, 1]))
      expect(relatedQuery.bindings).deep.equal(queryHelpers.formatBindings([1, 1]))
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
      expect(relatedQuery.bindings).deep.equal(queryHelpers.formatBindings([1]))
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
      expect(relatedQuery.bindings).deep.equal(queryHelpers.formatBindings([1, 2, 3]))
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
      expect(parentQuery.bindings).deep.equal(queryHelpers.formatBindings([1]))
      expect(relatedQuery.bindings).deep.equal(queryHelpers.formatBindings([1]))
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
      expect(relatedQuery.bindings).deep.equal(queryHelpers.formatBindings([1, 2, 3]))
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
      expect(relatedQuery.bindings).deep.equal(queryHelpers.formatBindings([1]))
      expect(supplier.id.toString()).to.equal(supplier.get('account').supplier_regid)
      yield relationFixtures.truncate(Database, 'suppliers')
      yield relationFixtures.truncate(Database, 'all_accounts')
    })

    it('should be able to resolve relations with different foriegnKey from model instance', function * () {
      yield relationFixtures.createRecords(Database, 'suppliers', {name: 'redtape'})
      yield relationFixtures.createRecords(Database, 'all_accounts', {name: 'redtape', supplier_regid: 1})
      let relatedQuery = null
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
        account () {
          return this.hasOne(Account, 'id', 'supplier_regid')
        }
      }
      Account.bootIfNotBooted()
      Supplier.bootIfNotBooted()
      const supplier = yield Supplier.find(1)
      const account = yield supplier.account().fetch()
      expect(queryHelpers.formatQuery(relatedQuery.sql)).to.equal(queryHelpers.formatQuery('select * from "all_accounts" where "supplier_regid" = ? limit ?'))
      expect(relatedQuery.bindings).deep.equal(queryHelpers.formatBindings([1, 1]))
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

    it('should be able to resolve relations with different primary and foriegnKey using model instance', function * () {
      yield relationFixtures.createRecords(Database, 'all_suppliers', {name: 'redtape', regid: 'rd'})
      yield relationFixtures.createRecords(Database, 'all_accounts', {name: 'redtape', supplier_regid: 'rd'})
      let relatedQuery = null
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
        account () {
          return this.hasOne(Account, 'regid', 'supplier_regid')
        }
        static get table () {
          return 'all_suppliers'
        }
      }
      Account.bootIfNotBooted()
      Supplier.bootIfNotBooted()
      const supplier = yield Supplier.find(1)
      yield supplier.account().fetch()
      expect(queryHelpers.formatQuery(relatedQuery.sql)).to.equal(queryHelpers.formatQuery('select * from "all_accounts" where "supplier_regid" = ? limit ?'))
      expect(relatedQuery.bindings).deep.equal(queryHelpers.formatBindings(['rd', 1]))
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
      expect(parentQuery.bindings).deep.equal(queryHelpers.formatBindings([1]))
      expect(accountQuery.bindings).deep.equal(queryHelpers.formatBindings([1]))
      expect(headOfficeQuery.bindings).deep.equal(queryHelpers.formatBindings([1]))
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
      expect(parentQuery.bindings).deep.equal(queryHelpers.formatBindings([1]))
      expect(accountQuery.bindings).deep.equal(queryHelpers.formatBindings([23]))
      expect(profileQuery.bindings).deep.equal(queryHelpers.formatBindings([4]))
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
      expect(accountQuery.bindings).deep.equal(queryHelpers.formatBindings(['missingname', 1]))
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
      expect(accountQuery.bindings).deep.equal(queryHelpers.formatBindings(['missingname', 'nike', 1]))
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
      expect(accountQuery.bindings).deep.equal(queryHelpers.formatBindings(['nike', 23]))
      expect(profileQuery.bindings).deep.equal(queryHelpers.formatBindings(['do not do it', 4]))
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

    it('should be able to save related model instance with different foriegnKey', function * () {
      class Account extends Model {
        static get table () {
          return 'all_accounts'
        }
      }
      class Supplier extends Model {
        account () {
          return this.hasOne(Account, 'id', 'supplier_regid')
        }
      }
      Supplier.bootIfNotBooted()
      Account.bootIfNotBooted()
      const supplier = new Supplier({name: 'redtape', id: 20})
      yield supplier.save()
      expect(supplier.id).not.to.equal(undefined)
      const account = new Account({name: 'rdtp'})
      yield supplier.account().save(account)
      expect(account.supplier_regid).to.equal(supplier.id)
      yield relationFixtures.truncate(Database, 'suppliers')
      yield relationFixtures.truncate(Database, 'all_accounts')
    })

    it('should be able to save related model instance with different primary and foriegn key', function * () {
      class Account extends Model {
        static get table () {
          return 'all_accounts'
        }
      }
      class Supplier extends Model {
        account () {
          return this.hasOne(Account, 'regid', 'supplier_regid')
        }
        static get table () {
          return 'all_suppliers'
        }
      }
      Supplier.bootIfNotBooted()
      Account.bootIfNotBooted()
      const supplier = new Supplier({name: 'redtape', regid: 102})
      yield supplier.save()
      expect(supplier.id).not.to.equal(undefined)
      const account = new Account({name: 'rdtp'})
      yield supplier.account().save(account)
      expect(account.supplier_regid).to.equal(supplier.regid)
      yield relationFixtures.truncate(Database, 'all_suppliers')
      yield relationFixtures.truncate(Database, 'all_accounts')
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

    it('should throw an error when actual model has not be saved', function * () {
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

    it('should be able to created related model using create method with different primary and foriegn key', function * () {
      class Account extends Model {
        static get table () {
          return 'all_accounts'
        }
      }
      class Supplier extends Model {
        account () {
          return this.hasOne(Account, 'regid', 'supplier_regid')
        }
        static get table () {
          return 'all_suppliers'
        }
      }
      Supplier.bootIfNotBooted()
      Account.bootIfNotBooted()
      const supplier = new Supplier({name: 'reebok', regid: 190})
      yield supplier.save()
      expect(supplier.id).not.to.equal(undefined)
      const account = yield supplier.account().create({name: 'bok'})
      expect(account.supplier_regid).to.equal(supplier.regid)
      yield relationFixtures.truncate(Database, 'all_suppliers')
      yield relationFixtures.truncate(Database, 'all_accounts')
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
      expect(accountQuery.bindings).deep.equal(queryHelpers.formatBindings(savedSupplier.concat([1])))
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

  context('HasMany', function () {
    it('should return an instance of HasMany when relation method has been called', function () {
      class Comment extends Model {
      }
      class Post extends Model {
        comments () {
          return this.hasMany(Comment)
        }
      }
      const post = new Post()
      expect(post.comments() instanceof HasMany).to.equal(true)
    })

    it('should be able to access query builder of related model', function () {
      class Comment extends Model {
      }
      class Post extends Model {
        comments () {
          return this.hasMany(Comment)
        }
      }
      const post = new Post()
      const relatedQuery = post.comments().where('is_draft', false).toSQL()
      expect(queryHelpers.formatQuery(relatedQuery.sql)).to.equal(queryHelpers.formatQuery('select * from "comments" where "is_draft" = ?'))
      expect(relatedQuery.bindings).deep.equal([false])
    })

    it('should be able to fetch results from related model', function * () {
      const savedPost = yield relationFixtures.createRecords(Database, 'posts', {title: 'Adonis 101', body: `Let's learn Adonis`})
      yield relationFixtures.createRecords(Database, 'comments', {body: 'Nice article', post_id: savedPost[0]})
      let commentsQuery = null
      class Comment extends Model {
        static boot () {
          super.boot()
          this.onQuery(function (query) {
            commentsQuery = query
          })
        }
      }
      class Post extends Model {
        comments () {
          return this.hasMany(Comment)
        }
      }
      Comment.bootIfNotBooted()
      const post = yield Post.find(savedPost[0])
      const comments = yield post.comments().fetch()
      expect(queryHelpers.formatQuery(commentsQuery.sql)).to.equal(queryHelpers.formatQuery('select * from "comments" where "post_id" = ?'))
      expect(commentsQuery.bindings).deep.equal(queryHelpers.formatBindings(savedPost))
      expect(comments.toJSON()).to.be.an('array')
      expect(comments.first() instanceof Comment).to.equal(true)
      yield relationFixtures.truncate(Database, 'posts')
      yield relationFixtures.truncate(Database, 'comments')
    })

    it('should be able to eagerLoad results from related model', function * () {
      const savedPost = yield relationFixtures.createRecords(Database, 'posts', {title: 'Adonis 101', body: `Let's learn Adonis`})
      yield relationFixtures.createRecords(Database, 'comments', {body: 'Nice article', post_id: savedPost[0]})
      let commentsQuery = null
      class Comment extends Model {
        static boot () {
          super.boot()
          this.onQuery(function (query) {
            commentsQuery = query
          })
        }
      }
      class Post extends Model {
        comments () {
          return this.hasMany(Comment)
        }
      }
      Comment.bootIfNotBooted()
      const post = yield Post.query().with('comments').first()
      expect(queryHelpers.formatQuery(commentsQuery.sql)).to.equal(queryHelpers.formatQuery('select * from "comments" where "post_id" in (?)'))
      expect(commentsQuery.bindings).deep.equal(queryHelpers.formatBindings(savedPost))
      expect(post.toJSON().comments).to.be.an('array')
      expect(post.toJSON().comments[0].post_id).to.equal(post.toJSON().id)
      yield relationFixtures.truncate(Database, 'posts')
      yield relationFixtures.truncate(Database, 'comments')
    })

    it('should be able to eagerLoad results from related model instance', function * () {
      const savedPost = yield relationFixtures.createRecords(Database, 'posts', {title: 'Adonis 101', body: `Let's learn Adonis`})
      yield relationFixtures.createRecords(Database, 'comments', {body: 'Nice article', post_id: savedPost[0]})
      let commentsQuery = null
      class Comment extends Model {
        static boot () {
          super.boot()
          this.onQuery(function (query) {
            commentsQuery = query
          })
        }
      }
      class Post extends Model {
        comments () {
          return this.hasMany(Comment)
        }
      }
      Comment.bootIfNotBooted()
      const post = yield Post.find(savedPost[0])
      yield post.related('comments').load()
      expect(queryHelpers.formatQuery(commentsQuery.sql)).to.equal(queryHelpers.formatQuery('select * from "comments" where "post_id" = ?'))
      expect(commentsQuery.bindings).deep.equal(queryHelpers.formatBindings(savedPost))
      const comments = post.get('comments')
      expect(comments.toJSON()).to.be.an('array')
      expect(comments.first() instanceof Comment).to.equal(true)
      expect(comments.toJSON()[0].post_id).to.equal(post.id)
      yield relationFixtures.truncate(Database, 'posts')
      yield relationFixtures.truncate(Database, 'comments')
    })

    it('should be able to eagerLoad multiple results for related model', function * () {
      const savedPost = yield relationFixtures.createRecords(Database, 'posts', {title: 'Adonis 101', body: `Let's learn Adonis`})
      yield relationFixtures.createRecords(Database, 'comments', [{body: 'Nice article', post_id: savedPost[0]}, {body: 'Another article', post_id: savedPost[0]}])
      let commentsQuery = null
      class Comment extends Model {
        static boot () {
          super.boot()
          this.onQuery(function (query) {
            commentsQuery = query
          })
        }
      }
      class Post extends Model {
        comments () {
          return this.hasMany(Comment)
        }
      }
      Comment.bootIfNotBooted()
      const post = yield Post.find(savedPost[0])
      yield post.related('comments').load()
      expect(queryHelpers.formatQuery(commentsQuery.sql)).to.equal(queryHelpers.formatQuery('select * from "comments" where "post_id" = ?'))
      expect(commentsQuery.bindings).deep.equal(queryHelpers.formatBindings(savedPost))
      const comments = post.get('comments')
      expect(comments.toJSON()).to.be.an('array')
      expect(comments.size()).to.equal(2)
      expect(comments.value()[0] instanceof Comment).to.equal(true)
      expect(comments.value()[1] instanceof Comment).to.equal(true)
      yield relationFixtures.truncate(Database, 'posts')
      yield relationFixtures.truncate(Database, 'comments')
    })

    it('should be able to save related model instance with proper foriegnKey', function * () {
      class Comment extends Model {
      }
      class Post extends Model {
        comments () {
          return this.hasMany(Comment)
        }
      }
      const post = new Post()
      post.title = 'Adonis 101'
      post.body = 'A beginners guide to Adonis'
      yield post.save()
      expect(post.id).not.to.equal(undefined)
      const comment = new Comment()
      comment.body = 'Nice learning'
      yield post.comments().save(comment)
      expect(comment.post_id).to.equal(post.id)
      yield relationFixtures.truncate(Database, 'posts')
      yield relationFixtures.truncate(Database, 'comments')
    })
  })

  context('BelongsTo', function () {
    it('should return an instance of BelongsTo when relation method has been called', function () {
      class Post extends Model {
      }
      class Comment extends Model {
        post () {
          return this.belongsTo(Post)
        }
      }
      const comment = new Comment()
      expect(comment.post() instanceof BelongsTo).to.equal(true)
    })

    it('should have proper foriegn and primary keys from the related model', function () {
      class Post extends Model {
      }
      class Comment extends Model {
        post () {
          return this.belongsTo(Post)
        }
      }
      const comment = new Comment()
      expect(comment.post().toKey).to.equal('id')
      expect(comment.post().fromKey).to.equal('post_id')
    })

    it('should be able to access query builder of related model', function () {
      class Post extends Model {
      }
      class Comment extends Model {
        post () {
          return this.belongsTo(Post)
        }
      }
      const comment = new Comment()
      const relatedQuery = comment.post().where('is_draft', false).toSQL()
      expect(queryHelpers.formatQuery(relatedQuery.sql)).to.equal(queryHelpers.formatQuery('select * from "posts" where "is_draft" = ?'))
      expect(relatedQuery.bindings).deep.equal([false])
    })

    it('should be able to fetch results from related model', function * () {
      const savedPost = yield relationFixtures.createRecords(Database, 'posts', {title: 'Adonis 101', body: 'Let\'s learn Adonis', id: 23})
      const savedComment = yield relationFixtures.createRecords(Database, 'comments', {body: 'Nice article', post_id: savedPost[0]})
      let postsQuery = null
      class Post extends Model {
        static boot () {
          super.boot()
          this.onQuery(function (query) {
            postsQuery = query
          })
        }
      }
      class Comment extends Model {
        post () {
          return this.belongsTo(Post)
        }
      }
      Post.bootIfNotBooted()
      const comment = yield Comment.find(savedComment[0])
      const post = yield comment.post().fetch()
      expect(queryHelpers.formatQuery(postsQuery.sql)).to.equal(queryHelpers.formatQuery('select * from "posts" where "id" = ? limit ?'))
      expect(postsQuery.bindings).deep.equal(queryHelpers.formatBindings(savedPost.concat([1])))
      expect(post instanceof Post).to.equal(true)
      expect(comment.post_id).to.equal(post.id)
      yield relationFixtures.truncate(Database, 'posts')
      yield relationFixtures.truncate(Database, 'comments')
    })

    it('should be able to eagerLoad results from related model', function * () {
      const savedPost = yield relationFixtures.createRecords(Database, 'posts', {title: 'Adonis 101', body: 'Let\'s learn Adonis', id: 66})
      const savedComment = yield relationFixtures.createRecords(Database, 'comments', {body: 'Nice article', post_id: savedPost[0]})
      let postsQuery = null
      class Post extends Model {
        static boot () {
          super.boot()
          this.onQuery(function (query) {
            postsQuery = query
          })
        }
      }
      class Comment extends Model {
        post () {
          return this.belongsTo(Post)
        }
      }
      Post.bootIfNotBooted()
      const comment = yield Comment.query().where('id', savedComment[0]).with('post').first()
      expect(queryHelpers.formatQuery(postsQuery.sql)).to.equal(queryHelpers.formatQuery('select * from "posts" where "id" in (?)'))
      expect(postsQuery.bindings).deep.equal(queryHelpers.formatBindings(savedPost))
      expect(comment instanceof Comment).to.equal(true)
      expect(comment.get('post') instanceof Post).to.equal(true)
      expect(comment.get('post').id).to.equal(comment.post_id).to.equal(66)
      yield relationFixtures.truncate(Database, 'posts')
      yield relationFixtures.truncate(Database, 'comments')
    })

    it('should be able to eagerLoad multiple results from related model', function * () {
      const savedPost = yield relationFixtures.createRecords(Database, 'posts', {title: 'Adonis 101', body: 'Let\'s learn Adonis', id: 24})
      yield relationFixtures.createRecords(Database, 'comments', {body: 'Nice article', post_id: savedPost[0]})
      yield relationFixtures.createRecords(Database, 'comments', {body: 'Nice article', post_id: savedPost[0]})
      class Post extends Model {
      }
      class Comment extends Model {
        post () {
          return this.belongsTo(Post)
        }
      }
      let comments = yield Comment.query().with('post').fetch()
      comments = comments.toJSON()
      expect(comments[0].post_id).to.equal(comments[0].post.id)
      expect(comments[0].post_id).to.equal(comments[1].post_id)
      expect(comments[1].post_id).to.equal(comments[1].post.id)
      yield relationFixtures.truncate(Database, 'posts')
      yield relationFixtures.truncate(Database, 'comments')
    })

    it('should be able to eagerLoad multiple results with multiple parent model', function * () {
      const savedPost = yield relationFixtures.createRecords(Database, 'posts', {title: 'Adonis 101', body: 'Let\'s learn Adonis', id: 24})
      yield relationFixtures.createRecords(Database, 'comments', {body: 'Nice article', post_id: savedPost[0]})
      const savedPost1 = yield relationFixtures.createRecords(Database, 'posts', {title: 'Adonis 101', body: 'Let\'s learn Adonis', id: 66})
      yield relationFixtures.createRecords(Database, 'comments', {body: 'Nice article', post_id: savedPost1[0]})
      class Post extends Model {
      }
      class Comment extends Model {
        post () {
          return this.belongsTo(Post)
        }
      }
      let comments = yield Comment.query().with('post').fetch()
      comments = comments.toJSON()
      expect(comments[0].post_id).to.equal(comments[0].post.id)
      expect(comments[0].post_id).not.to.equal(comments[1].post_id)
      expect(comments[1].post_id).to.equal(comments[1].post.id)
      yield relationFixtures.truncate(Database, 'posts')
      yield relationFixtures.truncate(Database, 'comments')
    })

    it('should be able to associate a related model', function * () {
      class Post extends Model {
      }
      class Comment extends Model {
        post () {
          return this.belongsTo(Post)
        }
      }
      const post = new Post()
      post.title = 'Adonis 101'
      post.body = 'A nice post'
      post.id = 66
      yield post.save()
      const comment = new Comment()
      comment.body = 'I liked it'
      comment.post().associate(post)
      yield comment.save()
      expect(comment.id).not.to.equal(undefined)
      expect(comment.post_id).to.equal(post.id)
      yield relationFixtures.truncate(Database, 'posts')
      yield relationFixtures.truncate(Database, 'comments')
    })

    it('should throw an error when associate value is not an instance of related model', function * () {
      class Post extends Model {
      }
      class Comment extends Model {
        post () {
          return this.belongsTo(Post)
        }
      }
      const post = {}
      post.title = 'Adonis 101'
      post.body = 'A nice post'
      post.id = 66
      const comment = new Comment()
      comment.body = 'I liked it'
      const fn = function () {
        return comment.post().associate(post)
      }
      expect(fn).to.throw(/associate accepts an instance of related model/i)
    })

    it('should throw an error when trying to associate a related model which is unsaved', function * () {
      class Post extends Model {
      }
      class Comment extends Model {
        post () {
          return this.belongsTo(Post)
        }
      }
      const post = new Post()
      post.title = 'Adonis 101'
      post.body = 'A nice post'
      const comment = new Comment()
      comment.body = 'I liked it'
      const fn = function () {
        return comment.post().associate(post)
      }
      expect(fn).to.throw(/Cannot associate an unsaved related model/i)
    })

    it('should throw an error when trying to call save method on a belongsTo relation', function * () {
      class Post extends Model {
      }
      class Comment extends Model {
        post () {
          return this.belongsTo(Post)
        }
      }
      const post = new Post()
      post.title = 'Adonis 101'
      post.body = 'A nice post'
      const comment = new Comment()
      comment.body = 'I liked it'
      try {
        yield comment.post().save(post)
        expect(true).to.equal(false)
      } catch (e) {
        expect(e.name).to.equal('ModelRelationSaveException')
        expect(e.message).to.match(/cannot call save method on a belongsTo relation/i)
      }
    })

    it('should throw an error when trying to call create method on a belongsTo relation', function * () {
      class Post extends Model {
      }
      class Comment extends Model {
        post () {
          return this.belongsTo(Post)
        }
      }
      const post = new Post()
      post.title = 'Adonis 101'
      post.body = 'A nice post'
      const comment = new Comment()
      comment.body = 'I liked it'
      try {
        yield comment.post().create(post)
        expect(true).to.equal(false)
      } catch (e) {
        expect(e.name).to.equal('ModelRelationSaveException')
        expect(e.message).to.match(/cannot call create method on a belongsTo relation/i)
      }
    })

    it('should be able to dissociate a related model', function * () {
      const savedPost = yield relationFixtures.createRecords(Database, 'posts', {title: 'Adonis 101', body: 'Let\'s learn Adonis', id: 24})
      const savedComment = yield relationFixtures.createRecords(Database, 'comments', {body: 'Nice article', post_id: savedPost[0]})
      class Post extends Model {
      }
      class Comment extends Model {
        post () {
          return this.belongsTo(Post)
        }
      }
      const comment = yield Comment.find(savedComment[0])
      comment.post().dissociate()
      yield comment.save()
      expect(comment.post_id).to.equal(null)
      yield relationFixtures.truncate(Database, 'posts')
      yield relationFixtures.truncate(Database, 'comments')
    })
  })

  context('BelongsToMany', function () {
    it('should return an instance of BelongsToMany when relation method has been called', function () {
      class Course extends Model {
      }
      class Student extends Model {
        courses () {
          return this.belongsToMany(Course)
        }
      }
      const student = new Student()
      expect(student.courses() instanceof BelongsToMany).to.equal(true)
    })

    it('should setup proper relation keys for a given relation', function () {
      class Course extends Model {
      }
      class Student extends Model {
        courses () {
          return this.belongsToMany(Course)
        }
      }
      const student = new Student()
      const coursesRelation = student.courses()
      expect(coursesRelation.toKey).to.equal('id')
      expect(coursesRelation.fromKey).to.equal('id')
      expect(coursesRelation.pivotLocalKey).to.equal('student_id')
      expect(coursesRelation.pivotTable).to.equal('course_student')
      expect(coursesRelation.pivotOtherKey).to.equal('course_id')
    })

    it('should be able to access query builder of related model', function () {
      class Course extends Model {
      }
      class Student extends Model {
        courses () {
          return this.belongsToMany(Course)
        }
      }
      const student = new Student()
      const relatedQuery = student.courses().where('is_draft', false).toSQL()
      expect(queryHelpers.formatQuery(relatedQuery.sql)).to.equal(queryHelpers.formatQuery('select * from "courses" where "is_draft" = ?'))
      expect(relatedQuery.bindings).deep.equal([false])
    })

    it('should be able to fetch results for related model', function * () {
      const savedStudent = yield relationFixtures.createRecords(Database, 'students', {name: 'ricky'})
      const savedCourse = yield relationFixtures.createRecords(Database, 'courses', {title: 'geometry'})
      yield relationFixtures.createRecords(Database, 'course_student', {student_id: savedStudent[0], course_id: savedCourse[0]})
      let courseQuery = null
      class Course extends Model {
        static boot () {
          super.boot()
          this.onQuery(function (query) {
            courseQuery = query
          })
        }
      }
      class Student extends Model {
        courses () {
          return this.belongsToMany(Course)
        }
      }
      Course.bootIfNotBooted()
      const student = yield Student.find(savedStudent[0])
      expect(student instanceof Student).to.equal(true)
      expect(student.id).not.to.equal(undefined)
      const courses = yield student.courses().fetch()
      expect(queryHelpers.formatQuery(courseQuery.sql)).to.equal(queryHelpers.formatQuery('select "courses".*, "course_student"."student_id" as "_pivot_student_id", "course_student"."course_id" as "_pivot_course_id" from "courses" inner join "course_student" on "courses"."id" = "course_student"."course_id" where "course_student"."student_id" = ?'))
      expect(courseQuery.bindings).deep.equal(queryHelpers.formatBindings(savedStudent))
      expect(courses.value()).to.be.an('array')
      expect(courses.first()._pivot_student_id).to.equal(student.id)
      expect(courses.first()._pivot_course_id).to.equal(courses.first().id)

      yield relationFixtures.truncate(Database, 'students')
      yield relationFixtures.truncate(Database, 'courses')
      yield relationFixtures.truncate(Database, 'course_student')
    })

    it('should be able to fetch first matching result for related model', function * () {
      const savedStudent = yield relationFixtures.createRecords(Database, 'students', {name: 'ricky'})
      const savedCourse = yield relationFixtures.createRecords(Database, 'courses', {title: 'geometry'})
      yield relationFixtures.createRecords(Database, 'course_student', {student_id: savedStudent[0], course_id: savedCourse[0]})
      let courseQuery = null
      class Course extends Model {
        static boot () {
          super.boot()
          this.onQuery(function (query) {
            courseQuery = query
          })
        }
      }
      class Student extends Model {
        courses () {
          return this.belongsToMany(Course)
        }
      }
      Course.bootIfNotBooted()
      const student = yield Student.find(savedStudent[0])
      expect(student instanceof Student).to.equal(true)
      expect(student.id).not.to.equal(undefined)
      const course = yield student.courses().first()
      expect(queryHelpers.formatQuery(courseQuery.sql)).to.equal(queryHelpers.formatQuery('select "courses".*, "course_student"."student_id" as "_pivot_student_id", "course_student"."course_id" as "_pivot_course_id" from "courses" inner join "course_student" on "courses"."id" = "course_student"."course_id" where "course_student"."student_id" = ? limit ?'))
      expect(courseQuery.bindings).deep.equal(queryHelpers.formatBindings(savedStudent.concat([1])))
      expect(course instanceof Course).to.equal(true)
      expect(course._pivot_student_id).to.equal(student.id)
      expect(course._pivot_course_id).to.equal(course.id)

      yield relationFixtures.truncate(Database, 'students')
      yield relationFixtures.truncate(Database, 'courses')
      yield relationFixtures.truncate(Database, 'course_student')
    })

    it('should be able to eagerLoad matching result for related model', function * () {
      const savedStudent = yield relationFixtures.createRecords(Database, 'students', {name: 'ricky', id: 29})
      const savedCourse = yield relationFixtures.createRecords(Database, 'courses', {title: 'geometry'})
      yield relationFixtures.createRecords(Database, 'course_student', {student_id: savedStudent[0], course_id: savedCourse[0]})
      let courseQuery = null
      class Course extends Model {
        static boot () {
          super.boot()
          this.onQuery(function (query) {
            courseQuery = query
          })
        }
      }
      class Student extends Model {
        courses () {
          return this.belongsToMany(Course)
        }
      }
      Course.bootIfNotBooted()
      const student = yield Student.query().where('id', savedStudent[0]).with('courses').first()
      expect(student instanceof Student).to.equal(true)
      expect(student.id).not.to.equal(undefined)
      expect(queryHelpers.formatQuery(courseQuery.sql)).to.equal(queryHelpers.formatQuery('select "courses".*, "course_student"."student_id" as "_pivot_student_id", "course_student"."course_id" as "_pivot_course_id" from "courses" inner join "course_student" on "courses"."id" = "course_student"."course_id" where "course_student"."student_id" in (?)'))
      expect(courseQuery.bindings).deep.equal(queryHelpers.formatBindings(savedStudent))
      const jsoned = student.toJSON()
      expect(jsoned).to.have.property('courses')
      expect(jsoned.courses).to.be.an('array')
      expect(jsoned.courses[0]._pivot_student_id).to.equal(student.id)
      yield relationFixtures.truncate(Database, 'students')
      yield relationFixtures.truncate(Database, 'courses')
      yield relationFixtures.truncate(Database, 'course_student')
    })

    it('should be able to eagerLoad multiple matching result for related model', function * () {
      const savedStudent = yield relationFixtures.createRecords(Database, 'students', {name: 'ricky', id: 29})
      const savedCourse = yield relationFixtures.createRecords(Database, 'courses', {title: 'geometry', id: 12})
      const savedCourse1 = yield relationFixtures.createRecords(Database, 'courses', {title: 'maths', id: 13})
      yield relationFixtures.createRecords(Database, 'course_student', [{student_id: savedStudent[0], course_id: savedCourse[0]}, {student_id: savedStudent[0], course_id: savedCourse1[0]}])
      let courseQuery = null
      class Course extends Model {
        static boot () {
          super.boot()
          this.onQuery(function (query) {
            courseQuery = query
          })
        }
      }
      class Student extends Model {
        courses () {
          return this.belongsToMany(Course)
        }
      }
      Course.bootIfNotBooted()
      const student = yield Student.query().where('id', savedStudent[0]).with('courses').first()
      expect(student instanceof Student).to.equal(true)
      expect(student.id).not.to.equal(undefined)
      expect(queryHelpers.formatQuery(courseQuery.sql)).to.equal(queryHelpers.formatQuery('select "courses".*, "course_student"."student_id" as "_pivot_student_id", "course_student"."course_id" as "_pivot_course_id" from "courses" inner join "course_student" on "courses"."id" = "course_student"."course_id" where "course_student"."student_id" in (?)'))
      expect(courseQuery.bindings).deep.equal(queryHelpers.formatBindings(savedStudent))
      const jsoned = student.toJSON()
      expect(jsoned).to.have.property('courses')
      expect(jsoned.courses).to.be.an('array')
      expect(jsoned.courses.length).to.equal(2)
      yield relationFixtures.truncate(Database, 'students')
      yield relationFixtures.truncate(Database, 'courses')
      yield relationFixtures.truncate(Database, 'course_student')
    })

    it('should be able to add query constraints pivotTable on runtime', function * () {
      const savedStudent = yield relationFixtures.createRecords(Database, 'students', {name: 'ricky', id: 29})
      const savedCourse = yield relationFixtures.createRecords(Database, 'courses', {title: 'geometry', id: 12})
      const savedCourse1 = yield relationFixtures.createRecords(Database, 'courses', {title: 'maths', id: 13})
      yield relationFixtures.createRecords(Database, 'course_student', [{student_id: savedStudent[0], course_id: savedCourse[0], is_enrolled: 1}, {student_id: savedStudent[0], course_id: savedCourse1[0], is_enrolled: 0}])
      let courseQuery = null
      class Course extends Model {
        static boot () {
          super.boot()
          this.onQuery(function (query) {
            courseQuery = query
          })
        }
      }
      class Student extends Model {
        courses () {
          return this.belongsToMany(Course)
        }
      }
      Course.bootIfNotBooted()
      const student = yield Student.query().where('id', savedStudent[0]).with('courses').scope('courses', function (builder) {
        builder.wherePivot('is_enrolled', 1)
      }).first()
      expect(student instanceof Student).to.equal(true)
      expect(student.id).not.to.equal(undefined)
      expect(queryHelpers.formatQuery(courseQuery.sql)).to.equal(queryHelpers.formatQuery('select "courses".*, "course_student"."student_id" as "_pivot_student_id", "course_student"."course_id" as "_pivot_course_id" from "courses" inner join "course_student" on "courses"."id" = "course_student"."course_id" where "course_student"."is_enrolled" = ? and "course_student"."student_id" in (?)'))
      expect(courseQuery.bindings).deep.equal(queryHelpers.formatBindings([1].concat(savedStudent)))
      const jsoned = student.toJSON()
      expect(jsoned).to.have.property('courses')
      expect(jsoned.courses).to.be.an('array')
      expect(jsoned.courses.length).to.equal(1)
      yield relationFixtures.truncate(Database, 'students')
      yield relationFixtures.truncate(Database, 'courses')
      yield relationFixtures.truncate(Database, 'course_student')
    })

    it('should be able to eagerLoad related model from parent model instance', function * () {
      const savedStudent = yield relationFixtures.createRecords(Database, 'students', {name: 'ricky', id: 29})
      const savedCourse = yield relationFixtures.createRecords(Database, 'courses', {title: 'geometry', id: 12})
      const savedCourse1 = yield relationFixtures.createRecords(Database, 'courses', {title: 'maths', id: 13})
      yield relationFixtures.createRecords(Database, 'course_student', [{student_id: savedStudent[0], course_id: savedCourse[0]}, {student_id: savedStudent[0], course_id: savedCourse1[0]}])
      let courseQuery = null
      class Course extends Model {
        static boot () {
          super.boot()
          this.onQuery(function (query) {
            courseQuery = query
          })
        }
      }
      class Student extends Model {
        courses () {
          return this.belongsToMany(Course)
        }
      }
      Course.bootIfNotBooted()
      const student = yield Student.find(savedStudent[0])
      expect(student instanceof Student).to.equal(true)
      expect(student.id).to.equal(savedStudent[0])
      yield student.related('courses').load()
      const courses = student.get('courses')
      expect(queryHelpers.formatQuery(courseQuery.sql)).to.equal(queryHelpers.formatQuery('select "courses".*, "course_student"."student_id" as "_pivot_student_id", "course_student"."course_id" as "_pivot_course_id" from "courses" inner join "course_student" on "courses"."id" = "course_student"."course_id" where "course_student"."student_id" = ?'))
      expect(courseQuery.bindings).deep.equal(queryHelpers.formatBindings(savedStudent))
      expect(courses.size()).to.equal(2)
      expect(courses.first() instanceof Course).to.equal(true)
      expect(courses.first()._pivot_student_id).to.equal(student.id)
      expect(courses.last()._pivot_student_id).to.equal(student.id)
      yield relationFixtures.truncate(Database, 'students')
      yield relationFixtures.truncate(Database, 'courses')
      yield relationFixtures.truncate(Database, 'course_student')
    })

    it('should throw an error when not passing array of object to the attach method', function * () {
      const savedStudent = yield relationFixtures.createRecords(Database, 'students', {name: 'ricky', id: 29})
      class Course extends Model {
      }
      class Student extends Model {
        courses () {
          return this.belongsToMany(Course)
        }
      }
      Course.bootIfNotBooted()
      const student = yield Student.find(savedStudent[0])
      expect(student instanceof Student).to.equal(true)
      expect(student.id).to.equal(savedStudent[0])
      try {
        yield student.courses().attach('foo')
        expect(true).to.equal(false)
      } catch (e) {
        expect(e.name).to.equal('ModelRelationAttachException')
        expect(e.message).to.match(/attach expects an array or an object of values to be attached/i)
      }
      yield relationFixtures.truncate(Database, 'students')
    })

    it('should be able to attach related models with their ids', function * () {
      const savedStudent = yield relationFixtures.createRecords(Database, 'students', {name: 'ricky', id: 29})
      const savedCourse = yield relationFixtures.createRecords(Database, 'courses', {title: 'geometry', id: 12})
      class Course extends Model {
      }
      class Student extends Model {
        courses () {
          return this.belongsToMany(Course)
        }
      }
      Course.bootIfNotBooted()
      const student = yield Student.find(savedStudent[0])
      expect(student instanceof Student).to.equal(true)
      expect(student.id).to.equal(savedStudent[0])
      yield student.courses().attach(savedCourse)
      const courses = yield student.courses().fetch()
      expect(courses.size()).to.equal(1)
      expect(courses.isArray()).to.equal(true)
      expect(courses.first()._pivot_course_id).to.equal(savedCourse[0])
      expect(courses.first()._pivot_student_id).to.equal(savedStudent[0])
      yield relationFixtures.truncate(Database, 'students')
      yield relationFixtures.truncate(Database, 'courses')
      yield relationFixtures.truncate(Database, 'course_student')
    })

    it('should be able to attach multiple related models with their ids', function * () {
      const savedStudent = yield relationFixtures.createRecords(Database, 'students', {name: 'ricky', id: 29})
      const savedCourse = yield relationFixtures.createRecords(Database, 'courses', {title: 'geometry', id: 12})
      const savedCourse1 = yield relationFixtures.createRecords(Database, 'courses', {title: 'physics', id: 33})
      class Course extends Model {
      }
      class Student extends Model {
        courses () {
          return this.belongsToMany(Course)
        }
      }
      Course.bootIfNotBooted()
      const student = yield Student.find(savedStudent[0])
      expect(student instanceof Student).to.equal(true)
      expect(student.id).to.equal(savedStudent[0])
      yield student.courses().attach(savedCourse.concat(savedCourse1))
      const courses = yield student.courses().fetch()
      expect(courses.size()).to.equal(2)
      expect(courses.isArray()).to.equal(true)
      expect(courses.first()._pivot_course_id).to.equal(savedCourse[0]).to.equal(12)
      expect(courses.first()._pivot_student_id).to.equal(savedStudent[0]).to.equal(29)
      expect(courses.last()._pivot_course_id).to.equal(savedCourse1[0]).to.equal(33)
      expect(courses.last()._pivot_student_id).to.equal(savedStudent[0]).to.equal(29)
      yield relationFixtures.truncate(Database, 'students')
      yield relationFixtures.truncate(Database, 'courses')
      yield relationFixtures.truncate(Database, 'course_student')
    })

    it('should be able to attach extra values to pivot table', function * () {
      const savedStudent = yield relationFixtures.createRecords(Database, 'students', {name: 'ricky', id: 29})
      const savedCourse = yield relationFixtures.createRecords(Database, 'courses', {title: 'geometry', id: 12})
      class Course extends Model {
      }
      class Student extends Model {
        courses () {
          return this.belongsToMany(Course)
        }
      }

      Course.bootIfNotBooted()
      const student = yield Student.find(savedStudent[0])
      expect(student instanceof Student).to.equal(true)
      expect(student.id).to.equal(savedStudent[0])
      yield student.courses().attach(savedCourse, {is_enrolled: 1})
      const courses = yield student.courses().withPivot('is_enrolled').fetch()
      expect(courses.size()).to.equal(1)
      expect(courses.isArray()).to.equal(true)
      expect(courses.first()._pivot_course_id).to.equal(savedCourse[0]).to.equal(12)
      expect(courses.first()._pivot_student_id).to.equal(savedStudent[0]).to.equal(29)
      expect(courses.first()._pivot_is_enrolled).to.be.ok
      yield relationFixtures.truncate(Database, 'students')
      yield relationFixtures.truncate(Database, 'courses')
      yield relationFixtures.truncate(Database, 'course_student')
    })

    it('should be able to attach extra values on each key for pivot table', function * () {
      const savedStudent = yield relationFixtures.createRecords(Database, 'students', {name: 'ricky', id: 29})
      const savedCourse = yield relationFixtures.createRecords(Database, 'courses', {title: 'geometry', id: 12})
      const savedCourse1 = yield relationFixtures.createRecords(Database, 'courses', {title: 'geometry', id: 38})
      class Course extends Model {
      }
      class Student extends Model {
        courses () {
          return this.belongsToMany(Course)
        }
      }

      Course.bootIfNotBooted()
      const student = yield Student.find(savedStudent[0])
      expect(student instanceof Student).to.equal(true)
      expect(student.id).to.equal(savedStudent[0])
      const listOfCourses = {}
      listOfCourses[savedCourse[0]] = {is_enrolled: 0}
      listOfCourses[savedCourse1[0]] = {is_enrolled: 1}
      yield student.courses().attach(listOfCourses)
      const courses = yield student.courses().withPivot('is_enrolled').fetch()
      expect(courses.size()).to.equal(2)
      expect(courses.isArray()).to.equal(true)
      expect(courses.first()._pivot_is_enrolled).not.to.be.ok
      expect(courses.last()._pivot_is_enrolled).to.be.ok
      yield relationFixtures.truncate(Database, 'students')
      yield relationFixtures.truncate(Database, 'courses')
      yield relationFixtures.truncate(Database, 'course_student')
    })

    it('should be able save to related model and put relation into pivot table', function * () {
      const savedStudent = yield relationFixtures.createRecords(Database, 'students', {name: 'ricky', id: 29})
      class Course extends Model {
      }
      class Student extends Model {
        courses () {
          return this.belongsToMany(Course)
        }
      }

      Course.bootIfNotBooted()
      const student = yield Student.find(savedStudent[0])
      expect(student instanceof Student).to.equal(true)
      expect(student.id).to.equal(savedStudent[0])
      const course = new Course({title: 'chemistry'})
      yield student.courses().save(course)
      expect(course.id).not.to.equal(undefined)
      expect(course._pivot_student_id).to.equal(student.id)
      expect(course._pivot_course_id).to.equal(course.id)

      yield relationFixtures.truncate(Database, 'students')
      yield relationFixtures.truncate(Database, 'courses')
      yield relationFixtures.truncate(Database, 'course_student')
    })

    it('should be able to detach mappings from pivot table', function * () {
      const savedStudent = yield relationFixtures.createRecords(Database, 'students', {name: 'ricky', id: 29})
      const savedCourse = yield relationFixtures.createRecords(Database, 'courses', {title: 'geometry', id: 12})
      const savedCourse1 = yield relationFixtures.createRecords(Database, 'courses', {title: 'geometry', id: 38})
      yield relationFixtures.createRecords(Database, 'course_student', [{student_id: savedStudent[0], course_id: savedCourse[0]}, {student_id: savedStudent[0], course_id: savedCourse1[0]}])
      class Course extends Model {
      }
      class Student extends Model {
        courses () {
          return this.belongsToMany(Course)
        }
      }

      Course.bootIfNotBooted()
      const student = yield Student.find(savedStudent[0])
      expect(student instanceof Student).to.equal(true)
      expect(student.id).to.equal(savedStudent[0])
      yield student.courses().detach(savedCourse)
      const courses = yield student.courses().fetch()
      expect(courses.size()).to.equal(1)
      yield relationFixtures.truncate(Database, 'students')
      yield relationFixtures.truncate(Database, 'courses')
      yield relationFixtures.truncate(Database, 'course_student')
    })

    it('should be able to detach all mappings from pivot table', function * () {
      const savedStudent = yield relationFixtures.createRecords(Database, 'students', {name: 'ricky', id: 29})
      const savedCourse = yield relationFixtures.createRecords(Database, 'courses', {title: 'geometry', id: 12})
      const savedCourse1 = yield relationFixtures.createRecords(Database, 'courses', {title: 'geometry', id: 38})
      yield relationFixtures.createRecords(Database, 'course_student', [{student_id: savedStudent[0], course_id: savedCourse[0]}, {student_id: savedStudent[0], course_id: savedCourse1[0]}])
      class Course extends Model {
      }
      class Student extends Model {
        courses () {
          return this.belongsToMany(Course)
        }
      }

      Course.bootIfNotBooted()
      const student = yield Student.find(savedStudent[0])
      expect(student instanceof Student).to.equal(true)
      expect(student.id).to.equal(savedStudent[0])
      yield student.courses().detach()
      const courses = yield student.courses().fetch()
      expect(courses.size()).to.equal(0)
      yield relationFixtures.truncate(Database, 'students')
      yield relationFixtures.truncate(Database, 'courses')
      yield relationFixtures.truncate(Database, 'course_student')
    })

    it('should be detach all mappings from pivot table and attach the given ones', function * () {
      const savedStudent = yield relationFixtures.createRecords(Database, 'students', {name: 'ricky', id: 29})
      const savedCourse = yield relationFixtures.createRecords(Database, 'courses', {title: 'geometry', id: 12})
      const savedCourse1 = yield relationFixtures.createRecords(Database, 'courses', {title: 'geometry', id: 38})
      yield relationFixtures.createRecords(Database, 'course_student', [{student_id: savedStudent[0], course_id: savedCourse[0]}])
      class Course extends Model {
      }
      class Student extends Model {
        courses () {
          return this.belongsToMany(Course)
        }
      }

      Course.bootIfNotBooted()
      const student = yield Student.find(savedStudent[0])
      expect(student instanceof Student).to.equal(true)
      expect(student.id).to.equal(savedStudent[0])
      const courses = yield student.courses().fetch()
      expect(courses.size()).to.equal(1)
      expect(courses.first()._pivot_course_id).to.equal(savedCourse[0])
      expect(courses.first()._pivot_student_id).to.equal(savedStudent[0])
      yield student.courses().sync(savedCourse1)

      const newCourses = yield student.courses().fetch()
      expect(newCourses.size()).to.equal(1)
      expect(newCourses.first()._pivot_course_id).to.equal(savedCourse1[0])
      expect(newCourses.first()._pivot_student_id).to.equal(savedStudent[0])

      yield relationFixtures.truncate(Database, 'students')
      yield relationFixtures.truncate(Database, 'courses')
      yield relationFixtures.truncate(Database, 'course_student')
    })

    it('should be able create a related model and put relation into pivot table', function * () {
      const savedStudent = yield relationFixtures.createRecords(Database, 'students', {name: 'ricky', id: 29})
      class Course extends Model {
      }
      class Student extends Model {
        courses () {
          return this.belongsToMany(Course)
        }
      }

      Course.bootIfNotBooted()
      const student = yield Student.find(savedStudent[0])
      expect(student instanceof Student).to.equal(true)
      expect(student.id).to.equal(savedStudent[0])
      const course = yield student.courses().create({title: 'chemistry'})
      expect(course.id).not.to.equal(undefined)
      expect(course._pivot_student_id).to.equal(student.id)
      expect(course._pivot_course_id).to.equal(course.id)

      yield relationFixtures.truncate(Database, 'students')
      yield relationFixtures.truncate(Database, 'courses')
      yield relationFixtures.truncate(Database, 'course_student')
    })

    it('should consider pivot properties as dirty properties', function * () {
      const savedStudent = yield relationFixtures.createRecords(Database, 'students', {name: 'ricky', id: 29})
      class Course extends Model {
      }
      class Student extends Model {
        courses () {
          return this.belongsToMany(Course)
        }
      }

      Course.bootIfNotBooted()
      const student = yield Student.find(savedStudent[0])
      expect(student instanceof Student).to.equal(true)
      expect(student.id).to.equal(savedStudent[0])
      const course = yield student.courses().create({title: 'chemistry'})
      expect(course.$dirty).deep.equal({})

      yield relationFixtures.truncate(Database, 'students')
      yield relationFixtures.truncate(Database, 'courses')
      yield relationFixtures.truncate(Database, 'course_student')
    })
  })
})
