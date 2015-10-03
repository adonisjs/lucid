'use strict'

/**
 * adonis-lucid
 * Copyright(c) 2015-2015 Harminder Virk
 * MIT Licensed
*/

require('harmony-reflect')
const proxy = require('./proxy')
const query = require('./query')

/**
 * @module StaticProxy
 * @description Returns proxied defination for a given
 * model class, it helps in creating magical methods
 * out of the box
 */
class StaticProxy {

  constructor (Model, Database) {
    Model.activeConnection = Database.table(Model.table)

    /**
     * here we store active relation as an object which 
     * has useful information like 
     * relational model
     * foreign key
     * other key
     * relation type [hasOne,belongsTo,etc.]
     * pivot table info [ if pivot table is in use ]
     * @type {Object}
     */
    Model._activeRelation = {}

    /**
     * here we store relation keys to be fetched when fetching 
     * host/target model. In short these are keys sent with
     * `with` method
     * @type {Array}
     */
    Model._relations = []

    /**
     * here we store scope methods, which should be executed on 
     * relational query builder. We simply store these
     * and invoke them when running relational model
     * queries.
     * @type {Object}
     */
    Model._relationsScope = {}

    /**
     * nested scope to resolve
     * @type {Object}
     */
    Model._nestedScope = {}

    /**
     * foreign key and it's value to be used while
     * saving relations. Works for hasOne and
     * hasMany.
     * @type {Object}
     */
    Model._foreignKey = {}

    /**
     * this key comes in use when this model is referenced as a relational
     * model under many to many relation. The end user can push
     * values to be fetched from pivot table.
     * @type {Array}
     */
    Model._withPivot = []

    /**
     * pivot table to refer when resolving pivot relations. It is required
     * by nested relations
     * @type {String}
     */
    Model._pivotTable = null

    /**
     * association model to set association attributes on this is required for 
     * belongsTo method.
     * @type {Object}
     */
    Model._associationModel = {}

    /**
     * association attributes to read foreign key value from while saving a 
     * relation.
     * @type {Object}
     */
    Model._associationAttributes = {}

    /**
     * pivotAttributes are required to save belongsToMany relationship
     * under a pivot table
     * @type {Object}
     */
    Model._pivotAttributes = {}

    /**
     * @function create
     * @see query.create
     * @public
     */
    Model.create = function (values, isMutated, connection) {

      /**
       * here we look for an active relation and if that relation is
       * belongsTo then we grab associationAttributes set by 
       * associate method and grab the value of foreign
       * key under relation
       */
      if(this._activeRelation.relation === 'belongsTo' && Object.keys(this._associationAttributes).length > 0){
        const targetPrimaryKey = this._activeRelation.targetPrimaryKey
        const relationPrimaryKey = this._activeRelation.relationPrimaryKey
        this._foreignKey[targetPrimaryKey] = this._associationAttributes[relationPrimaryKey]
      }
      
      /**
       * here we set foreign key and it's value to be inserted
       * if create method is invoked via relational model.
      */
      if(this._foreignKey && Object.keys(this._foreignKey).length > 0){
        const key = Object.keys(this._foreignKey)[0];
        values[key] = this._foreignKey[key]
      }

      return query.create(this, values, isMutated, connection)

    }

    /**
     * @function update
     * @see query.update
     * @public
     */
    Model.update = function (values, isMutated, connection) {

      /**
       * here we look for an active relation and if that relation is
       * belongsTo then we grab associationAttributes set by 
       * associate method and grab the value of foreign
       * key under relation
       */
      if(this._activeRelation.relation === 'belongsTo' && Object.keys(this._associationAttributes).length > 0){

        /**
         * otherwise set foriegn key value to the value of primary key
         * from relational model
         */
        const targetPrimaryKey = this._activeRelation.targetPrimaryKey
        const relationPrimaryKey = this._activeRelation.relationPrimaryKey

        /**
         * if dissociate has been called, set foreign key value to null
         */
        if(this._associationAttributes.dissociate){
          this._foreignKey[targetPrimaryKey] = null
        }else{
          this._foreignKey[targetPrimaryKey] = this._associationAttributes[relationPrimaryKey]
        }
      }
      
      /**
       * here we set foreign key and it's value to be inserted
       * if create method is invoked via relational model.
      */
      if(this._foreignKey && Object.keys(this._foreignKey).length > 0){
        const key = Object.keys(this._foreignKey)[0];
        values[key] = this._foreignKey[key]
      }

      return query.update(this, values, isMutated, connection)
    }

    /**
     * @function delete
     * @see query.delete
     * @public
     */
    Model.delete = function (connection) {
      return query.delete(this, connection)
    }

    /**
     * @function forceDelete
     * @see query.forceDelete
     * @public
     */
    Model.forceDelete = function (connection) {
      return query.forceDelete(this, connection)
    }

    /**
     * @function new
     * @description it makes model chained values back to normal,
     * which is required while making different
     * queries , otherwise knex old query
     * chain will we prepended.
     * @public
     */
    Model.new = function () {

      /**
       * setting back to defaults
       */
      this.disableSoftDeletes = false
      this._activeRelation = {}
      this._relations = []
      this._relationScope = {}
      this._nestedScope = {}
      this._foreignKey = {}
      this._withPivot = []
      this._pivotTable = null
      this._associationModel = {}
      this._associationAttributes = {}
      this._pivotAttributes = {}
      this.activeConnection = this.database.table(this.table)

      return this
    }

    return new Proxy(Model, proxy)
  }

}

module.exports = StaticProxy
