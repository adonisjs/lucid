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
const Ioc = require('adonis-fold').Ioc
const expect = chai.expect
const moment = require('moment')
const filesFixtures = require('./fixtures/files')
const relationFixtures = require('./fixtures/relations')
const config = require('./helpers/config')
const HasOne = require('../../src/Lucid/Relations/HasOne')
const HasMany = require('../../src/Lucid/Relations/HasMany')
const BelongsTo = require('../../src/Lucid/Relations/BelongsTo')
const BelongsToMany = require('../../src/Lucid/Relations/BelongsToMany')
const HasManyThrough = require('../../src/Lucid/Relations/HasManyThrough')
const queryHelpers = require('./helpers/query')
require('co-mocha')

describe('Relations', function () {
  before(function * () {
    Database._setConfigProvider(config)
    Ioc.bind('Adonis/Src/Database', function () {
      return Database
    })
    Ioc.bind('Adonis/Src/Helpers', function () {
      return {
        makeNameSpace: function (hook) {
          return `App/${hook}`
        }
      }
    })
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

    it('should return an instance of HasOne when relation is a namespace', function () {
      class Account extends Model {
      }
      Ioc.bind('App/Account', function () {
        return Account
      })
      class Supplier extends Model {
        account () {
          return this.hasOne('App/Account')
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
      expect(sql.bindings).deep.equal(queryHelpers.formatBindings(['joana', 22]))
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
        expect(e.name).to.equal('ModelRelationException')
        expect(e.message).to.equal('E_UNSAVED_MODEL_INSTANCE: Cannot perform fetch on Account model since Supplier instance is unsaved')
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

    it('should return null when unable to fetch related results via eager loading', function * () {
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
        expect(e.name).to.equal('ModelRelationException')
        expect(e.message).to.equal('E_MISSING_DATABASE_RELATION: profiles is not defined on Supplier model as a relationship')
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

    it('should be able to paginate when eagerLoading relations', function * () {
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
      const suppliers = yield Supplier.query().with('account').paginate(1, 3)
      const suppliersJSON = suppliers.toJSON()
      expect(queryHelpers.formatQuery(parentQuery.sql)).to.equal(queryHelpers.formatQuery('select * from "suppliers" limit ?'))
      expect(queryHelpers.formatQuery(relatedQuery.sql)).to.equal(queryHelpers.formatQuery('select * from "accounts" where "supplier_id" in (?, ?, ?)'))
      expect(parentQuery.bindings).deep.equal(queryHelpers.formatBindings([3]))
      expect(relatedQuery.bindings).deep.equal(queryHelpers.formatBindings([1, 2, 3]))
      suppliers.each(function (supplier) {
        expect(supplier.id).to.equal(supplier.get('account').supplier_id)
      })
      expect(suppliersJSON.data).to.have.length.below(4)
      expect(suppliersJSON).has.property('total')
      expect(suppliersJSON).has.property('perPage')
      expect(suppliersJSON).has.property('lastPage')
      expect(suppliersJSON).has.property('currentPage')
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

    it('should be able to save related model instance', function * () {
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
    })

    it('should throw error when trying to saveMany model instances', function * () {
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
      try {
        yield supplier.account().saveMany([account])
        expect(true).to.equal(false)
      } catch (e) {
        expect(e.name).to.equal('ModelRelationException')
        expect(e.message).to.equal('E_INVALID_RELATION_METHOD: saveMany is not supported by HasOne relationship')
      } finally {
        yield relationFixtures.truncate(Database, 'suppliers')
      }
    })

    it('should throw error when trying to createMany model instances', function * () {
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
      try {
        yield supplier.account().createMany([account])
        expect(true).to.equal(false)
      } catch (e) {
        expect(e.name).to.equal('ModelRelationException')
        expect(e.message).to.equal('E_INVALID_RELATION_METHOD: createMany is not supported by HasOne relationship')
      } finally {
        yield relationFixtures.truncate(Database, 'suppliers')
      }
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
        expect(e.name).to.equal('ModelRelationException')
        expect(e.message).to.equal('E_INVALID_RELATION_INSTANCE: save accepts an instance of related model')
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
        expect(e.name).to.equal('ModelRelationException')
        expect(e.message).to.equal('E_UNSAVED_MODEL_INSTANCE: Cannot perform save on Account model since Supplier instance is unsaved')
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

    it('should be able to eagerLoad relations for a model instance by passing an array of relations', function * () {
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
      yield supplier.related(['account']).load()
      expect(queryHelpers.formatQuery(accountQuery.sql)).to.equal(queryHelpers.formatQuery('select * from "accounts" where "supplier_id" = ? limit ?'))
      expect(accountQuery.bindings).deep.equal(queryHelpers.formatBindings(savedSupplier.concat([1])))
      expect(supplier.get('account') instanceof Account).to.equal(true)
      yield relationFixtures.truncate(Database, 'suppliers')
      yield relationFixtures.truncate(Database, 'accounts')
    })

    it('should be able to define eagerLoad scope using model instance', function * () {
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
      yield supplier.related('account').scope('account', function (builder) {
        builder.whereNull('created_at')
      }).load()
      expect(queryHelpers.formatQuery(accountQuery.sql)).to.equal(queryHelpers.formatQuery('select * from "accounts" where "created_at" is null and "supplier_id" = ? limit ?'))
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

    it('should be able increment the values on the relationship', function * () {
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
      const query = supplier.account().increment('points').toSQL()
      expect(queryHelpers.formatQuery(query.sql)).to.equal(queryHelpers.formatQuery('update "accounts" set "points" = "points" + 1 where "supplier_id" = ?'))
      expect(query.bindings).deep.equal(queryHelpers.formatBindings([savedSupplier[0]]))
      yield relationFixtures.truncate(Database, 'suppliers')
      yield relationFixtures.truncate(Database, 'accounts')
    })

    it('should be able decrement the values on the relationship', function * () {
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
      const query = supplier.account().decrement('points').toSQL()
      expect(queryHelpers.formatQuery(query.sql)).to.equal(queryHelpers.formatQuery('update "accounts" set "points" = "points" - 1 where "supplier_id" = ?'))
      expect(query.bindings).deep.equal(queryHelpers.formatBindings([savedSupplier[0]]))
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
      expect(relatedQuery.bindings).deep.equal(queryHelpers.formatBindings([false]))
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

    it('should be able to paginate results from related model', function * () {
      const savedPost = yield relationFixtures.createRecords(Database, 'posts', {title: 'Adonis 101', body: 'Let\'s learn Adonis'})
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
      const comments = yield post.comments().paginate(1)
      expect(queryHelpers.formatQuery(commentsQuery.sql)).to.equal(queryHelpers.formatQuery('select * from "comments" where "post_id" = ? limit ?'))
      expect(commentsQuery.bindings).deep.equal(queryHelpers.formatBindings(savedPost.concat([20])))
      expect(comments.toJSON().data).to.be.an('array')
      expect(comments.toJSON()).to.contain.any.keys('total', 'perPage', 'currentPage', 'lastPage')
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

    it('should be able to create related model instance with proper foriegnKey', function * () {
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
      const comment = yield post.comments().create({body: 'Nice learning'})
      expect(comment.post_id).to.equal(post.id)
      expect(comment.body).to.equal('Nice learning')
      yield relationFixtures.truncate(Database, 'posts')
      yield relationFixtures.truncate(Database, 'comments')
    })

    it('should be able to create many related model instances with createMany', function * () {
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
      const comments = yield post.comments().createMany([{body: 'Nice learning'}, {body: 'Foo bar'}])
      expect(comments).to.be.an('array')
      expect(comments.length).to.equal(2)
      comments.forEach(function (comment) {
        expect(comment.post_id).to.equal(post.id)
      })
      yield relationFixtures.truncate(Database, 'posts')
      yield relationFixtures.truncate(Database, 'comments')
    })

    it('should be able to save many related model instances with saveMany', function * () {
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
      const comment1 = new Comment()
      comment1.body = 'Nice learning'
      const comment2 = new Comment()
      comment1.body = 'Foo bar'
      yield post.comments().saveMany([comment1, comment2])
      expect(comment1.post_id).to.equal(post.id)
      expect(comment2.post_id).to.equal(post.id)
      yield relationFixtures.truncate(Database, 'posts')
      yield relationFixtures.truncate(Database, 'comments')
    })

    it('should be able to increment the values on the relationship', function * () {
      const savedPost = yield relationFixtures.createRecords(Database, 'posts', {title: 'Adonis 101', body: 'Let\'s learn Adonis'})
      yield relationFixtures.createRecords(Database, 'comments', [{body: 'Nice article', post_id: savedPost[0]}, {body: 'Another article', post_id: savedPost[0]}])

      class Comment extends Model {
      }

      class Post extends Model {
        comments () {
          return this.hasMany(Comment)
        }
      }

      const post = yield Post.find(savedPost[0])
      const query = yield post.comments().increment('likes').toSQL()
      expect(queryHelpers.formatQuery(query.sql)).to.equal(queryHelpers.formatQuery('update "comments" set "likes" = "likes" + 1 where "post_id" = ?'))
      expect(query.bindings).deep.equal(queryHelpers.formatBindings([savedPost[0]]))
      yield relationFixtures.truncate(Database, 'posts')
      yield relationFixtures.truncate(Database, 'comments')
    })

    it('should be able to decrement the values on the relationship', function * () {
      const savedPost = yield relationFixtures.createRecords(Database, 'posts', {title: 'Adonis 101', body: 'Let\'s learn Adonis'})
      yield relationFixtures.createRecords(Database, 'comments', [{body: 'Nice article', post_id: savedPost[0]}, {body: 'Another article', post_id: savedPost[0]}])

      class Comment extends Model {
      }

      class Post extends Model {
        comments () {
          return this.hasMany(Comment)
        }
      }

      const post = yield Post.find(savedPost[0])
      const query = yield post.comments().decrement('likes').toSQL()
      expect(queryHelpers.formatQuery(query.sql)).to.equal(queryHelpers.formatQuery('update "comments" set "likes" = "likes" - 1 where "post_id" = ?'))
      expect(query.bindings).deep.equal(queryHelpers.formatBindings([savedPost[0]]))
      yield relationFixtures.truncate(Database, 'posts')
      yield relationFixtures.truncate(Database, 'comments')
    })

    it('should be able to count the number of related rows', function * () {
      const savedPost = yield relationFixtures.createRecords(Database, 'posts', {title: 'Adonis 101', body: 'Let\'s learn Adonis'})
      yield relationFixtures.createRecords(Database, 'comments', [{body: 'Nice article', post_id: savedPost[0]}, {body: 'Another article', post_id: savedPost[0]}])

      class Comment extends Model {
      }

      class Post extends Model {
        comments () {
          return this.hasMany(Comment)
        }
      }

      const post = yield Post.find(savedPost[0])
      const query = yield post.comments().count('* as total').toSQL()
      expect(queryHelpers.formatQuery(query.sql)).to.equal(queryHelpers.formatQuery('select count(*) as "total" from "comments" where "post_id" = ?'))
      expect(query.bindings).deep.equal(queryHelpers.formatBindings([savedPost[0]]))
      yield relationFixtures.truncate(Database, 'posts')
      yield relationFixtures.truncate(Database, 'comments')
    })

    it('should be able to fetch ids from the relationship', function * () {
      const savedPost = yield relationFixtures.createRecords(Database, 'posts', {title: 'Adonis 101', body: 'Let\'s learn Adonis'})
      yield relationFixtures.createRecords(Database, 'comments', [{body: 'Nice article', post_id: savedPost[0]}, {body: 'Another article', post_id: savedPost[0]}])

      class Comment extends Model {
      }

      class Post extends Model {
        comments () {
          return this.hasMany(Comment)
        }
      }

      const post = yield Post.find(savedPost[0])
      const query = yield post.comments().ids().toSQL()
      expect(queryHelpers.formatQuery(query.sql)).to.equal(queryHelpers.formatQuery('select "id", "id" from "comments" where "post_id" = ?'))
      expect(query.bindings).deep.equal(queryHelpers.formatBindings([savedPost[0]]))
      yield relationFixtures.truncate(Database, 'posts')
      yield relationFixtures.truncate(Database, 'comments')
    })

    it('should be able to fetch ids from the relationship', function * () {
      const savedPost = yield relationFixtures.createRecords(Database, 'posts', {title: 'Adonis 101', body: 'Let\'s learn Adonis'})
      yield relationFixtures.createRecords(Database, 'comments', [{body: 'Nice article', post_id: savedPost[0]}, {body: 'Another article', post_id: savedPost[0]}])

      class Comment extends Model {
      }

      class Post extends Model {
        comments () {
          return this.hasMany(Comment)
        }
      }

      const post = yield Post.find(savedPost[0])
      const query = yield post.comments().ids().toSQL()
      expect(queryHelpers.formatQuery(query.sql)).to.equal(queryHelpers.formatQuery('select "id", "id" from "comments" where "post_id" = ?'))
      expect(query.bindings).deep.equal(queryHelpers.formatBindings([savedPost[0]]))
      yield relationFixtures.truncate(Database, 'posts')
      yield relationFixtures.truncate(Database, 'comments')
    })

    it('should be able to fetch key/value pair of two fields from the relationship', function * () {
      const savedPost = yield relationFixtures.createRecords(Database, 'posts', {title: 'Adonis 101', body: 'Let\'s learn Adonis'})
      yield relationFixtures.createRecords(Database, 'comments', [{body: 'Nice article', post_id: savedPost[0]}, {body: 'Another article', post_id: savedPost[0]}])
      let commentsQuery = null

      class Comment extends Model {
        static boot () {
          super.boot()
          this.onQuery((query) => {
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
      const comments = yield post.comments().pair('id', 'body')
      expect(comments).deep.equal({'1': 'Nice article', 2: 'Another article'})
      expect(queryHelpers.formatQuery(commentsQuery.sql)).to.equal(queryHelpers.formatQuery('select "id", "body" from "comments" where "post_id" = ?'))
      expect(commentsQuery.bindings).deep.equal(queryHelpers.formatBindings([savedPost[0]]))
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
      expect(relatedQuery.bindings).deep.equal(queryHelpers.formatBindings([false]))
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
      expect(fn).to.throw('ModelRelationException: E_INVALID_RELATION_INSTANCE: associate accepts an instance of related model')
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
      expect(fn).to.throw('ModelRelationException: E_UNSAVED_MODEL_INSTANCE: Cannot perform associate on Post model since Comment instance is unsaved')
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
        expect(e.name).to.equal('ModelRelationException')
        expect(e.message).to.equal('E_INVALID_RELATION_METHOD: save is not supported by BelongsTo relationship')
      }
    })

    it('should throw an error when trying to call saveMany method on a belongsTo relation', function * () {
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
        yield comment.post().saveMany([post])
        expect(true).to.equal(false)
      } catch (e) {
        expect(e.name).to.equal('ModelRelationException')
        expect(e.message).to.equal('E_INVALID_RELATION_METHOD: saveMany is not supported by BelongsTo relationship')
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
        expect(e.name).to.equal('ModelRelationException')
        expect(e.message).to.equal('E_INVALID_RELATION_METHOD: create is not supported by BelongsTo relationship')
      }
    })

    it('should throw an error when trying to call createMany method on a belongsTo relation', function * () {
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
        yield comment.post().createMany([post])
        expect(true).to.equal(false)
      } catch (e) {
        expect(e.name).to.equal('ModelRelationException')
        expect(e.message).to.equal('E_INVALID_RELATION_METHOD: createMany is not supported by BelongsTo relationship')
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
      expect(relatedQuery.bindings).deep.equal(queryHelpers.formatBindings([false]))
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

    it('should be able to paginate results for related model', function * () {
      const savedStudent = yield relationFixtures.createRecords(Database, 'students', {name: 'ricky'})
      const savedCourse = yield relationFixtures.createRecords(Database, 'courses', {title: 'geometry'})
      const savedCourse1 = yield relationFixtures.createRecords(Database, 'courses', {title: 'maths'})
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
      expect(student.id).not.to.equal(undefined)
      const courses = yield student.courses().paginate(1, 2)
      expect(queryHelpers.formatQuery(courseQuery.sql)).to.equal(queryHelpers.formatQuery('select "courses".*, "course_student"."student_id" as "_pivot_student_id", "course_student"."course_id" as "_pivot_course_id" from "courses" inner join "course_student" on "courses"."id" = "course_student"."course_id" where "course_student"."student_id" = ? limit ?'))
      expect(courseQuery.bindings).deep.equal(queryHelpers.formatBindings(savedStudent.concat([2])))
      expect(courses.toJSON().data).to.be.an('array')
      expect(courses.toJSON()).to.contain.any.keys('total', 'perPage', 'currentPage', 'lastPage')
      expect(courses.first()._pivot_student_id).to.equal(student.id)
      expect(courses.first()._pivot_course_id).to.equal(courses.first().id)

      yield relationFixtures.truncate(Database, 'students')
      yield relationFixtures.truncate(Database, 'courses')
      yield relationFixtures.truncate(Database, 'course_student')
    })

    it('should throw an error when trying to fetch related model from unsaved instance', function * () {
      class Course extends Model {
      }
      class Student extends Model {
        courses () {
          return this.belongsToMany(Course)
        }
      }
      Course.bootIfNotBooted()
      const student = new Student()
      expect(student instanceof Student).to.equal(true)
      try {
        yield student.courses().fetch()
        expect(true).to.equal(false)
      } catch (e) {
        expect(e.name).to.equal('ModelRelationException')
        expect(e.message).to.equal('E_UNSAVED_MODEL_INSTANCE: Cannot perform fetch on Course model since Student instance is unsaved')
      }
    })

    it('should throw an error when trying to fetch first row of related model from unsaved instance', function * () {
      class Course extends Model {
      }
      class Student extends Model {
        courses () {
          return this.belongsToMany(Course)
        }
      }
      Course.bootIfNotBooted()
      const student = new Student()
      expect(student instanceof Student).to.equal(true)
      try {
        yield student.courses().first()
        expect(true).to.equal(false)
      } catch (e) {
        expect(e.name).to.equal('ModelRelationException')
        expect(e.message).to.equal('E_UNSAVED_MODEL_INSTANCE: Cannot perform fetch on Course model since Student instance is unsaved')
      }
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
        expect(e.name).to.equal('InvalidArgumentException')
        expect(e.message).to.equal('E_INVALID_PARAMETER: attach expects an array of values or a plain object')
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

    it('should be able to query multiple extra values from pivot table', function * () {
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
      yield student.courses().attach(savedCourse, {is_enrolled: 1, lessons_done: 2})
      const courses = yield student.courses().withPivot('is_enrolled', 'lessons_done').fetch()
      expect(courses.size()).to.equal(1)
      expect(courses.isArray()).to.equal(true)
      expect(courses.first()._pivot_course_id).to.equal(savedCourse[0]).to.equal(12)
      expect(courses.first()._pivot_student_id).to.equal(savedStudent[0]).to.equal(29)
      expect(courses.first()._pivot_is_enrolled).to.be.ok
      expect(courses.first()._pivot_lessons_done).to.equal(2)
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

    it('should be able save many instances of related model and put relation into pivot table', function * () {
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
      const course1 = new Course({title: 'chemistry'})
      const course2 = new Course({title: 'english'})
      yield student.courses().saveMany([course1, course2])
      expect(course1.id).not.to.equal(undefined)
      expect(course1._pivot_student_id).to.equal(student.id)
      expect(course1._pivot_course_id).to.equal(course1.id)
      expect(course2.id).not.to.equal(undefined)
      expect(course2._pivot_student_id).to.equal(student.id)
      expect(course2._pivot_course_id).to.equal(course2.id)

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

    it('should be able to create many related models and put relation into pivot table', function * () {
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
      const courses = yield student.courses().createMany([{title: 'chemistry'}, {title: 'english'}])
      expect(courses).to.be.an('array')
      expect(courses.length).to.equal(2)
      courses.forEach(function (course) {
        expect(course.id).not.to.equal(undefined)
        expect(course._pivot_student_id).to.equal(student.id)
        expect(course._pivot_course_id).to.equal(course.id)
      })
      yield relationFixtures.truncate(Database, 'students')
      yield relationFixtures.truncate(Database, 'courses')
      yield relationFixtures.truncate(Database, 'course_student')
    })

    it('should throw an error when trying not passing related model instance to the save method', function * () {
      const savedStudent = yield relationFixtures.createRecords(Database, 'students', {name: 'ricky'})
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
        yield student.courses().save({title: 'chemistry'})
        expect(true).to.equal(false)
      } catch (e) {
        expect(e.name).to.equal('ModelRelationException')
        expect(e.message).to.equal('E_INVALID_RELATION_INSTANCE: save expects an instance of related model')
      }
      yield relationFixtures.truncate(Database, 'students')
      yield relationFixtures.truncate(Database, 'courses')
      yield relationFixtures.truncate(Database, 'course_student')
    })

    it('should throw an error when trying not save related model instance from unsaved instance', function * () {
      class Course extends Model {
      }
      class Student extends Model {
        courses () {
          return this.belongsToMany(Course)
        }
      }

      Course.bootIfNotBooted()
      const student = new Student()
      expect(student instanceof Student).to.equal(true)
      try {
        yield student.courses().save(new Course())
        expect(true).to.equal(false)
      } catch (e) {
        expect(e.name).to.equal('ModelRelationException')
        expect(e.message).to.equal('E_UNSAVED_MODEL_INSTANCE: Cannot perform save on Course model since Student instance is unsaved')
      }
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

    it('should be able to count rows of related model', function * () {
      const savedStudent = yield relationFixtures.createRecords(Database, 'students', {name: 'ricky', id: 29})
      const savedCourse = yield relationFixtures.createRecords(Database, 'courses', {title: 'geometry', id: 12})
      yield relationFixtures.createRecords(Database, 'course_student', [{student_id: savedStudent[0], course_id: savedCourse[0]}])
      yield relationFixtures.createRecords(Database, 'course_student', [{student_id: null, course_id: savedCourse[0]}])
      class Course extends Model {
      }
      class Student extends Model {
        courses () {
          return this.belongsToMany(Course)
        }
      }

      Course.bootIfNotBooted()
      const student = yield Student.find(savedStudent[0])
      const query = student.courses().count('* as total').toSQL()
      expect(queryHelpers.formatQuery(query.sql)).to.equal(queryHelpers.formatQuery('select count(*) as "total" from "courses" inner join "course_student" on "courses"."id" = "course_student"."course_id" where "course_student"."student_id" = ?'))
      const courses = yield student.courses().count('* as total')
      expect(Number(courses[0].total)).to.equal(1)

      yield relationFixtures.truncate(Database, 'students')
      yield relationFixtures.truncate(Database, 'courses')
      yield relationFixtures.truncate(Database, 'course_student')
    })

    it('should be able to find avg of a column on related model', function * () {
      const savedStudent = yield relationFixtures.createRecords(Database, 'students', {name: 'ricky', id: 29})
      const savedCourse = yield relationFixtures.createRecords(Database, 'courses', {title: 'geometry', id: 12, weightage: 8})
      const savedCourse1 = yield relationFixtures.createRecords(Database, 'courses', {title: 'maths', id: 14, weightage: 6})
      yield relationFixtures.createRecords(Database, 'course_student', [{student_id: savedStudent[0], course_id: savedCourse[0]}])
      yield relationFixtures.createRecords(Database, 'course_student', [{student_id: savedStudent[0], course_id: savedCourse1[0]}])
      yield relationFixtures.createRecords(Database, 'course_student', [{student_id: null, course_id: savedCourse1[0]}])
      class Course extends Model {
      }
      class Student extends Model {
        courses () {
          return this.belongsToMany(Course)
        }
      }

      Course.bootIfNotBooted()
      const student = yield Student.find(savedStudent[0])
      const query = student.courses().avg('weightage').toSQL()
      expect(queryHelpers.formatQuery(query.sql)).to.equal(queryHelpers.formatQuery('select avg("weightage") from "courses" inner join "course_student" on "courses"."id" = "course_student"."course_id" where "course_student"."student_id" = ?'))
      const coursesWeightage = yield student.courses().avg('weightage as weightage')
      expect(Number(coursesWeightage[0].weightage)).to.equal(7)

      yield relationFixtures.truncate(Database, 'students')
      yield relationFixtures.truncate(Database, 'courses')
      yield relationFixtures.truncate(Database, 'course_student')
    })

    it('should be able to find max value of a column on related model', function * () {
      const savedStudent = yield relationFixtures.createRecords(Database, 'students', {name: 'ricky', id: 29})
      const savedCourse = yield relationFixtures.createRecords(Database, 'courses', {title: 'geometry', id: 12, weightage: 8})
      const savedCourse1 = yield relationFixtures.createRecords(Database, 'courses', {title: 'maths', id: 14, weightage: 6})
      yield relationFixtures.createRecords(Database, 'course_student', [{student_id: savedStudent[0], course_id: savedCourse[0]}])
      yield relationFixtures.createRecords(Database, 'course_student', [{student_id: savedStudent[0], course_id: savedCourse1[0]}])
      yield relationFixtures.createRecords(Database, 'course_student', [{student_id: null, course_id: savedCourse1[0]}])
      class Course extends Model {
      }
      class Student extends Model {
        courses () {
          return this.belongsToMany(Course)
        }
      }

      Course.bootIfNotBooted()
      const student = yield Student.find(savedStudent[0])
      const query = student.courses().min('weightage').toSQL()
      expect(queryHelpers.formatQuery(query.sql)).to.equal(queryHelpers.formatQuery('select min("weightage") from "courses" inner join "course_student" on "courses"."id" = "course_student"."course_id" where "course_student"."student_id" = ?'))
      const coursesWeightage = yield student.courses().min('weightage as weightage')
      expect(coursesWeightage[0].weightage).to.equal(6)

      yield relationFixtures.truncate(Database, 'students')
      yield relationFixtures.truncate(Database, 'courses')
      yield relationFixtures.truncate(Database, 'course_student')
    })

    it('should be able to find min value of a column on related model', function * () {
      const savedStudent = yield relationFixtures.createRecords(Database, 'students', {name: 'ricky', id: 29})
      const savedCourse = yield relationFixtures.createRecords(Database, 'courses', {title: 'geometry', id: 12, weightage: 8})
      const savedCourse1 = yield relationFixtures.createRecords(Database, 'courses', {title: 'maths', id: 14, weightage: 6})
      const savedCourse2 = yield relationFixtures.createRecords(Database, 'courses', {title: 'science', weightage: 20})
      yield relationFixtures.createRecords(Database, 'course_student', [{student_id: savedStudent[0], course_id: savedCourse[0]}])
      yield relationFixtures.createRecords(Database, 'course_student', [{student_id: savedStudent[0], course_id: savedCourse1[0]}])
      yield relationFixtures.createRecords(Database, 'course_student', [{student_id: null, course_id: savedCourse2[0]}])
      class Course extends Model {
      }
      class Student extends Model {
        courses () {
          return this.belongsToMany(Course)
        }
      }

      Course.bootIfNotBooted()
      const student = yield Student.find(savedStudent[0])
      const query = student.courses().max('weightage').toSQL()
      expect(queryHelpers.formatQuery(query.sql)).to.equal(queryHelpers.formatQuery('select max("weightage") from "courses" inner join "course_student" on "courses"."id" = "course_student"."course_id" where "course_student"."student_id" = ?'))
      const coursesWeightage = yield student.courses().max('weightage as weightage')
      expect(coursesWeightage[0].weightage).to.equal(8)

      yield relationFixtures.truncate(Database, 'students')
      yield relationFixtures.truncate(Database, 'courses')
      yield relationFixtures.truncate(Database, 'course_student')
    })

    it('should throw exception when increment is called on relationship', function * () {
      const savedStudent = yield relationFixtures.createRecords(Database, 'students', {name: 'ricky', id: 29})
      const savedCourse = yield relationFixtures.createRecords(Database, 'courses', {title: 'geometry', id: 12, weightage: 8})
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
      try {
        const weightage = yield student.courses().increment('weightage')
        expect(weightage).to.not.exist
      } catch (e) {
        expect(e.message).to.equal('E_INVALID_RELATION_METHOD: increment is not supported by BelongsToMany relationship')
      } finally {
        yield relationFixtures.truncate(Database, 'students')
        yield relationFixtures.truncate(Database, 'courses')
        yield relationFixtures.truncate(Database, 'course_student')
      }
    })

    it('should throw exception when decrement is called on relationship', function * () {
      const savedStudent = yield relationFixtures.createRecords(Database, 'students', {name: 'ricky', id: 29})
      const savedCourse = yield relationFixtures.createRecords(Database, 'courses', {title: 'geometry', id: 12, weightage: 8})
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
      try {
        const weightage = yield student.courses().decrement('weightage')
        expect(weightage).to.not.exist
      } catch (e) {
        expect(e.message).to.equal('E_INVALID_RELATION_METHOD: decrement is not supported by BelongsToMany relationship')
      } finally {
        yield relationFixtures.truncate(Database, 'students')
        yield relationFixtures.truncate(Database, 'courses')
        yield relationFixtures.truncate(Database, 'course_student')
      }
    })

    it('should be able to pick ids for the related table', function * () {
      const savedStudent = yield relationFixtures.createRecords(Database, 'students', {name: 'ricky', id: 29})
      const savedCourse = yield relationFixtures.createRecords(Database, 'courses', {title: 'geometry', id: 12, weightage: 8})
      const savedCourse1 = yield relationFixtures.createRecords(Database, 'courses', {title: 'maths', id: 14, weightage: 6})
      const savedCourse2 = yield relationFixtures.createRecords(Database, 'courses', {title: 'science', weightage: 20})
      yield relationFixtures.createRecords(Database, 'course_student', [{student_id: savedStudent[0], course_id: savedCourse[0]}])
      yield relationFixtures.createRecords(Database, 'course_student', [{student_id: savedStudent[0], course_id: savedCourse1[0]}])
      yield relationFixtures.createRecords(Database, 'course_student', [{student_id: null, course_id: savedCourse2[0]}])
      class Course extends Model {
      }
      class Student extends Model {
        courses () {
          return this.belongsToMany(Course)
        }
      }

      Course.bootIfNotBooted()
      const student = yield Student.find(savedStudent[0])
      const coursesIds = yield student.courses().ids()
      expect(coursesIds).deep.equal([12, 14])

      yield relationFixtures.truncate(Database, 'students')
      yield relationFixtures.truncate(Database, 'courses')
      yield relationFixtures.truncate(Database, 'course_student')
    })

    it('should be able to pick key/value pair for the related table', function * () {
      const savedStudent = yield relationFixtures.createRecords(Database, 'students', {name: 'ricky', id: 29})
      const savedCourse = yield relationFixtures.createRecords(Database, 'courses', {title: 'geometry', id: 12, weightage: 8})
      const savedCourse1 = yield relationFixtures.createRecords(Database, 'courses', {title: 'maths', id: 14, weightage: 6})
      const savedCourse2 = yield relationFixtures.createRecords(Database, 'courses', {title: 'science', weightage: 20})
      yield relationFixtures.createRecords(Database, 'course_student', [{student_id: savedStudent[0], course_id: savedCourse[0]}])
      yield relationFixtures.createRecords(Database, 'course_student', [{student_id: savedStudent[0], course_id: savedCourse1[0]}])
      yield relationFixtures.createRecords(Database, 'course_student', [{student_id: null, course_id: savedCourse2[0]}])
      class Course extends Model {
      }
      class Student extends Model {
        courses () {
          return this.belongsToMany(Course)
        }
      }

      Course.bootIfNotBooted()
      const student = yield Student.find(savedStudent[0])
      const courses = yield student.courses().pair('id', 'title')
      expect(courses).deep.equal({'12': 'geometry', '14': 'maths'})

      yield relationFixtures.truncate(Database, 'students')
      yield relationFixtures.truncate(Database, 'courses')
      yield relationFixtures.truncate(Database, 'course_student')
    })

    it('should be able to select pivot table fields when eagerloading', function * () {
      const savedStudent = yield relationFixtures.createRecords(Database, 'students', {name: 'ricky', id: 29})
      const savedCourse = yield relationFixtures.createRecords(Database, 'courses', {title: 'geometry', id: 12, weightage: 8})
      yield relationFixtures.createRecords(Database, 'course_student', [{student_id: savedStudent[0], course_id: savedCourse[0], is_enrolled: 1}])
      class Course extends Model {
      }
      class Student extends Model {
        courses () {
          return this.belongsToMany(Course).withPivot('is_enrolled')
        }
      }

      Course.bootIfNotBooted()
      const students = yield Student.query().where('id', savedStudent[0]).with('courses').fetch()
      expect(students.first().get('courses').first()._pivot_is_enrolled).to.be.ok

      yield relationFixtures.truncate(Database, 'students')
      yield relationFixtures.truncate(Database, 'courses')
      yield relationFixtures.truncate(Database, 'course_student')
    })

    it('should be able to update the existing pivot table record', function * () {
      const savedStudent = yield relationFixtures.createRecords(Database, 'students', {name: 'ricky', id: 29})
      class Course extends Model {
      }
      class Student extends Model {
        courses () {
          return this.belongsToMany(Course).withPivot('is_enrolled')
        }
      }

      Course.bootIfNotBooted()
      const student = yield Student.find(savedStudent[0])
      const query = student.courses().updatePivot({is_enrolled: 0}, 12).toSQL()
      expect(queryHelpers.formatQuery(query.sql)).to.equal(queryHelpers.formatQuery('update "course_student" set "is_enrolled" = ? where "student_id" = ? and "course_id" in (?)'))
      expect(queryHelpers.formatBindings(query.bindings)).deep.equal(queryHelpers.formatBindings([0, savedStudent[0], 12]))

      yield relationFixtures.truncate(Database, 'students')
    })

    it('should be able to update all existing pivot records for a given model instance', function * () {
      const savedStudent = yield relationFixtures.createRecords(Database, 'students', {name: 'ricky', id: 29})
      class Course extends Model {
      }
      class Student extends Model {
        courses () {
          return this.belongsToMany(Course).withPivot('is_enrolled')
        }
      }

      Course.bootIfNotBooted()
      const student = yield Student.find(savedStudent[0])
      const query = student.courses().updatePivot({is_enrolled: 0}).toSQL()
      expect(queryHelpers.formatQuery(query.sql)).to.equal(queryHelpers.formatQuery('update "course_student" set "is_enrolled" = ? where "student_id" = ?'))
      expect(queryHelpers.formatBindings(query.bindings)).deep.equal(queryHelpers.formatBindings([0, savedStudent[0]]))

      yield relationFixtures.truncate(Database, 'students')
    })

    it('should be able to update selected pivot records for a given model instance', function * () {
      const savedStudent = yield relationFixtures.createRecords(Database, 'students', {name: 'ricky', id: 29})
      class Course extends Model {
      }
      class Student extends Model {
        courses () {
          return this.belongsToMany(Course).withPivot('is_enrolled')
        }
      }

      Course.bootIfNotBooted()
      const student = yield Student.find(savedStudent[0])
      const query = student.courses().updatePivot({is_enrolled: 0}, [12, 2]).toSQL()
      expect(queryHelpers.formatQuery(query.sql)).to.equal(queryHelpers.formatQuery('update "course_student" set "is_enrolled" = ? where "student_id" = ? and "course_id" in (?, ?)'))
      expect(queryHelpers.formatBindings(query.bindings)).deep.equal(queryHelpers.formatBindings([0, savedStudent[0], 12, 2]))

      yield relationFixtures.truncate(Database, 'students')
    })

    it('should be able to update the pivot table when executing updatePivot method', function * () {
      const savedStudent = yield relationFixtures.createRecords(Database, 'students', {name: 'ricky', id: 29})
      const savedCourse = yield relationFixtures.createRecords(Database, 'courses', {title: 'geometry', id: 12, weightage: 8})
      const savedCourse1 = yield relationFixtures.createRecords(Database, 'courses', {title: 'geometry', id: 14, weightage: 8})
      yield relationFixtures.createRecords(Database, 'course_student', [
        {student_id: savedStudent[0], course_id: savedCourse[0], is_enrolled: 1},
        {student_id: savedStudent[0], course_id: savedCourse1[0], is_enrolled: 1}
      ])

      class Course extends Model {
      }

      class Student extends Model {
        courses () {
          return this.belongsToMany(Course).withPivot('is_enrolled')
        }
      }

      Course.bootIfNotBooted()
      const student = yield Student.find(savedStudent[0])
      yield student.courses().updatePivot({is_enrolled: 0}, savedCourse[0])

      const studentCourses = yield student.courses().withPivot('is_enrolled').fetch()
      const isEnrolled = studentCourses.map((course) => {
        return { is_enrolled: !!course._pivot_is_enrolled, id: course.id }
      }).value()
      expect(isEnrolled).deep.equal([{is_enrolled: false, id: savedCourse[0]}, {is_enrolled: true, id: savedCourse1[0]}])

      yield relationFixtures.truncate(Database, 'students')
      yield relationFixtures.truncate(Database, 'courses')
      yield relationFixtures.truncate(Database, 'course_student')
    })

    it('should be return timestamps from the pivot table model withTimestamps method is used', function * () {
      const savedStudent = yield relationFixtures.createRecords(Database, 'students', {name: 'ricky', id: 29})
      const savedCourse = yield relationFixtures.createRecords(Database, 'courses', {title: 'geometry', id: 12})
      class Course extends Model {
      }
      class Student extends Model {
        courses () {
          return this.belongsToMany(Course).withTimestamps()
        }
      }

      Course.bootIfNotBooted()
      const student = yield Student.find(savedStudent[0])
      expect(student instanceof Student).to.equal(true)
      expect(student.id).to.equal(savedStudent[0])
      yield student.courses().attach(savedCourse, {is_enrolled: 1})
      const courses = yield student.courses().fetch()
      expect(courses.size()).to.equal(1)
      expect(courses.isArray()).to.equal(true)
      expect(courses.first()._pivot_created_at).to.equal(null)
      expect(courses.first()._pivot_updated_at).to.equal(null)
      yield relationFixtures.truncate(Database, 'students')
      yield relationFixtures.truncate(Database, 'courses')
      yield relationFixtures.truncate(Database, 'course_student')
    })

    it('should set timestamps on the pivot table when withTimestamps is set to true', function * () {
      const savedStudent = yield relationFixtures.createRecords(Database, 'students', {name: 'ricky', id: 29})
      class Course extends Model {
      }
      class Student extends Model {
        courses () {
          return this.belongsToMany(Course).withTimestamps()
        }
      }

      Course.bootIfNotBooted()
      const student = yield Student.find(savedStudent[0])
      yield student.courses().create({title: 'geometry'})
      const courses = yield student.courses().fetch()
      expect(moment(courses.first()._pivot_created_at).isValid()).to.equal(true)
      expect(moment(courses.first()._pivot_updated_at).isValid()).to.equal(true)
      yield relationFixtures.truncate(Database, 'students')
      yield relationFixtures.truncate(Database, 'courses')
      yield relationFixtures.truncate(Database, 'course_student')
    })

    it('should work fine when withTimestamps and withPivot is used together', function * () {
      const savedStudent = yield relationFixtures.createRecords(Database, 'students', {name: 'ricky', id: 29})
      class Course extends Model {
      }
      class Student extends Model {
        courses () {
          return this.belongsToMany(Course).withTimestamps().withPivot('is_enrolled')
        }
      }

      Course.bootIfNotBooted()
      const student = yield Student.find(savedStudent[0])
      yield student.courses().create({title: 'geometry'})
      const courses = yield student.courses().fetch()
      expect(moment(courses.first()._pivot_created_at).isValid()).to.equal(true)
      expect(moment(courses.first()._pivot_updated_at).isValid()).to.equal(true)
      expect(moment(courses.first()._pivot_course_id)).to.be.ok
      yield relationFixtures.truncate(Database, 'students')
      yield relationFixtures.truncate(Database, 'courses')
      yield relationFixtures.truncate(Database, 'course_student')
    })
  })

  context('HasManyThrough', function () {
    it('should return an instance of HasManyThrough when relation method has been called', function () {
      class Author extends Model {
      }
      class Publication extends Model {
      }
      class Country extends Model {
        publications () {
          return this.hasManyThrough(Publication, Author)
        }
      }
      const country = new Country()
      expect(country.publications() instanceof HasManyThrough).to.equal(true)
    })

    it('should setup proper relation keys for a given relation', function () {
      class Author extends Model {
      }
      class Publication extends Model {
      }
      class Country extends Model {
        publications () {
          return this.hasManyThrough(Publication, Author)
        }
      }
      const country = new Country()
      const countryPublications = country.publications()
      expect(countryPublications.toKey).to.equal('country_id')
      expect(countryPublications.fromKey).to.equal('id')
      expect(countryPublications.viaKey).to.equal('id')
    })

    it('should be able to get all rows using the model instance relational method', function * () {
      const savedCountry = yield relationFixtures.createRecords(Database, 'countries', {name: 'India', locale: 'IND'})
      const savedAuthor = yield relationFixtures.createRecords(Database, 'authors', {name: 'Virk', country_id: savedCountry[0]})
      yield relationFixtures.createRecords(Database, 'publications', {title: 'Adonis 101', body: 'Time to learn', author_id: savedAuthor[0]})
      let publicationQuery = null
      class Author extends Model {
      }
      class Publication extends Model {
        static boot () {
          super.boot()
          this.onQuery(function (query) {
            publicationQuery = query
          })
        }
      }
      class Country extends Model {
        publications () {
          return this.hasManyThrough(Publication, Author)
        }
      }
      Publication.bootIfNotBooted()
      const country = yield Country.find(savedCountry[0])
      const publications = yield country.publications().fetch()
      expect(queryHelpers.formatQuery(publicationQuery.sql)).to.equal(queryHelpers.formatQuery('select "publications".*, "authors"."country_id" from "publications" inner join "authors" on "authors"."id" = "publications"."author_id" where "authors"."country_id" = ?'))
      expect(publicationQuery.bindings).deep.equal(queryHelpers.formatBindings(savedCountry))
      expect(publications.size()).to.equal(1)
      expect(publications.first() instanceof Publication).to.equal(true)
      expect(publications.first().author_id).to.equal(savedAuthor[0])

      yield relationFixtures.truncate(Database, 'countries')
      yield relationFixtures.truncate(Database, 'authors')
      yield relationFixtures.truncate(Database, 'publications')
    })

    it('should be able to paginate model instance relational method', function * () {
      const savedCountry = yield relationFixtures.createRecords(Database, 'countries', {name: 'India', locale: 'IND'})
      const savedAuthor = yield relationFixtures.createRecords(Database, 'authors', {name: 'Virk', country_id: savedCountry[0]})
      const savedAuthor1 = yield relationFixtures.createRecords(Database, 'authors', {name: 'White', country_id: savedCountry[0]})
      yield relationFixtures.createRecords(Database, 'publications', [{title: 'Adonis 101', body: 'Time to learn', author_id: savedAuthor[0]}, {title: 'Routing 101', body: 'Time to learn', author_id: savedAuthor1[0]}])
      let publicationQuery = null
      class Author extends Model {
      }
      class Publication extends Model {
        static boot () {
          super.boot()
          this.onQuery(function (query) {
            publicationQuery = query
          })
        }
      }
      class Country extends Model {
        publications () {
          return this.hasManyThrough(Publication, Author)
        }
      }
      Publication.bootIfNotBooted()
      const country = yield Country.find(savedCountry[0])
      const publications = yield country.publications().paginate(1, 3)
      expect(queryHelpers.formatQuery(publicationQuery.sql)).to.equal(queryHelpers.formatQuery('select "publications".*, "authors"."country_id" from "publications" inner join "authors" on "authors"."id" = "publications"."author_id" where "authors"."country_id" = ? limit ?'))
      expect(publicationQuery.bindings).deep.equal(queryHelpers.formatBindings(savedCountry.concat([3])))
      expect(publications.toJSON().data).to.be.an('array')
      expect(publications.toJSON()).to.contain.any.keys('total', 'perPage', 'currentPage', 'lastPage')
      expect(publications.first() instanceof Publication).to.equal(true)
      expect(publications.first().author_id).to.equal(savedAuthor[0])

      yield relationFixtures.truncate(Database, 'countries')
      yield relationFixtures.truncate(Database, 'authors')
      yield relationFixtures.truncate(Database, 'publications')
    })

    it('should be able to get first row using the model instance relational method', function * () {
      const savedCountry = yield relationFixtures.createRecords(Database, 'countries', {name: 'India', locale: 'IND'})
      const savedAuthor = yield relationFixtures.createRecords(Database, 'authors', {name: 'Virk', country_id: savedCountry[0]})
      yield relationFixtures.createRecords(Database, 'publications', {title: 'Adonis 101', body: 'Time to learn', author_id: savedAuthor[0]})
      let publicationQuery = null
      class Author extends Model {
      }
      class Publication extends Model {
        static boot () {
          super.boot()
          this.onQuery(function (query) {
            publicationQuery = query
          })
        }
      }
      class Country extends Model {
        publications () {
          return this.hasManyThrough(Publication, Author)
        }
      }
      Publication.bootIfNotBooted()
      const country = yield Country.find(savedCountry[0])
      const publication = yield country.publications().first()
      expect(queryHelpers.formatQuery(publicationQuery.sql)).to.equal(queryHelpers.formatQuery('select "publications".*, "authors"."country_id" from "publications" inner join "authors" on "authors"."id" = "publications"."author_id" where "authors"."country_id" = ? limit ?'))
      expect(publicationQuery.bindings).deep.equal(queryHelpers.formatBindings(savedCountry.concat([1])))
      expect(publication instanceof Publication).to.equal(true)
      expect(publication.author_id).to.equal(savedAuthor[0])

      yield relationFixtures.truncate(Database, 'countries')
      yield relationFixtures.truncate(Database, 'authors')
      yield relationFixtures.truncate(Database, 'publications')
    })

    it('should be able to eagerLoad using static with method', function * () {
      const savedCountry = yield relationFixtures.createRecords(Database, 'countries', {name: 'India', locale: 'IND', id: 10})
      const savedAuthor = yield relationFixtures.createRecords(Database, 'authors', {name: 'Virk', country_id: savedCountry[0], id: 23})
      yield relationFixtures.createRecords(Database, 'publications', {title: 'Adonis 101', body: 'Time to learn', author_id: savedAuthor[0]})
      class Author extends Model {
      }
      class Publication extends Model {
      }
      class Country extends Model {
        publications () {
          return this.hasManyThrough(Publication, Author)
        }
      }
      Publication.bootIfNotBooted()
      const countries = yield Country.with('publications').fetch()
      expect(countries.size()).to.equal(1)
      const country = countries.first()
      expect(country instanceof Country).to.equal(true)
      expect(country.id).to.equal(savedCountry[0])
      expect(country.get('publications').first() instanceof Publication).to.equal(true)
      expect(country.get('publications').first().author_id).to.equal(savedAuthor[0])

      yield relationFixtures.truncate(Database, 'countries')
      yield relationFixtures.truncate(Database, 'authors')
      yield relationFixtures.truncate(Database, 'publications')
    })

    it('should be able to eagerLoad through model instance', function * () {
      const savedCountry = yield relationFixtures.createRecords(Database, 'countries', {name: 'India', locale: 'IND', id: 11})
      const savedAuthor = yield relationFixtures.createRecords(Database, 'authors', {name: 'Virk', country_id: savedCountry[0], id: 23})
      yield relationFixtures.createRecords(Database, 'publications', {title: 'Adonis 101', body: 'Time to learn', author_id: savedAuthor[0]})
      class Author extends Model {
      }
      class Publication extends Model {
      }
      class Country extends Model {
        publications () {
          return this.hasManyThrough(Publication, Author)
        }
      }
      Publication.bootIfNotBooted()
      const country = yield Country.find(savedCountry[0])
      yield country.related('publications').load()
      const publications = country.get('publications')
      expect(publications.first() instanceof Publication).to.equal(true)
      expect(country.get('publications').first().author_id).to.equal(savedAuthor[0]).to.equal(23)

      yield relationFixtures.truncate(Database, 'countries')
      yield relationFixtures.truncate(Database, 'authors')
      yield relationFixtures.truncate(Database, 'publications')
    })

    it('should throw an error when trying to save the related model', function * () {
      class Author extends Model {
      }
      class Publication extends Model {
      }
      class Country extends Model {
        publications () {
          return this.hasManyThrough(Publication, Author)
        }
      }
      const country = new Country()
      try {
        yield country.publications().save()
        expect(true).to.equal(false)
      } catch (e) {
        expect(e.name).to.equal('ModelRelationException')
        expect(e.message).to.equal('E_INVALID_RELATION_METHOD: save is not supported by HasManyThrough relationship')
      }
    })

    it('should throw an error when trying to saveMany the related model', function * () {
      class Author extends Model {
      }
      class Publication extends Model {
      }
      class Country extends Model {
        publications () {
          return this.hasManyThrough(Publication, Author)
        }
      }
      const country = new Country()
      try {
        yield country.publications().saveMany()
        expect(true).to.equal(false)
      } catch (e) {
        expect(e.name).to.equal('ModelRelationException')
        expect(e.message).to.equal('E_INVALID_RELATION_METHOD: saveMany is not supported by HasManyThrough relationship')
      }
    })

    it('should throw an error when trying to createMany the related model', function * () {
      class Author extends Model {
      }
      class Publication extends Model {
      }
      class Country extends Model {
        publications () {
          return this.hasManyThrough(Publication, Author)
        }
      }
      const country = new Country()
      try {
        yield country.publications().createMany()
        expect(true).to.equal(false)
      } catch (e) {
        expect(e.name).to.equal('ModelRelationException')
        expect(e.message).to.equal('E_INVALID_RELATION_METHOD: createMany is not supported by HasManyThrough relationship')
      }
    })

    it('should be able to count rows of related model', function * () {
      const savedCountry = yield relationFixtures.createRecords(Database, 'countries', {name: 'India', locale: 'IND', id: 11})
      const savedAuthor = yield relationFixtures.createRecords(Database, 'authors', {name: 'Virk', country_id: savedCountry[0], id: 23})
      yield relationFixtures.createRecords(Database, 'publications', {title: 'Adonis 101', body: 'Time to learn', author_id: savedAuthor[0], amount: 20})
      yield relationFixtures.createRecords(Database, 'publications', {title: 'Adonis 101', body: 'Time to learn part 2', author_id: savedAuthor[0], amount: 10})
      class Author extends Model {
      }
      class Publication extends Model {
      }
      class Country extends Model {
        publications () {
          return this.hasManyThrough(Publication, Author)
        }
      }
      Publication.bootIfNotBooted()
      const country = yield Country.find(savedCountry[0])
      const query = country.publications().count('publications.id as total').toSQL()
      expect(queryHelpers.formatQuery(query.sql)).to.equal(queryHelpers.formatQuery('select count("publications"."id") as "total" from "publications" inner join "authors" on "authors"."id" = "publications"."author_id" where "authors"."country_id" = ?'))
      const publicationsCount = yield country.publications().count('publications.id as total')
      expect(Number(publicationsCount[0].total)).deep.equal(2)
      yield relationFixtures.truncate(Database, 'countries')
      yield relationFixtures.truncate(Database, 'authors')
      yield relationFixtures.truncate(Database, 'publications')
    })

    it('should be able to find avg on related model', function * () {
      const savedCountry = yield relationFixtures.createRecords(Database, 'countries', {name: 'India', locale: 'IND', id: 11})
      const savedAuthor = yield relationFixtures.createRecords(Database, 'authors', {name: 'Virk', country_id: savedCountry[0], id: 23})
      yield relationFixtures.createRecords(Database, 'publications', {title: 'Adonis 101', body: 'Time to learn', author_id: savedAuthor[0], amount: 20})
      yield relationFixtures.createRecords(Database, 'publications', {title: 'Adonis 101', body: 'Time to learn part 2', author_id: savedAuthor[0], amount: 10})
      class Author extends Model {
      }
      class Publication extends Model {
      }
      class Country extends Model {
        publications () {
          return this.hasManyThrough(Publication, Author)
        }
      }
      Publication.bootIfNotBooted()
      const country = yield Country.find(savedCountry[0])
      const query = country.publications().avg('amount as amount').toSQL()
      expect(queryHelpers.formatQuery(query.sql)).to.equal(queryHelpers.formatQuery('select avg("amount") as "amount" from "publications" inner join "authors" on "authors"."id" = "publications"."author_id" where "authors"."country_id" = ?'))
      const publicationsCount = yield country.publications().avg('amount as amount')
      expect(Number(publicationsCount[0].amount)).deep.equal(15)
      yield relationFixtures.truncate(Database, 'countries')
      yield relationFixtures.truncate(Database, 'authors')
      yield relationFixtures.truncate(Database, 'publications')
    })

    it('should be able to find min on related model', function * () {
      const savedCountry = yield relationFixtures.createRecords(Database, 'countries', {name: 'India', locale: 'IND', id: 11})
      const savedAuthor = yield relationFixtures.createRecords(Database, 'authors', {name: 'Virk', country_id: savedCountry[0], id: 23})
      yield relationFixtures.createRecords(Database, 'publications', {title: 'Adonis 101', body: 'Time to learn', author_id: savedAuthor[0], amount: 20})
      yield relationFixtures.createRecords(Database, 'publications', {title: 'Adonis 101', body: 'Time to learn part 2', author_id: savedAuthor[0], amount: 10})
      class Author extends Model {
      }
      class Publication extends Model {
      }
      class Country extends Model {
        publications () {
          return this.hasManyThrough(Publication, Author)
        }
      }
      Publication.bootIfNotBooted()
      const country = yield Country.find(savedCountry[0])
      const query = country.publications().min('amount as amount').toSQL()
      expect(queryHelpers.formatQuery(query.sql)).to.equal(queryHelpers.formatQuery('select min("amount") as "amount" from "publications" inner join "authors" on "authors"."id" = "publications"."author_id" where "authors"."country_id" = ?'))
      const publicationsCount = yield country.publications().min('amount as amount')
      expect(Number(publicationsCount[0].amount)).deep.equal(10)
      yield relationFixtures.truncate(Database, 'countries')
      yield relationFixtures.truncate(Database, 'authors')
      yield relationFixtures.truncate(Database, 'publications')
    })

    it('should be able to find max on related model', function * () {
      const savedCountry = yield relationFixtures.createRecords(Database, 'countries', {name: 'India', locale: 'IND', id: 11})
      const savedAuthor = yield relationFixtures.createRecords(Database, 'authors', {name: 'Virk', country_id: savedCountry[0], id: 23})
      yield relationFixtures.createRecords(Database, 'publications', {title: 'Adonis 101', body: 'Time to learn', author_id: savedAuthor[0], amount: 20})
      yield relationFixtures.createRecords(Database, 'publications', {title: 'Adonis 101', body: 'Time to learn part 2', author_id: savedAuthor[0], amount: 10})
      class Author extends Model {
      }
      class Publication extends Model {
      }
      class Country extends Model {
        publications () {
          return this.hasManyThrough(Publication, Author)
        }
      }
      Publication.bootIfNotBooted()
      const country = yield Country.find(savedCountry[0])
      const query = country.publications().max('amount as amount').toSQL()
      expect(queryHelpers.formatQuery(query.sql)).to.equal(queryHelpers.formatQuery('select max("amount") as "amount" from "publications" inner join "authors" on "authors"."id" = "publications"."author_id" where "authors"."country_id" = ?'))
      const publicationsCount = yield country.publications().max('amount as amount')
      expect(Number(publicationsCount[0].amount)).deep.equal(20)
      yield relationFixtures.truncate(Database, 'countries')
      yield relationFixtures.truncate(Database, 'authors')
      yield relationFixtures.truncate(Database, 'publications')
    })
  })

  context('Regression:HasOne', function () {
    it('should return null when unable to fetch related results via eager loading', function * () {
      yield relationFixtures.createRecords(Database, 'suppliers', {name: 'redtape'})
      class Account extends Model {
      }
      class Supplier extends Model {
        account () {
          return this.hasOne(Account)
        }
      }
      const supplier = yield Supplier.query().with('account').first()
      expect(supplier.toJSON().account).to.equal(null)
      yield relationFixtures.truncate(Database, 'suppliers')
    })

    it('should return null when unable to fetch related results of the model instance', function * () {
      yield relationFixtures.createRecords(Database, 'suppliers', {name: 'redtape'})
      class Account extends Model {
      }
      class Supplier extends Model {
        account () {
          return this.hasOne(Account)
        }
      }
      const supplier = yield Supplier.find(1)
      const account = yield supplier.account().first()
      expect(account).to.equal(null)
      yield relationFixtures.truncate(Database, 'suppliers')
    })

    it('should return null when unable to fetch related results via lazy eager loading', function * () {
      yield relationFixtures.createRecords(Database, 'suppliers', {name: 'redtape'})
      class Account extends Model {
      }
      class Supplier extends Model {
        account () {
          return this.hasOne(Account)
        }
      }
      const supplier = yield Supplier.find(1)
      yield supplier.related('account').load()
      expect(supplier.toJSON().account).to.equal(null)
      yield relationFixtures.truncate(Database, 'suppliers')
    })

    it('should be able to delete related records', function * () {
      const supplierId = yield relationFixtures.createRecords(Database, 'suppliers', {name: 'redtape'})
      class Account extends Model {
      }
      class Supplier extends Model {
        account () {
          return this.hasOne(Account)
        }
      }
      const supplier = yield Supplier.find(1)
      const query = supplier.account().delete().toSQL()
      expect(queryHelpers.formatQuery(query.sql)).to.equal(queryHelpers.formatQuery('delete from "accounts" where "supplier_id" = ?'))
      expect(queryHelpers.formatBindings(query.bindings)).deep.equal(queryHelpers.formatBindings(supplierId))
      yield relationFixtures.truncate(Database, 'suppliers')
    })
  })

  context('Regression:BelongsTo', function () {
    it('should return null when unable to fetch related results via eager loading', function * () {
      yield relationFixtures.createRecords(Database, 'comments', {body: 'Nice article', post_id: 1})
      class Post extends Model {
      }
      class Comment extends Model {
        post () {
          return this.belongsTo(Post)
        }
      }
      const comment = yield Comment.query().with('post').first()
      expect(comment.toJSON().post).to.equal(null)
      yield relationFixtures.truncate(Database, 'comments')
    })

    it('should return null when unable to fetch related results of model instance', function * () {
      yield relationFixtures.createRecords(Database, 'comments', {body: 'Nice article', post_id: 1})
      class Post extends Model {
      }
      class Comment extends Model {
        post () {
          return this.belongsTo(Post)
        }
      }
      const comment = yield Comment.query().first()
      const post = yield comment.post().first()
      expect(post).to.equal(null)
      yield relationFixtures.truncate(Database, 'comments')
    })

    it('should return null when unable to fetch related results via lazy eager loading', function * () {
      yield relationFixtures.createRecords(Database, 'comments', {body: 'Nice article', post_id: 1})
      class Post extends Model {
      }
      class Comment extends Model {
        post () {
          return this.belongsTo(Post)
        }
      }
      const comment = yield Comment.query().first()
      yield comment.related('post').load()
      expect(comment.toJSON().post).to.equal(null)
      yield relationFixtures.truncate(Database, 'comments')
    })

    it('should be able to delete related records', function * () {
      const commentId = yield relationFixtures.createRecords(Database, 'comments', {body: 'Nice article', post_id: 1})

      class Post extends Model {
      }

      class Comment extends Model {
        post () {
          return this.belongsTo(Post)
        }
      }

      const comment = yield Comment.find(commentId[0])
      const query = comment.post().delete().toSQL()
      expect(queryHelpers.formatQuery(query.sql)).to.equal(queryHelpers.formatQuery('delete from "posts" where "id" = ?'))
      expect(queryHelpers.formatBindings(query.bindings)).deep.equal(commentId)
      yield relationFixtures.truncate(Database, 'comments')
    })
  })

  context('Regression:HasMany', function () {
    it('should return an empty array when unable to fetch related results via eager loading', function * () {
      yield relationFixtures.createRecords(Database, 'posts', {title: 'Adonis 101', body: 'Let\'s learn Adonis'})
      class Comment extends Model {
      }
      class Post extends Model {
        comments () {
          return this.hasMany(Comment)
        }
      }
      const post = yield Post.query().with('comments').first()
      expect(post.toJSON().comments).deep.equal([])
      yield relationFixtures.truncate(Database, 'posts')
    })

    it('should return an empty array when unable to fetch related results of model instance', function * () {
      yield relationFixtures.createRecords(Database, 'posts', {title: 'Adonis 101', body: 'Let\'s learn Adonis'})
      class Comment extends Model {
      }
      class Post extends Model {
        comments () {
          return this.hasMany(Comment)
        }
      }
      const post = yield Post.query().first()
      const comments = yield post.comments().fetch()
      expect(comments.toJSON()).deep.equal([])
      yield relationFixtures.truncate(Database, 'posts')
    })

    it('should return an empty array when unable to fetch related results via lazy eager loading', function * () {
      yield relationFixtures.createRecords(Database, 'posts', {title: 'Adonis 101', body: 'Let\'s learn Adonis'})
      class Comment extends Model {
      }
      class Post extends Model {
        comments () {
          return this.hasMany(Comment)
        }
      }
      const post = yield Post.query().first()
      yield post.related('comments').load()
      expect(post.toJSON().comments).deep.equal([])
      yield relationFixtures.truncate(Database, 'posts')
    })

    it('should be able to delete the related records', function * () {
      const postId = yield relationFixtures.createRecords(Database, 'posts', {title: 'Adonis 101', body: 'Let\'s learn Adonis'})
      class Comment extends Model {
      }
      class Post extends Model {
        comments () {
          return this.hasMany(Comment)
        }
      }
      const post = yield Post.find(postId[0])
      const query = post.comments().delete().toSQL()
      expect(queryHelpers.formatQuery(query.sql)).to.equal(queryHelpers.formatQuery('delete from "comments" where "post_id" = ?'))
      expect(queryHelpers.formatBindings(query.bindings)).deep.equal(postId)
      yield relationFixtures.truncate(Database, 'posts')
    })
  })

  context('Regression:BelongsToMany', function () {
    it('should return an empty array when unable to fetch related results via eager loading', function * () {
      yield relationFixtures.createRecords(Database, 'students', {name: 'ricky', id: 29})
      class Course extends Model {
      }
      class Student extends Model {
        courses () {
          return this.belongsToMany(Course)
        }
      }
      const student = yield Student.query().with('courses').first()
      expect(student.toJSON().courses).deep.equal([])
      yield relationFixtures.truncate(Database, 'students')
    })

    it('should return an empty array when unable to fetch related results of model instance', function * () {
      yield relationFixtures.createRecords(Database, 'students', {name: 'ricky', id: 29})
      class Course extends Model {
      }
      class Student extends Model {
        courses () {
          return this.belongsToMany(Course)
        }
      }
      const student = yield Student.query().first()
      const courses = yield student.courses().fetch()
      expect(courses.toJSON()).deep.equal([])
      yield relationFixtures.truncate(Database, 'students')
    })

    it('should return an empty array when unable to fetch related results via lazy eager loading', function * () {
      yield relationFixtures.createRecords(Database, 'students', {name: 'ricky', id: 29})
      class Course extends Model {
      }
      class Student extends Model {
        courses () {
          return this.belongsToMany(Course)
        }
      }
      const student = yield Student.query().first()
      yield student.related('courses').load()
      expect(student.toJSON().courses).deep.equal([])
      yield relationFixtures.truncate(Database, 'students')
    })

    it('should return expected output with nested relations', function * () {
      const savedStudent = yield relationFixtures.createRecords(Database, 'students', {name: 'ricky', id: 29})
      const savedCourse = yield relationFixtures.createRecords(Database, 'courses', {title: 'geometry'})
      yield relationFixtures.createRecords(Database, 'course_student', {student_id: savedStudent[0], course_id: savedCourse[0]})

      class Subject extends Model {
      }

      class Course extends Model {
        subject () {
          return this.hasOne(Subject) // situational for testing only
        }
      }

      class Student extends Model {
        courses () {
          return this.belongsToMany(Course)
        }
      }

      const student = yield Student.query().with('courses.subject').first()
      expect(student.toJSON().courses).to.be.an('array')
      expect(student.toJSON().courses[0].subject).to.equal(null)
      yield relationFixtures.truncate(Database, 'students')
      yield relationFixtures.truncate(Database, 'courses')
      yield relationFixtures.truncate(Database, 'course_student')
    })

    it('should throw an exception when trying to delete related records', function * () {
      const savedStudent = yield relationFixtures.createRecords(Database, 'students', {name: 'ricky', id: 29})
      const savedCourse = yield relationFixtures.createRecords(Database, 'courses', {title: 'geometry'})
      yield relationFixtures.createRecords(Database, 'course_student', {student_id: savedStudent[0], course_id: savedCourse[0]})

      class Course extends Model {
      }

      class Student extends Model {
        courses () {
          return this.belongsToMany(Course)
        }
      }

      const student = yield Student.find(savedStudent[0])
      try {
        const isDeleted = yield student.courses().delete()
        expect(isDeleted).not.to.exist
      } catch (e) {
        expect(e.message).to.equal('delete is not supported by BelongsToMany, use detach instead')
        yield relationFixtures.truncate(Database, 'students')
        yield relationFixtures.truncate(Database, 'courses')
        yield relationFixtures.truncate(Database, 'course_student')
      }
    })
  })
})
