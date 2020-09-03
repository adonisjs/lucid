/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference path="../../adonis-typings/index.ts" />

import knex from 'knex'
import { BaseCreator } from './BaseCreator'

export class MssqlCreator extends BaseCreator {
	protected patchClient({ client }: knex): void {
		if (!client.config.datatypes.bigint) {
			return
		}

		const originalProcessResponse = client.processResponse

		client.processResponse = function (obj, runner) {
			if (obj && obj.response) {
				const bigintColumns = Object.keys(obj.response.columns).filter((column) => {
					return obj.response.columns[column].type === client.driver.BigInt
				})

				if (bigintColumns.length > 0) {
					for (const row of obj.response) {
						for (const column of bigintColumns) {
							if (row[column] === null) {
								continue
							}

							row[column] = BigInt(row[column])
						}
					}
				}
			}

			return originalProcessResponse.call(this, obj, runner)
		}
	}
}
