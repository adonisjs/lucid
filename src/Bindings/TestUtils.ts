/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { DatabaseContract } from '@ioc:Adonis/Lucid/Database'
import type { TestUtilsContract } from '@ioc:Adonis/Core/TestUtils'
import type { ApplicationContract } from '@ioc:Adonis/Core/Application'

import { TestsMigrator } from '../TestUtils/Migration'
import { TestsSeeder } from '../TestUtils/Seeder'

/**
 * Define database testing utilities
 */
export function defineTestUtils(
  testUtils: TestUtilsContract,
  db: DatabaseContract,
  application: ApplicationContract
) {
  testUtils.constructor.getter('db', () => {
    return {
      migrate(connectionName?: string) {
        return () =>
          new TestsMigrator(db, connectionName || db.primaryConnectionName, application).run()
      },
      seed(connectionName?: string) {
        return () =>
          new TestsSeeder(db, connectionName || db.primaryConnectionName, application).seed()
      },
    }
  })
}
