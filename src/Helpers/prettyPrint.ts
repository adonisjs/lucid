/*
* @adonisjs/lucid
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

import kleur from 'kleur'
import { inspect } from 'util'

/**
 * Colorizes the sql query based upon the method
 */
function colorizeQuery (color: typeof kleur, method: string, sql: string) {
  switch (method) {
    case 'select':
      return color.cyan(sql)
    case 'insert':
    case 'create':
      return color.green(sql)
    case 'delete':
    case 'drop':
      return color.red(sql)
    case 'alter':
    case 'update':
      return color.yellow(sql)
    default:
      return color.magenta(sql)
  }
}

/**
 * Extracts the method from the DDL sql query
 */
export function extractDDLMethod (sql: string) {
  if (sql.startsWith('create')) {
    return 'create'
  }

  if (sql.startsWith('alter')) {
    return 'alter'
  }

  if (sql.startsWith('drop')) {
    return 'drop'
  }

  return 'unknown'
}

/**
 * Pretty print queries
*/
export function prettyPrint (queryLog: any) {
  /**
   * Lazy loading pretty printed dependencies
   */
  const color = require('kleur')
  const prettyHrtime = require('pretty-hrtime')

  let output: string = color.gray(`"${queryLog.connection}" `)

  /**
   * DDL queries
   */
  if (Array.isArray(queryLog.queries)) {
    queryLog.queries.forEach(({ sql, bindings }) => {
      output += 'DDL '
      if (queryLog.duration) {
        output += `(${prettyHrtime(queryLog.duration)}) `
      }
      output += colorizeQuery(color, extractDDLMethod(sql), sql)
      output += color.gray(` ${inspect(bindings)}`)
    })
    console.log(output)
    return
  }

  /**
   * Concatenate the model
   */
  if (queryLog.model) {
    output += `${queryLog.model} `
  }

  /**
   * Concatenate the duration
   */
  if (queryLog.duration) {
    output += `(${prettyHrtime(queryLog.duration)}) `
  }

  /**
   * Colorize query and bindings
   */
  output += colorizeQuery(color, queryLog.method, queryLog.sql)
  output += color.gray(` ${inspect(queryLog.bindings)}`)

  /**
   * Print it to the console
   */
  console.log(output)
}
