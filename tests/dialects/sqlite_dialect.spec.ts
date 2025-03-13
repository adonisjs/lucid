/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { Connection } from '../../src/connection/connection.js'
import { SQLiteDialect } from '../../src/dialects/sqlite_dialect.js'
import {
  dbSetup,
  getConnectionConfig,
  SQLiteSetupForScanning,
  SQLiteSetupForTruncation,
} from '../helpers.js'
import { QueryClient } from '../../src/database_clients/query_client.js'
import { SelectExpressionBuilder } from '../../src/expression_builders/select_expression_builder.js'

test.group('SQLite Dialect | getAllTables', (group) => {
  group.each.setup(async (t) => {
    await t.context.fs.mkdir('./')
  })

  test('get all tables', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('sqlite')
    const connection = new Connection('primary', config)
    cleanup(() => connection.close())

    await SQLiteSetupForScanning(connection)
    const dialect = new SQLiteDialect(connection)
    assert.sameDeepMembers(await dialect.getAllTables(), [
      {
        name: 'users',
      },
      {
        name: 'profiles',
      },
    ])
  })
})

test.group('SQLite Dialect | getAllViews', (group) => {
  group.each.setup(async (t) => {
    await t.context.fs.mkdir('./')
  })

  test('get all views', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('sqlite')
    const connection = new Connection('primary', config)
    cleanup(() => connection.close())

    await SQLiteSetupForScanning(connection)
    const dialect = new SQLiteDialect(connection)
    assert.snapshot(await dialect.getAllViews()).matchInline(`
      [
        {
          "definition": "CREATE VIEW \`voters\` (\`first_name\`, \`email\`) as select \`first_name\`, \`email\` from \`users\` where \`age\` > '18'",
          "name": "voters",
        },
      ]
    `)
  })
})

test.group('SQLite Dialect | dropAllTables', (group) => {
  group.each.setup(async (t) => {
    await t.context.fs.mkdir('./')
  })

  test('drop all tables', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('sqlite')
    const connection = new Connection('primary', config)
    cleanup(() => connection.close())

    const resources = await SQLiteSetupForScanning(connection)
    const dialect = new SQLiteDialect(connection)

    const rows = await connection.getWriteClient().table('users').insert({
      first_name: 'foo',
      last_name: 'bar',
      email: 'foo@bar.com',
      password: 'secret',
      age: 32,
    })

    await connection.getWriteClient().table('profiles').insert({
      full_name: 'foo bar',
      user_id: rows[0],
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
      assert.isFalse(await dialect.hasTable(table), `"${table}" table does not exist`)
    }
  })

  test('drop all tables excluding the provided list', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('sqlite')
    const connection = new Connection('primary', config)
    cleanup(() => connection.close())

    const resources = await SQLiteSetupForScanning(connection)
    const dialect = new SQLiteDialect(connection)

    /**
     * All tables exists
     */
    for (let table of resources.tables) {
      assert.isTrue(await dialect.hasTable(table), `"${table}" table exists`)
    }

    /**
     * All tables dropped except the excluded one's.
     */
    await dialect.dropAllTables(['users'])

    for (let table of resources.tables) {
      if (['users'].includes(table)) {
        assert.isTrue(await dialect.hasTable(table), `"${table}" table exists`)
      } else {
        assert.isFalse(await dialect.hasTable(table), `"${table}" does not table exist`)
      }
    }
  })
})

test.group('SQLite Dialect | dropAllViews', (group) => {
  group.each.setup(async (t) => {
    await t.context.fs.mkdir('./')
  })

  test('drop all views', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('sqlite')
    const connection = new Connection('primary', config)
    cleanup(() => connection.close())

    const resources = await SQLiteSetupForScanning(connection)
    const dialect = new SQLiteDialect(connection)

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
      assert.isFalse(await dialect.hasView(view), `"${view}" view does not exist`)
    }
  })

  test('drop all views excluding the provided list', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('sqlite')
    const connection = new Connection('primary', config)
    cleanup(() => connection.close())

    const resources = await SQLiteSetupForScanning(connection)
    const dialect = new SQLiteDialect(connection)

    /**
     * All views exists
     */
    for (let view of resources.views) {
      assert.isTrue(await dialect.hasView(view), `"${view}" view exists`)
    }

    /**
     * All views dropped
     */
    await dialect.dropAllViews(['voters'])
    for (let view of resources.views) {
      if (view === 'voters') {
        assert.isTrue(await dialect.hasView(view), `"${view}" view exists`)
      } else {
        assert.isFalse(await dialect.hasView(view), `"${view}" view does not exist`)
      }
    }
  })
})

test.group('SQLite Dialect | truncate', (group) => {
  group.each.setup(async (t) => {
    await t.context.fs.mkdir('./')
  })

  test('truncate all tables with foreign key constraints', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('sqlite')
    const connection = new Connection('primary', config)
    const knex = connection.getWriteClient()
    cleanup(() => connection.close())

    await SQLiteSetupForTruncation(connection)
    const dialect = new SQLiteDialect(connection)

    const rows = await knex.table('users').insert({
      email: 'foo@bar.com',
      password: 'secret',
    })
    await knex.table('profiles').insert({
      full_name: 'foo bar',
      user_id: rows[0],
    })
    await knex.table('profiles_restrict_cascade').insert({
      full_name: 'foo bar',
      user_id: rows[0],
    })

    await dialect.truncateAllTables()
    assert.deepEqual(await knex.from('users').select('*'), [])
    assert.deepEqual(await knex.from('profiles').select('*'), [])
    assert.deepEqual(await knex.from('profiles_restrict_cascade').select('*'), [])
  })

  test('truncate all tables excluding the provided list', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('sqlite')
    const connection = new Connection('primary', config)
    const knex = connection.getWriteClient()
    cleanup(() => connection.close())

    await SQLiteSetupForTruncation(connection)
    const dialect = new SQLiteDialect(connection)

    const rows = await knex.table('users').insert({
      email: 'foo@bar.com',
      password: 'secret',
    })
    await knex.table('profiles').insert({
      full_name: 'foo bar',
      user_id: rows[0],
    })
    await knex.table('profiles_restrict_cascade').insert({
      full_name: 'foo bar',
      user_id: rows[0],
    })

    await dialect.truncateAllTables(['users'])
    assert.lengthOf(await knex.from('users').select('*'), 1)
    assert.deepEqual(await knex.from('profiles_restrict_cascade').select('*'), [])
    assert.deepEqual(await knex.from('profiles').select('*'), [])
  })
})

test.group('SQLite Dialect | getAllColumns', (group) => {
  group.each.setup(async (t) => {
    await t.context.fs.mkdir('./')
  })

  test('get columns for a table', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('sqlite')
    const connection = new Connection('primary', config)
    cleanup(() => connection.close())

    await SQLiteSetupForScanning(connection)
    const dialect = new SQLiteDialect(connection)
    assert.sameDeepMembers(await dialect.getAllColumns('users'), [
      {
        name: 'id',
        type: 'number',
        dialectType: 'integer',
        nullable: false,
        optional: false,
      },
      {
        name: 'first_name',
        type: 'string',
        dialectType: 'varchar(255)',
        nullable: true,
        optional: false,
      },
      {
        name: 'last_name',
        type: 'string',
        dialectType: 'varchar(255)',
        nullable: true,
        optional: false,
      },
      {
        name: 'email',
        type: 'string',
        dialectType: 'varchar(255)',
        nullable: true,
        optional: false,
      },
      {
        name: 'age',
        type: 'number',
        dialectType: 'integer',
        nullable: false,
        optional: false,
      },
      {
        name: 'role',
        type: 'enum',
        dialectType: 'text',
        nullable: true,
        optional: false,
        enumOptions: ['admin', 'guest'],
      },
      {
        name: 'password',
        type: 'string',
        dialectType: 'varchar(255)',
        nullable: true,
        optional: false,
      },
    ])
  })
})

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
