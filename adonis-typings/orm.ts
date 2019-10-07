/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

declare module '@ioc:Adonis/Lucid/Orm' {
  import {
    ColumnFn,
    HasOneFn,
    HasManyFn,
    ComputedFn,
    BelongsToFn,
    ManyToManyFn,
    HasManyThroughFn,
    ModelConstructorContract,
  } from '@ioc:Adonis/Lucid/Model'

  /**
   * Generate key/value pair of model properties and
   * adapter keys
   */
  export type Refs<T extends any, K extends keyof T> = {
    [P in K]: string
  }

  export const BaseModel: ModelConstructorContract
  export const column: ColumnFn
  export const computed: ComputedFn
  export const hasOne: HasOneFn
  export const belongsTo: BelongsToFn
  export const hasMany: HasManyFn
  export const manyToMany: ManyToManyFn
  export const hasManyThrough: HasManyThroughFn
}
