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
import { dbSetup, getConnectionConfig } from '../../helpers.js'
import { Connection } from '../../../src/connection/connection.js'
import { QueryClient } from '../../../src/database_clients/query_client.js'
import { SelectExpressionBuilder } from '../../../src/expression_builders/select_expression_builder.js'

test.group('MYSQL Dialect | insert', () => {
  test('{$self}: insert complex values to the table')
    .with(['mysql', 'legacy_mysql'] as const)
    .run(async ({ assert, cleanup }, dialect) => {
      const config = getConnectionConfig(dialect)
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
        .on('query', (sql) => debug('%O', sql))
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
        .on('query', (sql) => debug('%O', sql))
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

  test('{$self}: merge changes on unique constraint conflict')
    .with(['mysql', 'legacy_mysql'] as const)
    .run(async ({ assert, cleanup }, dialect) => {
      const config = getConnectionConfig(dialect)
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
        .on('query', (sql) => debug('%O', sql))
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
        .on('query', (sql) => debug('%O', sql))
        .exec()

      const users = await client
        .query()
        .select('email', 'username', 'last_name')
        .from('users')
        .exec()
      assert.deepEqual(users, [
        {
          email: 'virk@adonisjs.com',
          last_name: 'Virk',
          username: 'virk',
        },
      ])
    })

  test('{$self}: merge selected columns')
    .with(['mysql', 'legacy_mysql'] as const)
    .run(async ({ assert, cleanup }, dialect) => {
      const config = getConnectionConfig(dialect)
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
        .on('query', (sql) => debug('%O', sql))
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
        .on('query', (sql) => debug('%O', sql))
        .exec()

      const users = await client
        .query()
        .select('first_name', 'username', 'age')
        .from('users')
        .exec()
      assert.deepEqual(users, [
        {
          first_name: 'Harminder',
          username: 'virk@adonisjs.com',
          age: 36,
        },
      ])
    })

  test('{$self}: ignore error on unique constraint conflict')
    .with(['mysql', 'legacy_mysql'] as const)
    .run(async ({ assert, cleanup }, dialect) => {
      const config = getConnectionConfig(dialect)
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
        .on('query', (sql) => debug('%O', sql))
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
        .on('query', (sql) => debug('%O', sql))
        .exec()

      const users = await client.query().select('email', 'username').from('users').exec()
      assert.deepEqual(users, [
        {
          email: 'virk@adonisjs.com',
          username: 'virk@adonisjs.com',
        },
      ])
    })

  test('{$self}: insert using a sub-query')
    .with(['mysql', 'legacy_mysql'] as const)
    .run(async ({ assert, cleanup }, dialect) => {
      const config = getConnectionConfig(dialect)
      const connection = new Connection('primary', config)
      const client = new QueryClient(connection, 'dual')
      cleanup(() => connection.close())

      await dbSetup(connection)

      /**
       * Create user
       */
      const [lastInsertedId] = await client
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
            user_id: lastInsertedId,
            skill_name: 'programming',
          },
          {
            user_id: lastInsertedId,
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
          query.select('skill_name', 'user_id').from('skills').where('user_id', lastInsertedId)
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
})
