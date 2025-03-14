/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { dbSetup, getConnectionConfig } from '../../helpers.js'
import { Connection } from '../../../src/connection/connection.js'
import { QueryClient } from '../../../src/database_clients/query_client.js'
import { SelectExpressionBuilder } from '../../../src/expression_builders/select_expression_builder.js'

test.group('SQLite Dialect | insert', (group) => {
  group.each.setup(async (t) => {
    await t.context.fs.mkdir('./')
  })

  test('insert complex values to the table', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('sqlite')
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
          is_default: false,
        },
        {
          name: 'staff',
          is_default: false,
        },
      ])
      .exec()

    await client
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
      .exec()

    const roles = await client.query().select('name', 'is_default', 'id').from('roles').exec()
    const users = await client.query().select('email', 'username', 'role_id').from('users').exec()

    assert.deepEqual(roles, [
      {
        id: 1,
        name: 'guest',
        is_default: 1,
      },
      {
        id: 2,
        name: 'admin',
        is_default: 0,
      },
      {
        id: 3,
        name: 'staff',
        is_default: 0,
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

  test('merge changes on unique constraint conflict', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('sqlite')
    const connection = new Connection('primary', config)
    const client = new QueryClient(connection, 'dual')
    cleanup(() => connection.close())

    await dbSetup(connection)

    await client
      .insertQuery()
      .table('users')
      .values({
        first_name: 'Harminder',
        last_name: 'Virk',
        username: 'virk@adonisjs.com',
        email: 'virk@adonisjs.com',
        age: 35,
      })
      .exec()

    await client
      .insertQuery()
      .table('users')
      .values({
        first_name: 'Harminder',
        username: 'virk',
        email: 'virk@adonisjs.com',
        age: 35,
      })
      .onConflict(['email'])
      .merge()
      .exec()

    const users = await client.query().select('email', 'username', 'last_name').from('users').exec()
    assert.deepEqual(users, [
      {
        email: 'virk@adonisjs.com',
        last_name: 'Virk',
        username: 'virk',
      },
    ])
  })

  test('merge selected columns', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('sqlite')
    const connection = new Connection('primary', config)
    const client = new QueryClient(connection, 'dual')
    cleanup(() => connection.close())

    await dbSetup(connection)

    await client
      .insertQuery()
      .table('users')
      .values({
        first_name: 'Harminder',
        last_name: 'Virk',
        username: 'virk@adonisjs.com',
        email: 'virk@adonisjs.com',
        age: 35,
      })
      .exec()

    await client
      .insertQuery()
      .table('users')
      .values({
        first_name: 'Aman',
        last_name: 'Virk',
        username: 'virk',
        email: 'virk@adonisjs.com',
        age: 36,
      })
      .onConflict(['email'])
      .merge(['age'])
      .exec()

    const users = await client.query().select('first_name', 'username', 'age').from('users').exec()
    assert.deepEqual(users, [
      {
        first_name: 'Harminder',
        username: 'virk@adonisjs.com',
        age: 36,
      },
    ])
  })

  test('ignore error on unique constraint conflict', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('sqlite')
    const connection = new Connection('primary', config)
    const client = new QueryClient(connection, 'dual')
    cleanup(() => connection.close())

    await dbSetup(connection)

    await client
      .insertQuery()
      .table('users')
      .values({
        first_name: 'Harminder',
        last_name: 'Virk',
        username: 'virk@adonisjs.com',
        email: 'virk@adonisjs.com',
        age: 35,
      })
      .exec()

    await client
      .insertQuery()
      .table('users')
      .values({
        first_name: 'Harminder',
        username: 'virk',
        email: 'virk@adonisjs.com',
        age: 35,
      })
      .onConflict(['email'])
      .ignore()
      .exec()

    const users = await client.query().select('email', 'username').from('users').exec()
    assert.deepEqual(users, [
      {
        email: 'virk@adonisjs.com',
        username: 'virk@adonisjs.com',
      },
    ])
  })

  test('insert using a sub-query', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('sqlite')
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
})
