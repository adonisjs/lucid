/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { debug } from '../../src/debug.js'
import { Connection } from '../../src/connection/connection.js'
import { MSSQLDialect } from '../../src/dialects/mssql_dialect.js'
import {
  dbSetup,
  getConnectionConfig,
  MSSQLSetupForScanning,
  MSSQLSetupForTruncation,
} from '../helpers.js'
import { QueryClient } from '../../src/database_clients/query_client.js'
import { SelectExpressionBuilder } from '../../src/expression_builders/select_expression_builder.js'

test.group('MSSQL Dialect | getAllTables', () => {
  test('get tables for all the schemas', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('mssql')
    const connection = new Connection('primary', config)
    cleanup(() => connection.close())

    await MSSQLSetupForScanning(connection)
    const dialect = new MSSQLDialect(connection)
    assert.sameDeepMembers(await dialect.getAllTables(), [
      {
        schema: 'dbo',
        name: 'users',
      },
      {
        schema: 'dbo',
        name: 'profiles',
      },
      {
        schema: 'dbo',
        name: 'posts',
      },
      {
        schema: 'dbo',
        name: 'comments',
      },
      {
        schema: 'search',
        name: 'users',
      },
    ])
  })

  test('get all tables for a given schema', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('mssql')
    const connection = new Connection('primary', config)
    cleanup(() => connection.close())

    await MSSQLSetupForScanning(connection)
    const dialect = new MSSQLDialect(connection)

    assert.sameDeepMembers(await dialect.getAllTables(['search']), [
      {
        schema: 'search',
        name: 'users',
      },
    ])
  })
})

test.group('MSSQL Dialect | getAllViews', () => {
  test('get views for all the schemas', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('mssql')
    const connection = new Connection('primary', config)
    cleanup(() => connection.close())

    await MSSQLSetupForScanning(connection)
    const dialect = new MSSQLDialect(connection)
    assert.snapshot(await dialect.getAllViews()).matchInline(`
      [
        {
          "definition": "CREATE VIEW [voters] ([first_name], [email]) AS select [first_name], [email] from [users] where [age] > '18'",
          "name": "voters",
          "schema": "dbo",
        },
        {
          "definition": "CREATE VIEW [search].[voters] ([first_name], [email]) AS select [first_name], [email] from [search].[users] where [age] > '18'",
          "name": "voters",
          "schema": "search",
        },
      ]
    `)
  })

  test('get views for a given schemas', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('mssql')
    const connection = new Connection('primary', config)
    cleanup(() => connection.close())

    await MSSQLSetupForScanning(connection)
    const dialect = new MSSQLDialect(connection)
    assert.snapshot(await dialect.getAllViews(['search'])).matchInline(`
      [
        {
          "definition": "CREATE VIEW [search].[voters] ([first_name], [email]) AS select [first_name], [email] from [search].[users] where [age] > '18'",
          "name": "voters",
          "schema": "search",
        },
      ]
    `)
  })
})

test.group('MSSQL Dialect | dropAllTables', () => {
  test('drop all tables from the default schema', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('mssql')
    const connection = new Connection('primary', config)
    cleanup(() => connection.close())

    const resources = await MSSQLSetupForScanning(connection)
    const dialect = new MSSQLDialect(connection)

    const rows = await connection
      .getWriteClient()
      .table('users')
      .insert({
        email: 'foo@bar.com',
        password: 'secret',
        age: 32,
      })
      .returning('id')

    await connection.getWriteClient().table('profiles').insert({
      full_name: 'foo bar',
      user_id: rows[0].id,
    })

    /**
     * All tables exists
     */
    for (let table of resources.tables) {
      assert.isTrue(await dialect.hasTable(table), `"${table}" table exists`)
    }

    /**
     * All tables dropped
     */
    await dialect.dropAllTables()
    for (let table of resources.tables) {
      if (table.includes('search.')) {
        assert.isTrue(await dialect.hasTable(table), `"${table}" table exist`)
      } else {
        assert.isFalse(await dialect.hasTable(table), `"${table}" table does not exist`)
      }
    }
  })

  test('drop all tables excluding the provided list', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('mssql')
    const connection = new Connection('primary', config)
    cleanup(() => connection.close())

    const resources = await MSSQLSetupForScanning(connection)
    const dialect = new MSSQLDialect(connection)

    const rows = await connection
      .getWriteClient()
      .table('users')
      .insert({
        email: 'foo@bar.com',
        password: 'secret',
        age: 32,
      })
      .returning('id')

    await connection.getWriteClient().table('profiles').insert({
      full_name: 'foo bar',
      user_id: rows[0].id,
    })

    /**
     * All tables exists
     */
    for (let table of resources.tables) {
      assert.isTrue(await dialect.hasTable(table), `"${table}" table exists`)
    }

    /**
     * All tables dropped except the excluded one's.
     */
    await dialect.dropAllTables(['profiles', 'comments'])

    for (let table of resources.tables) {
      if (['profiles', 'comments', 'search.users'].includes(table)) {
        assert.isTrue(await dialect.hasTable(table), `"${table}" table exists`)
      } else {
        assert.isFalse(await dialect.hasTable(table), `"${table}" does not table exist`)
      }
    }
  })

  test('drop all tables from an explicit searchPath', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('mssql')
    const connection = new Connection('primary', config)
    cleanup(() => connection.close())

    const resources = await MSSQLSetupForScanning(connection)
    const dialect = new MSSQLDialect(connection)

    /**
     * All tables exists
     */
    for (let table of resources.tables) {
      assert.isTrue(await dialect.hasTable(table), `"${table}" table exists`)
    }

    /**
     * All tables dropped from the public schema
     */
    await dialect.dropAllTables([], ['search'])

    for (let table of resources.tables) {
      if (table.startsWith('search.')) {
        assert.isFalse(await dialect.hasTable(table, ['search']), `"${table}" table does not exist`)
      } else {
        assert.isTrue(await dialect.hasTable(table), `"${table}" table exists`)
      }
    }
  })
})

test.group('MSSQL Dialect | dropAllViews', () => {
  test('drop all views from the default schema', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('mssql')
    const connection = new Connection('primary', config)
    cleanup(() => connection.close())

    const resources = await MSSQLSetupForScanning(connection)
    const dialect = new MSSQLDialect(connection)

    /**
     * All views exists
     */
    for (let view of resources.views) {
      assert.isTrue(await dialect.hasView(view), `"${view}" view exists`)
    }

    /**
     * All views dropped
     */
    await dialect.dropAllViews()
    for (let view of resources.views) {
      if (view.includes('search.')) {
        assert.isTrue(await dialect.hasView(view), `"${view}" view exists`)
      } else {
        assert.isFalse(await dialect.hasView(view), `"${view}" view does not exist`)
      }
    }
  })

  test('drop all views excluding the provided list', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('mssql')
    const connection = new Connection('primary', config)
    cleanup(() => connection.close())

    const resources = await MSSQLSetupForScanning(connection)
    const dialect = new MSSQLDialect(connection)

    /**
     * All views exists
     */
    for (let view of resources.views) {
      assert.isTrue(await dialect.hasView(view), `"${view}" view exists`)
    }

    /**
     * All views dropped
     */
    await dialect.dropAllViews(['public.voters'], ['public', 'search'])
    for (let view of resources.views) {
      if (view === 'voters') {
        assert.isTrue(await dialect.hasView(view), `"${view}" view exists`)
      } else {
        assert.isFalse(await dialect.hasView(view), `"${view}" view does not exist`)
      }
    }
  })

  test('drop all views from an explicit searchPath', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('mssql')
    const connection = new Connection('primary', config)
    cleanup(() => connection.close())

    const resources = await MSSQLSetupForScanning(connection)
    const dialect = new MSSQLDialect(connection)

    /**
     * All views exists
     */
    for (let view of resources.views) {
      assert.isTrue(await dialect.hasView(view), `"${view}" view exists`)
    }

    /**
     * All views dropped from the public schema
     */
    await dialect.dropAllViews([], ['public'])
    for (let view of resources.views) {
      if (view.startsWith('search.')) {
        assert.isTrue(await dialect.hasView(view), `"${view}" view exists`)
      } else {
        assert.isFalse(await dialect.hasView(view, ['public']), `"${view}" view does not exist`)
      }
    }
  })
})

test.group('MSSQL Dialect | truncateAllTables', () => {
  test('truncate all tables with foreign key constraints', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('mssql')
    const connection = new Connection('primary', config)
    const knex = connection.getWriteClient()
    cleanup(() => connection.close())

    await MSSQLSetupForTruncation(connection)
    const dialect = new MSSQLDialect(connection)

    const rows = await knex
      .table('users')
      .insert({
        email: 'foo@bar.com',
        password: 'secret',
      })
      .returning('id')
    await knex.table('profiles').insert({
      full_name: 'foo bar',
      user_id: rows[0].id,
    })
    await knex.table('profiles_restrict_cascade').insert({
      full_name: 'foo bar',
      user_id: rows[0].id,
    })

    await dialect.truncateAllTables()
    assert.deepEqual(await knex.from('users').select('*'), [])
    assert.deepEqual(await knex.from('profiles').select('*'), [])
    assert.deepEqual(await knex.from('profiles_restrict_cascade').select('*'), [])
  })

  test('truncate all tables excluding the provided list', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('mssql')
    const connection = new Connection('primary', config)
    const knex = connection.getWriteClient()
    cleanup(() => connection.close())

    await MSSQLSetupForTruncation(connection)
    const dialect = new MSSQLDialect(connection)

    const rows = await knex
      .table('users')
      .insert({
        email: 'foo@bar.com',
        password: 'secret',
      })
      .returning('id')
    await knex.table('profiles').insert({
      full_name: 'foo bar',
      user_id: rows[0].id,
    })
    await knex.table('profiles_restrict_cascade').insert({
      full_name: 'foo bar',
      user_id: rows[0].id,
    })

    await dialect.truncateAllTables(['users'])
    assert.lengthOf(await knex.from('users').select('*'), 1)
    assert.deepEqual(await knex.from('profiles_restrict_cascade').select('*'), [])
    assert.deepEqual(await knex.from('profiles').select('*'), [])
  })
})

test.group('MSSQL Dialect | getAllColumns', () => {
  test('get columns for a table', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('mssql')
    const connection = new Connection('primary', config)
    cleanup(() => connection.close())

    await MSSQLSetupForScanning(connection)
    const dialect = new MSSQLDialect(connection)
    assert.sameDeepMembers(await dialect.getAllColumns('users'), [
      {
        name: 'id',
        type: 'number',
        dialectType: 'int',
        nullable: false,
        optional: false,
      },
      {
        name: 'first_name',
        type: 'string',
        dialectType: 'nvarchar',
        nullable: true,
        optional: false,
      },
      {
        name: 'last_name',
        type: 'string',
        dialectType: 'nvarchar',
        nullable: true,
        optional: false,
      },
      {
        name: 'email',
        type: 'string',
        dialectType: 'nvarchar',
        nullable: true,
        optional: false,
      },
      {
        name: 'age',
        type: 'number',
        dialectType: 'int',
        nullable: false,
        optional: false,
      },
      {
        name: 'role',
        type: 'string',
        dialectType: 'nvarchar',
        nullable: true,
        optional: false,
      },
      {
        name: 'password',
        type: 'string',
        dialectType: 'nvarchar',
        nullable: true,
        optional: false,
      },
    ])
  })
})

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
})

test.group('MSSQL Dialect | update', () => {
  test('update table with complex values', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('mssql')
    const connection = new Connection('primary', config)
    const client = new QueryClient(connection, 'dual')
    cleanup(() => connection.close())

    await dbSetup(connection)

    await client
      .insertInto('users')
      .values([
        {
          first_name: 'Harminder',
          last_name: 'Virk',
          email: 'virk@adonisjs.com',
          age: 35,
        },
        {
          first_name: 'Romain',
          last_name: 'Lanz',
          username: 'rlanz',
          email: 'rlanz@adonisjs.com',
          age: 30,
        },
      ])
      .exec()

    await client
      .updateTable('users')
      .set({
        username: client.raw('CASE WHEN ?? iS NULL THEN ?? ELSE ?? END', [
          'username',
          'email',
          'username',
        ]),
        age: client.raw('?? + ?', ['age', 1]),
      })
      .on('query', (sql) => debug('%O', sql))
      .exec()

    const users = await client.query().select('email', 'username', 'age').from('users').exec()
    assert.deepEqual(users, [
      {
        age: 36,
        email: 'virk@adonisjs.com',
        username: 'virk@adonisjs.com',
      },
      {
        age: 31,
        email: 'rlanz@adonisjs.com',
        username: 'rlanz',
      },
    ])
  })

  test('update table as a key-value pair', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('mssql')
    const connection = new Connection('primary', config)
    const client = new QueryClient(connection, 'dual')
    cleanup(() => connection.close())

    await dbSetup(connection)

    await client
      .insertInto('users')
      .values([
        {
          first_name: 'Romain',
          last_name: 'Lanz',
          username: 'rlanz',
          email: 'rlanz@adonisjs.com',
          age: 30,
        },
      ])
      .exec()

    await client
      .updateTable('users')
      .set('username', client.raw('??', ['email']))
      .where('username', 'rlanz')
      .on('query', (sql) => debug('%O', sql))
      .exec()

    const users = await client.query().select('email', 'username').from('users').exec()
    assert.deepEqual(users, [
      {
        email: 'rlanz@adonisjs.com',
        username: 'rlanz@adonisjs.com',
      },
    ])
  })
})
