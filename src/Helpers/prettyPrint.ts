/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type kleur from 'kleur'
import { inspect } from 'util'
import { DbQueryEventNode } from '@ioc:Adonis/Lucid/Database'

/**
 * Colorizes the sql query based upon the method
 */
function colorizeQuery(color: typeof kleur, method: string, sql: string) {
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
 * Pretty print queries
 */
export function prettyPrint(queryLog: DbQueryEventNode) {
	/**
	 * Lazy loading pretty printed dependencies
	 */
	const color = require('kleur')
	const prettyHrtime = require('pretty-hrtime')

	let output: string = color.gray(`"${queryLog.connection}" `)

	/**
	 * Concatenate the model
	 */
	if (queryLog.model) {
		output += `${queryLog.model} `
	}

	/**
	 * Concatenate DDL prefix
	 */
	if (queryLog.ddl) {
		output += 'DDL '
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
