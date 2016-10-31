'use strict'

/*
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const _ = require('lodash')
const BaseRelation = require('./BaseRelation')
const CE = require('../../Exceptions')

/**
 * The HasOne relationship defines a relation between
 * two models
 *
 * @class HasOne
 * @constructor
 */
class HasOne extends BaseRelation {
  /**
   * Persists the parent model instance if it's not
   * persisted already. This is done before saving
   * the related instance
   *
   * @method _persistParentIfRequired
   *
   * @return {void}
   *
   * @private
   */
  async _persistParentIfRequired () {
    if (this.parentInstance.isNew) {
      await this.parentInstance.save()
    }
  }

  /**
   * Returns an array of values to be used for running
   * whereIn query when eagerloading relationships.
   *
   * @method mapValues
   *
   * @param  {Array}  modelInstances - An array of model instances
   *
   * @return {Array}
   */
  mapValues (modelInstances) {
    return _.map(modelInstances, (modelInstance) => modelInstance[this.primaryKey])
  }

  /**
   * Takes an array of related instances and returns an array
   * for each parent record.
   *
   * @method group
   *
   * @param  {Array} relatedInstances
   *
   * @return {Object} @multiple([key=String, values=Array, defaultValue=Null])
   */
  group (relatedInstances) {
    const transformedValues = _.transform(relatedInstances, (result, relatedInstance) => {
      const foreignKeyValue = relatedInstance[this.foreignKey]
      const existingRelation = _.find(result, (row) => row.identity === foreignKeyValue)

      /**
       * If there is already an existing instance for same parent
       * record. We should override the value and do WARN the
       * user since hasOne should never have multiple
       * related instance.
       */
      if (existingRelation) {
        existingRelation.value = relatedInstance
        return result
      }

      result.push({
        identity: foreignKeyValue,
        value: relatedInstance
      })
      return result
    }, [])
    return { key: this.primaryKey, values: transformedValues, defaultValue: null }
  }

  /**
   * Fetch related rows for a relationship
   *
   * @method fetch
   *
   * @alias first
   *
   * @return {Model}
   */
  fetch () {
    return this.first()
  }

  /**
   * Adds a where clause to limit the select search
   * to related rows only.
   *
   * @method relatedWhere
   *
   * @param  {Boolean}     count
   *
   * @return {Object}
   */
  relatedWhere (count) {
    this.relatedQuery.whereRaw(`${this.$primaryTable}.${this.primaryKey} = ${this.$foreignTable}.${this.foreignKey}`)
    if (count) {
      this.relatedQuery.count('*')
    }
<<<<<<< fe3e68828ae1074c2b1dc620b2133e67c706257e
    return this.relatedQuery.query
  }

  /**
   * Adds `on` clause to the innerjoin context. This
   * method is mainly used by HasManyThrough
   *
   * @method addWhereOn
   *
   * @param  {Object}   context
   */
  addWhereOn (context) {
    context.on(`${this.$primaryTable}.${this.primaryKey}`, '=', `${this.$foreignTable}.${this.foreignKey}`)
  }

  /**
   * Saves the related instance to the database. Foreign
   * key is set automatically.
   *
   * NOTE: This method will persist the parent model if
   * not persisted already.
   *
   * @method save
   *
   * @param  {Object} relatedInstance
   *
   * @return {Promise}
   */
  async save (relatedInstance) {
    await this._persistParentIfRequired()
    relatedInstance[this.foreignKey] = this.$primaryKeyValue
    return relatedInstance.save()
  }

  /**
   * Creates the new related instance model and persist
   * it to database. Foreign key is set automatically.
   *
   * NOTE: This method will persist the parent model if
   * not persisted already.
   *
   * @method create
   *
   * @param  {Object} payload
   *
   * @return {Promise}
   */
  async create (payload) {
    await this._persistParentIfRequired()
    payload[this.foreignKey] = this.$primaryKeyValue
    return this.RelatedModel.create(payload)
  }

  /* istanbul ignore next */
  createMany () {
    throw CE.ModelRelationException.unSupportedMethod('createMany', 'hasOne')
  }

  /* istanbul ignore next */
  saveMany () {
    throw CE.ModelRelationException.unSupportedMethod('saveMany', 'hasOne')
  }
}

module.exports = HasOne
=======
  })

  it('should be able to run transactions on different connection', function * () {
    yield Database.connection('alternateConnection').transaction(function * (trx) {
      return yield trx.table('users').insert({username: 'different-trx'})
    })
    const user = yield Database.connection('alternateConnection').table('users').where('username', 'different-trx')
    expect(user).to.be.an('array')
    expect(user[0].username).to.equal('different-trx')
  })

  it('should be able to paginate results', function * () {
    const paginatedUsers = yield Database.table('users').paginate(1)
    expect(paginatedUsers).to.have.property('total')
    expect(paginatedUsers).to.have.property('lastPage')
    expect(paginatedUsers).to.have.property('perPage')
    expect(paginatedUsers).to.have.property('data')
    expect(paginatedUsers.total).to.equal(paginatedUsers.data.length)
  })

  it('should throw an error when page is not passed', function * () {
    try {
      yield Database.table('users').paginate()
      expect(true).to.equal(false)
    } catch (e) {
      expect(e.message).to.match(/cannot paginate results for page less than 1/)
    }
  })

  it('should throw an error when page equals 0', function * () {
    try {
      yield Database.table('users').paginate(0)
      expect(true).to.equal(false)
    } catch (e) {
      expect(e.message).to.match(/cannot paginate results for page less than 1/)
    }
  })

  it('should return proper meta data when paginate returns zero results', function * () {
    const paginatedUsers = yield Database.table('users').where('status', 'published').paginate(1)
    expect(paginatedUsers.total).to.equal(0)
    expect(paginatedUsers.lastPage).to.equal(0)
  })

  it('should return proper meta data when there are results but page is over the last page', function * () {
    const paginatedUsers = yield Database.table('users').paginate(10)
    expect(paginatedUsers.total).to.equal(3)
    expect(paginatedUsers.lastPage).to.equal(1)
  })

  it('should be able paginate results using order by on the original query', function * () {
    const paginatedUsers = yield Database.table('users').orderBy('id', 'desc').paginate(1)
    expect(paginatedUsers).to.have.property('total')
    expect(paginatedUsers).to.have.property('lastPage')
    expect(paginatedUsers).to.have.property('perPage')
    expect(paginatedUsers).to.have.property('data')
    expect(paginatedUsers.total).to.equal(paginatedUsers.data.length)
  })

  it('should be able to get results in chunks', function * () {
    let callbackCalledForTimes = 0
    const allUsers = yield Database.table('users')
    yield Database.table('users').chunk(1, function (user) {
      expect(user[0].id).to.equal(allUsers[callbackCalledForTimes].id)
      callbackCalledForTimes++
    })
    expect(callbackCalledForTimes).to.equal(allUsers.length)
  })

  it('should be able to prefix the database table using a configuration option', function * () {
    Database._setConfigProvider(config.withPrefix)
    const query = Database.table('users').toSQL()
    expect(queryHelpers.formatQuery(query.sql)).to.equal(queryHelpers.formatQuery('select * from "ad_users"'))
  })

  it('should be able to prefix the database table when table method is called after other methods', function * () {
    const query = Database.where('username', 'foo').table('users').toSQL()
    expect(queryHelpers.formatQuery(query.sql)).to.equal(queryHelpers.formatQuery('select * from "ad_users" where "username" = ?'))
  })

  it('should be able to prefix the database table when from method is used', function * () {
    const query = Database.from('users').toSQL()
    expect(queryHelpers.formatQuery(query.sql)).to.equal(queryHelpers.formatQuery('select * from "ad_users"'))
  })

  it('should be able to prefix the database table when from method is called after other methods', function * () {
    const query = Database.where('username', 'foo').from('users').toSQL()
    expect(queryHelpers.formatQuery(query.sql)).to.equal(queryHelpers.formatQuery('select * from "ad_users" where "username" = ?'))
  })

  it('should be able to prefix the database table when into method is used', function * () {
    const query = Database.into('users').toSQL()
    expect(queryHelpers.formatQuery(query.sql)).to.equal(queryHelpers.formatQuery('select * from "ad_users"'))
  })

  it('should be able to prefix the database table when into method is called after other methods', function * () {
    const query = Database.where('username', 'foo').into('users').toSQL()
    expect(queryHelpers.formatQuery(query.sql)).to.equal(queryHelpers.formatQuery('select * from "ad_users" where "username" = ?'))
  })

  it('should be able to remove the prefix using the withoutPrefix method', function * () {
    const query = Database.withoutPrefix().table('users').toSQL()
    expect(queryHelpers.formatQuery(query.sql)).to.equal(queryHelpers.formatQuery('select * from "users"'))
  })

  it('should be able to remove the prefix when withoutPrefix method is called after other methods', function * () {
    const query = Database.where('username', 'foo').withoutPrefix().table('users').toSQL()
    expect(queryHelpers.formatQuery(query.sql)).to.equal(queryHelpers.formatQuery('select * from "users" where "username" = ?'))
  })

  it('should be able to change the prefix using the withPrefix method', function * () {
    const query = Database.withPrefix('k_').table('users').toSQL()
    expect(queryHelpers.formatQuery(query.sql)).to.equal(queryHelpers.formatQuery('select * from "k_users"'))
  })

  it('should be able to remove the prefix when withPrefix method is called after other methods', function * () {
    const query = Database.where('username', 'foo').withPrefix('k_').table('users').toSQL()
    expect(queryHelpers.formatQuery(query.sql)).to.equal(queryHelpers.formatQuery('select * from "k_users" where "username" = ?'))
  })

  it('should not mess the query builder instance when withPrefix is called on multiple queries at same time', function * () {
    const query = Database.where('username', 'foo').withPrefix('k_').table('users')
    const query1 = Database.where('username', 'foo').table('users')
    expect(queryHelpers.formatQuery(query.toSQL().sql)).to.equal(queryHelpers.formatQuery('select * from "k_users" where "username" = ?'))
    expect(queryHelpers.formatQuery(query1.toSQL().sql)).to.equal(queryHelpers.formatQuery('select * from "ad_users" where "username" = ?'))
  })

  it('should not mess the query builder instance when withoutPrefix is called on multiple queries at same time', function * () {
    const query = Database.where('username', 'foo').withoutPrefix().table('users')
    const query1 = Database.where('username', 'foo').table('users')
    expect(queryHelpers.formatQuery(query.toSQL().sql)).to.equal(queryHelpers.formatQuery('select * from "users" where "username" = ?'))
    expect(queryHelpers.formatQuery(query1.toSQL().sql)).to.equal(queryHelpers.formatQuery('select * from "ad_users" where "username" = ?'))
  })
})
>>>>>>> feat(database): add support for table prefixing
