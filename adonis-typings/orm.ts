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
    ScopeFn,
    LucidModel,
    ColumnDecorator,
    ComputedDecorator,
    DateColumnDecorator,
    DateTimeColumnDecorator,
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

  export { OrmConfig, ModelQueryBuilderContract } from '@ioc:Adonis/Lucid/Model'

  export const scope: ScopeFn
  export const BaseModel: LucidModel
  export const computed: ComputedDecorator
  export const hasOne: HasOneDecorator
  export const belongsTo: BelongsToDecorator
  export const hasMany: HasManyDecorator
  export const manyToMany: ManyToManyDecorator
  export const hasManyThrough: HasManyThroughDecorator
  export const column: ColumnDecorator & { date: DateColumnDecorator, dateTime: DateTimeColumnDecorator }
}
