/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { parseMigrationIntent, syncDiff } from '../src/utils/index.js'

test.group('Utils | syncDiff', () => {
  test('return ids to be added', ({ assert }) => {
    const dbRows = {
      1: {
        id: '1',
        user_id: '1',
        skill_id: '1',
        score: 1,
      },
    }

    const idsToSync = {
      1: {},
      2: {},
      3: {},
    }

    const diff = syncDiff(dbRows, idsToSync)
    assert.deepEqual(diff, {
      added: { 2: {}, 3: {} },
      updated: {},
    })
  })

  test('return ids to be updated when attributes are different', ({ assert }) => {
    const dbRows = {
      1: {
        id: '1',
        user_id: '1',
        skill_id: '1',
        score: 1,
      },
    }

    const idsToSync = {
      1: {
        score: 4,
      },
      2: {},
      3: {},
    }

    const diff = syncDiff(dbRows, idsToSync)
    assert.deepEqual(diff, {
      added: { 2: {}, 3: {} },
      updated: {
        1: { score: 4 },
      },
    })
  })

  test('ignore rows whose attributes are same', ({ assert }) => {
    const dbRows = {
      1: {
        id: '1',
        user_id: '1',
        skill_id: '1',
        score: 1,
      },
    }

    const idsToSync = {
      1: {
        score: 1,
      },
      2: {
        score: 4,
      },
      3: {
        score: 4,
      },
    }

    const diff = syncDiff(dbRows, idsToSync)
    assert.deepEqual(diff, {
      added: {
        2: { score: 4 },
        3: { score: 4 },
      },
      updated: {},
    })
  })
})

test.group('Utils | parseMigrationIntent', () => {
  test('parse migration name intent: {input}')
    .with([
      { input: 'create_users_table', output: { tableName: 'users', create: true, alter: false } },
      { input: 'create_users', output: { tableName: 'users', create: true, alter: false } },
      { input: 'users', output: null },
      { input: 'user', output: null },
      { input: 'add_email_to_users', output: { tableName: 'users', create: false, alter: true } },
      {
        input: 'add_email_to_users_table',
        output: { tableName: 'users', create: false, alter: true },
      },
      {
        input: 'add_email_in_users_table',
        output: { tableName: 'users', create: false, alter: true },
      },
      {
        input: 'remove_email_from_users_table',
        output: { tableName: 'users', create: false, alter: true },
      },
      {
        input: 'remove_email_from_users',
        output: { tableName: 'users', create: false, alter: true },
      },
      {
        input: 'alter_users_add_email_column',
        output: { tableName: 'users', create: false, alter: true },
      },
      { input: 'alter_users', output: { tableName: 'users', create: false, alter: true } },
      { input: 'alter_users_table', output: { tableName: 'users', create: false, alter: true } },
      {
        input: 'alter_users_add_email_column',
        output: { tableName: 'users', create: false, alter: true },
      },
    ])
    .run(({ assert }, { input, output }) => {
      assert.deepEqual(parseMigrationIntent(input), output)
    })
})
