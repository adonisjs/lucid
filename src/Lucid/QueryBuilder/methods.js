'use strict'

/**
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const _ = require('lodash')
const util = require('../../../lib/util')
const CE = require('../../Exceptions')
const methods = exports = module.exports = {}

/**
 * fetches query results and wrap it inside a collection
 * of model instances.
 *
 * @method fetch
 *
 * @param  {Object} target
 * @return {Function}
 *
 * @public
 */
methods.fetch = function (target) {
  return function * () {
    const serializer = new target.HostModel.QuerySerializer(target, this)
    return yield serializer.fetch()
  }
}

/**
 * overrides the clone method of query builder
 * to make sure it includes the right parent.
 *
 * @param  {Object} target
 * @return {Function}
 *
 * @public
 */
methods.clone = function (target) {
  return function () {
    return target.modelQueryBuilder.clone()
  }
}

/**
 * fetches query results as paginated data and wrap
 *  it inside a collection of model instances.
 *
 * @method paginate
 *
 * @param  {Object} target
 * @return {Function}
 *
 * @public
 */
methods.paginate = function (target) {
  return function * (page, perPage, countByQuery) {
    const serializer = new target.HostModel.QuerySerializer(target, this)
    return yield serializer.paginate(page, perPage, countByQuery)
  }
}

/**
 * inserts values inside the database and touches create
 * and update timestamps. This method does not allows
 * bulk inserts.
 *
 * @method insertAttributes
 *
 * @param  {Object} target
 * @return {Promise}
 *
 * @public
 */
methods.insertAttributes = function (target) {
  return function (values) {
    values = target.HostModel.prototype.setCreateTimestamp(values)
    values = target.HostModel.prototype.setUpdateTimestamp(values)
    return target.modelQueryBuilder.insert(values)
  }
}

/**
 * update values inside the database and touches postupdate
 * timestamp. This method does not run bulkUpdate hooks.
 *
 * @method updateAttributes
 *
 * @param  {Object} target
 * @return {Promise}
 */
methods.updateAttributes = function (target) {
  return function (values) {
    values = target.HostModel.prototype.setUpdateTimestamp(values)
    return target.modelQueryBuilder.update(values)
  }
}
methods.update = methods.updateAttributes

/**
 * deletes rows inside the database only when soft deletes are enabled.
 * Otherwise it will update the model with delete timestamp.
 * This methods does not run bulkDelete hooks.
 *
 * @method deleteAttributes
 *
 * @param  {Object} target
 * @return {Promise}
 *
 * @public
 */
methods.deleteAttributes = function (target) {
  return function (values) {
    if (target.HostModel.deleteTimestamp) {
      values = values || {}
      values = target.HostModel.prototype.setDeleteTimestamp(values)
      return this.updateAttributes(values)
    }
    return target.modelQueryBuilder.delete()
  }
}
methods.delete = methods.deleteAttributes

/**
 * restores a soft deleted row
 *
 * @method restoreAttributes
 *
 * @param  {Object}          target
 * @return {Promise}
 *
 * @public
 */
methods.restoreAttributes = function (target) {
  return function (values) {
    if (!target.HostModel.deleteTimestamp) {
      throw CE.ModelException.cannotRestore(target.HostModel.name)
    }
    values = values || {}
    values = target.HostModel.prototype.setRestoreTimestamp(values)
    return this.updateAttributes(values)
  }
}
methods.restore = methods.restoreAttributes

/**
 * returns the first record from data collection
 *
 * @method first
 *
 * @param  {Object} target
 * @return {Object}
 *
 * @public
 */
methods.first = function (target) {
  return function * () {
    target.modelQueryBuilder.limit(1)
    const results = yield this.fetch()
    return results.first() || null
  }
}

/**
 * Returns the last record from the data collection
 *
 * @param  {Object} target
 * @return {Object}
 *
 * @public
 */
methods.last = function (target) {
  return function * () {
    target.modelQueryBuilder.orderBy(target.HostModel.primaryKey, 'desc').limit(1)
    const results = yield this.fetch()
    return results.first() || null
  }
}

/**
 * returns the first record from data collection
 * or fails by throwing an exception
 *
 * @method firstOrFail
 *
 * @param  {Object} target
 * @return {Object}
 *
 * @public
 */
methods.firstOrFail = function (target) {
  return function * (onErrorCallback) {
    const row = yield this.first()
    if (!row) {
      onErrorCallback = typeof (onErrorCallback) === 'function' ? onErrorCallback : function () {
        throw CE.ModelNotFoundException.raise('Unable to fetch database results')
      }
      return onErrorCallback()
    }
    return row
  }
}

/**
 * with trashed will set a flag on query builder instance to
 * include trashed results.
 *
 * @method withTrashed
 *
 * @param  {Object}    target
 * @return {Object} - reference to this for chaining
 */
methods.withTrashed = function (target) {
  return function () {
    this.avoidTrashed = true
    return this
  }
}

/**
 * sets avoidtrashed on query builder chain to stop
 * soft deletes from running and add a clause
 * to pull all rows whose deleteTimestamp
 * is to null
 *
 * @method onlyTrashed
 *
 * @param  {Object}    target
 * @return {Object} - reference to this for chaining
 */
methods.onlyTrashed = function (target) {
  return function () {
    this.avoidTrashed = true
    this.whereNotNull(target.HostModel.deleteTimestamp)
    return this
  }
}

/**
 * sets up relations to be eager loaded when calling fetch method.
 * From here it is fetch method job to entertain withRelations
 * array.
 *
 *
 * @method with
 *
 * @param  {Object} target
 * @return {Object}        reference to this for chaining
 *
 * @public
 */
methods.with = function (target) {
  return function () {
    const relations = _.isArray(arguments[0]) ? arguments[0] : _.toArray(arguments)
    target.eagerLoad.with(relations)
    return this
  }
}

/**
 * Filters the top level results by checking the existence
 * of related rows.
 *
 * @param  {Object}  target
 * @return {Object}        reference to this for chaining
 *
 * @private
 */
methods._has = function (target) {
  return function (key, method, expression, value) {
    if (!value && expression) {
      value = expression
      expression = '='
    }

    const relations = util.parseNestedRelations(key)
    const relationInstance = target.HostModel.prototype[relations.root]()

    /**
     * Call the has method on nested relations if any
     */
    if (relations.nested) {
      relationInstance.getRelatedQuery().has(relations.nested, expression, value)
      this[method](relationInstance.exists())
    } else if (value && expression) {
      this.whereRaw(`(${relationInstance.counts().toSQL().sql}) ${expression} ?`, [value])
    } else {
      this[method](relationInstance.exists())
    }

    return this
  }
}

/**
 * Filters the top level results by checking the existence
 * of related rows with additional checks via callback.
 *
 * @param  {Object}  target
 * @return {Object}        reference to this for chaining
 *
 * @public
 */
methods._whereHas = function (target) {
  return function (key, method, callback, expression, value) {
    if (!value && expression) {
      value = expression
      expression = '='
    }

    const relations = util.parseNestedRelations(key)
    const relationInstance = target.HostModel.prototype[relations.root]()

    /**
     * Call the has method on nested relations if any
     */
    if (relations.nested) {
      relationInstance.getRelatedQuery().whereHas(relations.nested, callback, expression, value)
      this[method](relationInstance.exists())
    } else if (value && expression) {
      const countsQuery = relationInstance.counts(callback).toSQL()
      this.whereRaw(`(${countsQuery.sql}) ${expression} ?`, countsQuery.bindings.concat([value]))
    } else {
      this[method](relationInstance.exists(callback))
    }

    return this
  }
}

/**
 * Filters the top level rows via checking the existence
 * of related rows defined as relationships.
 *
 * @param {String} key
 * @param {String} [expression]
 * @param {Mixed} [value]
 *
 * @chainable
 */
methods.has = function () {
  return function (key, expression, value) {
    return this._has(key, 'whereExists', expression, value)
  }
}

/**
 * Filters the top level rows via checking the non-existence
 * of related rows defined as relationships.
 *
 * @param {String} key
 *
 * @chainable
 */
methods.doesntHave = function () {
  return function (key) {
    return this._has(key, 'whereNotExists')
  }
}

/**
 * Filters the top level rows via checking the existence
 * of related rows defined as relationships and allows
 * a conditional callback to add more clauses
 *
 * @param {String} key
 * @param {Function} callback
 * @param {String} [expression]
 * @param {Mixed} [value]
 *
 * @chainable
 */
methods.whereHas = function () {
  return function (key, callback, value, expression) {
    return this._whereHas(key, 'whereExists', callback, value, expression)
  }
}

/**
 * Filters the top level rows via checking the non-existence
 * of related rows defined as relationships and allows
 * a conditional callback to add more clauses
 *
 * @param {String} key
 * @param {Function} callback
 *
 * @chainable
 */
methods.whereDoesntHave = function () {
  return function (key, callback) {
    return this._whereHas(key, 'whereNotExists', callback)
  }
}

methods.withCount = function (target) {
  return function (relation, callback) {
    const relationInstance = target.HostModel.prototype[relation]()
    const selectedColumns = _.find(target.modelQueryBuilder._statements, (statement) => statement.grouping === 'columns')

    /**
     * Select all columns from the table when none have
     * been selected already.
     */
    if (!selectedColumns) {
      target.modelQueryBuilder.column(`${this.HostModel.table}.*`)
    }

    /**
     * The count query to fetch the related counts
     * from relation instance.
     */
    const countsQuery = relationInstance.counts(callback).toSQL()
    target
    .modelQueryBuilder
    .column(
      target.queryBuilder.raw(countsQuery.sql, countsQuery.bindings).wrap('(', `) as ${relation}_count`)
    )
    return this
  }
}

/**
 * stores a callback for a given relation.
 *
 * @method scope
 *
 * @param  {Object} target
 * @return {Object}        - reference to this for chaining
 *
 * @public
 */
methods.scope = function (target) {
  return function (key, callback) {
    target.eagerLoad.appendScope(key, callback)
    return this
  }
}

/**
 * pluck primary keys from the SQL query and return
 * them as an array.
 *
 * @param  {Object} target
 *
 * @return {Function}
 */
methods.ids = function (target) {
  return function () {
    const serializer = new target.HostModel.QuerySerializer(target, this)
    serializer._decorateQuery()
    return target.modelQueryBuilder.select(target.HostModel.primaryKey).pluck(target.HostModel.primaryKey)
  }
}

/**
 * pluck two fields from SQL table and return them as a
 * key/value pair.
 *
 * @param  {Object} target
 *
 * @return {Function}
 */
methods.pair = function (target) {
  return function (lhs, rhs) {
    const serializer = new target.HostModel.QuerySerializer(target, this)
    serializer._decorateQuery()
    return target.modelQueryBuilder.select(lhs, rhs).reduce(function (result, row) {
      result[row[lhs]] = row[rhs]
      return result
    }, {})
  }
}

/**
 * plucks first given field as original data type.
 *
 * @param  {Object} target
 *
 * @return {Function}
 *
 * @public
 */
methods.pluckFirst = function (target) {
  return function * (field) {
    const firstRow = yield target.modelQueryBuilder.select(field).first()
    return firstRow ? firstRow[field] : null
  }
}

/**
 * plucks first primary key as original datatype.
 *
 * @param  {Object} target
 *
 * @return {Function}
 *
 * @public
 */
methods.pluckId = function (target) {
  return function () {
    return this.pluckFirst(target.HostModel.primaryKey)
  }
}

/**
 * picks given number of rows with orderBy asc
 * on primary key
 *
 * @param  {Object} target
 *
 * @return {Function}
 *
 * @public
 */
methods.pick = function (target) {
  return function (limit) {
    limit = limit || 1
    target.modelQueryBuilder.limit(limit).orderBy(target.HostModel.primaryKey, 'asc')
    return this.fetch()
  }
}

/**
 * picks given number of rows with orderBy desc
 * on primary key
 *
 * @param  {Object} target
 *
 * @return {Function}
 *
 * @public
 */
methods.pickInverse = function (target) {
  return function (limit) {
    limit = limit || 1
    target.modelQueryBuilder.limit(limit).orderBy(target.HostModel.primaryKey, 'desc')
    return this.fetch()
  }
}
