/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/// <reference path="../../../adonis-typings/orm.ts" />
/// <reference path="../../../adonis-typings/database.ts" />

// import { DatabaseContract } from '@ioc:Adonis/Lucid/Database'
// import { AdapterContract, ModelContract } from '@ioc:Adonis/Lucid/Orm'

// /**
//  * Adapter to execute queries for a given model. Please note that adapters
//  * are stateless and only one instance of adapter is used across the
//  * app, so make sure not to store any state.
//  */
// export class Adapter implements AdapterContract {
//   constructor (private _db: DatabaseContract) {}

//   public async insert (model: ModelContract, attributes: any): Promise<void> {
//     const modelConstructor = model.$getConstructor()

//     /**
//      * Pulling the query client for a given connection.
//      */
//     const client = this._db.connection(modelConstructor.$connection)

//     *
//      * Letting model give us the insert query. This enables the end user
//      * to add some constraints to the query builder before returning
//      * it back to us

//     const query = modelConstructor.$getSaveQuery(client, 'insert')

//     /**
//      * Execute the query
//      */
//     const result = await query.insert(attributes)

//     /**
//      * Set id when increments is true
//      */
//     if (modelConstructor.$increments) {
//       model.$consumeAdapterResult({ [modelConstructor.$primaryKey]: result[0] })
//     }
//   }

//   public async update (model: ModelContract, dirty: any): Promise<void> {
//     const modelConstructor = model.$getConstructor()

//     /**
//      * Pulling the query client for a given connection.
//      */
//     const client = this._db.connection(modelConstructor.$connection)

//     /**
//      * Letting model give us the insert query. This enables the end user
//      * to add some constraints to the query builder before returning
//      * it back to us
//      */
//     const query = modelConstructor.$getSaveQuery(client, 'update')

//     /**
//      * Execute the query
//      */
//     await query.update(dirty)
//   }
// }
