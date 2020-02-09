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
    ColumnDecorator,
    ComputedDecorator,
    OrmConfigContract,
    DateColumnDecorator,
    DateTimeColumnDecorator,
    ModelConstructorContract,
  } from '@ioc:Adonis/Lucid/Model'

  import {
    HasOneDecorator,
    HasManyDecorator,
    BelongsToDecorator,
    ManyToManyDecorator,
    HasManyThroughDecorator,
  } from '@ioc:Adonis/Lucid/Relations'

  export {
    HasOne,
    HasMany,
    BelongsTo,
    ManyToMany,
    HasManyThrough,
  } from '@ioc:Adonis/Lucid/Relations'

  export { OrmConfigContract, ModelQueryBuilderContract } from '@ioc:Adonis/Lucid/Model'

  export const BaseModel: ModelConstructorContract

  export const column: ColumnDecorator & {
    date: DateColumnDecorator,
    dateTime: DateTimeColumnDecorator,
  }

  export const computed: ComputedDecorator
  export const hasOne: HasOneDecorator
  export const belongsTo: BelongsToDecorator
  export const hasMany: HasManyDecorator
  export const manyToMany: ManyToManyDecorator
  export const hasManyThrough: HasManyThroughDecorator
}
