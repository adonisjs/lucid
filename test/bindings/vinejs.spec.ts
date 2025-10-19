/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import vine from '@vinejs/vine'
import { test } from '@japa/runner'
import { Database } from '../../src/database/main.js'
import { defineValidationRules } from '../../src/bindings/vinejs.js'
import { getConfig, setup, cleanup, logger, createEmitter } from '../../test-helpers/index.js'

let db: Database
const dialectPerformsCaseSensitiveSearch = ['mysql', 'mysql_legacy', 'mssql'].includes(
  process.env.DB!
)

test.group('VineJS | unique', (group) => {
  group.setup(async () => {
    const config = {
      connection: 'primary',
      connections: { primary: getConfig() },
    }

    db = new Database(config, logger, createEmitter())
    defineValidationRules(db)
  })

  group.teardown(async () => {
    await db.manager.closeAll()
  })

  group.each.setup(async () => {
    await setup()
    return () => cleanup()
  })

  test('fail when value is already in use', async ({ assert }) => {
    assert.plan(1)

    await db.table('users').insert({
      email: 'foo@bar.com',
    })

    const validator = vine.compile(
      vine.object({
        email: vine.string().unique({
          table: 'users',
        }),
      })
    )

    try {
      await validator.validate({
        email: 'foo@bar.com',
      })
    } catch (error) {
      assert.deepEqual(error.messages, [
        {
          field: 'email',
          message: 'The email has already been taken',
          rule: 'database.unique',
        },
      ])
    }
  })

  test('perform case-insensitive search', async ({ assert }) => {
    assert.plan(1)

    await db.table('users').insert({
      username: 'FOO',
      email: 'foo@BAR.com',
    })

    const validator = vine.compile(
      vine.object({
        username: vine.string().unique({
          table: 'users',
        }),
        email: vine.string().unique({
          table: 'users',
          caseInsensitive: true,
        }),
      })
    )

    try {
      await validator.validate({
        /**
         * Username validation will pass because of case
         * mismatch
         */
        username: 'foo',
        /**
         * Email validation will fail regardless of the
         * case mismatch
         */
        email: 'foo@bar.com',
      })
    } catch (error) {
      if (dialectPerformsCaseSensitiveSearch) {
        assert.deepEqual(error.messages, [
          {
            field: 'username',
            message: 'The username has already been taken',
            rule: 'database.unique',
          },
          {
            field: 'email',
            message: 'The email has already been taken',
            rule: 'database.unique',
          },
        ])
      } else {
        assert.deepEqual(error.messages, [
          {
            field: 'email',
            message: 'The email has already been taken',
            rule: 'database.unique',
          },
        ])
      }
    }
  })

  test('perform case-insensitive search (all fields)', async ({ assert }) => {
    assert.plan(1)

    await db.table('users').insert({
      username: 'FOO',
      email: 'foo@BAR.com',
    })

    const validator = vine.compile(
      vine.object({
        username: vine.string().unique({
          table: 'users',
          column: 'username',
          caseInsensitive: true,
        }),
        email: vine.string().unique({
          table: 'users',
          column: 'email',
          caseInsensitive: true,
        }),
      })
    )

    try {
      await validator.validate({
        /**
         * Username validation will fail regardless of the
         * case mismatch
         */
        username: 'foo',
        /**
         * Email validation will fail regardless of the
         * case mismatch
         */
        email: 'foo@bar.com',
      })
    } catch (error) {
      assert.deepEqual(error.messages, [
        {
          field: 'username',
          message: 'The username has already been taken',
          rule: 'database.unique',
        },
        {
          field: 'email',
          message: 'The email has already been taken',
          rule: 'database.unique',
        },
      ])
    }
  })

  test('apply additional filters', async ({ assert }) => {
    assert.plan(1)

    await db.table('users').insert({
      email: 'foo@bar.com',
    })

    const validator = vine.compile(
      vine.object({
        email: vine.string().unique({
          table: 'users',
          column: 'email',
          filter(query) {
            query.whereNotNull('country_id')
          },
        }),
      })
    )

    assert.deepEqual(
      await validator.validate({
        email: 'foo@bar.com',
      }),
      {
        email: 'foo@bar.com',
      }
    )
  })

  test('fail when callback returns false', async ({ assert }) => {
    assert.plan(1)

    await db.table('users').insert({
      email: 'foo@bar.com',
    })

    const validator = vine.compile(
      vine.object({
        email: vine.string().unique(async ($db, value) => {
          const row = await $db.from('users').where('email', value).first()
          return row ? false : true
        }),
      })
    )

    try {
      await validator.validate({
        email: 'foo@bar.com',
      })
    } catch (error) {
      assert.deepEqual(error.messages, [
        {
          field: 'email',
          message: 'The email has already been taken',
          rule: 'database.unique',
        },
      ])
    }
  })

  test('pass when callback returns true', async ({ assert }) => {
    assert.plan(1)

    await db.table('users').insert({
      email: 'foo@bar.com',
    })

    const validator = vine.compile(
      vine.object({
        email: vine.string().unique(async ($db, value) => {
          const row = await $db
            .from('users')
            .where('email', value)
            .whereNotNull('country_id')
            .first()
          return row ? false : true
        }),
      })
    )

    assert.deepEqual(
      await validator.validate({
        email: 'foo@bar.com',
      }),
      {
        email: 'foo@bar.com',
      }
    )
  })
})

test.group('VineJS | exists', (group) => {
  group.setup(async () => {
    const config = {
      connection: 'primary',
      connections: { primary: getConfig() },
    }

    db = new Database(config, logger, createEmitter())
    defineValidationRules(db)
  })

  group.teardown(async () => {
    await db.manager.closeAll()
  })

  group.each.setup(async () => {
    await setup()
    return () => cleanup()
  })

  test('fail when value does not exists', async ({ assert }) => {
    assert.plan(1)

    const validator = vine.compile(
      vine.object({
        email: vine.string().exists({
          table: 'users',
          column: 'email',
        }),
      })
    )

    try {
      await validator.validate({
        email: 'foo@bar.com',
      })
    } catch (error) {
      assert.deepEqual(error.messages, [
        {
          field: 'email',
          message: 'The selected email is invalid',
          rule: 'database.exists',
        },
      ])
    }
  })

  test('perform case-insensitive search', async ({ assert }) => {
    assert.plan(1)

    await db.table('users').insert({
      username: 'FOO',
      email: 'foo@BAR.com',
    })

    const validator = vine.compile(
      vine.object({
        username: vine.string().exists({
          table: 'users',
          column: 'username',
        }),
        email: vine.string().exists({
          table: 'users',
          column: 'email',
          caseInsensitive: true,
        }),
      })
    )

    if (dialectPerformsCaseSensitiveSearch) {
      assert.deepEqual(
        await validator.validate({
          username: 'foo',
          email: 'foo@bar.com',
        }),
        {
          username: 'foo',
          email: 'foo@bar.com',
        }
      )
    } else {
      try {
        await validator.validate({
          /**
           * Username validation will fail because of case
           * mismatch
           */
          username: 'foo',
          /**
           * Email validation will pass regardless of the
           * case mismatch
           */
          email: 'foo@bar.com',
        })
      } catch (error) {
        assert.deepEqual(error.messages, [
          {
            field: 'username',
            message: 'The selected username is invalid',
            rule: 'database.exists',
          },
        ])
      }
    }
  })

  test('apply additional filters', async ({ assert }) => {
    assert.plan(1)

    await db.table('users').insert({
      email: 'foo@bar.com',
    })

    const validator = vine.compile(
      vine.object({
        email: vine.string().exists({
          table: 'users',
          column: 'email',
          filter(query) {
            query.whereNull('country_id')
          },
        }),
      })
    )

    assert.deepEqual(
      await validator.validate({
        email: 'foo@bar.com',
      }),
      {
        email: 'foo@bar.com',
      }
    )
  })

  test('fail when callback returns false', async ({ assert }) => {
    assert.plan(1)

    const validator = vine.compile(
      vine.object({
        email: vine.string().exists(async ($db, value) => {
          const row = await $db.from('users').where('email', value).first()
          return !!row
        }),
      })
    )

    try {
      await validator.validate({
        email: 'foo@bar.com',
      })
    } catch (error) {
      assert.deepEqual(error.messages, [
        {
          field: 'email',
          message: 'The selected email is invalid',
          rule: 'database.exists',
        },
      ])
    }
  })

  test('pass when callback returns true', async ({ assert }) => {
    assert.plan(1)

    await db.table('users').insert({
      email: 'foo@bar.com',
    })

    const validator = vine.compile(
      vine.object({
        email: vine.string().exists(async ($db, value) => {
          const row = await $db.from('users').where('email', value).first()
          return !!row
        }),
      })
    )

    assert.deepEqual(
      await validator.validate({
        email: 'foo@bar.com',
      }),
      {
        email: 'foo@bar.com',
      }
    )
  })
})
