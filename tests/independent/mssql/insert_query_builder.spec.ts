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
import { dbSetup, getConnectionConfig } from '../../helpers.js'
import { QueryClient } from '../../../src/database_clients/query_client.js'
import { SelectExpressionBuilder } from '../../../src/expression_builders/select_expression_builder.js'

test.group('MSSQL Dialect | insert', () => {
  test('insert complex values to the table', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('mssql')
    const connection = new Connection('primary', config)
    const client = new QueryClient(connection, 'dual')
    cleanup(() => connection.close())

    await dbSetup(connection)

    await client
      .insertQuery()
      .table('roles')
      .values([
        {
          name: 'guest',
          is_default: true,
        },
        {
          name: 'admin',
        },
        {
          name: 'staff',
        },
      ])
      .exec()

    const [row] = await client
      .insertQuery()
      .table('users')
      .values({
        first_name: 'Harminder',
        last_name: 'Virk',
        username: 'virk@adonisjs.com', // self refs are not supported
        email: 'virk@adonisjs.com',
        age: 35,
        role_id: (q: SelectExpressionBuilder) =>
          q.from('roles').select('id').where('is_default', true),
      })
      .returning(['id'])
      .on('query', (sql) => debug('%O', sql))
      .exec()

    const roles = await client.query().select('name', 'is_default', 'id').from('roles').exec()
    const users = await client.query().select('email', 'username', 'role_id').from('users').exec()

    assert.equal(row.id, 1)
    assert.deepEqual(roles, [
      {
        id: 1,
        name: 'guest',
        is_default: true,
      },
      {
        id: 2,
        name: 'admin',
        is_default: false,
      },
      {
        id: 3,
        name: 'staff',
        is_default: false,
      },
    ])
    assert.deepEqual(users, [
      {
        email: 'virk@adonisjs.com',
        role_id: 1,
        username: 'virk@adonisjs.com',
      },
    ])
  })

  test('insert using a sub-query', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('pg')
    const connection = new Connection('primary', config)
    const client = new QueryClient(connection, 'dual')
    cleanup(() => connection.close())

    await dbSetup(connection)

    /**
     * Create user
     */
    const [row] = await client
      .insertQuery()
      .table('users')
      .values([
        {
          first_name: 'Harminder',
          last_name: 'Virk',
          username: 'virk@adonisjs.com',
          email: 'virk@adonisjs.com',
          age: 35,
        },
      ])
      .returning(['id'])
      .on('query', (sql) => debug('%O', sql))
      .exec()

    /**
     * Create skills
     */
    await client
      .insertQuery()
      .table('skills')
      .values([
        {
          user_id: row.id,
          skill_name: 'programming',
        },
        {
          user_id: row.id,
          skill_name: 'cooking',
        },
      ])
      .on('query', (sql) => debug('%O', sql))
      .exec()

    /**
     * Replicate skills
     */
    await client
      .insertQuery()
      .table('skills')
      .columns(['skill_name', 'user_id'])
      .using((query) => {
        query.select('skill_name', 'user_id').from('skills').where('user_id', row.id)
      })
      .on('query', (sql) => debug('%O', sql))
      .exec()

    const skills = await client.query().select('skill_name').from('skills').exec()
    assert.deepEqual(skills, [
      {
        skill_name: 'programming',
      },
      {
        skill_name: 'cooking',
      },
      {
        skill_name: 'programming',
      },
      {
        skill_name: 'cooking',
      },
    ])
  })

  test('clone a query and execute', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('mssql')
    const connection = new Connection('primary', config)
    const client = new QueryClient(connection, 'dual')
    cleanup(() => connection.close())

    await dbSetup(connection)

    const query = client
      .insertQuery()
      .table('roles')
      .values([
        {
          name: 'guest',
          is_default: true,
        },
        {
          name: 'admin',
        },
        {
          name: 'staff',
        },
      ])
      .withContext({ requestId: 1 })

    const clonedQuery = query
      .clone()
      .on('query', (sql) => debug('%O', sql))
      .withContext({ userId: 1 })
    await clonedQuery.exec()

    assert.deepEqual(clonedQuery.getContext(), { requestId: 1, userId: 1 })
    assert.deepEqual(query.getContext(), { requestId: 1 })

    const roles = await client.query().select('name', 'is_default', 'id').from('roles').exec()
    assert.deepEqual(roles, [
      {
        id: 1,
        name: 'guest',
        is_default: true,
      },
      {
        id: 2,
        name: 'admin',
        is_default: false,
      },
      {
        id: 3,
        name: 'staff',
        is_default: false,
      },
    ])
  })
})
