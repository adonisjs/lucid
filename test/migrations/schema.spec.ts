/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import test from 'japa'
import { ApplicationContract } from '@ioc:Adonis/Core/Application'
import { setup, cleanup, getDb, getBaseSchema, setupApplication, fs } from '../../test-helpers'

let db: ReturnType<typeof getDb>
let app: ApplicationContract

test.group('Schema', (group) => {
  group.beforeEach(async () => {
    app = await setupApplication()
    db = getDb(app)
    await setup()
  })

  group.afterEach(async () => {
    await db.manager.closeAll()
    await cleanup()
    await fs.cleanup()
  })

  test('get schema queries defined inside the up method in dry run', async (assert) => {
    class UsersSchema extends getBaseSchema() {
      public up() {
        this.schema.createTable('users', (table) => {
          table.increments('id')
          table.string('username')
        })
      }
    }

    const schema = new UsersSchema(db.connection(), 'users.ts', true)
    const queries = await schema.execUp()

    const knexSchema = db
      .connection()
      .schema.createTable('users', (table) => {
        table.increments('id')
        table.string('username')
      })
      .toQuery()

    assert.deepEqual(queries, [knexSchema])
  })

  test('get schema queries defined inside the down method in dry run', async (assert) => {
    class UsersSchema extends getBaseSchema() {
      public down() {
        this.schema.dropTable('users')
      }
    }

    const schema = new UsersSchema(db.connection(), 'users.ts', true)
    const queries = await schema.execDown()

    const knexSchema = db.connection().schema.dropTable('users').toQuery()
    assert.deepEqual(queries, [knexSchema])
  })

  test('get knex raw query builder using now method', async (assert) => {
    class UsersSchema extends getBaseSchema() {
      public up() {
        this.schema.createTable('users', (table) => {
          table.increments('id')
          table.string('username')
        })
      }
    }

    const schema = new UsersSchema(db.connection(), 'users.ts', true)
    assert.equal(schema.now().toQuery(), 'CURRENT_TIMESTAMP')
  })

  test('do not execute defer calls in dry run', async (assert) => {
    assert.plan(1)

    class UsersSchema extends getBaseSchema() {
      public up() {
        assert.isTrue(true)
        this.defer(() => {
          throw new Error('Not expected to be invoked')
        })
      }
    }

    const schema = new UsersSchema(db.connection(), 'foo.ts', true)
    await schema.execUp()
  })

  test('execute up method queries on a given connection', async (assert) => {
    class UsersSchema extends getBaseSchema() {
      public up() {
        this.schema.createTable('schema_users', (table) => {
          table.increments('id')
          table.string('username')
        })

        this.schema.createTable('schema_accounts', (table) => {
          table.increments('id')
          table.integer('user_id').unsigned().references('schema_users.id')
        })
      }
    }

    const trx = await db.transaction()
    const schema = new UsersSchema(trx, 'users.ts', false)

    try {
      await schema.execUp()
      await trx.commit()
    } catch (error) {
      await trx.rollback()
    }

    const hasUsers = await db.connection().schema.hasTable('schema_users')
    const hasAccounts = await db.connection().schema.hasTable('schema_accounts')

    await db.connection().schema.dropTable('schema_accounts')
    await db.connection().schema.dropTable('schema_users')

    assert.isTrue(hasUsers)
    assert.isTrue(hasAccounts)
  })

  test('execute up method deferred actions in correct sequence', async (assert) => {
    class UsersSchema extends getBaseSchema() {
      public up() {
        this.schema.createTable('schema_users', (table) => {
          table.increments('id')
          table.string('username')
        })

        this.defer(async () => {
          await this.db.table('schema_users').insert({ username: 'virk' })
        })

        this.schema.createTable('schema_accounts', (table) => {
          table.increments('id')
          table.integer('user_id').unsigned().references('schema_users.id')
        })
      }
    }

    const trx = await db.transaction()
    const schema = new UsersSchema(trx, 'users.ts', false)

    try {
      await schema.execUp()
      await trx.commit()
    } catch (error) {
      await trx.rollback()
    }

    const user = await db.connection().query().from('schema_users').first()
    assert.equal(user.username, 'virk')

    await db.connection().schema.dropTable('schema_accounts')
    await db.connection().schema.dropTable('schema_users')
  })

  test('execute down method queries on a given connection', async (assert) => {
    class UsersSchema extends getBaseSchema() {
      public up() {
        this.schema.createTable('schema_users', (table) => {
          table.increments('id')
          table.string('username')
        })

        this.schema.createTable('schema_accounts', (table) => {
          table.increments('id')
          table.integer('user_id').unsigned().references('schema_users.id')
        })
      }

      public down() {
        if (this.db.dialect.name !== 'sqlite3') {
          this.schema.table('schema_accounts', (table) => {
            table.dropForeign(['user_id'])
          })
        }

        this.schema.dropTable('schema_users')
        this.schema.dropTable('schema_accounts')
      }
    }

    await new UsersSchema(db.connection(), 'users.ts', false).execUp()

    const trx = await db.transaction()
    const schema = new UsersSchema(trx, 'users.ts', false)

    try {
      await schema.execDown()
      await trx.commit()
    } catch (error) {
      await trx.rollback()
      console.log(error)
    }

    const hasUsers = await db.connection().schema.hasTable('schema_users')
    const hasAccounts = await db.connection().schema.hasTable('schema_accounts')

    assert.isFalse(hasUsers)
    assert.isFalse(hasAccounts)
  })

  test('use now helper to define default timestamp', async (assert) => {
    class UsersSchema extends getBaseSchema() {
      public up() {
        this.schema.createTable('users', (table) => {
          table.increments('id')
          table.timestamp('created_at').defaultTo(this.now())
        })
      }
    }

    const schema = new UsersSchema(db.connection(), 'users.ts', true)
    const queries = await schema.execUp()

    const knexSchema = db
      .connection()
      .schema.createTable('users', (table) => {
        table.increments('id')
        table.timestamp('created_at').defaultTo(db.connection().getWriteClient().fn.now())
      })
      .toQuery()

    assert.deepEqual(queries, [knexSchema])
  })

  test('emit db:query event when schema instructions are executed', async (assert) => {
    assert.plan(10)

    class UsersSchema extends getBaseSchema() {
      public up() {
        this.schema.createTable('schema_users', (table) => {
          table.increments('id')
          table.string('username')
        })

        this.schema.createTable('schema_accounts', (table) => {
          table.increments('id')
          table.integer('user_id').unsigned().references('schema_users.id')
        })
      }
    }

    const trx = await db.transaction()
    trx.debug = true
    const schema = new UsersSchema(trx, 'users.ts', false)

    app.container.use('Adonis/Core/Event').on('db:query', (query) => {
      assert.property(query, 'sql')
      assert.isTrue(query.inTransaction)
      assert.equal(query.connection, 'primary')
      assert.property(query, 'duration')
      assert.equal(query.method, 'create')
    })

    try {
      await schema.execUp()
      await trx.commit()
    } catch (error) {
      await trx.rollback()
    }

    await db.connection().schema.dropTable('schema_accounts')
    await db.connection().schema.dropTable('schema_users')
  })

  test('do not emit db:query debugging is turned off', async () => {
    class UsersSchema extends getBaseSchema() {
      public up() {
        this.schema.createTable('schema_users', (table) => {
          table.increments('id')
          table.string('username')
        })

        this.schema.createTable('schema_accounts', (table) => {
          table.increments('id')
          table.integer('user_id').unsigned().references('schema_users.id')
        })
      }
    }

    const trx = await db.transaction()
    trx.debug = false

    const schema = new UsersSchema(trx, 'users.ts', false)
    app.container.use('Adonis/Core/Event').on('db:query', () => {
      throw new Error('Never expected to reach here')
    })

    try {
      await schema.execUp()
      await trx.commit()
    } catch (error) {
      await trx.rollback()
    }

    await db.connection().schema.dropTable('schema_accounts')
    await db.connection().schema.dropTable('schema_users')
  })

  test('emit db:query when enabled on the schema', async (assert) => {
    assert.plan(10)

    class UsersSchema extends getBaseSchema() {
      public debug = true

      public up() {
        this.schema.createTable('schema_users', (table) => {
          table.increments('id')
          table.string('username')
        })

        this.schema.createTable('schema_accounts', (table) => {
          table.increments('id')
          table.integer('user_id').unsigned().references('schema_users.id')
        })
      }
    }

    const trx = await db.transaction()
    const schema = new UsersSchema(trx, 'users.ts', false)

    app.container.use('Adonis/Core/Event').on('db:query', (query) => {
      assert.property(query, 'sql')
      assert.isTrue(query.inTransaction)
      assert.equal(query.connection, 'primary')
      assert.property(query, 'duration')
      assert.equal(query.method, 'create')
    })

    try {
      await schema.execUp()
      await trx.commit()
    } catch (error) {
      await trx.rollback()
    }

    await db.connection().schema.dropTable('schema_accounts')
    await db.connection().schema.dropTable('schema_users')
  })
})
