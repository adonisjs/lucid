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
var SchemaChain = require("./chain");
/*
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/
/**
 * The schema is used to define SQL table schemas. This makes
 * use of all the methods from http://knexjs.org/#Schema
 *
 * @binding Adonis/Src/Schema
 * @alias Schema
 * @group Database
 * @uses (['Adonis/Src/Database'])
 *
 * @class Schema
 * @constructor
 */
var Schema = /** @class */ (function () {
    function Schema(Database) {
        this.db = Database.connection(this.constructor.connection);
        this._chains = [];
    }
    Object.defineProperty(Schema, "connection", {
        /**
         * Connection to be used for schema
         *
         * @attribute connection
         *
         * @return {String}
         */
        get: function () {
            return '';
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Schema.prototype, "schema", {
        /**
         * The schema instance of knex
         *
         * @attribute schema
         *
         * @return {Object}
         */
        get: function () {
            return this.db.schema;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Schema.prototype, "fn", {
        /**
         * Access to db fn
         *
         * @attribute fn
         *
         * @return {Object}
         */
        get: function () {
            return this.db.fn;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Returns a boolean indicating if a table
     * already exists or not
     *
     * @method hasTable
     *
     * @param  {String}  tableName
     *
     * @return {Boolean}
     */
    Schema.prototype.hasTable = function (tableName) {
        return this.schema.hasTable(tableName);
    };
    /* istanbul ignore next */
    /**
     * Returns a boolean indicating if a column exists
     * inside a table or not.
     *
     * @method hasColumn
     *
     * @param  {String}  tableName
     * @param  {String}  columnName
     *
     * @return {Boolean}
     */
    Schema.prototype.hasColumn = function (tableName, columnName) {
        return this.schema.hasColumn(tableName, columnName);
    };
    /**
     * Execute deferred actions in sequence. All the actions will be
     * wrapped inside a transaction, which get's rolled back on
     * error.
     *
     * @method executeActions
     *
     * @param {Boolean} [getSql = false] Get sql for the actions over executing them
     *
     * @return {Array}
     */
    Schema.prototype.executeActions = function (getSql) {
        if (getSql === void 0) { getSql = false; }
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            var trx, _i, _a, chain;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        /**
                         * Returns SQL array over executing the actions
                         */
                        if (getSql) {
                            return [2 /*return*/, this._chains.map(function (chain) { return chain.toString(_this.schema); })];
                        }
                        return [4 /*yield*/, this.db.beginTransaction()
                            /**
                             * Execute all the chains
                             */
                        ];
                    case 1:
                        trx = _b.sent();
                        _i = 0, _a = this._chains;
                        _b.label = 2;
                    case 2:
                        if (!(_i < _a.length)) return [3 /*break*/, 5];
                        chain = _a[_i];
                        return [4 /*yield*/, chain.execute(trx)];
                    case 3:
                        _b.sent();
                        _b.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5:
                        /**
                         * Finally commit the transaction
                         */
                        trx.commit();
                        return [2 /*return*/, []];
                }
            });
        });
    };
    return Schema;
}());
/**
 * Copying all the chain method to the Schema prototype.
 */
Object
    .getOwnPropertyNames(SchemaChain.prototype)
    .filter(function (method) { return method !== 'constructor'; })
    .forEach(function (method) {
    Schema.prototype[method] = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var chain = new SchemaChain();
        chain[method].apply(chain, args);
        this._chains.push(chain);
        return chain;
    };
});
module.exports = Schema;
//# sourceMappingURL=index.js.map