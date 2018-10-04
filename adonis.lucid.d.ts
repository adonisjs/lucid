/*
  Package: @adonis/lucid
  Last Updated: June 6, 2018
  On Commit: e4442b129d3b0a440b12e72e0afca9f2103ba029
 */

import * as moment from 'moment'

declare namespace AdonisLucid {

  /*
   * https://github.com/adonisjs/adonis-lucid/blob/e4442b129d3b0a440b12e72e0afca9f2103ba029/src/Lucid/Model/Base.js
   */
  export class BaseModel {
    /**
     * The attributes to be considered as dates. By default
     * @ref('Model.createdAtColumn') and @ref('Model.updatedAtColumn')
     * are considered as dates.
     *
     * @attribute dates
     *
     * @return {Array}
     *
     * @static
     */
    public static dates: Readonly<Array<string>>

    /**
     * The attribute name for created at timestamp.
     *
     * @attribute createdAtColumn
     *
     * @return {String}
     *
     * @static
     */
    public static createdAtColumn: Readonly<string>

    /**
     * The attribute name for updated at timestamp.
     *
     * @attribute updatedAtColumn
     *
     * @return {String}
     *
     * @static
     */
    public static updatedAtColumn: Readonly<string>

    /**
     * The serializer to be used for serializing
     * data. The return value must always be a
     * ES6 class.
     *
     * By default Lucid uses @ref('VanillaSerializer')
     *
     * @attribute Serializer
     *
     * @return {Class}
     */
    public static Serializer: Readonly<StaticSerializer>

    /**
     * The database connection to be used for
     * the model. Returning blank string will
     * use the `default` connection.
     *
     * @attribute connection
     *
     * @return {String}
     *
     * @static
     */
    public static connection: Readonly<string>

    /**
     * This method is executed for all the date fields
     * with the field name and the value. The return
     * value gets saved to the database.
     *
     * Also if you have defined a setter for a date field
     * this method will not be executed for that field.
     *
     * @method formatDates
     *
     * @param  {String}    key
     * @param  {String|Date}    value
     *
     * @return {String}
     */
    public static formatDates (key: string, value: string | Date): string

    /**
     * Tells whether model instance is new or
     * persisted to database.
     *
     * @attribute isNew
     *
     * @return {Boolean}
     */
    public isNew: Readonly<boolean>

    /**
     * Returns a boolean indicating whether model
     * has been deleted or not
     *
     * @method isDeleted
     *
     * @return {Boolean}
     */
    public isDeleted: Readonly<boolean>

    /**
     * Resolves the serializer for the current model.
     *
     * If serializer is a string, then it is resolved using
     * the Ioc container, otherwise it is assumed that
     * a `class` is returned.
     *
     * @method resolveSerializer
     *
     * @returns {Class}
     */
    public static resolveSerializer (): Serializer<AdonisLucid.BaseModel>

    /**
     * This method is executed when toJSON is called on a
     * model or collection of models. The value received
     * will always be an instance of momentjs and return
     * value is used.
     *
     * NOTE: This method will not be executed when you define
     * a getter for a given field.
     *
     * @method castDates
     *
     * @param  {String}  key
     * @param  {Moment}  value
     *
     * @return {String}
     *
     * @static
     */
    public static castDates (key: string, value: moment.Moment): string

    /**
     * Method to be called only once to boot
     * the model.
     *
     * NOTE: This is called automatically by the IoC
     * container hooks when you make use of `use()`
     * method.
     *
     * @method boot
     *
     * @return {void}
     *
     * @static
     */
    public static boot (): void

    /**
     * Hydrates model static properties by re-setting
     * them to their original value.
     *
     * @method hydrate
     *
     * @return {void}
     *
     * @static
     */
    public static hydrate (): void

    /**
     * Set attributes on model instance in bulk.
     *
     * NOTE: Calling this method will remove the existing attributes.
     *
     * @method fill
     *
     * @param  {Object} attributes
     *
     * @return {void}
     */
    public fill (attributes: object): void

    /**
     * Merge attributes into on a model instance without
     * overriding existing attributes and their values
     *
     * @method fill
     *
     * @param  {Object} attributes
     *
     * @return {void}
     */
    public merge (attributes: object): void

    /**
     * Freezes the model instance for modifications
     *
     * @method freeze
     *
     * @return {void}
     */
    public freeze (): void

    /**
     * Unfreezes the model allowing further modifications
     *
     * @method unfreeze
     *
     * @return {void}
     */
    public unfreeze (): void

    /**
     * Converts model instance toJSON using the serailizer
     * toJSON method
     *
     * @method toJSON
     *
     * @return {Object}
     */
    public toJSON (): Array<any> | Object
  }

  /*
   * File https://github.com/adonisjs/adonis-lucid/blob/e4442b129d3b0a440b12e72e0afca9f2103ba029/src/Lucid/Model/index.js
   */
  export class Model extends AdonisLucid.BaseModel{

    /**
     * An array of methods to be called everytime
     * a model is imported via ioc container.
     *
     * @attribute iocHooks
     *
     * @return {Array}
     *
     * @static
     */
    public static iocHooks: Readonly<Array<string>>

    /**
     * Making sure that `ioc.make` returns
     * the class object and not it's
     * instance
     *
     * @method makePlain
     *
     * @return {Boolean}
     */
    public static makePlain: Readonly<boolean>

    /**
     * The primary key for the model. You can change it
     * to anything you want, just make sure that the
     * value of this key will always be unique.
     *
     * @attribute primaryKey
     *
     * @return {String} The default value is `id`
     *
     * @static
     */
    public static primaryKey: Readonly<string>

    /**
     * The foreign key for the model. It is generated
     * by converting model name to lowercase and then
     * snake case and appending `_id` to it.
     *
     * @attribute foreignKey
     *
     * @return {String}
     *
     * @example
     * ```
     * User - user_id
     * Post - post_id
     * ``
     */
    public static foreignKey: Readonly<string>

    /**
     * Tell Lucid whether primary key is supposed to be incrementing
     * or not. If `false` is returned then you are responsible for
     * setting the `primaryKeyValue` for the model instance.
     *
     * @attribute incrementing
     *
     * @return {Boolean}
     *
     * @static
     */
    public static incrementing: Readonly<boolean>

    /**
     * The table name for the model. It is dynamically generated
     * from the T name by pluralizing it and converting it
     * to lowercase.
     *
     * @attribute table
     *
     * @return {String}
     *
     * @static
     *
     * @example
     * ```
     * T - User
     * table - users
     *
     * T - Person
     * table - people
     * ```
     */
    public static table: Readonly<string>

    /**
     * Returns an object of values dirty after persisting to
     * database or after fetching from database.
     *
     * @attribute dirty
     *
     * @return {Object}
     */
    public dirty: Readonly<object>

    /**
     * Tells whether model is dirty or not
     *
     * @attribute isDirty
     *
     * @return {Boolean}
     */
    public isDirty: Readonly<boolean>

    /**
     * Returns a boolean indicating if model is
     * child of a parent model
     *
     * @attribute hasParent
     *
     * @return {Boolean}
     */
    public hasParent: Readonly<boolean>

    /**
     * Get fresh instance of query builder for
     * this model.
     *
     * @method query
     *
     * @return {LucidQueryBuilder}
     *
     * @static
     */
    public static query (): AdonisLucid.QueryBuilder<AdonisLucid.Model>

    /**
     * Returns a query builder without any global scopes
     *
     * @method queryWithOutScopes
     *
     * @return {QueryBuilder}
     */
    public static queryWithOutScopes (): AdonisLucid.QueryBuilder<AdonisLucid.Model>

    /**
     * Define a query macro to be added to query builder.
     *
     * @method queryMacro
     *
     * @param  {String}   name
     * @param  {Function} fn
     *
     * @chainable
     */
    public static queryMacro (name: string, fn: Function): AdonisLucid.Model

    /**
     * Adds a new hook for a given event type.
     *
     * @method addHook
     *
     * @param  {String} forEvent
     * @param  {Function|String|Array} handlers
     *
     * @chainable
     *
     * @static
     */
    public static addHook (forEvent: string, handlers: Function | string | Array<any>): AdonisLucid.Model

    /**
     * Adds the global scope to the model global scopes.
     *
     * You can also give name to the scope, since named
     * scopes can be removed when executing queries.
     *
     * @method addGlobalScope
     *
     * @param  {Function}     callback
     * @param  {String}       [name = null]
     *
     * @chainable
     */
    static addGlobalScope (callback: Function, name?: string): AdonisLucid.Model

    /**
     * Attach a listener to be called everytime a query on
     * the model is executed.
     *
     * @method onQuery
     *
     * @param  {Function} callback
     *
     * @chainable
     */
    static onQuery (callback: Function): AdonisLucid.Model

    /**
     * Adds a new trait to the model. Ideally it does a very
     * simple thing and that is to pass the model class to
     * your trait and you own it from there.
     *
     * @method addTrait
     *
     * @param  {Function|String} trait - A plain function or reference to IoC container string
     */
    static addTrait (trait: string | Function, options: object): void

    /**
     * Creates a new model instances from payload
     * and also persist it to database at the
     * same time.
     *
     * @method create
     *
     * @param  {Object} payload
     * @param  {Object} [trx]
     *
     * @return {Model} T instance is returned
     */
    static create (payload: object, trx: object): Promise<AdonisLucid.Model>

    /**
     * Returns the latest row from the database.
     *
     * @method last
     * @async
     *
     * @param  {String} field
     *
     * @return {Model|Null}
     */
    static last (field?: string): AdonisLucid.Model | null

    /**
     * Creates many instances of model in parallel.
     *
     * @method createMany
     *
     * @param  {Array} payloadArray
     * @param  {Object} [trx]
     *
     * @return {Array} Array of model instances is returned
     *
     * @throws {InvalidArgumentException} If payloadArray is not an array
     */
    static createMany (payloadArray: Array<any>, trx: object): Promise<Array<AdonisLucid.Model>>

    /**
     * Deletes all rows of this model (truncate table).
     *
     * @method truncate
     *
     * @return {Promise<void>}
     */
    static truncate (): Promise<void>

    /**
     * Returns the value of primary key regardless of
     * the key name.
     *
     * @attribute primaryKeyValue
     *
     * @return {*}
     */
    public primaryKeyValue: any

    /**
     * Set attribute on model instance. Setting properties
     * manually or calling the `set` function has no
     * difference.
     *
     * NOTE: this method will call the setter
     *
     * @method set
     *
     * @param  {String} name
     * @param  {*} value
     *
     * @return {void}
     */
    public set (name: string, value: any): void

    /**
     * Converts model to an object. This method will call getters,
     * cast dates and will attach `computed` properties to the
     * object.
     *
     * @method toObject
     *
     * @return {Object}
     */
    public toObject (): object

    /**
     * Persist model instance to the database. It will create
     * a new row when model has not been persisted already,
     * otherwise will update it.
     *
     * @method save
     * @async
     *
     * @param {Object} trx Transaction object to be used
     *
     * @return {Promise<Boolean>} Whether or not the model was persisted
     */
    public save (trx: object): Promise<boolean>

    /**
     * Deletes the model instance from the database. Also this
     * method will freeze the model instance for updates.
     *
     * @method delete
     * @async
     *
     * @return {Promise<Boolean>}
     */
    public delete (): Promise<boolean>

    /**
     * Perform required actions to newUp the model instance. This
     * method does not call setters since it is supposed to be
     * called after `fetch` or `find`.
     *
     * @method newUp
     *
     * @param  {Object} row
     *
     * @return {void}
     */
    public newUp (row: object): void

    /**
     * Sets a preloaded relationship on the model instance
     *
     * @method setRelated
     *
     * @param  {String}   key
     * @param  {Object|Array}   value
     *
     * @throws {RuntimeException} If trying to set a relationship twice.
     */
    public setRelated (key: string, value: object | Array<any>): void

    /**
     * Returns the relationship value
     *
     * @method getRelated
     *
     * @param  {String}   key
     *
     * @return {Object}
     */
    public getRelated (key: string): Object

    /**
     * Loads relationships and set them as $relations
     * attribute.
     *
     * To load multiple relations, call this method for
     * multiple times
     *
     * @method load
     * @async
     *
     * @param  {String}   relation
     * @param  {Function} callback
     *
     * @return {void}
     */
    public load (relation: string, callback: Function): Promise<void>

    /**
     * Just like @ref('T.load') but instead loads multiple relations for a
     * single model instance.
     *
     * @method loadMany
     * @async
     *
     * @param  {Object} eagerLoadMap
     *
     * @return {void}
     */
    public loadMany (eagerLoadMap: object): Promise<object>

    /**
     * Returns an instance of @ref('HasOne') relation.
     *
     * @method hasOne
     *
     * @param  {String|Class}  relatedModel
     * @param  {String}        primaryKey
     * @param  {String}        foreignKey
     *
     * @return {HasOne}
     */
    public hasOne <T extends AdonisLucid.BaseModel>(relatedModel: string | T, primaryKey: string, foreignKey: string): AdonisLucid.HasOne<T>

    /**
     * Returns an instance of @ref('HasMany') relation
     *
     * @method hasMany
     *
     * @param  {String|Class}  relatedModel
     * @param  {String}        primaryKey
     * @param  {String}        foreignKey
     *
     * @return {HasMany}
     */
    public hasMany <T extends AdonisLucid.BaseModel>(relatedModel: string | T, primaryKey: string, foreignKey: string): AdonisLucid.HasMany<T>

    /**
     * Returns an instance of @ref('BelongsTo') relation
     *
     * @method belongsTo
     *
     * @param  {String|Class}  relatedModel
     * @param  {String}        primaryKey
     * @param  {String}        foreignKey
     *
     * @return {BelongsTo}
     */
    public belongsTo <T extends AdonisLucid.BaseModel>(relatedModel: string | T, primaryKey: string, foreignKey: string): AdonisLucid.BelongsTo<T>

    /**
     * Returns an instance of @ref('BelongsToMany') relation
     *
     * @method belongsToMany
     *
     * @param  {Class|String}      relatedModel
     * @param  {String}            foreignKey
     * @param  {String}            relatedForeignKey
     * @param  {String}            primaryKey
     * @param  {String}            relatedPrimaryKey
     *
     * @return {BelongsToMany}
     */
    public belongsToMany <T extends AdonisLucid.BaseModel>(relatedModel: string | T, foreignKey: string, relatedForeignKey: string, primaryKey: string, relatedPrimaryKey: string): AdonisLucid.BelongsToMany<T>

    /**
     * Returns instance of @ref('HasManyThrough')
     *
     * @method manyThrough
     *
     * @param  {Class|String}    relatedModel
     * @param  {String}    relatedMethod
     * @param  {String}    primaryKey
     * @param  {String}    foreignKey
     *
     * @return {HasManyThrough}
     */
    public manyThrough <T extends AdonisLucid.BaseModel>(relatedModel: string | T, relatedMethod: string, primaryKey: string, foreignKey: string): AdonisLucid.HasManyThrough<T>

    /**
     * Reload the model instance in memory. Some may
     * not like it, but in real use cases no one
     * wants a new instance.
     *
     * @method reload
     *
     * @return {void}
     */
    public reload (): Promise<void>

  }

  /*
   * https://github.com/adonisjs/adonis-lucid/blob/e4442b129d3b0a440b12e72e0afca9f2103ba029/src/Lucid/QueryBuilder/index.js
   */
  export class QueryBuilder<T extends AdonisLucid.BaseModel> {

    /**
     * Reference to database provider
     */
    public db: any

    /**
     * Reference to query builder with pre selected table
     */
    public query: any

    /**
     * Reference to the global scopes iterator. A fresh instance
     * needs to be used for each query
     */
    public scopesIterator: Iterator<any>

    constructor (Model: T, connection: any)

    /**
     * Access of query formatter
     *
     * @method formatter
     *
     * @return {Object}
     */
    public formatter (): object

    /**
     * Instruct query builder to ignore all global
     * scopes.
     *
     * Passing `*` will ignore all scopes or you can
     * pass an array of scope names.
     *
     * @param {Array} [scopes = ['*']]
     *
     * @method ignoreScopes
     *
     * @chainable
     */
    ignoreScopes (scopes: Array<string>): AdonisLucid.QueryBuilder<T>

    /**
     * Execute the query builder chain by applying global scopes
     *
     * @method fetch
     * @async
     *
     * @return {Serializer} Instance of model serializer
     */
    public fetch (): Promise<AdonisLucid.Serializer<T>>

    /**
     * Returns the first row from the database.
     *
     * @method first
     * @async
     *
     * @return {Model|Null}
     */
    public first (): Promise<T | null>

    /**
     * Returns the latest row from the database.
     *
     * @method last
     * @async
     *
     * @param  {String} field
     *
     * @return {Model|Null}
     */
    public last (field?: string): Promise<T | null>

    /**
     * Throws an exception when unable to find the first
     * row for the built query
     *
     * @method firstOrFail
     * @async
     *
     * @return {Model}
     *
     * @throws {ModelNotFoundException} If unable to find first row
     */
    public firstOrFail (): Promise<T>

    /**
     * Paginate records, same as fetch but returns a
     * collection with pagination info
     *
     * @method paginate
     * @async
     *
     * @param  {Number} [page = 1]
     * @param  {Number} [limit = 20]
     *
     * @return {Serializer}
     */
    public paginate (page?: number, limit?: number): Promise<AdonisLucid.Serializer<T>>

    /**
     * Bulk update data from query builder. This method will also
     * format all dates and set `updated_at` column
     *
     * @method update
     * @async
     *
     * @param  {Object|Model} valuesOrModelInstance
     *
     * @return {Promise}
     */
    public update (valuesOrModelInstance: object | T): Promise<any>

    /**
     * Deletes the rows from the database.
     *
     * @method delete
     * @async
     *
     * @return {Promise}
     */
    public delete (): Promise<any>

    /**
     * Returns an array of primaryKeys
     *
     * @method ids
     * @async
     *
     * @return {Array}
     */
    public ids (): Promise<Array<any>>

    /**
     * Returns a pair of lhs and rhs. This method will not
     * eagerload relationships.
     *
     * @method pair
     * @async
     *
     * @param  {String} lhs
     * @param  {String} rhs
     *
     * @return {Object}
     */
    public pair (lhs: string, rhs: string): Promise<object>

    /**
     * Same as `pick` but inverse
     *
     * @method pickInverse
     * @async
     *
     * @param  {Number}    [limit = 1]
     *
     * @return {Collection}
     */
    public pickInverse (limit?: number): Promise<AdonisLucid.Serializer<T>>

    /**
     * Pick x number of rows from the database
     *
     * @method pick
     * @async
     *
     * @param  {Number} [limit = 1]
     *
     * @return {Collection}
     */
    public pick (limit?: number): Promise<AdonisLucid.Serializer<T>>

    /**
     * Eagerload relationships when fetching the parent
     * record
     *
     * @method with
     *
     * @param  {String}   relation
     * @param  {Function} [callback]
     *
     * @chainable
     */
    public with (relation: string, callback: Function): AdonisLucid.QueryBuilder<T>

    /**
     * Adds a check on there parent model to fetch rows
     * only where related rows exists or as per the
     * defined number
     *
     * @method has
     *
     * @param  {String}  relation
     * @param  {String}  expression
     * @param  {*}   value
     *
     * @chainable
     */
    public has (relation: string, expression: string, value: any): AdonisLucid.QueryBuilder<T>

    /**
     * Similar to `has` but instead adds or clause
     *
     * @method orHas
     *
     * @param  {String} relation
     * @param  {String} expression
     * @param  {Mixed} value
     *
     * @chainable
     */
    public orHas (relation: string, expression: string, value: any): AdonisLucid.QueryBuilder<T>

    /**
     * Adds a check on the parent model to fetch rows where
     * related rows doesn't exists
     *
     * @method doesntHave
     *
     * @param  {String}   relation
     *
     * @chainable
     */
    public doesntHave (relation: string): AdonisLucid.QueryBuilder<T>

    /**
     * Same as `doesntHave` but adds a `or` clause.
     *
     * @method orDoesntHave
     *
     * @param  {String}   relation
     *
     * @chainable
     */
    public orDoesntHave (relation: string): AdonisLucid.QueryBuilder<T>

    /**
     * Adds a query constraint just like has but gives you
     * a chance to pass a callback to add more constraints
     *
     * @method whereHas
     *
     * @param  {String}   relation
     * @param  {Function} callback
     * @param  {String}   expression
     * @param  {String}   value
     *
     * @chainable
     */
    public whereHas (relation: string, callback: Function, expression: string, value: any): AdonisLucid.QueryBuilder<T>

    /**
     * Same as `whereHas` but with `or` clause
     *
     * @method orWhereHas
     *
     * @param  {String}   relation
     * @param  {Function} callback
     * @param  {String}   expression
     * @param  {Mixed}   value
     *
     * @chainable
     */
    public orWhereHas (relation: string, callback: Function, expression: string, value: any): AdonisLucid.QueryBuilder<T>

    /**
     * Opposite of `whereHas`
     *
     * @method whereDoesntHave
     *
     * @param  {String}        relation
     * @param  {Function}      callback
     *
     * @chainable
     */
    public whereDoesntHave (relation: string, callback: Function): AdonisLucid.QueryBuilder<T>

    /**
     * Same as `whereDoesntHave` but with `or` clause
     *
     * @method orWhereDoesntHave
     *
     * @param  {String}          relation
     * @param  {Function}        callback
     *
     * @chainable
     */
    public orWhereDoesntHave (relation: string, callback: Function): AdonisLucid.QueryBuilder<T>

    /**
     * Returns count of a relationship
     *
     * @method withCount
     *
     * @param  {String}   relation
     * @param  {Function} callback
     *
     * @chainable
     *
     * @example
     * ```js
     * query().withCount('profile')
     * query().withCount('profile as userProfile')
     * ```
     */
    public withCount (relation: string, callback: Function): AdonisLucid.QueryBuilder<T>

    /**
     * Define fields to be visible for a single
     * query.
     *
     * Computed when `toJSON` is called
     *
     * @method setVisible
     *
     * @param  {Array}   fields
     *
     * @chainable
     */
    public setVisible (fields: Array<any>): AdonisLucid.QueryBuilder<T>

    /**
     * Define fields to be hidden for a single
     * query.
     *
     * Computed when `toJSON` is called
     *
     * @method setHidden
     *
     * @param  {Array}   fields
     *
     * @chainable
     */
    public setHidden (fields: Array<any>): AdonisLucid.QueryBuilder<T>
  }

  /*
   * https://github.com/adonisjs/adonis-lucid/blob/e4442b129d3b0a440b12e72e0afca9f2103ba029/src/Lucid/Serializers/Vanilla.js
   */
  export class VanillaSerializer<T extends AdonisLucid.BaseModel> {

    /**
     * The serializer rows. All rows should be instance
     * of Lucid model
     *
     * @attribute rows
     *
     * @type {Array}
     */
    public rows: Array<T>

    /**
     * The pagination meta data
     *
     * @attribute pages
     *
     * @type {Object}
     */
    public pages: object

    /**
     * A boolean indicating whether return output of
     * toJSON should be an array of an object.
     *
     * @attribute isOne
     *
     * @type {Boolean}
     */
    public isOne: boolean

    /**
     * Add row to the list of rows. Make sure the row
     * is an instance of the same model as the other
     * model instances.
     *
     * @method addRow
     *
     * @param  {Model} row
     */
    public addRow (row: T): void

    /**
     * Get first model instance
     *
     * @method first
     *
     * @return {Model}
     */
    public first (): T

    /**
     * Returns the row for the given index
     *
     * @method nth
     *
     * @param  {Number} index
     *
     * @return {Model|Null}
     */
    public nth (index: number): T | null

    /**
     * Get last model instance
     *
     * @method last
     *
     * @return {Model}
     */
    public last (): T


    /**
     * Returns the size of rows
     *
     * @method size
     *
     * @return {Number}
     */
    public size (): number

    /**
     * Convert all rows/model instances to their JSON
     * representation
     *
     * @method toJSON
     *
     * @return {Array|Object}
     */
    public toJSON (): Array<T> | object

  }

  // This is aliased since it seems like Harminder wanted Serializers
  // to adopt an common SerializerInterface, but there is no documentation
  // on how that contract should look. So we will alias it so it can be changed
  // without having to change the internal type documentation
  export type Serializer<Model extends AdonisLucid.BaseModel> = VanillaSerializer<Model>
  export type StaticSerializer = typeof VanillaSerializer

  /*
   https://github.com/adonisjs/adonis-lucid/blob/e4442b129d3b0a440b12e72e0afca9f2103ba029/src/Lucid/Relations/BaseRelation.js
   */
  export class BaseRelation {

    /**
     * Returns the value for the primary key set on
     * the relationship
     *
     * @attribute $primaryKeyValue
     *
     * @return {Mixed}
     */
    public $primaryKeyValue: Readonly<any>

    /**
     * The primary table in relationship
     *
     * @attribute $primaryTable
     *
     * @return {String}
     */
    public $primaryTable: Readonly<any>

    /**
     * The foreign table in relationship
     *
     * @attribute $foreignTable
     *
     * @return {String}
     */
    public $foreignTable: Readonly<any>

    /**
     * Define a custom eagerload query.
     *
     * NOTE: Defining eagerload query leaves everything on you
     * to resolve the correct rows and they must be an array
     *
     * @method eagerLoadQuery
     *
     * @return {void}
     */
    public eagerLoadQuery (fn: Function): void

    /**
     * Applies scopes on the related query. This is used when
     * the related query is used as subquery.
     *
     * @method applyRelatedScopes
     */
    public applyRelatedScopes (): void

    /**
     * Returns the eagerLoad query for the relationship
     *
     * @method eagerLoad
     * @async
     *
     * @param  {Array}          rows
     *
     * @return {Object}
     */
    public eagerLoad (rows: Array<any>): Promise<object>

    /**
     * Load a single relationship from parent to child
     * model, but only for one row.
     *
     * @method load
     * @async
     *
     * @param  {String|Number}     value
     *
     * @return {Model}
     */
    public load (): Promise<AdonisLucid.BaseModel>

    /**
     * Columnize dot notated column name using the formatter
     *
     * @method columnize
     *
     * @param  {String}  column
     *
     * @return {String}
     */
    public columnize (column: string): string

  }

  /*
   * https://github.com/adonisjs/adonis-lucid/blob/e4442b129d3b0a440b12e72e0afca9f2103ba029/src/Lucid/Relations/HasOne.js
   */
  export class HasOne<T extends AdonisLucid.BaseModel> extends BaseRelation {
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
    public mapValues (modelInstances: Array<T>): Array<T>

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
    public group (relatedInstances: Array<any>): object

    /**
     * Fetch related rows for a relationship
     *
     * @method fetch
     *
     * @alias first
     *
     * @return {Model}
     */
    public fetch (): T

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
    public relatedWhere (count: boolean): object

    /**
     * Adds `on` clause to the innerjoin context. This
     * method is mainly used by HasManyThrough
     *
     * @method addWhereOn
     *
     * @param  {Object}   context
     */
    public addWhereOn (context: object): void

    /**
     * Saves the related instance to the database. Foreign
     * key is set automatically.
     *
     * NOTE: This method will persist the parent model if
     * not persisted already.
     *
     * @method save
     *
     * @param  {Object}  relatedInstance
     * @param  {Object}  [trx]
     *
     * @return {Promise}
     */
    public save (relatedInstance: object, trx: object): Promise<any> // UNKNOWN

    /**
     * Creates the new related instance model and persist
     * it to database. Foreign key is set automatically.
     *
     * NOTE: This method will persist the parent model if
     * not persisted already.
     *
     * @method create
     * @param  {Object}  [trx]
     *
     * @param  {Object} payload
     *
     * @return {Promise}
     */
    public create (payload: object, trx: object): Promise<any> // UNKNOWN
  }

  /*
   * https://github.com/adonisjs/adonis-lucid/blob/e4442b129d3b0a440b12e72e0afca9f2103ba029/src/Lucid/Relations/HasMany.js
   */
  export class HasMany<T extends AdonisLucid.BaseModel> extends BaseRelation {
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
    public mapValues (modelInstances: Array<T>): Array<T>

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
    public group (relatedInstances: Array<any>): object

    /**
     * Adds a where clause to limit the select search
     * to related rows only.
     *
     * @method relatedWhere
     *
     * @param  {Boolean}     count
     * @param  {Number}      counter
     *
     * @return {Object}
     */
    public relatedWhere (count: boolean, counter: number): object

    /**
     * Adds `on` clause to the innerjoin context. This
     * method is mainly used by HasManyThrough
     *
     * @method addWhereOn
     *
     * @param  {Object}   context
     */
    public addWhereOn (context: object): void

    /**
     * Saves the related instance to the database. Foreign
     * key is set automatically
     *
     * @method save
     *
     * @param  {Object}  relatedInstance
     * @param  {Object}  [trx]
     *
     * @return {Promise}
     */
    public save (relatedInstance: object, trx: object): Promise<any>

    /**
     * Creates the new related instance model and persist
     * it to database. Foreign key is set automatically
     *
     * @method create
     *
     * @param  {Object} payload
     * @param  {Object}  [trx]
     *
     * @return {Promise}
     */
    public create (payload: object, trx: object): Promise<any>

    /**
     * Creates an array of model instances in parallel
     *
     * @method createMany
     *
     * @param  {Array}   arrayOfPayload
     * @param  {Object}  [trx]
     *
     * @return {Array}
     */
    public createMany (arrayOfPayload: Array<any>, trx: object): Promise<Array<any>>

    /**
     * Creates an array of model instances in parallel
     *
     * @method createMany
     *
     * @param  {Array}   arrayOfRelatedInstances
     * @param  {Object}  [trx]
     *
     * @return {Array}
     */
    public saveMany (arrayOfRelatedInstances: Array<any>, trx: object): Promise<Array<any>>
  }

  /*
   * https://github.com/adonisjs/adonis-lucid/blob/e4442b129d3b0a440b12e72e0afca9f2103ba029/src/Lucid/Relations/BelongsTo.js
   */
  export class BelongsTo<T extends AdonisLucid.BaseModel> extends BaseRelation {

    /**
     * Returns the first row for the related model
     *
     * @method first
     *
     * @return {Object|Null}
     */
    public first (): object | null

    /**
     * Map values from model instances to an array. It is required
     * to make `whereIn` query when eagerloading results.
     *
     * @method mapValues
     *
     * @param  {Array}  modelInstances
     *
     * @return {Array}
     */
    public mapValues (modelInstances: Array<T>): Array<any>

    /**
     * Groups related instances with their foriegn keys
     *
     * @method group
     *
     * @param  {Array} relatedInstances
     *
     * @return {Object} @multiple([key=String, values=Array, defaultValue=Null])
     */
    public group (relatedInstances: Array<any>): object

    /**
     * Overriding fetch to call first, since belongsTo
     * can never have many rows
     *
     * @method fetch
     * @async
     *
     * @return {Object}
     */
    public fetch (): object

    /**
     * Adds a where clause to limit the select search
     * to related rows only.
     *
     * @method relatedWhere
     *
     * @param  {Boolean}     count
     * @param  {Integer}     counter
     *
     * @return {Object}
     */
    public relatedWhere (count: boolean, counter: number): object

    /**
     * Adds `on` clause to the innerjoin context. This
     * method is mainly used by HasManyThrough
     *
     * @method addWhereOn
     *
     * @param  {Object}   context
     */
    public addWhereOn (context: object): void

    /**
     * Associate 2 models together, also this method will save
     * the related model if not already persisted
     *
     * @method associate
     * @async
     *
     * @param  {Object}  relatedInstance
     * @param  {Object}  [trx]
     *
     * @return {Promise}
     */
    public associate (relatedInstance: object, trx: object): Promise<any>

    /**
     * Dissociate relationship from database by setting `foriegnKey` to null
     *
     * @method dissociate
     * @async
     *
     * @param  {Object}  [trx]
     *
     * @return {Promise}
     */
    public dissociate (trx: object): Promise<any>
  }

  /*
   * https://github.com/adonisjs/adonis-lucid/blob/e4442b129d3b0a440b12e72e0afca9f2103ba029/src/Lucid/Relations/BelongsToMany.js
   */
  export class BelongsToMany<T extends AdonisLucid.BaseModel> extends BaseRelation {

    /**
     * Returns the pivot table name. The pivot model is
     * given preference over the default table name.
     *
     * @attribute $pivotTable
     *
     * @return {String}
     */
    public $pivotTable: Readonly<string>

    /**
     * The pivot columns to be selected
     *
     * @attribute $pivotColumns
     *
     * @return {Array}
     */
    public $pivotColumns: Readonly<Array<any>>

    /**
     * The colums to be selected from the related
     * query
     *
     * @method select
     *
     * @param  {Array} columns
     *
     * @chainable
     */
    public select (columns: Array<any>): AdonisLucid.BelongsToMany<T>

    /**
     * Define a fully qualified model to be used for
     * making pivot table queries and using defining
     * pivot table settings.
     *
     * @method pivotModel
     *
     * @param  {Model}   pivotModel
     *
     * @chainable
     */
    public pivotModel (pivotModel: AdonisLucid.BaseModel): AdonisLucid.BelongsToMany<T>

    /**
     * Define the pivot table
     *
     * @method pivotTable
     *
     * @param  {String}   table
     *
     * @chainable
     */
    public pivotTable (table: string): AdonisLucid.BelongsToMany<T>

    /**
     * Make sure `created_at` and `updated_at` timestamps
     * are being used
     *
     * @method withTimestamps
     *
     * @chainable
     */
    public withTimestamps (): AdonisLucid.BelongsToMany<T>

    /**
     * Fields to be selected from pivot table
     *
     * @method withPivot
     *
     * @param  {Array}  fields
     *
     * @chainable
     */
    public withPivot (fields: Array<string>): AdonisLucid.BelongsToMany<T>

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
    public mapValues (modelInstances: Array<any>): Array<any>

    /**
     * Make a where clause on the pivot table
     *
     * @method whereInPivot
     *
     * @param  {String}     key
     * @param  {...Spread}  args
     *
     * @chainable
     */
    public whereInPivot (key: string, args?: Array<any>): AdonisLucid.BelongsToMany<T>

    /**
     * Make a orWhere clause on the pivot table
     *
     * @method orWherePivot
     *
     * @param  {String}     key
     * @param  {...Spread}  args
     *
     * @chainable
     */
    public orWherePivot (key: string, args?: Array<any>): AdonisLucid.BelongsToMany<T>

    /**
     * Make a andWhere clause on the pivot table
     *
     * @method andWherePivot
     *
     * @param  {String}     key
     * @param  {...Spread}  args
     *
     * @chainable
     */
    public andWherePivot (key: string, args?: Array<any>): AdonisLucid.BelongsToMany<T>

    /**
     * Where clause on pivot table
     *
     * @method wherePivot
     *
     * @param  {String}    key
     * @param  {...Spread} args
     *
     * @chainable
     */
    public wherePivot (key: string, args?: Array<any>): AdonisLucid.BelongsToMany<T>

    /**
     * Returns the eagerLoad query for the relationship
     *
     * @method eagerLoad
     * @async
     *
     * @param  {Array}          rows
     *
     * @return {Object}
     */
    public eagerLoad (rows: Array<any>): Promise<object>

    /**
     * Method called when eagerloading for a single
     * instance
     *
     * @method load
     * @async
     *
     * @return {Promise}
     */
    public load (): Promise<any>

    /**
     * Fetch ids for the related model
     *
     * @method ids
     *
     * @return {Array}
     */
    public ids (): Array<any>

    /**
     * Execute the query and setup pivot values
     * as a relation
     *
     * @method fetch
     * @async
     *
     * @return {Serializer}
     */
    public fetch (): Promise<AdonisLucid.Serializer<T>>

    /**
     * Groups related instances with their foriegn keys
     *
     * @method group
     *
     * @param  {Array} relatedInstances
     *
     * @return {Object} @multiple([key=String, values=Array, defaultValue=Null])
     */
    public group (relatedInstances: Array<string>): object

    /**
     * Returns the query for pivot table
     *
     * @method pivotQuery
     *
     * @param {Boolean} selectFields
     *
     * @return {Object}
     */
    public pivotQuery (selectFields?: boolean): object

    /**
     * Adds a where clause to limit the select search
     * to related rows only.
     *
     * @method relatedWhere
     *
     * @param  {Boolean}     count
     * @param  {Integer}     counter
     *
     * @return {Object}
     */
    public relatedWhere (count: boolean, counter: number): object

    /**
     * Adds `on` clause to the innerjoin context. This
     * method is mainly used by HasManyThrough
     *
     * @method addWhereOn
     *
     * @param  {Object}   context
     */
    public addWhereOn (context: object): void

    /**
     * Attach existing rows inside pivot table as a relationship
     *
     * @method attach
     *
     * @param  {Number|String|Array} references
     * @param  {Function} [pivotCallback]
     * @param  {trx} Transaction
     *
     * @return {Promise}
     */
    public attach (references: number | string | Array<any>, pivotCallback: Function | null, trx: object): Promise<any>

    /**
     * Delete related model rows in bulk and also detach
     * them from the pivot table.
     *
     * NOTE: This method will run 3 queries in total. First is to
     * fetch the related rows, next is to delete them and final
     * is to remove the relationship from pivot table.
     *
     * @method delete
     * @async
     *
     * @return {Number} Number of effected rows
     */
    public delete (): Promise<number>

    /**
     * Update related rows
     *
     * @method update
     *
     * @param  {Object} values
     *
     * @return {Number}        Number of effected rows
     */
    public update (values: object): Promise<number>

    /**
     * Detach existing relations from the pivot table
     *
     * @method detach
     * @async
     *
     * @param  {Array}  references
     * @param  {Object} trx
     *
     * @return {Number}  The number of effected rows
     */
    public detach (references: Array<any>, trx: object): Promise<number>

    /**
     * Calls `detach` and `attach` together.
     *
     * @method sync
     *
     * @param  {Number|String|Array} relatedPrimaryKeyValue
     * @param  {Function} [pivotCallback]
     *
     * @return {void}
     */
    public sync (references: number | string | Array<any>, pivotCallback: Function, trx: object): Promise<void>

    /**
     * Save the related model instance and setup the relationship
     * inside pivot table
     *
     * @method save
     *
     * @param  {Object} relatedInstance
     * @param  {Function} pivotCallback
     *
     * @return {void}
     */
    public save (relatedInstance: object, pivotCallback: Function): Promise<void>

    /**
     * Save multiple relationships to the database. This method
     * will run queries in parallel
     *
     * @method saveMany
     * @async
     *
     * @param  {Array}    arrayOfRelatedInstances
     * @param  {Function} [pivotCallback]
     *
     * @return {void}
     */
    public saveMany (arrayOfRelatedInstances: Array<any>, pivotCallback: Function): Promise<void>

    /**
     * Creates a new related model instance and persist
     * the relationship inside pivot table
     *
     * @method create
     * @async
     *
     * @param  {Object}   row
     * @param  {Function} [pivotCallback]
     *
     * @return {Object}               Instance of related model
     */
    public create (row: object, pivotCallback: Function): Promise<object>

    /**
     * Creates multiple related relationships. This method will
     * call all queries in parallel
     *
     * @method createMany
     * @async
     *
     * @param  {Array}   rows
     * @param  {Function}   pivotCallback
     *
     * @return {Array}
     */
    public createMany (rows: Array<any>, pivotCallback: Function): Promise<Array<any>>


  }

  /*
   * https://github.com/adonisjs/adonis-lucid/blob/e4442b129d3b0a440b12e72e0afca9f2103ba029/src/Lucid/Relations/HasManyThrough.js
   */
  export class HasManyThrough<T extends AdonisLucid.BaseModel> extends BaseRelation {

    /**
     * Select fields from the primary table
     *
     * @method select
     *
     * @param  {Array} columns
     *
     * @chainable
     */
    public select (columns: Array<string>): AdonisLucid.HasManyThrough<T>

    /**
     * Select fields from the through table.
     *
     * @method selectThrough
     *
     * @param  {Array}      columns
     *
     * @chainable
     */
    public selectThrough (columns: Array<string>): AdonisLucid.HasManyThrough<T>

    /**
     * Select fields from the related table
     *
     * @method selectRelated
     *
     * @param  {Array}      columns
     *
     * @chainable
     */
    public selectRelated (columns: Array<string>): AdonisLucid.HasManyThrough<T>

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
    public mapValues (modelInstances: Array<any>): Array<any>

    /**
     * Returns the eagerLoad query for the relationship
     *
     * @method eagerLoad
     * @async
     *
     * @param  {Array}          rows
     *
     * @return {Object}
     */
    public eagerLoad (rows: Array<any>): Promise<object>

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
    public group (relatedInstances: Array<any>): object

    /**
     * Adds `on` clause to the innerjoin context. This
     * method is mainly used by HasManyThrough
     *
     * @method addWhereOn
     *
     * @param  {Object}   context
     */
    public relatedWhere (count: any): any // JSDoc invalid
  }
}
