/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { PluginFn } from '@japa/runner/types'
import { TestContext } from '@japa/runner/core'
import type { ApplicationService } from '@adonisjs/core/types'
import { DatabaseTestAssertions } from '../../test_utils/assertions.js'

declare module '@japa/runner/core' {
  interface TestContext {
    db: DatabaseTestAssertions
  }
}

/**
 * Japa plugin that adds database assertion methods
 * to the test context via `({ db }) => { ... }`.
 */
export function dbAssertions(app: ApplicationService): PluginFn {
  return function () {
    TestContext.getter('db', () => new DatabaseTestAssertions(app), true)
  }
}
