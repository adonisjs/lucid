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
import { MysqlConfig } from '@ioc:Adonis/Lucid/Database'
import { BaseCreator } from './BaseCreator'

export class MysqlCreator extends BaseCreator {
	protected patchConfig(config: MysqlConfig): knex.Config {
		if (!config.datatypes || !config.datatypes.bigint) {
			return {}
		}

		const originalTypeCast =
			config.connection && typeof config.connection.typeCast !== 'undefined'
				? config.connection.typeCast
				: true

		// https://github.com/mysqljs/mysql/blob/master/lib/protocol/packets/RowDataPacket.js
		const typeCast: Required<MysqlConfig>['connection']['typeCast'] = (field, next) => {
			if (field.type === 'LONGLONG') {
				const numberString = field.string()
				return numberString === null ? null : BigInt(numberString)
			}

			if (typeof originalTypeCast === 'function') {
				return originalTypeCast(field, next)
			}

			if (originalTypeCast) {
				return next()
			}

			// 63 = Charsets.BINARY
			return field.packet.charsetNr === 63 ? field.buffer() : field.string()
		}

		return { connection: { typeCast } }
	}
}
