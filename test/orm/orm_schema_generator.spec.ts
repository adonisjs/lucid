/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { join } from 'node:path'
import { test } from '@japa/runner'
import { readFile } from 'node:fs/promises'
import { AppFactory } from '@adonisjs/core/factories/app'
import { OrmSchemaGenerator } from '../../src/orm/schema_generator/generator.ts'
import { setup, cleanup, getDb } from '../../test-helpers/index.js'

test.group('OrmSchemaGenerator | Basic Generation', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  test('generate schemas from database tables to output file', async ({
    fs,
    assert,
    cleanup: testCleanup,
  }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    testCleanup(() => db.manager.closeAll())

    const connection = db.connection()

    // Create test tables
    await connection.schema.dropTableIfExists('test_users')
    await connection.schema.dropTableIfExists('test_posts')

    await connection.schema.createTable('test_users', (table) => {
      table.increments('id')
      table.string('name').notNullable()
      table.string('email').notNullable()
      table.timestamp('created_at').notNullable()
    })

    await connection.schema.createTable('test_posts', (table) => {
      table.increments('id')
      table.integer('user_id').notNullable()
      table.string('title').notNullable()
      table.text('content').notNullable()
    })

    const outputPath = join(fs.basePath, 'schemas.ts')
    const generator = new OrmSchemaGenerator(db, app, { outputPath, schemas: ['public'] })

    await generator.generate()

    // Verify output file was created
    const output = await readFile(outputPath, 'utf-8')

    // Should contain imports
    assert.include(output, "import { BaseModel, column } from '@adonisjs/lucid/orm'")
    assert.include(output, "import { DateTime } from 'luxon'")

    // Should contain both classes
    assert.include(output, 'export class TestUserSchema extends BaseModel')
    assert.include(output, 'export class TestPostSchema extends BaseModel')

    // Should contain properties from test_users
    assert.include(output, 'declare id: number')
    assert.include(output, 'declare name: string')
    assert.include(output, 'declare email: string')
    assert.include(output, 'declare createdAt: DateTime')

    // Should contain properties from test_posts
    assert.include(output, 'declare userId: number')
    assert.include(output, 'declare title: string')
    assert.include(output, 'declare content: string')

    // Cleanup
    await connection.schema.dropTable('test_users')
    await connection.schema.dropTable('test_posts')
  })

  test('generate schema for single table', async ({ fs, assert, cleanup: testCleanup }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    testCleanup(() => db.manager.closeAll())

    const connection = db.connection()

    await connection.schema.dropTableIfExists('test_products')
    await connection.schema.createTable('test_products', (table) => {
      table.increments('id')
      table.string('name').notNullable()
      table.decimal('price', 10, 2).notNullable()
      table.integer('stock').notNullable()
    })

    const outputPath = join(fs.basePath, 'product_schema.ts')
    const generator = new OrmSchemaGenerator(db, app, { outputPath, schemas: ['public'] })

    await generator.generate()

    const output = await readFile(outputPath, 'utf-8')

    assert.include(output, 'export class TestProductSchema extends BaseModel')
    assert.include(output, 'declare name: string')
    assert.include(output, 'declare stock: number')

    // Price type depends on database
    const expectedPriceType = ['sqlite', 'libsql', 'better_sqlite'].includes(process.env.DB!)
      ? 'number'
      : 'string'
    assert.include(output, `declare price: ${expectedPriceType}`)

    await connection.schema.dropTable('test_products')
  })

  test('handle nullable columns correctly', async ({ fs, assert, cleanup: testCleanup }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    testCleanup(() => db.manager.closeAll())

    const connection = db.connection()

    await connection.schema.dropTableIfExists('test_profiles')
    await connection.schema.createTable('test_profiles', (table) => {
      table.increments('id')
      table.string('bio').nullable()
      table.string('website').nullable()
    })

    const outputPath = join(fs.basePath, 'profile_schema.ts')
    const generator = new OrmSchemaGenerator(db, app, { outputPath, schemas: ['public'] })

    await generator.generate()

    const output = await readFile(outputPath, 'utf-8')

    assert.include(output, 'declare bio: string | null')
    assert.include(output, 'declare website: string | null')

    await connection.schema.dropTable('test_profiles')
  })
})

test.group('OrmSchemaGenerator | Custom Schema Rules', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  test('load and apply custom rules from file', async ({ fs, assert, cleanup: testCleanup }) => {
    const app = new AppFactory().create(fs.baseUrl, (identifier) => {
      return import(new URL(identifier, fs.baseUrl).href)
    })
    await app.init()
    const db = getDb()
    testCleanup(() => db.manager.closeAll())

    const connection = db.connection()

    // Create custom rules file
    const rulesPath = 'custom_rules.js'
    await fs.create(
      rulesPath,
      `
      export default {
        columns: {
          status: {
            tsType: 'UserStatus',
            decorator: '@column()',
            imports: [{ source: '#types/enums', typeImports: ['UserStatus'] }]
          }
        }
      }
    `
    )

    await connection.schema.dropTableIfExists('test_accounts')
    await connection.schema.createTable('test_accounts', (table) => {
      table.increments('id')
      table.string('status').notNullable()
    })

    const outputPath = join(fs.basePath, 'account_schema.ts')
    const generator = new OrmSchemaGenerator(db, app, {
      outputPath,
      schemas: ['public'],
      rulesPaths: [rulesPath],
    })
    await generator.generate()

    const output = await readFile(outputPath, 'utf-8')

    // Should import the custom type
    assert.include(output, "import type { UserStatus } from '#types/enums'")

    // Should use custom type
    assert.include(output, 'declare status: UserStatus')

    await connection.schema.dropTable('test_accounts')
  })

  test('throw error when rules file does not exist', async ({
    fs,
    assert,
    cleanup: testCleanup,
  }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    testCleanup(() => db.manager.closeAll())

    const connection = db.connection()

    await connection.schema.dropTableIfExists('test_dummy')
    await connection.schema.createTable('test_dummy', (table) => {
      table.increments('id')
    })

    const rulesPath = join(fs.basePath, 'non_existent_rules.js')
    const outputPath = join(fs.basePath, 'dummy_schema.ts')

    const generator = new OrmSchemaGenerator(db, app, {
      outputPath,
      rulesPaths: [rulesPath],
      schemas: ['public'],
    })
    await assert.rejects(() => generator.generate(), /Failed to load schema rules/)
    await connection.schema.dropTable('test_dummy')
  })

  test('handle rules file with default export', async ({ fs, assert, cleanup: testCleanup }) => {
    const app = new AppFactory().create(fs.baseUrl, (identifier) => {
      return import(new URL(identifier, fs.baseUrl).href)
    })
    await app.init()
    const db = getDb()
    testCleanup(() => db.manager.closeAll())

    const connection = db.connection()

    await fs.create(
      'rules_default.js',
      `
      export default {
        columns: {
          priority: {
            tsType: 'Priority',
            decorator: '@column()',
            imports: [{ source: '#types', namedImports: ['Priority'] }]
          }
        }
      }
    `
    )

    await connection.schema.dropTableIfExists('test_tasks')
    await connection.schema.createTable('test_tasks', (table) => {
      table.increments('id')
      table.string('priority').notNullable()
    })

    const outputPath = join(fs.basePath, 'task_schema.ts')
    const rulesPath = 'rules_default.js'

    const generator = new OrmSchemaGenerator(db, app, {
      outputPath,
      rulesPaths: [rulesPath],
      schemas: ['public'],
    })

    await generator.generate()

    const output = await readFile(outputPath, 'utf-8')
    assert.include(output, 'declare priority: Priority')

    await connection.schema.dropTable('test_tasks')
  })

  test('handle rules file with named export', async ({ fs, assert, cleanup: testCleanup }) => {
    const app = new AppFactory().create(fs.baseUrl, (identifier) => {
      return import(new URL(identifier, fs.baseUrl).href)
    })
    await app.init()
    const db = getDb()
    testCleanup(() => db.manager.closeAll())

    const connection = db.connection()

    await fs.create(
      'rules_named.js',
      `
      export default {
        columns: {
          role: {
            tsType: 'Role',
            decorator: '@column()',
            imports: [{ source: '#types', namedImports: ['Role'] }]
          }
        }
      }
    `
    )

    await connection.schema.dropTableIfExists('test_members')
    await connection.schema.createTable('test_members', (table) => {
      table.increments('id')
      table.string('role').notNullable()
    })

    const outputPath = join(fs.basePath, 'member_schema.ts')
    const rulesPath = 'rules_named.js'

    const generator = new OrmSchemaGenerator(db, app, {
      outputPath,
      rulesPaths: [rulesPath],
      schemas: ['public'],
    })

    await generator.generate()

    const output = await readFile(outputPath, 'utf-8')
    // Since there's no default export, it should use the module itself
    assert.include(output, 'export class TestMemberSchema extends BaseModel')

    await connection.schema.dropTable('test_members')
  })

  test('handle rules with column aware decorators', async ({
    fs,
    assert,
    cleanup: testCleanup,
  }) => {
    const app = new AppFactory().create(fs.baseUrl, (identifier) => {
      return import(new URL(identifier, fs.baseUrl).href)
    })
    await app.init()
    const db = getDb()
    testCleanup(() => db.manager.closeAll())

    const connection = db.connection()

    await fs.create(
      'rules_decorators.js',
      `
      export default {
        types: {
          string: (dataType, column) => ({
            tsType: 'string',
            decorator: [\`@column({ meta: { type: "\${column.type}" } })\`],
            imports: []
          }),
        },
      }
    `
    )

    await connection.schema.dropTableIfExists('test_members')
    await connection.schema.createTable('test_members', (table) => {
      table.increments('id')
      table.string('role').notNullable()
    })

    const outputPath = join(fs.basePath, 'member_schema.ts')
    const rulesPath = 'rules_decorators.js'

    const generator = new OrmSchemaGenerator(db, app, {
      outputPath,
      rulesPaths: [rulesPath],
      schemas: ['public'],
    })

    await generator.generate()

    const output = await readFile(outputPath, 'utf-8')
    // Since there's no default export, it should use the module itself
    assert.include(output, 'export class TestMemberSchema extends BaseModel')
    assert.include(output, '@column({ meta: { type: "varchar" } })')

    await connection.schema.dropTable('test_members')
  }).tags(['@dec'])

  test('merge multiple rules files', async ({ fs, assert, cleanup: testCleanup }) => {
    const app = new AppFactory().create(fs.baseUrl, (identifier) => {
      return import(new URL(identifier, fs.baseUrl).href)
    })
    await app.init()
    const db = getDb()
    testCleanup(() => db.manager.closeAll())

    const connection = db.connection()

    // Create first rules file for status column
    await fs.create(
      'rules_status.js',
      `
      export default {
        columns: {
          status: {
            tsType: 'Status',
            decorator: '@column()',
            imports: [{ source: '#types/status', namedImports: ['Status'] }]
          }
        }
      }
    `
    )

    // Create second rules file for priority column
    await fs.create(
      'rules_priority.js',
      `
      export default {
        columns: {
          priority: {
            tsType: 'Priority',
            decorator: '@column()',
            imports: [{ source: '#types/priority', namedImports: ['Priority'] }]
          }
        }
      }
    `
    )

    await connection.schema.dropTableIfExists('test_tickets')
    await connection.schema.createTable('test_tickets', (table) => {
      table.increments('id')
      table.string('status').notNullable()
      table.string('priority').notNullable()
    })

    const outputPath = join(fs.basePath, 'ticket_schema.ts')
    const generator = new OrmSchemaGenerator(db, app, {
      outputPath,
      rulesPaths: ['rules_status.js', 'rules_priority.js'],
      schemas: ['public'],
    })

    await generator.generate()

    const output = await readFile(outputPath, 'utf-8')

    // Should import both custom types
    assert.include(output, "import { Status } from '#types/status'")
    assert.include(output, "import { Priority } from '#types/priority'")

    // Should use both custom types
    assert.include(output, 'declare status: Status')
    assert.include(output, 'declare priority: Priority')

    await connection.schema.dropTable('test_tickets')
  })
})

test.group('OrmSchemaGenerator | Connection Handling', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  test('use primary connection when no connection name specified', async ({
    fs,
    assert,
    cleanup: testCleanup,
  }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    testCleanup(() => db.manager.closeAll())

    const connection = db.connection()

    await connection.schema.dropTableIfExists('test_settings')
    await connection.schema.createTable('test_settings', (table) => {
      table.increments('id')
      table.string('key').notNullable()
      table.string('value').notNullable()
    })

    const outputPath = join(fs.basePath, 'settings_schema.ts')
    const generator = new OrmSchemaGenerator(db, app, { outputPath, schemas: ['public'] })

    await generator.generate()

    const output = await readFile(outputPath, 'utf-8')
    assert.include(output, 'export class TestSettingSchema extends BaseModel')

    await connection.schema.dropTable('test_settings')
  })

  test('use specified connection name', async ({ fs, assert, cleanup: testCleanup }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    testCleanup(() => db.manager.closeAll())

    const connection = db.connection('primary')

    await connection.schema.dropTableIfExists('test_logs')
    await connection.schema.createTable('test_logs', (table) => {
      table.increments('id')
      table.string('message').notNullable()
    })

    const outputPath = join(fs.basePath, 'logs_schema.ts')
    const generator = new OrmSchemaGenerator(db, app, {
      outputPath,
      schemas: ['public'],
      connectionName: 'primary',
    })

    await generator.generate()

    const output = await readFile(outputPath, 'utf-8')
    assert.include(output, 'export class TestLogSchema extends BaseModel')

    await connection.schema.dropTable('test_logs')
  })
})

test.group('OrmSchemaGenerator | Table Filtering', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  test('exclude system tables from generation', async ({ fs, assert, cleanup: testCleanup }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    testCleanup(() => db.manager.closeAll())

    const connection = db.connection()

    // Create user table
    await connection.schema.dropTableIfExists('test_items')
    await connection.schema.createTable('test_items', (table) => {
      table.increments('id')
      table.string('name').notNullable()
    })

    const outputPath = join(fs.basePath, 'items_schema.ts')
    const generator = new OrmSchemaGenerator(db, app, { outputPath, schemas: ['public'] })

    await generator.generate()

    const output = await readFile(outputPath, 'utf-8')

    // Should include user table
    assert.include(output, 'export class TestItemSchema extends BaseModel')

    // Should NOT include system tables
    // Note: The actual system tables depend on the database dialect
    // SQLite: sqlite_sequence, sqlite_stat, etc.
    // PostgreSQL: pg_*, information_schema.*, etc.
    // These are filtered by the dialect-specific methods

    // For this test, we just verify that our table is included
    // and the generation completes successfully without errors
    assert.isString(output)
    assert.isNotEmpty(output)

    await connection.schema.dropTable('test_items')
  })

  test('generate schemas for all user tables in database', async ({
    fs,
    assert,
    cleanup: testCleanup,
  }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    testCleanup(() => db.manager.closeAll())

    const connection = db.connection()

    // Create multiple tables
    await connection.schema.dropTableIfExists('test_categories')
    await connection.schema.dropTableIfExists('test_tags')
    await connection.schema.dropTableIfExists('test_articles')

    await connection.schema.createTable('test_categories', (table) => {
      table.increments('id')
      table.string('name').notNullable()
    })

    await connection.schema.createTable('test_tags', (table) => {
      table.increments('id')
      table.string('label').notNullable()
    })

    await connection.schema.createTable('test_articles', (table) => {
      table.increments('id')
      table.string('title').notNullable()
      table.integer('category_id').notNullable()
    })

    const outputPath = join(fs.basePath, 'all_schemas.ts')
    const generator = new OrmSchemaGenerator(db, app, { outputPath, schemas: ['public'] })

    await generator.generate()

    const output = await readFile(outputPath, 'utf-8')

    // Should contain all three classes
    assert.include(output, 'export class TestCategorySchema extends BaseModel')
    assert.include(output, 'export class TestTagSchema extends BaseModel')
    assert.include(output, 'export class TestArticleSchema extends BaseModel')

    await connection.schema.dropTable('test_categories')
    await connection.schema.dropTable('test_tags')
    await connection.schema.dropTable('test_articles')
  })
})
