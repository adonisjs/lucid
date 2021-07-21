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
import { rules } from '@adonisjs/validator/build/src/Rules'
import { schema } from '@adonisjs/validator/build/src/Schema'
import { extendValidator } from '../../src/Bindings/Validator'
import { validator } from '@adonisjs/validator/build/src/Validator'

import { fs, getDb, setup, cleanup, resetTables, setupApplication } from '../../test-helpers'
import { ApplicationContract } from '@ioc:Adonis/Core/Application'

let app: ApplicationContract
let db: ReturnType<typeof getDb>

test.group('Validator | exists', (group) => {
  group.before(async () => {
    app = await setupApplication()
    db = getDb(app)
    await setup()
    extendValidator(validator, db, app.logger)
  })

  group.after(async () => {
    await cleanup()
    await fs.cleanup()
    await db.manager.closeAll()
  })

  group.afterEach(async () => {
    await resetTables()
    db.connection().getReadClient().removeAllListeners()
  })

  test("must fail when row doesn't exists in the table", async (assert) => {
    assert.plan(1)

    try {
      await validator.validate({
        schema: schema.create({
          id: schema.number([
            rules.exists({
              table: 'users',
              column: 'id',
            }),
          ]),
        }),
        data: { id: 1 },
      })
    } catch (error) {
      assert.deepEqual(error.messages, {
        id: ['exists validation failure'],
      })
    }
  })

  test('work fine when row exists', async (assert) => {
    assert.plan(2)

    const [userId] = await db
      .table('users')
      .returning('id')
      .insert({ email: 'virk@adonisjs.com', username: 'virk' })

    db.connection()
      .getReadClient()
      .on('query', ({ sql, bindings }) => {
        const { sql: knexSql, bindings: knexBindings } = db
          .connection()
          .getReadClient()
          .from('users')
          .where('id', userId)
          .limit(1)
          .toSQL()
          .toNative()

        assert.equal(sql, knexSql)
        assert.deepEqual(bindings, knexBindings)
      })

    await validator.validate({
      schema: schema.create({
        id: schema.number([
          rules.exists({
            table: 'users',
            column: 'id',
          }),
        ]),
      }),
      data: { id: userId },
    })
  })

  test('add where contraints', async (assert) => {
    assert.plan(3)

    const [userId] = await db
      .table('users')
      .returning('id')
      .insert({ email: 'virk@adonisjs.com', username: 'virk' })

    db.connection()
      .getReadClient()
      .on('query', ({ sql, bindings }) => {
        const { sql: knexSql, bindings: knexBindings } = db
          .connection()
          .getReadClient()
          .from('users')
          .where('id', userId)
          .where('username', 'nikk')
          .limit(1)
          .toSQL()
          .toNative()

        assert.equal(sql, knexSql)
        assert.deepEqual(bindings, knexBindings)
      })

    try {
      await validator.validate({
        schema: schema.create({
          id: schema.number([
            rules.exists({
              table: 'users',
              column: 'id',
              where: {
                username: 'nikk',
              },
            }),
          ]),
        }),
        data: { id: userId },
      })
    } catch (error) {
      assert.deepEqual(error.messages, {
        id: ['exists validation failure'],
      })
    }
  })

  test('add where contraints with refs', async (assert) => {
    assert.plan(3)

    const [userId] = await db
      .table('users')
      .returning('id')
      .insert({ email: 'virk@adonisjs.com', username: 'virk' })

    db.connection()
      .getReadClient()
      .on('query', ({ sql, bindings }) => {
        const { sql: knexSql, bindings: knexBindings } = db
          .connection()
          .getReadClient()
          .from('users')
          .where('id', userId)
          .where('username', 'nikk')
          .limit(1)
          .toSQL()
          .toNative()

        assert.equal(sql, knexSql)
        assert.deepEqual(bindings, knexBindings)
      })

    try {
      const refs = schema.refs({
        username: 'nikk',
      })

      await validator.validate({
        refs,
        schema: schema.create({
          id: schema.number([
            rules.exists({
              table: 'users',
              column: 'id',
              where: {
                username: refs.username,
              },
            }),
          ]),
        }),
        data: { id: userId },
      })
    } catch (error) {
      assert.deepEqual(error.messages, {
        id: ['exists validation failure'],
      })
    }
  })

  test('add wherein contraints', async (assert) => {
    assert.plan(3)

    const [userId] = await db
      .table('users')
      .returning('id')
      .insert({ email: 'virk@adonisjs.com', username: 'virk' })

    db.connection()
      .getReadClient()
      .on('query', ({ sql, bindings }) => {
        const { sql: knexSql, bindings: knexBindings } = db
          .connection()
          .getReadClient()
          .from('users')
          .where('id', userId)
          .whereIn('username', ['nikk', 'romain'])
          .limit(1)
          .toSQL()
          .toNative()

        assert.equal(sql, knexSql)
        assert.deepEqual(bindings, knexBindings)
      })

    try {
      await validator.validate({
        schema: schema.create({
          id: schema.number([
            rules.exists({
              table: 'users',
              column: 'id',
              where: {
                username: ['nikk', 'romain'],
              },
            }),
          ]),
        }),
        data: { id: userId },
      })
    } catch (error) {
      assert.deepEqual(error.messages, {
        id: ['exists validation failure'],
      })
    }
  })

  test('add wherein contraints with refs', async (assert) => {
    assert.plan(3)

    const [userId] = await db
      .table('users')
      .returning('id')
      .insert({ email: 'virk@adonisjs.com', username: 'virk' })

    db.connection()
      .getReadClient()
      .on('query', ({ sql, bindings }) => {
        const { sql: knexSql, bindings: knexBindings } = db
          .connection()
          .getReadClient()
          .from('users')
          .where('id', userId)
          .whereIn('username', ['nikk', 'romain'])
          .limit(1)
          .toSQL()
          .toNative()

        assert.equal(sql, knexSql)
        assert.deepEqual(bindings, knexBindings)
      })

    try {
      const refs = schema.refs({
        username: ['nikk', 'romain'],
      })

      await validator.validate({
        refs,
        schema: schema.create({
          id: schema.number([
            rules.exists({
              table: 'users',
              column: 'id',
              where: {
                username: refs.username,
              },
            }),
          ]),
        }),
        data: { id: userId },
      })
    } catch (error) {
      assert.deepEqual(error.messages, {
        id: ['exists validation failure'],
      })
    }
  })

  test('add where not constraints', async (assert) => {
    assert.plan(3)

    const [userId] = await db
      .table('users')
      .returning('id')
      .insert({ email: 'virk@adonisjs.com', username: 'virk' })

    db.connection()
      .getReadClient()
      .on('query', ({ sql, bindings }) => {
        const { sql: knexSql, bindings: knexBindings } = db
          .connection()
          .getReadClient()
          .from('users')
          .where('id', userId)
          .whereNot('username', 'virk')
          .limit(1)
          .toSQL()
          .toNative()

        assert.equal(sql, knexSql)
        assert.deepEqual(bindings, knexBindings)
      })

    try {
      await validator.validate({
        schema: schema.create({
          id: schema.number([
            rules.exists({
              table: 'users',
              column: 'id',
              whereNot: {
                username: 'virk',
              },
            }),
          ]),
        }),
        data: { id: userId },
      })
    } catch (error) {
      assert.deepEqual(error.messages, {
        id: ['exists validation failure'],
      })
    }
  })

  test('add where not constraints with refs', async (assert) => {
    assert.plan(3)

    const [userId] = await db
      .table('users')
      .returning('id')
      .insert({ email: 'virk@adonisjs.com', username: 'virk' })

    db.connection()
      .getReadClient()
      .on('query', ({ sql, bindings }) => {
        const { sql: knexSql, bindings: knexBindings } = db
          .connection()
          .getReadClient()
          .from('users')
          .where('id', userId)
          .whereNot('username', 'virk')
          .limit(1)
          .toSQL()
          .toNative()

        assert.equal(sql, knexSql)
        assert.deepEqual(bindings, knexBindings)
      })

    try {
      const refs = schema.refs({
        username: 'virk',
      })

      await validator.validate({
        refs,
        schema: schema.create({
          id: schema.number([
            rules.exists({
              table: 'users',
              column: 'id',
              whereNot: {
                username: refs.username,
              },
            }),
          ]),
        }),
        data: { id: userId },
      })
    } catch (error) {
      assert.deepEqual(error.messages, {
        id: ['exists validation failure'],
      })
    }
  })

  test('add where not in constraints', async (assert) => {
    assert.plan(3)

    const [userId] = await db
      .table('users')
      .returning('id')
      .insert({ email: 'virk@adonisjs.com', username: 'virk' })

    db.connection()
      .getReadClient()
      .on('query', ({ sql, bindings }) => {
        const { sql: knexSql, bindings: knexBindings } = db
          .connection()
          .getReadClient()
          .from('users')
          .where('id', userId)
          .whereNotIn('username', ['virk', 'nikk'])
          .limit(1)
          .toSQL()
          .toNative()

        assert.equal(sql, knexSql)
        assert.deepEqual(bindings, knexBindings)
      })

    try {
      await validator.validate({
        schema: schema.create({
          id: schema.number([
            rules.exists({
              table: 'users',
              column: 'id',
              whereNot: {
                username: ['virk', 'nikk'],
              },
            }),
          ]),
        }),
        data: { id: userId },
      })
    } catch (error) {
      assert.deepEqual(error.messages, {
        id: ['exists validation failure'],
      })
    }
  })

  test('add where not in constraints with refs', async (assert) => {
    assert.plan(3)

    const [userId] = await db
      .table('users')
      .returning('id')
      .insert({ email: 'virk@adonisjs.com', username: 'virk' })

    db.connection()
      .getReadClient()
      .on('query', ({ sql, bindings }) => {
        const { sql: knexSql, bindings: knexBindings } = db
          .connection()
          .getReadClient()
          .from('users')
          .where('id', userId)
          .whereNotIn('username', ['virk', 'nikk'])
          .limit(1)
          .toSQL()
          .toNative()

        assert.equal(sql, knexSql)
        assert.deepEqual(bindings, knexBindings)
      })

    try {
      const refs = schema.refs({
        username: ['virk', 'nikk'],
      })

      await validator.validate({
        refs,
        schema: schema.create({
          id: schema.number([
            rules.exists({
              table: 'users',
              column: 'id',
              whereNot: {
                username: refs.username,
              },
            }),
          ]),
        }),
        data: { id: userId },
      })
    } catch (error) {
      assert.deepEqual(error.messages, {
        id: ['exists validation failure'],
      })
    }
  })

  test('perform case-insensitive query', async (assert) => {
    assert.plan(2)

    await db.table('users').returning('id').insert({ email: 'virk@adonisjs.com', username: 'virk' })

    db.connection()
      .getReadClient()
      .on('query', ({ sql, bindings }) => {
        const { sql: knexSql, bindings: knexBindings } = db
          .connection()
          .getReadClient()
          .from('users')
          .whereRaw(`lower(username) = ?`, [db.connection().knexRawQuery(`lower(?)`, ['VIRK'])])
          .limit(1)
          .toSQL()
          .toNative()

        assert.equal(sql, knexSql)
        assert.deepEqual(bindings, knexBindings)
      })

    await validator.validate({
      schema: schema.create({
        username: schema.string({}, [
          rules.exists({
            table: 'users',
            caseInsensitive: true,
            column: 'username',
          }),
        ]),
      }),
      data: { username: 'VIRK' },
    })
  })

  test('do not report SQL errors to the validator', async (assert) => {
    assert.plan(1)

    try {
      await validator.validate({
        schema: schema.create({
          username: schema.string({}, [
            rules.exists({
              table: 'invalid_users',
              caseInsensitive: true,
              column: 'username',
            }),
          ]),
        }),
        data: { username: 'VIRK' },
      })
    } catch (error) {
      assert.deepEqual(error.messages, {
        username: ['exists validation failure'],
      })
    }
  })

  test('make correct sql query schema field is of date type', async (assert) => {
    assert.plan(3)

    let sql: any
    let bindings: any
    let knexSql: any
    let knexBindings: any

    db.connection()
      .getReadClient()
      .on('query', (query) => {
        sql = query.sql
        bindings = query.bindings

        const knexQuery = db
          .connection()
          .getReadClient()
          .from('users')
          .where('created_at', '2020-10-20 00:00:00')
          .limit(1)
          .toSQL()
          .toNative()

        knexSql = knexQuery.sql
        knexBindings = knexQuery.bindings
      })

    try {
      await validator.validate({
        schema: schema.create({
          id: schema.date({}, [
            rules.exists({
              table: 'users',
              column: 'created_at',
            }),
          ]),
        }),
        data: { id: '2020-10-20' },
      })
    } catch (error) {
      assert.deepEqual(error.messages, {
        id: ['exists validation failure'],
      })
    }

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('define custom format datetime values', async (assert) => {
    assert.plan(3)

    let sql: any
    let bindings: any
    let knexSql: any
    let knexBindings: any

    db.connection()
      .getReadClient()
      .on('query', (query) => {
        sql = query.sql
        bindings = query.bindings

        const knexQuery = db
          .connection()
          .getReadClient()
          .from('users')
          .where('created_at', '2020-10-20')
          .limit(1)
          .toSQL()
          .toNative()

        knexSql = knexQuery.sql
        knexBindings = knexQuery.bindings
      })

    try {
      await validator.validate({
        schema: schema.create({
          id: schema.date({}, [
            rules.exists({
              table: 'users',
              dateFormat: 'yyyy-LL-dd',
              column: 'created_at',
            }),
          ]),
        }),
        data: { id: '2020-10-20' },
      })
    } catch (error) {
      assert.deepEqual(error.messages, {
        id: ['exists validation failure'],
      })
    }

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })
})

test.group('Validator | unique', (group) => {
  group.before(async () => {
    app = await setupApplication()
    db = getDb(app)
    await setup()
    extendValidator(validator, db, app.logger)
  })

  group.after(async () => {
    await cleanup()
    await fs.cleanup()
    await db.manager.closeAll()
  })

  group.afterEach(async () => {
    await resetTables()
    db.connection().getReadClient().removeAllListeners()
  })

  test('must fail when row already exists in the table', async (assert) => {
    assert.plan(1)

    const [userId] = await db
      .table('users')
      .returning('id')
      .insert({ email: 'virk@adonisjs.com', username: 'virk' })

    try {
      await validator.validate({
        schema: schema.create({
          id: schema.number([
            rules.unique({
              table: 'users',
              column: 'id',
            }),
          ]),
        }),
        data: { id: userId },
      })
    } catch (error) {
      assert.deepEqual(error.messages, {
        id: ['unique validation failure'],
      })
    }
  })

  test('work fine when row is missing', async () => {
    await validator.validate({
      schema: schema.create({
        id: schema.number([
          rules.unique({
            table: 'users',
            column: 'id',
          }),
        ]),
      }),
      data: { id: 1 },
    })
  })

  test('add where contraints', async (assert) => {
    assert.plan(3)

    const [userId] = await db
      .table('users')
      .returning('id')
      .insert({ email: 'virk@adonisjs.com', username: 'virk' })

    db.connection()
      .getReadClient()
      .on('query', ({ sql, bindings }) => {
        const { sql: knexSql, bindings: knexBindings } = db
          .connection()
          .getReadClient()
          .from('users')
          .where('id', userId)
          .where('username', 'virk')
          .limit(1)
          .toSQL()
          .toNative()

        assert.equal(sql, knexSql)
        assert.deepEqual(bindings, knexBindings)
      })

    try {
      await validator.validate({
        schema: schema.create({
          id: schema.number([
            rules.unique({
              table: 'users',
              column: 'id',
              where: {
                username: 'virk',
              },
            }),
          ]),
        }),
        data: { id: userId },
      })
    } catch (error) {
      assert.deepEqual(error.messages, {
        id: ['unique validation failure'],
      })
    }
  })

  test('add where contraints with refs', async (assert) => {
    assert.plan(3)

    const [userId] = await db
      .table('users')
      .returning('id')
      .insert({ email: 'virk@adonisjs.com', username: 'virk' })

    db.connection()
      .getReadClient()
      .on('query', ({ sql, bindings }) => {
        const { sql: knexSql, bindings: knexBindings } = db
          .connection()
          .getReadClient()
          .from('users')
          .where('id', userId)
          .where('username', 'virk')
          .limit(1)
          .toSQL()
          .toNative()

        assert.equal(sql, knexSql)
        assert.deepEqual(bindings, knexBindings)
      })

    try {
      const refs = schema.refs({
        username: 'virk',
      })

      await validator.validate({
        refs,
        schema: schema.create({
          id: schema.number([
            rules.unique({
              table: 'users',
              column: 'id',
              where: {
                username: refs.username,
              },
            }),
          ]),
        }),
        data: { id: userId },
      })
    } catch (error) {
      assert.deepEqual(error.messages, {
        id: ['unique validation failure'],
      })
    }
  })

  test('add where in contraints', async (assert) => {
    assert.plan(3)

    const [userId] = await db
      .table('users')
      .returning('id')
      .insert({ email: 'virk@adonisjs.com', username: 'virk' })

    db.connection()
      .getReadClient()
      .on('query', ({ sql, bindings }) => {
        const { sql: knexSql, bindings: knexBindings } = db
          .connection()
          .getReadClient()
          .from('users')
          .where('id', userId)
          .whereIn('username', ['virk', 'nikk'])
          .limit(1)
          .toSQL()
          .toNative()

        assert.equal(sql, knexSql)
        assert.deepEqual(bindings, knexBindings)
      })

    try {
      await validator.validate({
        schema: schema.create({
          id: schema.number([
            rules.unique({
              table: 'users',
              column: 'id',
              where: {
                username: ['virk', 'nikk'],
              },
            }),
          ]),
        }),
        data: { id: userId },
      })
    } catch (error) {
      assert.deepEqual(error.messages, {
        id: ['unique validation failure'],
      })
    }
  })

  test('add where in contraints with refs', async (assert) => {
    assert.plan(3)

    const [userId] = await db
      .table('users')
      .returning('id')
      .insert({ email: 'virk@adonisjs.com', username: 'virk' })

    db.connection()
      .getReadClient()
      .on('query', ({ sql, bindings }) => {
        const { sql: knexSql, bindings: knexBindings } = db
          .connection()
          .getReadClient()
          .from('users')
          .where('id', userId)
          .whereIn('username', ['virk', 'nikk'])
          .limit(1)
          .toSQL()
          .toNative()

        assert.equal(sql, knexSql)
        assert.deepEqual(bindings, knexBindings)
      })

    try {
      const refs = schema.refs({
        username: ['virk', 'nikk'],
      })

      await validator.validate({
        refs,
        schema: schema.create({
          id: schema.number([
            rules.unique({
              table: 'users',
              column: 'id',
              where: {
                username: refs.username,
              },
            }),
          ]),
        }),
        data: { id: userId },
      })
    } catch (error) {
      assert.deepEqual(error.messages, {
        id: ['unique validation failure'],
      })
    }
  })

  test('add whereNot contraints', async (assert) => {
    assert.plan(3)

    const [userId] = await db
      .table('users')
      .returning('id')
      .insert({ email: 'virk@adonisjs.com', username: 'virk' })

    db.connection()
      .getReadClient()
      .on('query', ({ sql, bindings }) => {
        const { sql: knexSql, bindings: knexBindings } = db
          .connection()
          .getReadClient()
          .from('users')
          .where('id', userId)
          .whereNot('username', 'nikk')
          .limit(1)
          .toSQL()
          .toNative()

        assert.equal(sql, knexSql)
        assert.deepEqual(bindings, knexBindings)
      })

    try {
      await validator.validate({
        schema: schema.create({
          id: schema.number([
            rules.unique({
              table: 'users',
              column: 'id',
              whereNot: {
                username: 'nikk',
              },
            }),
          ]),
        }),
        data: { id: userId },
      })
    } catch (error) {
      assert.deepEqual(error.messages, {
        id: ['unique validation failure'],
      })
    }
  })

  test('add whereNot contraints with refs', async (assert) => {
    assert.plan(3)

    const [userId] = await db
      .table('users')
      .returning('id')
      .insert({ email: 'virk@adonisjs.com', username: 'virk' })

    db.connection()
      .getReadClient()
      .on('query', ({ sql, bindings }) => {
        const { sql: knexSql, bindings: knexBindings } = db
          .connection()
          .getReadClient()
          .from('users')
          .where('id', userId)
          .whereNot('username', 'nikk')
          .limit(1)
          .toSQL()
          .toNative()

        assert.equal(sql, knexSql)
        assert.deepEqual(bindings, knexBindings)
      })

    try {
      const refs = schema.refs({
        username: 'nikk',
      })

      await validator.validate({
        refs,
        schema: schema.create({
          id: schema.number([
            rules.unique({
              table: 'users',
              column: 'id',
              whereNot: {
                username: refs.username,
              },
            }),
          ]),
        }),
        data: { id: userId },
      })
    } catch (error) {
      assert.deepEqual(error.messages, {
        id: ['unique validation failure'],
      })
    }
  })

  test('add whereNot in contraints', async (assert) => {
    assert.plan(3)

    const [userId] = await db
      .table('users')
      .returning('id')
      .insert({ email: 'virk@adonisjs.com', username: 'virk', country_id: 4 })

    db.connection()
      .getReadClient()
      .on('query', ({ sql, bindings }) => {
        const { sql: knexSql, bindings: knexBindings } = db
          .connection()
          .getReadClient()
          .from('users')
          .where('id', userId)
          .whereNotIn('country_id', [1, 2])
          .limit(1)
          .toSQL()
          .toNative()

        assert.equal(sql, knexSql)
        assert.deepEqual(bindings, knexBindings)
      })

    try {
      await validator.validate({
        schema: schema.create({
          id: schema.number([
            rules.unique({
              table: 'users',
              column: 'id',
              whereNot: {
                country_id: [1, 2],
              },
            }),
          ]),
        }),
        data: { id: userId },
      })
    } catch (error) {
      assert.deepEqual(error.messages, {
        id: ['unique validation failure'],
      })
    }
  })

  test('add whereNot in contraints with refs', async (assert) => {
    assert.plan(3)

    const [userId] = await db
      .table('users')
      .returning('id')
      .insert({ email: 'virk@adonisjs.com', username: 'virk', country_id: 4 })

    db.connection()
      .getReadClient()
      .on('query', ({ sql, bindings }) => {
        const { sql: knexSql, bindings: knexBindings } = db
          .connection()
          .getReadClient()
          .from('users')
          .where('id', userId)
          .whereNotIn('country_id', [1, 2])
          .limit(1)
          .toSQL()
          .toNative()

        assert.equal(sql, knexSql)
        assert.deepEqual(bindings, knexBindings)
      })

    try {
      const refs = schema.refs({
        country: [1, 2],
      })

      await validator.validate({
        refs,
        schema: schema.create({
          id: schema.number([
            rules.unique({
              table: 'users',
              column: 'id',
              whereNot: {
                country_id: refs.country,
              },
            }),
          ]),
        }),
        data: { id: userId },
      })
    } catch (error) {
      assert.deepEqual(error.messages, {
        id: ['unique validation failure'],
      })
    }
  })

  test('perform case-insensitive check', async (assert) => {
    assert.plan(3)

    await db.table('users').returning('id').insert({ email: 'virk@adonisjs.com', username: 'virk' })
    db.connection()
      .getReadClient()
      .on('query', ({ sql, bindings }) => {
        const { sql: knexSql, bindings: knexBindings } = db
          .connection()
          .getReadClient()
          .from('users')
          .whereRaw(`lower(username) = ?`, [db.connection().knexRawQuery(`lower(?)`, ['VIRK'])])
          .limit(1)
          .toSQL()
          .toNative()

        assert.equal(sql, knexSql)
        assert.deepEqual(bindings, knexBindings)
      })

    try {
      await validator.validate({
        schema: schema.create({
          username: schema.string({}, [
            rules.unique({
              table: 'users',
              column: 'username',
              caseInsensitive: true,
            }),
          ]),
        }),
        data: { username: 'VIRK' },
      })
    } catch (error) {
      assert.deepEqual(error.messages, {
        username: ['unique validation failure'],
      })
    }
  })

  test('do not report SQL errors to the validator', async (assert) => {
    assert.plan(1)

    try {
      await validator.validate({
        schema: schema.create({
          username: schema.string({}, [
            rules.unique({
              table: 'invalid_users',
              column: 'username',
              caseInsensitive: true,
            }),
          ]),
        }),
        data: { username: 'VIRK' },
      })
    } catch (error) {
      assert.deepEqual(error.messages, {
        username: ['unique validation failure'],
      })
    }
  })

  test('make correct sql query schema field is of date type', async (assert) => {
    assert.plan(3)

    await db
      .table('users')
      .insert({ email: 'virk@adonisjs.com', username: 'virk', created_at: '2020-10-20 00:00:00' })

    let sql: any
    let bindings: any
    let knexSql: any
    let knexBindings: any

    db.connection()
      .getReadClient()
      .on('query', (query) => {
        sql = query.sql
        bindings = query.bindings

        const knexQuery = db
          .connection()
          .getReadClient()
          .from('users')
          .where('created_at', '2020-10-20 00:00:00')
          .limit(1)
          .toSQL()
          .toNative()

        knexSql = knexQuery.sql
        knexBindings = knexQuery.bindings
      })

    try {
      await validator.validate({
        schema: schema.create({
          id: schema.date({}, [
            rules.unique({
              table: 'users',
              column: 'created_at',
            }),
          ]),
        }),
        data: { id: '2020-10-20' },
      })
    } catch (error) {
      assert.deepEqual(error.messages, {
        id: ['unique validation failure'],
      })
    }

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('define custom format datetime values', async (assert) => {
    assert.plan(3)

    await db
      .table('users')
      .insert({ email: 'virk@adonisjs.com', username: 'virk', created_at: '2020-10-20' })

    let sql: any
    let bindings: any
    let knexSql: any
    let knexBindings: any

    db.connection()
      .getReadClient()
      .on('query', (query) => {
        sql = query.sql
        bindings = query.bindings

        const knexQuery = db
          .connection()
          .getReadClient()
          .from('users')
          .where('created_at', '2020-10-20')
          .limit(1)
          .toSQL()
          .toNative()

        knexSql = knexQuery.sql
        knexBindings = knexQuery.bindings
      })

    try {
      await validator.validate({
        schema: schema.create({
          id: schema.date({}, [
            rules.unique({
              table: 'users',
              dateFormat: 'yyyy-LL-dd',
              column: 'created_at',
            }),
          ]),
        }),
        data: { id: '2020-10-20' },
      })
    } catch (error) {
      assert.deepEqual(error.messages, {
        id: ['unique validation failure'],
      })
    }

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })
})
