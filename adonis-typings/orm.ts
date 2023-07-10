/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

declare module '@ioc:Adonis/Lucid/Orm' {
  import { SimplePaginatorMetaKeys } from '@ioc:Adonis/Lucid/Database'
  export const SnakeCaseNamingStrategy: {
    new (): NamingStrategyContract
  }
  export const scope: ScopeFn
  export const BaseModel: LucidModel

  /**
   * Relationships
   */
  export const hasOne: HasOneDecorator
  export const belongsTo: BelongsToDecorator
  export const hasMany: HasManyDecorator
  export const manyToMany: ManyToManyDecorator
  export const hasManyThrough: HasManyThroughDecorator

  /**
   * Hooks
   */
  export const beforeSave: HooksDecorator
  export const afterSave: HooksDecorator
  export const beforeCreate: HooksDecorator
  export const afterCreate: HooksDecorator
  export const beforeUpdate: HooksDecorator
  export const afterUpdate: HooksDecorator
  export const beforeDelete: HooksDecorator
  export const afterDelete: HooksDecorator
  export const beforeFind: HooksDecorator
  export const afterFind: HooksDecorator
  export const beforeFetch: HooksDecorator
  export const afterFetch: HooksDecorator
  export const beforePaginate: HooksDecorator
  export const afterPaginate: HooksDecorator
  export const ModelPaginator: {
    namingStrategy: {
      paginationMetaKeys(): SimplePaginatorMetaKeys
    }
    new <Row extends LucidRow>(
      total: number,
      perPage: number,
      currentPage: number,
      ...rows: Row[]
    ): ModelPaginatorContract<Row>
  }

  /**
   * Columns and computed
   */
  export const column: ColumnDecorator & {
    date: DateColumnDecorator
    dateTime: DateTimeColumnDecorator
    json: JsonColumnDecorator
  }
  export const computed: ComputedDecorator
}
