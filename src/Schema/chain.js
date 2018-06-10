"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
/**
 * adonis-schema
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/
const GE = require('@adonisjs/generic-exceptions');
class SchemaChain {
    constructor() {
        this._deferredActions = [];
        this._scheduleFn = null;
    }
    /**
     * Select schema to be used with postgreSQL.
     *
     * @method withSchema
     *
     * @param {String} schema
     *
     * @chainable
     */
    withSchema(schema) {
        this._deferredActions.push({ name: 'withSchema', args: [schema] });
        return this;
    }
    /**
     * Create a extension.
     *
     * NOTE: This action is deferred
     *
     * @method createExtension
     *
     * @param  {String}    extensionName
     *
     * @return {void}
     */
    createExtension(extensionName) {
        this._deferredActions.push({ name: 'createExtension', args: [extensionName] });
    }
    /**
     * Create a extension if not already exists.
     *
     * NOTE: This action is deferred
     *
     * @method createExtensionIfNotExists
     *
     * @param  {String}    extensionName
     *
     * @return {void}
     */
    createExtensionIfNotExists(extensionName) {
        this._deferredActions.push({ name: 'createExtensionIfNotExists', args: [extensionName] });
    }
    /**
     * Create a new table.
     *
     * NOTE: This action is deferred
     *
     * @method createTable
     *
     * @param  {String}    tableName
     * @param  {Function}  callback
     *
     * @return {void}
     */
    createTable(tableName, callback) {
        this._deferredActions.push({ name: 'createTable', args: [tableName, callback] });
    }
    /**
     * Create a new table if not already exists.
     *
     * NOTE: This action is deferred
     *
     * @method createTableIfNotExists
     *
     * @param  {String}    tableName
     * @param  {Function}  callback
     *
     * @return {void}
     */
    createTableIfNotExists(tableName, callback) {
        this._deferredActions.push({ name: 'createTableIfNotExists', args: [tableName, callback] });
    }
    /**
     * Rename existing table.
     *
     * NOTE: This action is deferred
     *
     * @method renameTable
     *
     * @param  {String}    fromTable
     * @param  {String}    toTable
     *
     * @return {void}
     */
    renameTable(fromTable, toTable) {
        this._deferredActions.push({ name: 'renameTable', args: [fromTable, toTable] });
    }
    /**
     * Drop existing extension.
     *
     * NOTE: This action is deferred
     *
     * @method dropExtension
     *
     * @param  {String}    extensionName
     *
     * @return {void}
     */
    dropExtension(extensionName) {
        this._deferredActions.push({ name: 'dropExtension', args: [extensionName] });
    }
    /**
     * Drop extension only if it exists.
     *
     * NOTE: This action is deferred
     *
     * @method dropExtensionIfExists
     *
     * @param  {String}    extensionName
     *
     * @return {void}
     */
    dropExtensionIfExists(extensionName) {
        this._deferredActions.push({ name: 'dropExtensionIfExists', args: [extensionName] });
    }
    /**
     * Drop existing table.
     *
     * NOTE: This action is deferred
     *
     * @method dropTable
     *
     * @param  {String}    tableName
     *
     * @return {void}
     */
    dropTable(tableName) {
        this._deferredActions.push({ name: 'dropTable', args: [tableName] });
    }
    /**
     * Drop table only if it exists.
     *
     * NOTE: This action is deferred
     *
     * @method dropTableIfExists
     *
     * @param  {String}    tableName
     *
     * @return {void}
     */
    dropTableIfExists(tableName) {
        this._deferredActions.push({ name: 'dropTableIfExists', args: [tableName] });
    }
    /**
     * Select table for altering it.
     *
     * NOTE: This action is deferred
     *
     * @method table
     *
     * @param  {String}    tableName
     * @param  {Function}  callback
     *
     * @return {void}
     */
    table(tableName, callback) {
        this._deferredActions.push({ name: 'table', args: [tableName, callback] });
    }
    /* istanbul ignore next */
    /**
     * Run a raw SQL statement
     *
     * @method raw
     *
     * @param  {String} statement
     *
     * @return {Object}
     *
     * @return {void}
     */
    raw(statement) {
        this._deferredActions.push({ name: 'raw', args: [statement] });
        return this;
    }
    /**
     * Schedule a method to be executed in sequence with migrations
     *
     * @method schedule
     *
     * @param  {Function} fn
     *
     * @return {void}
     */
    schedule(fn) {
        if (typeof (fn) !== 'function') {
            throw GE.InvalidArgumentException.invalidParameter(`this.schedule expects 1st argument to be a function`);
        }
        this._scheduleFn = fn;
    }
    /**
     * Alias for @ref('Schema.table')
     *
     * @method alter
     */
    alter(tableName, callback) {
        return this.table(tableName, callback);
    }
    /**
     * Alias for @ref('Schema.createTable')
     *
     * @method create
     */
    create(tableName, callback) {
        return this.createTable(tableName, callback);
    }
    /**
     * Alias for @ref('Schema.createTableIfNotExists')
     *
     * @method createIfNotExists
     */
    createIfNotExists(tableName, callback) {
        return this.createTableIfNotExists(tableName, callback);
    }
    /**
     * Alias for @ref('Schema.dropTable')
     *
     * @method drop
     */
    drop(tableName) {
        return this.dropTable(tableName);
    }
    /**
     * Alias for @ref('Schema.dropTableIfExists')
     *
     * @method dropIfExists
     */
    dropIfExists(tableName) {
        return this.dropTableIfExists(tableName);
    }
    /**
     * Alias for @ref('Schema.renameTable')
     *
     * @method rename
     */
    rename(fromTable, toTable) {
        return this.renameTable(fromTable, toTable);
    }
    /**
     * Returns the SQL query for all the actions.
     *
     * @method toString
     *
     * @return {String}
     */
    toString(schema) {
        this._deferredActions.forEach((action) => (schema[action.name](...action.args)));
        return schema.toString();
    }
    /**
     * Executes the deferred actions on a single chain. This method will
     * rollback the trx on error.
     *
     * @method execute
     *
     * @param  {Object} trx
     *
     * @return {void}
     */
    execute(trx) {
        return __awaiter(this, void 0, void 0, function* () {
            /**
             * If schedule fn is defined, then execute it. Within a chain a user
             * can never have `schedule` and `deferredActions` together.
             */
            if (typeof (this._scheduleFn) === 'function') {
                try {
                    yield this._scheduleFn(trx);
                }
                catch (error) {
                    trx.rollback();
                    throw error;
                }
                return;
            }
            const schema = trx.schema;
            /**
             * Looping over all the deferred actions
             */
            this._deferredActions.forEach((action) => (schema[action.name](...action.args)));
            try {
                yield schema;
                this._deferredActions = [];
            }
            catch (error) {
                trx.rollback();
                throw error;
            }
        });
    }
}
module.exports = SchemaChain;
//# sourceMappingURL=chain.js.map