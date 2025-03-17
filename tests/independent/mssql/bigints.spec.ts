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

test.group('MSSQL Dialect | bigInt', () => {
  test('allow inserting bigInt values', async ({ assert, cleanup }) => {
    /**
     * MSSQL client does not allow inserting values as BigInt, unless the
     * "options.mapBinding" method is defined to self convert values to
     * strings.
     *
     * Also, the MSSQL client does not allow casting datatypes to JavaScript
     * types. So with MSSQL, bigInts will be string values
     */

    const config = getConnectionConfig('mssql')
    const connection = new Connection('primary', config)
    const client = new QueryClient(connection, 'dual')
    cleanup(() => connection.close())

    await dbBigIntsSetup(connection)

    const ids = await client
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

    assert.deepEqual(ids, [{ id: '1' }, { id: '2' }])
    const departments = await client.selectFrom('departments').exec()

    assert.deepEqual(departments, [
      {
        id: '1',
        name: 'IT',
        budget: '100',
      },
      {
        id: '2',
        name: 'Sales',
        budget: '400',
      },
    ])
  })
})
