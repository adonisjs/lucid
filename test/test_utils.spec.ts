/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { ListLoader } from '@adonisjs/core/ace'
import { AceFactory } from '@adonisjs/core/factories'

import DbSeed from '../commands/db_seed.js'
import { getDb } from '../test-helpers/index.js'
import Migrate from '../commands/migration/run.js'
import DbTruncate from '../commands/db_truncate.js'
import Rollback from '../commands/migration/rollback.js'
import { DatabaseTestUtils } from '../src/test_utils/database.js'

test.group('Database Test Utils', () => {
  test('truncate() should run migration:run and db:truncate commands', async ({ fs, assert }) => {
    let migrationRun = false
    let truncateRun = false

    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })

    class FakeMigrate extends Migrate {
      override async run() {
        migrationRun = true
      }
    }

    class FakeDbTruncate extends DbTruncate {
      override async run() {
        truncateRun = true
      }
    }

    ace.addLoader(new ListLoader([FakeMigrate, FakeDbTruncate]))

    const dbTestUtils = new DatabaseTestUtils(ace, getDb())
    const truncate = await dbTestUtils.truncate()

    await truncate()

    assert.isTrue(migrationRun)
    assert.isTrue(truncateRun)
  })

  test('truncate() with custom connectionName', async ({ fs, assert }) => {
    assert.plan(2)

    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })

    class FakeMigrate extends Migrate {
      override async run() {
        assert.equal(this.connection, 'secondary')
      }
    }

    class FakeDbTruncate extends DbTruncate {
      override async run() {
        assert.equal(this.connection, 'secondary')
      }
    }

    ace.addLoader(new ListLoader([FakeMigrate, FakeDbTruncate]))

    const dbTestUtils = new DatabaseTestUtils(ace, getDb(), 'secondary')
    const truncate = await dbTestUtils.truncate()

    await truncate()
  })

  test('seed() should run db:seed command', async ({ fs, assert }) => {
    assert.plan(1)

    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })

    class FakeDbSeed extends DbSeed {
      override async run() {
        assert.isTrue(true)
      }
    }

    ace.addLoader(new ListLoader([FakeDbSeed]))

    const dbTestUtils = new DatabaseTestUtils(ace, getDb())
    await dbTestUtils.seed()
  })

  test('seed() with custom connectionName', async ({ fs, assert }) => {
    assert.plan(1)

    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })

    class FakeDbSeed extends DbSeed {
      override async run() {
        assert.equal(this.connection, 'secondary')
      }
    }

    ace.addLoader(new ListLoader([FakeDbSeed]))

    const dbTestUtils = new DatabaseTestUtils(ace, getDb(), 'secondary')
    await dbTestUtils.seed()
  })

  test('migrate() should run migration:run and migration:rollback commands', async ({
    fs,
    assert,
  }) => {
    let migrationRun = false
    let rollbackRun = false

    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })

    class FakeMigrate extends Migrate {
      override async run() {
        migrationRun = true
      }
    }

    class FakeMigrationRollback extends Rollback {
      override async run() {
        rollbackRun = true
      }
    }

    ace.addLoader(new ListLoader([FakeMigrate, FakeMigrationRollback]))

    const dbTestUtils = new DatabaseTestUtils(ace, getDb())
    const rollback = await dbTestUtils.migrate()

    await rollback()

    assert.isTrue(migrationRun)
    assert.isTrue(rollbackRun)
  })

  test('migrate() with custom connectionName', async ({ fs, assert }) => {
    assert.plan(2)

    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })

    class FakeMigrate extends Migrate {
      override async run() {
        assert.equal(this.connection, 'secondary')
      }
    }

    class FakeMigrationRollback extends Rollback {
      override async run() {
        assert.equal(this.connection, 'secondary')
      }
    }

    ace.addLoader(new ListLoader([FakeMigrate, FakeMigrationRollback]))

    const dbTestUtils = new DatabaseTestUtils(ace, getDb(), 'secondary')
    const rollback = await dbTestUtils.migrate()

    await rollback()
  })

  test('should throw error when command has an exitCode = 1', async ({ fs }) => {
    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })

    class FakeMigrate extends Migrate {
      override async run() {
        this.exitCode = 1
      }
    }

    ace.addLoader(new ListLoader([FakeMigrate]))

    const dbTestUtils = new DatabaseTestUtils(ace, getDb())
    await dbTestUtils.migrate()
  }).throws('"migration:run" failed')

  test('should re-use command.error message if available', async ({ fs }) => {
    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })

    class FakeMigrate extends Migrate {
      override async run() {
        this.exitCode = 1
        this.error = new Error('Custom error message')
      }
    }

    ace.addLoader(new ListLoader([FakeMigrate]))

    const dbTestUtils = new DatabaseTestUtils(ace, getDb())
    await dbTestUtils.migrate()
  }).throws('Custom error message')

  test('withGlobalTransaction should wrap and rollback a transaction', async ({ fs, assert }) => {
    const db = getDb()
    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    const dbTestUtils = new DatabaseTestUtils(ace, db)
    const rollback = await dbTestUtils.withGlobalTransaction()

    assert.isDefined(db.connectionGlobalTransactions.get(db.primaryConnectionName))

    await rollback()

    assert.isUndefined(db.connectionGlobalTransactions.get(db.primaryConnectionName))
  })
})
