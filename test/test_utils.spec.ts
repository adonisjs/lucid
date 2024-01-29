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
import { AppFactory } from '@adonisjs/core/factories/app'
import { ApplicationService } from '@adonisjs/core/types'
import { DatabaseTestUtils } from '../src/test_utils/database.js'

test.group('Database Test Utils', () => {
  test('truncate() should run migration:run and db:truncate commands', async ({ fs, assert }) => {
    let migrationRun = false
    let truncateRun = false

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

    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    ace.addLoader(new ListLoader([FakeMigrate, FakeDbTruncate]))

    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()

    app.container.bind('lucid.db', () => getDb())
    app.container.bind('ace', () => ace)

    const dbTestUtils = new DatabaseTestUtils(app as ApplicationService)
    const truncate = await dbTestUtils.truncate()

    await truncate()

    assert.isTrue(migrationRun)
    assert.isTrue(truncateRun)
  })

  test('truncate() with custom connectionName', async ({ fs, assert }) => {
    assert.plan(2)

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

    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    ace.addLoader(new ListLoader([FakeMigrate, FakeDbTruncate]))

    const app = new AppFactory().create(fs.baseUrl, () => {}) as ApplicationService
    await app.init()

    app.container.bind('lucid.db', () => getDb())
    app.container.bind('ace', () => ace)

    const dbTestUtils = new DatabaseTestUtils(app, 'secondary')
    const truncate = await dbTestUtils.truncate()

    await truncate()
  })

  test('seed() should run db:seed command', async ({ fs, assert }) => {
    assert.plan(1)

    class FakeDbSeed extends DbSeed {
      override async run() {
        assert.isTrue(true)
      }
    }

    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    ace.addLoader(new ListLoader([FakeDbSeed]))

    const app = new AppFactory().create(fs.baseUrl, () => {}) as ApplicationService
    await app.init()

    app.container.bind('lucid.db', () => getDb())
    app.container.bind('ace', () => ace)

    const dbTestUtils = new DatabaseTestUtils(app)
    await dbTestUtils.seed()
  })

  test('seed() with custom connectionName', async ({ fs, assert }) => {
    assert.plan(1)

    class FakeDbSeed extends DbSeed {
      override async run() {
        assert.equal(this.connection, 'secondary')
      }
    }

    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    ace.addLoader(new ListLoader([FakeDbSeed]))

    const app = new AppFactory().create(fs.baseUrl, () => {}) as ApplicationService
    await app.init()

    app.container.bind('lucid.db', () => getDb())
    app.container.bind('ace', () => ace)

    const dbTestUtils = new DatabaseTestUtils(app, 'secondary')
    await dbTestUtils.seed()
  })

  test('migrate() should run migration:run and migration:rollback commands', async ({
    fs,
    assert,
  }) => {
    let migrationRun = false
    let rollbackRun = false

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

    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    ace.addLoader(new ListLoader([FakeMigrate, FakeMigrationRollback]))

    const app = new AppFactory().create(fs.baseUrl, () => {}) as ApplicationService
    await app.init()

    app.container.bind('lucid.db', () => getDb())
    app.container.bind('ace', () => ace)

    const dbTestUtils = new DatabaseTestUtils(app)
    const rollback = await dbTestUtils.migrate()

    await rollback()

    assert.isTrue(migrationRun)
    assert.isTrue(rollbackRun)
  })

  test('migrate() with custom connectionName', async ({ fs, assert }) => {
    assert.plan(2)

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

    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    ace.addLoader(new ListLoader([FakeMigrate, FakeMigrationRollback]))

    const app = new AppFactory().create(fs.baseUrl, () => {}) as ApplicationService
    await app.init()

    app.container.bind('lucid.db', () => getDb())
    app.container.bind('ace', () => ace)

    const dbTestUtils = new DatabaseTestUtils(app, 'secondary')
    const rollback = await dbTestUtils.migrate()

    await rollback()
  })

  test('should throw error when command has an exitCode = 1', async ({ fs }) => {
    class FakeMigrate extends Migrate {
      override async run() {
        this.exitCode = 1
      }
    }

    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    ace.addLoader(new ListLoader([FakeMigrate]))

    const app = new AppFactory().create(fs.baseUrl, () => {}) as ApplicationService
    await app.init()

    app.container.bind('lucid.db', () => getDb())
    app.container.bind('ace', () => ace)

    const dbTestUtils = new DatabaseTestUtils(app)
    await dbTestUtils.migrate()
  }).throws('"migration:run" failed')

  test('should re-use command.error message if available', async ({ fs }) => {
    class FakeMigrate extends Migrate {
      override async run() {
        this.exitCode = 1
        this.error = new Error('Custom error message')
      }
    }

    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    ace.addLoader(new ListLoader([FakeMigrate]))

    const app = new AppFactory().create(fs.baseUrl, () => {}) as ApplicationService
    await app.init()

    app.container.bind('lucid.db', () => getDb())
    app.container.bind('ace', () => ace)

    const dbTestUtils = new DatabaseTestUtils(app)
    await dbTestUtils.migrate()
  }).throws('Custom error message')

  test('withGlobalTransaction should wrap and rollback a transaction', async ({ fs, assert }) => {
    const db = getDb()
    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })

    const app = new AppFactory().create(fs.baseUrl, () => {}) as ApplicationService
    await app.init()

    app.container.bind('lucid.db', () => db)
    app.container.bind('ace', () => ace)

    const dbTestUtils = new DatabaseTestUtils(app)
    const rollback = await dbTestUtils.withGlobalTransaction()

    assert.isDefined(db.connectionGlobalTransactions.get(db.primaryConnectionName))

    await rollback()

    assert.isUndefined(db.connectionGlobalTransactions.get(db.primaryConnectionName))
  })
})
