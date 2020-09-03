/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference path="../../adonis-typings/index.ts" />

import test from 'japa'
import { DatabaseContract } from '@ioc:Adonis/Lucid/Database'
import { Database } from '../../src/Database/index'
import {
	getConfig,
	getLogger,
	getProfiler,
	getEmitter,
	setup,
	cleanup,
	resetTables,
} from '../../test-helpers'

let db: DatabaseContract

if (process.env.DB !== 'sqlite') {
	test.group('Datatypes | bigint', (group) => {
		group.before(async () => {
			const config = {
				connection: 'primary',
				connections: { primary: Object.assign({}, getConfig(), { datatypes: { bigint: true } }) },
			}

			db = new Database(config, getLogger(), getProfiler(), getEmitter())

			await setup()
		})

		group.after(async () => {
			await db.manager.closeAll()
			await cleanup()
		})

		group.afterEach(async () => {
			await resetTables()
		})

		test('convert selected bigint columns', async (assert) => {
			await db
				.insertQuery()
				.table('scores')
				.multiInsert([
					{ username: 'ruby184', score: null },
					{ username: 'virk', score: 20 },
				])

			const results = await db.query().from('scores')

			assert.isArray(results)
			assert.lengthOf(results, 2)
			assert.deepEqual(results[0], { id: BigInt(1), username: 'ruby184', score: null })
			assert.deepEqual(results[1], { id: BigInt(2), username: 'virk', score: BigInt(20) })
		})

		test('convert count to bigint', async (assert) => {
			await db
				.insertQuery()
				.table('scores')
				.multiInsert([
					{ username: 'ruby184', score: 5 },
					{ username: 'virk', score: 20 },
				])

			const results = await db.query().from('scores').count('* as total')

			assert.isArray(results)
			assert.lengthOf(results, 1)
			assert.typeOf(results[0].total, 'bigint')
			assert.equal(results[0].total, 2)
		})
	})
}
