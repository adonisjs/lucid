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

  export interface Rules {
    exists (options: {
      table: string,
      column: string,
      connection?: string,
      constraints?: { [key: string]: any } | { [key: string]: any }[],
    }): Rule

    unique (options: {
      table: string,
      column: string,
      connection?: string,
      constraints?: { [key: string]: any } | { [key: string]: any }[],
    }): Rule
  }
}
