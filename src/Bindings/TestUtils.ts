/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { TestUtilsContract } from '@ioc:Adonis/Core/TestUtils'

import type Ace from '@ioc:Adonis/Core/Ace'

import { TestsSeeder } from '../TestUtils/Seeder'
import { TestsMigrator } from '../TestUtils/Migration'
import { TestsTruncator } from '../TestUtils/Truncator'

/**
 * Define database testing utilities
 */
export function defineTestUtils(testUtils: TestUtilsContract, ace: typeof Ace) {
  testUtils.constructor.macro('db', (connectionName?: string) => {
    return {
      migrate() {
        return new TestsMigrator(ace, connectionName).run()
      },
      seed() {
        return new TestsSeeder(ace, connectionName).run()
      },
      truncate() {
        return new TestsTruncator(ace, connectionName).run()
      },
    }
  })
}
