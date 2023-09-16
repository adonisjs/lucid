/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

// @ts-expect-error
import igniculus from 'igniculus'
import kleur from 'kleur'
import { inspect } from 'node:util'
import hrTime from 'pretty-hrtime'
import { DbQueryEventNode } from '../../adonis-typings/database.js'

const illuminate = igniculus({
  comments: { fg: 'gray' },
  constants: { fg: 'red' },
  delimitedIdentifiers: { fg: 'yellow' },
  variables: { fg: 'cyan' },
  dataTypes: { fg: 'green', casing: 'uppercase' },
  standardKeywords: { fg: 'green', casing: 'uppercase' },
  lesserKeywords: { mode: 'bold', fg: 'cyan', casing: 'uppercase' },
  prefix: { replace: /.*?: / },
  output: (line: string) => line,
})

/**
 * Colorizes the sql query
 */
function colorizeQuery(sql: string) {
  return illuminate(sql)
}

/**
 * Pretty print queries
 */
export function prettyPrint(queryLog: DbQueryEventNode) {
  let output: string = ''

  if (!queryLog.ddl) {
    output += kleur.gray(`"${queryLog.connection}" `)
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
    output += `(${hrTime(queryLog.duration)}) `
  }

  /**
   * Colorize query and bindings
   */
  output += colorizeQuery(queryLog.sql)

  if (!queryLog.ddl) {
    output += kleur.gray(` ${inspect(queryLog.bindings)}`)
  }

  /**
   * Print it to the console
   */
  console.log(output)
}
