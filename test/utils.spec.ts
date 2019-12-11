/*
* @adonisjs/lucid
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

/// <reference path="../adonis-typings/index.ts" />

import test from 'japa'
import { syncDiff } from '../src/utils'

test.group('Utils | attachDiff', () => {
  test('return ids to be inserted', (assert) => {
    const dbRows = [{
      id: '1',
      user_id: '1',
      skill_id: '1',
      score: 1,
    }]

    const idsToSync = ['1', '2', '3']

    const diff = syncDiff(dbRows, idsToSync, (rows, id) => rows.find(({ skill_id }) => skill_id === id))
    assert.deepEqual(diff, { insert: ['2', '3'], update: [] })
  })

  test('return ids when ids to sync are represented as an object', (assert) => {
    const dbRows = [{
      id: '1',
      user_id: '1',
      skill_id: '1',
      score: 1,
    }]

    const idsToSync = {
      '1': {},
      '2': {},
      '3': {},
    }

    const diff = syncDiff(dbRows, idsToSync, (rows, id) => rows.find(({ skill_id }) => skill_id === id))
    assert.deepEqual(diff, { insert: ['2', '3'], update: [] })
  })

  test('return ids to be updated when attributes are different', (assert) => {
    const dbRows = [{
      id: '1',
      user_id: '1',
      skill_id: '1',
      score: 1,
    }]

    const idsToSync = {
      '1': {
        score: 4,
      },
      '2': {
        score: 2,
      },
      '3': {
        score: 1,
      },
    }

    const diff = syncDiff(dbRows, idsToSync, (rows, id) => rows.find(({ skill_id }) => skill_id === id))
    assert.deepEqual(diff, { insert: ['2', '3'], update: ['1'] })
  })

  test('ignore rows whose attributes value is same', (assert) => {
    const dbRows = [{
      id: '1',
      user_id: '1',
      skill_id: '1',
      score: 1,
    }]

    const idsToSync = {
      '1': {
        score: 1,
      },
      '2': {
        score: 2,
      },
      '3': {
        score: 1,
      },
    }

    const diff = syncDiff(dbRows, idsToSync, (rows, id) => rows.find(({ skill_id }) => skill_id === id))
    assert.deepEqual(diff, { insert: ['2', '3'], update: [] })
  })
})
