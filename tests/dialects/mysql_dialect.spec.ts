/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { Connection } from '../../src/connection.js'
import { MySQLDialect } from '../../src/dialects/mysql_dialect.js'
import { getConnectionConfig, mySQLSetupForScanning, mySQLSetupForTruncation } from '../helpers.js'

test.group('MySQL Dialect | getAllTables', () => {
  test('get all tables', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('mysql')
    const connection = new Connection('primary', config)
    cleanup(() => connection.close())

    await mySQLSetupForScanning(connection)
    const dialect = new MySQLDialect(connection)
    assert.sameDeepMembers(await dialect.getAllTables(), [
      {
        name: 'users',
      },
      {
        name: 'skills',
      },
      {
        name: 'profiles',
      },
    ])
  })
})

test.group('MySQL Dialect | getAllViews', () => {
  test('get all views', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('mysql')
    const connection = new Connection('primary', config)
    cleanup(() => connection.close())

    await mySQLSetupForScanning(connection)
    const dialect = new MySQLDialect(connection)
    assert.snapshot(await dialect.getAllViews()).matchInline(`
      [
        {
          "definition": "select \`lucid\`.\`users\`.\`first_name\` AS \`first_name\`,\`lucid\`.\`users\`.\`email\` AS \`email\` from \`lucid\`.\`users\` where (\`lucid\`.\`users\`.\`age\` > '18')",
          "name": "voters",
        },
      ]
    `)
  })
})

test.group('MySQL Dialect | dropAllTables', () => {
  test('drop all tables', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('mysql')
    const connection = new Connection('primary', config)
    cleanup(() => connection.close())

    const resources = await mySQLSetupForScanning(connection)
    const dialect = new MySQLDialect(connection)

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
    const config = getConnectionConfig('mysql')
    const connection = new Connection('primary', config)
    cleanup(() => connection.close())

    const resources = await mySQLSetupForScanning(connection)
    const dialect = new MySQLDialect(connection)

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

test.group('MySQL Dialect | dropAllViews', () => {
  test('drop all views', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('mysql')
    const connection = new Connection('primary', config)
    cleanup(() => connection.close())

    const resources = await mySQLSetupForScanning(connection)
    const dialect = new MySQLDialect(connection)

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
    const config = getConnectionConfig('mysql')
    const connection = new Connection('primary', config)
    cleanup(() => connection.close())

    const resources = await mySQLSetupForScanning(connection)
    const dialect = new MySQLDialect(connection)

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

test.group('MYSQL Dialect | truncate', () => {
  test('truncate all tables with foreign key constraints', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('mysql')
    const connection = new Connection('primary', config)
    const knex = connection.getWriteClient()
    cleanup(() => connection.close())

    await mySQLSetupForTruncation(connection)
    const dialect = new MySQLDialect(connection)

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
    const config = getConnectionConfig('mysql')
    const connection = new Connection('primary', config)
    const knex = connection.getWriteClient()
    cleanup(() => connection.close())

    await mySQLSetupForTruncation(connection)
    const dialect = new MySQLDialect(connection)

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

test.group('MySQL Dialect | acquireAdvisoryLock', () => {
  test('acquire advisory lock for a key', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('mysql')
    const connection = new Connection('primary', config)
    cleanup(() => connection.close())

    const dialect = new MySQLDialect(connection)
    cleanup(async () => {
      await dialect.releaseAdvisoryLock('migrations')
    })

    assert.isTrue(await dialect.getAdvisoryLock('migrations'))
  })

  test('fail to acquire lock when already taken', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('mysql')
    const connection = new Connection('primary', config)
    const connection1 = new Connection('secondary', config)
    cleanup(() => connection.close())
    cleanup(() => connection1.close())

    const dialect = new MySQLDialect(connection)
    const dialect1 = new MySQLDialect(connection1)
    cleanup(async () => {
      await dialect.releaseAdvisoryLock('migrations')
    })

    assert.isTrue(await dialect.getAdvisoryLock('migrations'))
    assert.isFalse(await dialect1.getAdvisoryLock('migrations'))
  })
})
