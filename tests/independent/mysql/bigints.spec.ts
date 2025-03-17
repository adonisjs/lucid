/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { debug } from '../../../src/debug.js'
import { Connection } from '../../../src/connection/connection.js'
import { dbBigIntsSetup, getConnectionConfig } from '../../helpers.js'
import { QueryClient } from '../../../src/database_clients/query_client.js'

test.group('MySQL Dialect | bigInt', () => {
  test('{$self} insert and cast database values to JavaScript BigInt')
    .with(['mysql', 'legacy_mysql'] as const)
    .run(async ({ assert, cleanup }, dialect) => {
      /**
       * BigInts are supported via the following connection config options.
       *
       * supportBigNumbers
       * bigNumberStrings
       * typeCast
       */
      const config = getConnectionConfig(dialect)
      const connection = new Connection('primary', config)
      const client = new QueryClient(connection, 'dual')
      cleanup(() => connection.close())

      await dbBigIntsSetup(connection)

      const [lastId] = await client
        .insertQuery()
        .table('departments')
        .values([
          {
            name: 'IT',
            budget: BigInt(100),
          },
          {
            name: 'Sales',
            budget: BigInt(400),
          },
        ])
        .returning(['id'])
        .on('query', (sql) => debug('%O', sql))
        .exec()

      assert.isNumber(lastId)
      const departments = await client.selectFrom('departments').exec()

      assert.deepEqual(departments, [
        {
          id: BigInt(1),
          name: 'IT',
          budget: BigInt(100),
        },
        {
          id: BigInt(2),
          name: 'Sales',
          budget: BigInt(400),
        },
      ])
    })
})
