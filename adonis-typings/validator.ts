/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

declare module '@ioc:Adonis/Core/Validator' {
  import { Rule } from '@ioc:Adonis/Core/Validator'

  export type DbRowCheckOptions = {
    table: string
    column: string
    connection?: string
    caseInsensitive?: boolean
    constraints?: { [key: string]: any }
    where?: { [key: string]: any }
    whereNot?: { [key: string]: any }
  }

  export interface Rules {
    exists(options: DbRowCheckOptions): Rule
    unique(options: DbRowCheckOptions): Rule
  }
}
