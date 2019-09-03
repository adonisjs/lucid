// /*
//  * @adonisjs/lucid
//  *
//  * (c) Harminder Virk <virk@adonisjs.com>
//  *
//  * For the full copyright and license information, please view the LICENSE
//  * file that was distributed with this source code.
// */

// declare module '@ioc:Adonis/Lucid/Orm' {
//   import {
//     InsertQueryBuilderContract,
//     DatabaseQueryBuilderContract,
//   } from '@ioc:Adonis/Lucid/DatabaseQueryBuilder'

//   import {
//     ModelConstructorContract as BaseModelConstructorContract,
//     ModelContract as BaseModelContract,
//     AdapterContract as BaseAdapterContract,
//   } from '@poppinss/data-models'

//   export interface OrmQueryBuilder<
//     Model extends ModelConstructorContract,
//     Result extends any,
//   > extends DatabaseQueryBuilderContract<Model['refs']>, ExcutableQueryBuilderContract<Result> {
//   }

//   export interface ModelConstructorContract extends BaseModelConstructorContract {
//     $connection?: string,
//     $increments: boolean,
//     $table: string,

//     refs: any,

//     $getSaveQuery (
//       client: QueryClientContract,
//       action: 'insert',
//     ): InsertQueryBuilderContract,

//     $getSaveQuery (
//       client: QueryClientContract,
//       action: 'update',
//     ): OrmQueryBuilder<any, any>,

//     $getSaveQuery (
//       client: QueryClientContract,
//       action: 'insert' | 'update',
//     ): InsertQueryBuilderContract | OrmQueryBuilder<any, any>,

//     query (): OrmQueryBuilder<this, new () => this>,
//   }

//   export interface ModelContract extends BaseModelContract {
//     $getConstructor (): ModelConstructorContract,
//   }

//   export interface AdapterContract extends BaseAdapterContract {
//     insert (instance: ModelContract, attributes: any): Promise<void>
//   }
// }
