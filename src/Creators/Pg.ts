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
import { PostgreConfig } from '@ioc:Adonis/Lucid/Database'
import { BaseCreator } from './BaseCreator'

export class PgCreator extends BaseCreator {
	protected patchConfig(config: PostgreConfig): knex.Config {
		if (!config.datatypes || !config.datatypes.bigint) {
			return {}
		}

		const originalPoolAfterCreate = config.pool && config.pool.afterCreate

		const afterCreate: Function = (conn: any, done: (error?: any) => void) => {
			this.patchConnection(conn)

			if (typeof originalPoolAfterCreate === 'function') {
				originalPoolAfterCreate(conn, done)
			} else {
				done()
			}
		}

		return { pool: { afterCreate } }
	}

	private patchConnection(conn: any) {
		// Type Id 20 = BIGINT | BIGSERIAL
		conn.setTypeParser(20, 'text', BigInt)
		conn.setTypeParser(20, 'binary', (buffer: Buffer) => buffer.readBigInt64BE(0))

		// 1016 = Type Id for arrays of BigInt values
		const parseBigIntegerArray = conn.getTypeParser(1016, 'text')
		conn.setTypeParser(1016, 'text', (a) => parseBigIntegerArray(a).map(BigInt))
	}
}
