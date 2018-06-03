"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * adonis-schema
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/
var GE = require('@adonisjs/generic-exceptions');
var SchemaChain = /** @class */ (function () {
    function SchemaChain() {
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
    SchemaChain.prototype.withSchema = function (schema) {
        this._deferredActions.push({ name: 'withSchema', args: [schema] });
        return this;
    };
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
    SchemaChain.prototype.createExtension = function (extensionName) {
        this._deferredActions.push({ name: 'createExtension', args: [extensionName] });
    };
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
    SchemaChain.prototype.createExtensionIfNotExists = function (extensionName) {
        this._deferredActions.push({ name: 'createExtensionIfNotExists', args: [extensionName] });
    };
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
    SchemaChain.prototype.createTable = function (tableName, callback) {
        this._deferredActions.push({ name: 'createTable', args: [tableName, callback] });
    };
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
    SchemaChain.prototype.createTableIfNotExists = function (tableName, callback) {
        this._deferredActions.push({ name: 'createTableIfNotExists', args: [tableName, callback] });
    };
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
    SchemaChain.prototype.renameTable = function (fromTable, toTable) {
        this._deferredActions.push({ name: 'renameTable', args: [fromTable, toTable] });
    };
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
    SchemaChain.prototype.dropExtension = function (extensionName) {
        this._deferredActions.push({ name: 'dropExtension', args: [extensionName] });
    };
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
    SchemaChain.prototype.dropExtensionIfExists = function (extensionName) {
        this._deferredActions.push({ name: 'dropExtensionIfExists', args: [extensionName] });
    };
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
    SchemaChain.prototype.dropTable = function (tableName) {
        this._deferredActions.push({ name: 'dropTable', args: [tableName] });
    };
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
    SchemaChain.prototype.dropTableIfExists = function (tableName) {
        this._deferredActions.push({ name: 'dropTableIfExists', args: [tableName] });
    };
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
    SchemaChain.prototype.table = function (tableName, callback) {
        this._deferredActions.push({ name: 'table', args: [tableName, callback] });
    };
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
    SchemaChain.prototype.raw = function (statement) {
        this._deferredActions.push({ name: 'raw', args: [statement] });
        return this;
    };
    /**
     * Schedule a method to be executed in sequence with migrations
     *
     * @method schedule
     *
     * @param  {Function} fn
     *
     * @return {void}
     */
    SchemaChain.prototype.schedule = function (fn) {
        if (typeof (fn) !== 'function') {
            throw GE.InvalidArgumentException.invalidParameter("this.schedule expects 1st argument to be a function");
        }
        this._scheduleFn = fn;
    };
    /**
     * Alias for @ref('Schema.table')
     *
     * @method alter
     */
    SchemaChain.prototype.alter = function (tableName, callback) {
        return this.table(tableName, callback);
    };
    /**
     * Alias for @ref('Schema.createTable')
     *
     * @method create
     */
    SchemaChain.prototype.create = function (tableName, callback) {
        return this.createTable(tableName, callback);
    };
    /**
     * Alias for @ref('Schema.createTableIfNotExists')
     *
     * @method createIfNotExists
     */
    SchemaChain.prototype.createIfNotExists = function (tableName, callback) {
        return this.createTableIfNotExists(tableName, callback);
    };
    /**
     * Alias for @ref('Schema.dropTable')
     *
     * @method drop
     */
    SchemaChain.prototype.drop = function (tableName) {
        return this.dropTable(tableName);
    };
    /**
     * Alias for @ref('Schema.dropTableIfExists')
     *
     * @method dropIfExists
     */
    SchemaChain.prototype.dropIfExists = function (tableName) {
        return this.dropTableIfExists(tableName);
    };
    /**
     * Alias for @ref('Schema.renameTable')
     *
     * @method rename
     */
    SchemaChain.prototype.rename = function (fromTable, toTable) {
        return this.renameTable(fromTable, toTable);
    };
    /**
     * Returns the SQL query for all the actions.
     *
     * @method toString
     *
     * @return {String}
     */
    SchemaChain.prototype.toString = function (schema) {
        this._deferredActions.forEach(function (action) { return (schema[action.name].apply(schema, action.args)); });
        return schema.toString();
    };
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
    SchemaChain.prototype.execute = function (trx) {
        return __awaiter(this, void 0, void 0, function () {
            var error_1, schema, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(typeof (this._scheduleFn) === 'function')) return [3 /*break*/, 5];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this._scheduleFn(trx)];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        error_1 = _a.sent();
                        trx.rollback();
                        throw error_1;
                    case 4: return [2 /*return*/];
                    case 5:
                        schema = trx.schema;
                        /**
                         * Looping over all the deferred actions
                         */
                        this._deferredActions.forEach(function (action) { return (schema[action.name].apply(schema, action.args)); });
                        _a.label = 6;
                    case 6:
                        _a.trys.push([6, 8, , 9]);
                        return [4 /*yield*/, schema];
                    case 7:
                        _a.sent();
                        this._deferredActions = [];
                        return [3 /*break*/, 9];
                    case 8:
                        error_2 = _a.sent();
                        trx.rollback();
                        throw error_2;
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    return SchemaChain;
}());
exports.default = SchemaChain;
//# sourceMappingURL=chain.js.map