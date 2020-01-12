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

test.group('Utils | syncDiff', () => {
  test('return ids to be added', (assert) => {
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
      removed: {},
    })
  })

  test('return ids to be updated when attributes are different', (assert) => {
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
      removed: {},
    })
  })

  test('ignore rows whose attributes are same', (assert) => {
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
      removed: {},
    })
  })

  test('return rows to be removed', (assert) => {
    const dbRows = {
      1: {
        id: '1',
        user_id: '1',
        skill_id: '1',
        score: 1,
      },
      2: {
        id: '2',
        user_id: '1',
        skill_id: '2',
        score: 1,
      },
    }

    const idsToSync = {
      1: {
        score: 1,
      },
      3: {
        score: 4,
      },
    }

    const diff = syncDiff(dbRows, idsToSync)
    assert.deepEqual(diff, {
      added: {
        3: { score: 4 },
      },
      updated: {
      },
      removed: { 2: {} },
    })
  })
})
