/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/*
|--------------------------------------------------------------------------
| Work around for multiple class inheritance
|--------------------------------------------------------------------------
|
| Javascript doesn't allow extending two or more classes. There are stuff like
| mixins in Typescript, but they have numerous limitations and hence creating
| helpers is the only straight forward way to share functionality.
|
*/

import { ManyToManyQueryBuilder } from './query_builder.js'
import { ManyToManySubQueryBuilder } from './sub_query_builder.js'

export class PivotHelpers {
  constructor(
    private query: ManyToManyQueryBuilder | ManyToManySubQueryBuilder,
    private aliasSelectColumns: boolean
  ) {}

  /**
   * Prefixes the pivot table name to a column
   */
  prefixPivotTable(column: string) {
    if (column.includes('.')) {
      return column
    }

    if (this.query instanceof ManyToManySubQueryBuilder) {
      return `${this.query.relation.pivotTable}.${column}`
    }

    return this.query.isPivotOnlyQuery ? column : `${this.query.relation.pivotTable}.${column}`
  }

  /**
   * Adds a where pivot condition to the query
   */
  wherePivot(varition: 'or' | 'and' | 'not' | 'orNot', key: any, operator?: any, value?: any) {
    let method: keyof (ManyToManyQueryBuilder | ManyToManySubQueryBuilder) = 'where'

    switch (varition) {
      case 'or':
        method = 'orWhere'
        break
      case 'not':
        method = 'whereNot'
        break
      case 'orNot':
        method = 'orWhereNot'
    }

    if (value !== undefined) {
      return this.query[method](this.prefixPivotTable(key), operator, value)
    } else if (operator !== undefined) {
      return this.query[method](this.prefixPivotTable(key), operator)
    } else {
      return this.query[method](key)
    }
  }

  /**
   * Adds a where pivot condition to the query
   */
  whereNullPivot(varition: 'or' | 'and' | 'not' | 'orNot', key: string) {
    let method: keyof (ManyToManyQueryBuilder | ManyToManySubQueryBuilder) = 'whereNull'

    switch (varition) {
      case 'or':
        method = 'orWhereNull'
        break
      case 'not':
        method = 'whereNotNull'
        break
      case 'orNot':
        method = 'orWhereNotNull'
    }

    return (this.query as any)[method](this.prefixPivotTable(key))
  }

  /**
   * Adds a where pivot condition to the query
   */
  whereInPivot(varition: 'or' | 'and' | 'not' | 'orNot', key: any, value: any) {
    let method: keyof (ManyToManyQueryBuilder | ManyToManySubQueryBuilder) = 'whereIn'

    switch (varition) {
      case 'or':
        method = 'orWhereIn'
        break
      case 'not':
        method = 'whereNotIn'
        break
      case 'orNot':
        method = 'orWhereNotIn'
    }

    key = Array.isArray(key)
      ? key.map((one) => this.prefixPivotTable(one))
      : this.prefixPivotTable(key)

    return this.query[method](key, value)
  }

  /**
   * Select pivot columns
   */
  pivotColumns(columns: string[]): this {
    this.query.knexQuery.select(
      columns.map((column) => {
        if (this.aliasSelectColumns) {
          return `${this.prefixPivotTable(column)} as ${this.query.relation.pivotAlias(column)}`
        }
        return this.prefixPivotTable(column)
      })
    )
    return this
  }
}
