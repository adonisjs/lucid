/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

declare module '@ioc:Adonis/Lucid/Schema' {
  import { QueryClientContract, ExcutableQueryBuilderContract } from '@ioc:Adonis/Lucid/Database'
  import { RawContract } from '@ioc:Adonis/Lucid/DatabaseQueryBuilder'
  import { SchemaBuilder } from 'knex'

  export type DeferCallback = (client: QueryClientContract) => void | Promise<void>

  export interface SchemaConstructorContract {
    disableTransactions: boolean
    new (db: QueryClientContract, file: string, dryRun: boolean): SchemaContract
  }

  export interface SchemaContract {
    dryRun: boolean
    db: QueryClientContract
    schema: SchemaBuilder
    file: string

    now (precision?: number): RawContract & ExcutableQueryBuilderContract<any>
    defer: (cb: DeferCallback) => void
    up (): Promise<void> | void
    down (): Promise<void> | void
    execUp (): Promise<string [] | boolean>
    execDown (): Promise<string [] | boolean>
  }

  const Schema: SchemaConstructorContract
  export default Schema
}
