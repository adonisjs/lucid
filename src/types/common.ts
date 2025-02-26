/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * Prettify complex TypeScript types
 */
export type Prettify<T> = {
  -readonly [K in keyof T]: T[K]
} & {}

/**
 * Represents the information of a column that exists in the database.
 * The information is limited to what we need to automatically generate
 * Lucid model schemas.
 */
export type ColumnInfo = {
  /**
   * The name of the column in the databse
   */
  name: string

  /**
   * The column type that can represent a data-type in
   * TypeScript with exception to "embedded"
   */
  type:
    | 'string'
    | 'boolean'
    | 'date'
    | 'time'
    | 'dateTime'
    | 'number'
    | 'bigInt'
    | 'json'
    | 'jsonb'
    | 'enum'
    | 'embedded'
    | 'any'

  /**
   * The database type to represent the column in the database.
   * This could vary between dialects
   */
  dialectType: string

  /**
   * Enum options when the column is of type enum
   */
  enumOptions?: any[]

  /**
   * Embedded schema columns
   */
  embeddedColumns?: ColumnInfo[]

  /**
   * Is field marked as nullable in the database
   */
  nullable: boolean

  /**
   * Set to true when field has a default value set
   * in the database
   */
  optional: boolean
}
