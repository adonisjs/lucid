/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { OrmSchemaBuilder } from '../../src/orm/schema_generator/builder.ts'
import { setup, cleanup, getDb, resetTables } from '../../test-helpers/index.ts'

test.group('OrmSchemaBuilder | Basic Type Mapping', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('generate schema for table with basic types', async ({ assert }) => {
    const db = getDb()
    const connection = db.connection()
    const generator = new OrmSchemaBuilder(connection)

    await connection.schema.dropTableIfExists('test_basic_types')

    await connection.schema.createTable('test_basic_types', (table) => {
      table.increments('id')
      table.string('name').notNullable()
      table.integer('age').notNullable()
      table.boolean('is_active').notNullable()
      table.text('bio').notNullable()
    })

    const columns = await connection.knexQuery().from('test_basic_types').columnInfo()
    const primaryKeys = await connection.getPrimaryKeys('test_basic_types')
    const schemas = generator.generateSchemas([{ name: 'test_basic_types', columns, primaryKeys }])
    const output = schemas.classes.join('\n')

    assert.snapshot(output).matchInline(`
      "export class TestBasicTypeSchema extends BaseModel {
        static $columns = ['age', 'bio', 'id', 'isActive', 'name'] as const
        $columns = TestBasicTypeSchema.$columns
        @column()
        declare age: number
        @column()
        declare bio: string
        @column({ isPrimary: true })
        declare id: number
        @column()
        declare isActive: boolean
        @column()
        declare name: string
      }"
    `)

    await connection.schema.dropTable('test_basic_types')
  })

  test('handle various numeric types', async ({ assert }) => {
    const db = getDb()
    const connection = db.connection()
    const generator = new OrmSchemaBuilder(connection)

    await connection.schema.dropTableIfExists('test_numbers')

    await connection.schema.createTable('test_numbers', (table) => {
      table.increments('id')
      table.integer('small_num').notNullable()
      table.bigInteger('big_num').notNullable()
      table.decimal('decimal_num', 10, 2).notNullable()
    })

    const columns = await connection.knexQuery().from('test_numbers').columnInfo()
    const primaryKeys = await connection.getPrimaryKeys('test_numbers')
    const schemas = generator.generateSchemas([{ name: 'test_numbers', columns, primaryKeys }])
    const output = schemas.classes.join('\n')
    const expectedDecilamNumType = ['sqlite', 'libsql', 'better_sqlite'].includes(process.env.DB!)
      ? 'number'
      : 'string'

    assert.snapshot(output).matchInline(`
      "export class TestNumberSchema extends BaseModel {
        static $columns = ['bigNum', 'decimalNum', 'id', 'smallNum'] as const
        $columns = TestNumberSchema.$columns
        @column()
        declare bigNum: bigint | number
        @column()
        declare decimalNum: ${expectedDecilamNumType}
        @column({ isPrimary: true })
        declare id: number
        @column()
        declare smallNum: number
      }"
    `)

    await connection.schema.dropTable('test_numbers')
  })

  test('handle date and datetime types', async ({ assert }) => {
    const db = getDb()
    const connection = db.connection()
    const generator = new OrmSchemaBuilder(connection)

    await connection.schema.dropTableIfExists('test_dates')

    await connection.schema.createTable('test_dates', (table) => {
      table.increments('id')
      table.date('birth_date').notNullable()
      table.timestamp('created_at').notNullable()
    })

    const columns = await connection.knexQuery().from('test_dates').columnInfo()
    const primaryKeys = await connection.getPrimaryKeys('test_dates')
    const schemas = generator.generateSchemas([{ name: 'test_dates', columns, primaryKeys }])
    const output = schemas.classes.join('\n')

    assert.snapshot(output).matchInline(`
      "export class TestDateSchema extends BaseModel {
        static $columns = ['birthDate', 'createdAt', 'id'] as const
        $columns = TestDateSchema.$columns
        @column.date()
        declare birthDate: DateTime
        @column.dateTime({ autoCreate: true })
        declare createdAt: DateTime
        @column({ isPrimary: true })
        declare id: number
      }"
    `)

    await connection.schema.dropTable('test_dates')
  })

  test('handle JSON type', async ({ assert }) => {
    const db = getDb()
    const connection = db.connection()
    const generator = new OrmSchemaBuilder(connection)

    await connection.schema.dropTableIfExists('test_json')

    await connection.schema.createTable('test_json', (table) => {
      table.increments('id')
      table.json('metadata').notNullable()
    })

    /**
     * There is no JSONB column type in SQL server, they use Nvarchar instead
     */
    const expectedJSONType = ['mssql'].includes(process.env.DB!) ? 'string' : 'any'

    const columns = await connection.knexQuery().from('test_json').columnInfo()
    const primaryKeys = await connection.getPrimaryKeys('test_json')
    const schemas = generator.generateSchemas([{ name: 'test_json', columns, primaryKeys }])
    const output = schemas.classes.join('\n')

    assert.snapshot(output).matchInline(`
      "export class TestJsonSchema extends BaseModel {
        static $columns = ['id', 'metadata'] as const
        $columns = TestJsonSchema.$columns
        @column({ isPrimary: true })
        declare id: number
        @column()
        declare metadata: ${expectedJSONType}
      }"
    `)

    await connection.schema.dropTable('test_json')
  })

  test('handle JSONB type', async ({ assert }) => {
    const db = getDb()
    const connection = db.connection()
    const generator = new OrmSchemaBuilder(connection)

    await connection.schema.dropTableIfExists('test_jsonb')

    await connection.schema.createTable('test_jsonb', (table) => {
      table.increments('id')
      table.jsonb('settings').notNullable()
      table.jsonb('preferences').nullable()
    })

    /**
     * There is no JSONB column type in SQL server, they use Nvarchar instead
     */
    const expectedJSONType = ['mssql'].includes(process.env.DB!) ? 'string' : 'any'

    const columns = await connection.knexQuery().from('test_jsonb').columnInfo()
    const primaryKeys = await connection.getPrimaryKeys('test_jsonb')
    const schemas = generator.generateSchemas([{ name: 'test_jsonb', columns, primaryKeys }])
    const output = schemas.classes.join('\n')

    assert.snapshot(output).matchInline(`
      "export class TestJsonbSchema extends BaseModel {
        static $columns = ['id', 'preferences', 'settings'] as const
        $columns = TestJsonbSchema.$columns
        @column({ isPrimary: true })
        declare id: number
        @column()
        declare preferences: ${expectedJSONType} | null
        @column()
        declare settings: ${expectedJSONType}
      }"
    `)

    await connection.schema.dropTable('test_jsonb')
  })
})

test.group('OrmSchemaBuilder | Column-Specific Rules', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('apply primary key decorator to id column', async ({ assert }) => {
    const db = getDb()
    const connection = db.connection()
    const generator = new OrmSchemaBuilder(connection)

    await connection.schema.dropTableIfExists('test_pk')

    await connection.schema.createTable('test_pk', (table) => {
      table.increments('id')
      table.string('name').notNullable()
    })

    const columns = await connection.knexQuery().from('test_pk').columnInfo()
    const primaryKeys = await connection.getPrimaryKeys('test_pk')
    const schemas = generator.generateSchemas([{ name: 'test_pk', columns, primaryKeys }])
    const output = schemas.classes.join('\n')

    assert.snapshot(output).matchInline(`
      "export class TestPkSchema extends BaseModel {
        static $columns = ['id', 'name'] as const
        $columns = TestPkSchema.$columns
        @column({ isPrimary: true })
        declare id: number
        @column()
        declare name: string
      }"
    `)

    await connection.schema.dropTable('test_pk')
  })

  test('apply primary key decorator to uuid id column with string type', async ({ assert }) => {
    const db = getDb()
    const connection = db.connection()
    const generator = new OrmSchemaBuilder(connection)

    const columns = {
      id: { type: 'uuid', nullable: false },
      name: { type: 'varchar', nullable: false },
    }

    const schemas = generator.generateSchemas([
      { name: 'test_uuid_pk', columns, primaryKeys: ['id'] },
    ])
    const output = schemas.classes.join('\n')

    assert.snapshot(output).matchInline(`
      "export class TestUuidPkSchema extends BaseModel {
        static $columns = ['id', 'name'] as const
        $columns = TestUuidPkSchema.$columns
        @column({ isPrimary: true })
        declare id: string
        @column()
        declare name: string
      }"
    `)
  })

  test('apply primary key decorator to non-id column', async ({ assert }) => {
    const db = getDb()
    const connection = db.connection()
    const generator = new OrmSchemaBuilder(connection)

    await connection.schema.dropTableIfExists('test_custom_pk')

    await connection.schema.createTable('test_custom_pk', (table) => {
      table.string('key').notNullable().primary()
      table.string('value').notNullable()
    })

    const columns = await connection.knexQuery().from('test_custom_pk').columnInfo()
    const primaryKeys = await connection.getPrimaryKeys('test_custom_pk')
    const schemas = generator.generateSchemas([{ name: 'test_custom_pk', columns, primaryKeys }])
    const output = schemas.classes.join('\n')

    assert.snapshot(output).matchInline(`
      "export class TestCustomPkSchema extends BaseModel {
        static $columns = ['key', 'value'] as const
        $columns = TestCustomPkSchema.$columns
        @column({ isPrimary: true })
        declare key: string
        @column()
        declare value: string
      }"
    `)

    await connection.schema.dropTable('test_custom_pk')
  })

  test('column rules take precedence over primary key rule', async ({ assert }) => {
    const db = getDb()
    const connection = db.connection()
    const generator = new OrmSchemaBuilder(connection)

    generator.loadRules([
      {
        columns: {
          key: {
            tsType: 'string',
            decorator: "@column({ columnName: 'key' })",
            imports: [],
          },
        },
      },
    ])

    const columns = {
      key: { type: 'text', nullable: false },
      value: { type: 'text', nullable: false },
    }

    const schemas = generator.generateSchemas([
      { name: 'test_precedence', columns, primaryKeys: ['key'] },
    ])
    const output = schemas.classes.join('\n')

    assert.snapshot(output).matchInline(`
      "export class TestPrecedenceSchema extends BaseModel {
        static $columns = ['key', 'value'] as const
        $columns = TestPrecedenceSchema.$columns
        @column({ columnName: 'key' })
        declare key: string
        @column()
        declare value: string
      }"
    `)
  })

  test('table-specific primaryKey rule takes precedence over global', async ({ assert }) => {
    const db = getDb()
    const connection = db.connection()
    const generator = new OrmSchemaBuilder(connection)

    generator.loadRules([
      {
        tables: {
          test_table_pk: {
            primaryKey: (_tableName, primaryKeys, columns) => {
              const columnName = primaryKeys[0]
              if (!columnName || !columns[columnName]) return undefined
              return {
                columnName,
                columnInfo: {
                  tsType: 'string',
                  decorator: '@column({ isPrimary: true, serializeAs: null })',
                  imports: [],
                },
              }
            },
          },
        },
      },
    ])

    const columns = {
      key: { type: 'text', nullable: false },
      value: { type: 'text', nullable: false },
    }

    const schemas = generator.generateSchemas([
      { name: 'test_table_pk', columns, primaryKeys: ['key'] },
    ])
    const output = schemas.classes.join('\n')

    assert.snapshot(output).matchInline(`
      "export class TestTablePkSchema extends BaseModel {
        static $columns = ['key', 'value'] as const
        $columns = TestTablePkSchema.$columns
        @column({ isPrimary: true, serializeAs: null })
        declare key: string
        @column()
        declare value: string
      }"
    `)
  })

  test('no primary key when database returns empty primary keys', async ({ assert }) => {
    const db = getDb()
    const connection = db.connection()
    const generator = new OrmSchemaBuilder(connection)

    const columns = {
      name: { type: 'varchar', nullable: false },
      value: { type: 'text', nullable: false },
    }

    const schemas = generator.generateSchemas([{ name: 'test_no_pk', columns, primaryKeys: [] }])
    const output = schemas.classes.join('\n')

    assert.snapshot(output).matchInline(`
      "export class TestNoPkSchema extends BaseModel {
        static $columns = ['name', 'value'] as const
        $columns = TestNoPkSchema.$columns
        @column()
        declare name: string
        @column()
        declare value: string
      }"
    `)
  })

  test('apply serializeAs: null to password column', async ({ assert }) => {
    const db = getDb()
    const connection = db.connection()
    const generator = new OrmSchemaBuilder(connection)

    await connection.schema.dropTableIfExists('test_password')

    await connection.schema.createTable('test_password', (table) => {
      table.increments('id')
      table.string('password').notNullable()
    })

    const columns = await connection.knexQuery().from('test_password').columnInfo()
    const primaryKeys = await connection.getPrimaryKeys('test_password')
    const schemas = generator.generateSchemas([{ name: 'test_password', columns, primaryKeys }])
    const output = schemas.classes.join('\n')

    assert.snapshot(output).matchInline(`
      "export class TestPasswordSchema extends BaseModel {
        static $columns = ['id', 'password'] as const
        $columns = TestPasswordSchema.$columns
        @column({ isPrimary: true })
        declare id: number
        @column({ serializeAs: null })
        declare password: string
      }"
    `)

    await connection.schema.dropTable('test_password')
  })

  test('apply autoCreate to created_at column', async ({ assert }) => {
    const db = getDb()
    const connection = db.connection()
    const generator = new OrmSchemaBuilder(connection)

    await connection.schema.dropTableIfExists('test_created_at')

    await connection.schema.createTable('test_created_at', (table) => {
      table.increments('id')
      table.timestamp('created_at').notNullable()
    })

    const columns = await connection.knexQuery().from('test_created_at').columnInfo()
    const primaryKeys = await connection.getPrimaryKeys('test_created_at')
    const schemas = generator.generateSchemas([{ name: 'test_created_at', columns, primaryKeys }])
    const output = schemas.classes.join('\n')

    assert.snapshot(output).matchInline(`
      "export class TestCreatedAtSchema extends BaseModel {
        static $columns = ['createdAt', 'id'] as const
        $columns = TestCreatedAtSchema.$columns
        @column.dateTime({ autoCreate: true })
        declare createdAt: DateTime
        @column({ isPrimary: true })
        declare id: number
      }"
    `)

    await connection.schema.dropTable('test_created_at')
  })

  test('apply autoCreate and autoUpdate to updated_at column', async ({ assert }) => {
    const db = getDb()
    const connection = db.connection()
    const generator = new OrmSchemaBuilder(connection)

    await connection.schema.dropTableIfExists('test_updated_at')

    await connection.schema.createTable('test_updated_at', (table) => {
      table.increments('id')
      table.timestamp('updated_at').notNullable()
    })

    const columns = await connection.knexQuery().from('test_updated_at').columnInfo()
    const primaryKeys = await connection.getPrimaryKeys('test_updated_at')
    const schemas = generator.generateSchemas([{ name: 'test_updated_at', columns, primaryKeys }])
    const output = schemas.classes.join('\n')

    assert.snapshot(output).matchInline(`
      "export class TestUpdatedAtSchema extends BaseModel {
        static $columns = ['id', 'updatedAt'] as const
        $columns = TestUpdatedAtSchema.$columns
        @column({ isPrimary: true })
        declare id: number
        @column.dateTime({ autoCreate: true, autoUpdate: true })
        declare updatedAt: DateTime
      }"
    `)

    await connection.schema.dropTable('test_updated_at')
  })
})

test.group('OrmSchemaBuilder | Nullable Columns', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('add null union type for nullable columns', async ({ assert }) => {
    const db = getDb()
    const connection = db.connection()
    const generator = new OrmSchemaBuilder(connection)

    await connection.schema.dropTableIfExists('test_nullable')

    await connection.schema.createTable('test_nullable', (table) => {
      table.increments('id')
      table.string('middle_name').nullable()
      table.integer('age').nullable()
    })

    const columns = await connection.knexQuery().from('test_nullable').columnInfo()
    const primaryKeys = await connection.getPrimaryKeys('test_nullable')
    const schemas = generator.generateSchemas([{ name: 'test_nullable', columns, primaryKeys }])
    const output = schemas.classes.join('\n')

    assert.snapshot(output).matchInline(`
      "export class TestNullableSchema extends BaseModel {
        static $columns = ['age', 'id', 'middleName'] as const
        $columns = TestNullableSchema.$columns
        @column()
        declare age: number | null
        @column({ isPrimary: true })
        declare id: number
        @column()
        declare middleName: string | null
      }"
    `)

    await connection.schema.dropTable('test_nullable')
  })

  test('nullable timestamps should have null type', async ({ assert }) => {
    const db = getDb()
    const connection = db.connection()
    const generator = new OrmSchemaBuilder(connection)

    await connection.schema.dropTableIfExists('test_nullable_ts')

    await connection.schema.createTable('test_nullable_ts', (table) => {
      table.increments('id')
      table.timestamp('deleted_at').nullable()
    })

    const columns = await connection.knexQuery().from('test_nullable_ts').columnInfo()
    const primaryKeys = await connection.getPrimaryKeys('test_nullable_ts')
    const schemas = generator.generateSchemas([{ name: 'test_nullable_ts', columns, primaryKeys }])
    const output = schemas.classes.join('\n')

    assert.snapshot(output).matchInline(`
      "export class TestNullableTSchema extends BaseModel {
        static $columns = ['deletedAt', 'id'] as const
        $columns = TestNullableTSchema.$columns
        @column.dateTime()
        declare deletedAt: DateTime | null
        @column({ isPrimary: true })
        declare id: number
      }"
    `)

    await connection.schema.dropTable('test_nullable_ts')
  })
})

test.group('OrmSchemaBuilder | Custom Rules', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('apply custom column rules', async ({ assert }) => {
    const db = getDb()
    const connection = db.connection()
    const generator = new OrmSchemaBuilder(connection)

    generator.loadRules([
      {
        columns: {
          special_field: {
            tsType: 'SpecialType',
            decorator: '@column.special()',
            imports: [{ source: '#types', namedImports: ['SpecialType'] }],
          },
        },
      },
    ])

    await connection.schema.dropTableIfExists('test_custom')

    await connection.schema.createTable('test_custom', (table) => {
      table.increments('id')
      table.string('special_field').notNullable()
    })

    const columns = await connection.knexQuery().from('test_custom').columnInfo()
    const primaryKeys = await connection.getPrimaryKeys('test_custom')
    const schemas = generator.generateSchemas([{ name: 'test_custom', columns, primaryKeys }])
    const output = schemas.classes.join('\n')

    assert.snapshot(output).matchInline(`
      "export class TestCustomSchema extends BaseModel {
        static $columns = ['id', 'specialField'] as const
        $columns = TestCustomSchema.$columns
        @column({ isPrimary: true })
        declare id: number
        @column.special()
        declare specialField: SpecialType
      }"
    `)

    await connection.schema.dropTable('test_custom')
  })

  test('apply table-specific column rules', async ({ assert }) => {
    const db = getDb()
    const connection = db.connection()
    const generator = new OrmSchemaBuilder(connection)

    generator.loadRules([
      {
        tables: {
          test_users: {
            columns: {
              status: {
                tsType: 'UserStatus',
                decorator: '@column()',
                imports: [{ source: '#enums', namedImports: ['UserStatus'] }],
              },
            },
          },
        },
      },
    ])

    await connection.schema.dropTableIfExists('test_users')

    await connection.schema.createTable('test_users', (table) => {
      table.increments('id')
      table.string('status').notNullable()
    })

    const columns = await connection.knexQuery().from('test_users').columnInfo()
    const primaryKeys = await connection.getPrimaryKeys('test_users')
    const schemas = generator.generateSchemas([{ name: 'test_users', columns, primaryKeys }])
    const output = schemas.classes.join('\n')

    assert.snapshot(output).matchInline(`
      "export class TestUserSchema extends BaseModel {
        static $columns = ['id', 'status'] as const
        $columns = TestUserSchema.$columns
        @column({ isPrimary: true })
        declare id: number
        @column()
        declare status: UserStatus
      }"
    `)

    await connection.schema.dropTable('test_users')
  })

  test('table-specific rules override column rules', async ({ assert }) => {
    const db = getDb()
    const connection = db.connection()
    const generator = new OrmSchemaBuilder(connection)

    generator.loadRules([
      {
        columns: {
          status: {
            tsType: 'GenericStatus',
            decorator: '@column()',
            imports: [],
          },
        },
        tables: {
          test_users: {
            columns: {
              status: {
                tsType: 'UserStatus',
                decorator: '@column()',
                imports: [{ source: '#enums', namedImports: ['UserStatus'] }],
              },
            },
          },
        },
      },
    ])

    await connection.schema.dropTableIfExists('test_users')
    await connection.schema.dropTableIfExists('test_posts')

    await connection.schema.createTable('test_users', (table) => {
      table.increments('id')
      table.string('status').notNullable()
    })

    await connection.schema.createTable('test_posts', (table) => {
      table.increments('id')
      table.string('status').notNullable()
    })

    const [userColumns, userPrimaryKeys] = await Promise.all([
      connection.knexQuery().from('test_users').columnInfo(),
      connection.getPrimaryKeys('test_users'),
    ])
    const [postColumns, postPrimaryKeys] = await Promise.all([
      connection.knexQuery().from('test_posts').columnInfo(),
      connection.getPrimaryKeys('test_posts'),
    ])

    const userSchemas = generator.generateSchemas([
      { name: 'test_users', columns: userColumns, primaryKeys: userPrimaryKeys },
    ])
    const postSchemas = generator.generateSchemas([
      { name: 'test_posts', columns: postColumns, primaryKeys: postPrimaryKeys },
    ])

    assert.snapshot(userSchemas.classes.join('\n')).matchInline(`
      "export class TestUserSchema extends BaseModel {
        static $columns = ['id', 'status'] as const
        $columns = TestUserSchema.$columns
        @column({ isPrimary: true })
        declare id: number
        @column()
        declare status: UserStatus
      }"
    `)
    assert.snapshot(postSchemas.classes.join('\n')).matchInline(`
      "export class TestPostSchema extends BaseModel {
        static $columns = ['id', 'status'] as const
        $columns = TestPostSchema.$columns
        @column({ isPrimary: true })
        declare id: number
        @column()
        declare status: GenericStatus
      }"
    `)

    await connection.schema.dropTable('test_users')
    await connection.schema.dropTable('test_posts')
  })
})

test.group('OrmSchemaBuilder | Multiple Tables', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('generate schemas for multiple tables', async ({ assert }) => {
    const db = getDb()
    const connection = db.connection()
    const generator = new OrmSchemaBuilder(connection)

    await connection.schema.dropTableIfExists('test_users')
    await connection.schema.dropTableIfExists('test_posts')

    await connection.schema.createTable('test_users', (table) => {
      table.increments('id')
      table.string('name').notNullable()
    })

    await connection.schema.createTable('test_posts', (table) => {
      table.increments('id')
      table.string('title').notNullable()
    })

    const tables = [
      {
        name: 'test_users',
        columns: await connection.knexQuery().from('test_users').columnInfo(),
        primaryKeys: await connection.getPrimaryKeys('test_users'),
      },
      {
        name: 'test_posts',
        columns: await connection.knexQuery().from('test_posts').columnInfo(),
        primaryKeys: await connection.getPrimaryKeys('test_posts'),
      },
    ]

    const schemas = generator.generateSchemas(tables)

    // Check imports contain the base import
    const baseImport = schemas.imports.find((imp) => imp.source === '@adonisjs/lucid/orm')
    assert.exists(baseImport)
    assert.deepInclude(baseImport!.namedImports, 'BaseModel')
    assert.deepInclude(baseImport!.namedImports, 'column')

    assert.include(schemas.classes.join('\n'), 'export class TestUserSchema extends BaseModel')
    assert.include(schemas.classes.join('\n'), 'export class TestPostSchema extends BaseModel')

    await connection.schema.dropTable('test_users')
    await connection.schema.dropTable('test_posts')
  })

  test('deduplicate imports across multiple tables', async ({ assert }) => {
    const db = getDb()
    const connection = db.connection()
    const generator = new OrmSchemaBuilder(connection)

    await connection.schema.dropTableIfExists('test_users')
    await connection.schema.dropTableIfExists('test_posts')

    await connection.schema.createTable('test_users', (table) => {
      table.increments('id')
      table.timestamp('created_at').notNullable()
    })

    await connection.schema.createTable('test_posts', (table) => {
      table.increments('id')
      table.timestamp('published_at').notNullable()
    })

    const tables = [
      {
        name: 'test_users',
        columns: await connection.knexQuery().from('test_users').columnInfo(),
        primaryKeys: await connection.getPrimaryKeys('test_users'),
      },
      {
        name: 'test_posts',
        columns: await connection.knexQuery().from('test_posts').columnInfo(),
        primaryKeys: await connection.getPrimaryKeys('test_posts'),
      },
    ]

    const schemas = generator.generateSchemas(tables)
    const luxonImports = schemas.imports.filter((imp) => imp.source === 'luxon')

    // Should only have one import for luxon (deduplicated)
    assert.lengthOf(luxonImports, 1)
    // It should have DateTime in namedImports
    assert.deepInclude(luxonImports[0].namedImports, 'DateTime')

    await connection.schema.dropTable('test_users')
    await connection.schema.dropTable('test_posts')
  })
})

test.group('OrmSchemaBuilder | Output Generation', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('generate complete output string', async ({ assert }) => {
    const db = getDb()
    const connection = db.connection()
    const generator = new OrmSchemaBuilder(connection)

    await connection.schema.dropTableIfExists('test_users')

    await connection.schema.createTable('test_users', (table) => {
      table.increments('id')
      table.string('name').notNullable()
      table.timestamp('created_at').notNullable()
    })

    const tables = [
      {
        name: 'test_users',
        columns: await connection.knexQuery().from('test_users').columnInfo(),
        primaryKeys: await connection.getPrimaryKeys('test_users'),
      },
    ]

    const schemas = generator.generateSchemas(tables)
    const output = generator.getOutput(schemas)

    assert.snapshot(output).matchInline(`
      "import { BaseModel, column } from '@adonisjs/lucid/orm'
      import { DateTime } from 'luxon'

      export class TestUserSchema extends BaseModel {
        static $columns = ['createdAt', 'id', 'name'] as const
        $columns = TestUserSchema.$columns
        @column.dateTime({ autoCreate: true })
        declare createdAt: DateTime
        @column({ isPrimary: true })
        declare id: number
        @column()
        declare name: string
      }
      "
    `)

    await connection.schema.dropTable('test_users')
  })
})

test.group('OrmSchemaBuilder | Unknown Types', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('default to any type for unknown database types', async ({ assert }) => {
    const db = getDb()
    const connection = db.connection()
    const generator = new OrmSchemaBuilder(connection)

    // Manually create a column info with an unknown type
    const columns = {
      id: { type: 'integer', nullable: false },
      weird_field: { type: 'unknown_exotic_type', nullable: false },
      exotic_nullable: { type: 'another_unknown_type', nullable: true },
    }

    const schemas = generator.generateSchemas([{ name: 'test', columns, primaryKeys: ['id'] }])
    const output = schemas.classes.join('\n')

    // Unknown types should default to 'any'
    assert.snapshot(output).matchInline(`
      "export class TestSchema extends BaseModel {
        static $columns = ['exoticNullable', 'id', 'weirdField'] as const
        $columns = TestSchema.$columns
        @column()
        declare exoticNullable: any | null
        @column({ isPrimary: true })
        declare id: number
        @column()
        declare weirdField: any
      }"
    `)
  })
})

test.group('OrmSchemaBuilder | Enum Handling', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('handle enum via column-level schema rules', async ({ assert }) => {
    const db = getDb()
    const connection = db.connection()
    const generator = new OrmSchemaBuilder(connection)

    generator.loadRules([
      {
        columns: {
          status: {
            tsType: 'UserStatus',
            decorator: '@column()',
            imports: [{ source: '#types/enums', typeImports: ['UserStatus'] }],
          },
        },
      },
    ])

    // PostgreSQL: use native enum
    if (process.env.DB === 'pg') {
      await connection.rawQuery('DROP TYPE IF EXISTS user_status_enum CASCADE')
      await connection.rawQuery(
        "CREATE TYPE user_status_enum AS ENUM ('active', 'inactive', 'banned')"
      )
      await connection.schema.dropTableIfExists('test_enum_users')
      await connection.schema.createTable('test_enum_users', (table) => {
        table.increments('id')
        table.specificType('status', 'user_status_enum').notNullable()
      })
    } else {
      // MySQL, SQLite, MSSQL: use table.enum()
      await connection.schema.dropTableIfExists('test_enum_users')
      await connection.schema.createTable('test_enum_users', (table) => {
        table.increments('id')
        table.enum('status', ['active', 'inactive', 'banned']).notNullable()
      })
    }

    const columns = await connection.knexQuery().from('test_enum_users').columnInfo()
    const primaryKeys = await connection.getPrimaryKeys('test_enum_users')
    const schemas = generator.generateSchemas([{ name: 'test_enum_users', columns, primaryKeys }])
    const output = schemas.classes.join('\n')

    assert.snapshot(output).matchInline(`
      "export class TestEnumUserSchema extends BaseModel {
        static $columns = ['id', 'status'] as const
        $columns = TestEnumUserSchema.$columns
        @column({ isPrimary: true })
        declare id: number
        @column()
        declare status: UserStatus
      }"
    `)

    await connection.schema.dropTable('test_enum_users')
    if (process.env.DB === 'pg') {
      await connection.rawQuery('DROP TYPE user_status_enum')
    }
  })

  test('handle nullable enum', async ({ assert }) => {
    const db = getDb()
    const connection = db.connection()
    const generator = new OrmSchemaBuilder(connection)

    generator.loadRules([
      {
        columns: {
          mood: {
            tsType: 'Mood',
            decorator: '@column()',
            imports: [{ source: '#types/enums', typeImports: ['Mood'] }],
          },
        },
      },
    ])

    // PostgreSQL: use native enum
    if (process.env.DB === 'pg') {
      await connection.rawQuery('DROP TYPE IF EXISTS mood_enum CASCADE')
      await connection.rawQuery("CREATE TYPE mood_enum AS ENUM ('happy', 'sad', 'neutral')")
      await connection.schema.dropTableIfExists('test_enum_profiles')
      await connection.schema.createTable('test_enum_profiles', (table) => {
        table.increments('id')
        table.specificType('mood', 'mood_enum').nullable()
      })
    } else {
      // MySQL, SQLite, MSSQL: use table.enum()
      await connection.schema.dropTableIfExists('test_enum_profiles')
      await connection.schema.createTable('test_enum_profiles', (table) => {
        table.increments('id')
        table.enum('mood', ['happy', 'sad', 'neutral']).nullable()
      })
    }

    const columns = await connection.knexQuery().from('test_enum_profiles').columnInfo()
    const primaryKeys = await connection.getPrimaryKeys('test_enum_profiles')
    const schemas = generator.generateSchemas([
      { name: 'test_enum_profiles', columns, primaryKeys },
    ])
    const output = schemas.classes.join('\n')

    assert.snapshot(output).matchInline(`
      "export class TestEnumProfileSchema extends BaseModel {
        static $columns = ['id', 'mood'] as const
        $columns = TestEnumProfileSchema.$columns
        @column({ isPrimary: true })
        declare id: number
        @column()
        declare mood: Mood | null
      }"
    `)

    await connection.schema.dropTable('test_enum_profiles')
    if (process.env.DB === 'pg') {
      await connection.rawQuery('DROP TYPE mood_enum')
    }
  })

  test('PostgreSQL USER-DEFINED types default to any without schema rules')
    .skip(process.env.DB !== 'pg', 'Only PostgreSQL has USER-DEFINED type for native enums')
    .run(async ({ assert }) => {
      const db = getDb()
      const connection = db.connection()
      const generator = new OrmSchemaBuilder(connection)

      await connection.rawQuery('DROP TYPE IF EXISTS status_enum CASCADE')
      await connection.rawQuery("CREATE TYPE status_enum AS ENUM ('draft', 'published')")
      await connection.schema.dropTableIfExists('test_enum_no_rule')
      await connection.schema.createTable('test_enum_no_rule', (table) => {
        table.increments('id')
        table.specificType('status', 'status_enum').notNullable()
        table.specificType('mood', 'status_enum').nullable()
      })

      const columns = await connection.knexQuery().from('test_enum_no_rule').columnInfo()
      const primaryKeys = await connection.getPrimaryKeys('test_enum_no_rule')
      const schemas = generator.generateSchemas([
        { name: 'test_enum_no_rule', columns, primaryKeys },
      ])
      const output = schemas.classes.join('\n')

      // USER-DEFINED types without schema rules should default to 'any'
      assert.snapshot(output).matchInline(`
        "export class TestEnumNoRuleSchema extends BaseModel {
          static $columns = ['id', 'mood', 'status'] as const
          $columns = TestEnumNoRuleSchema.$columns
          @column({ isPrimary: true })
          declare id: number
          @column()
          declare mood: any | null
          @column()
          declare status: any
        }"
      `)

      await connection.schema.dropTable('test_enum_no_rule')
      await connection.rawQuery('DROP TYPE status_enum')
    })

  test('enum columns default to string type without custom schema rules', async ({ assert }) => {
    const db = getDb()
    const connection = db.connection()
    const generator = new OrmSchemaBuilder(connection)

    await connection.schema.dropTableIfExists('test_enum_default')
    await connection.schema.createTable('test_enum_default', (table) => {
      table.increments('id')
      table.enum('status', ['active', 'inactive', 'pending']).notNullable()
      table.enum('priority', ['low', 'medium', 'high']).nullable()
    })

    const columns = await connection.knexQuery().from('test_enum_default').columnInfo()
    const primaryKeys = await connection.getPrimaryKeys('test_enum_default')
    const schemas = generator.generateSchemas([{ name: 'test_enum_default', columns, primaryKeys }])
    const output = schemas.classes.join('\n')

    // Without custom schema rules, enum should default to string type
    assert.snapshot(output).matchInline(`
      "export class TestEnumDefaultSchema extends BaseModel {
        static $columns = ['id', 'priority', 'status'] as const
        $columns = TestEnumDefaultSchema.$columns
        @column({ isPrimary: true })
        declare id: number
        @column()
        declare priority: string | null
        @column()
        declare status: string
      }"
    `)

    await connection.schema.dropTable('test_enum_default')
  })
})

test.group('OrmSchemaBuilder | Name Conversion', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('convert snake_case column names to camelCase properties', async ({ assert }) => {
    const db = getDb()
    const connection = db.connection()
    const generator = new OrmSchemaBuilder(connection)

    await connection.schema.dropTableIfExists('test_profiles')

    await connection.schema.createTable('test_profiles', (table) => {
      table.increments('id')
      table.integer('user_profile_id').notNullable()
      table.string('first_name').notNullable()
      table.string('last_name_suffix').notNullable()
    })

    const columns = await connection.knexQuery().from('test_profiles').columnInfo()
    const primaryKeys = await connection.getPrimaryKeys('test_profiles')
    const schemas = generator.generateSchemas([{ name: 'test_profiles', columns, primaryKeys }])
    const output = schemas.classes.join('\n')

    assert.snapshot(output).matchInline(`
      "export class TestProfileSchema extends BaseModel {
        static $columns = ['firstName', 'id', 'lastNameSuffix', 'userProfileId'] as const
        $columns = TestProfileSchema.$columns
        @column()
        declare firstName: string
        @column({ isPrimary: true })
        declare id: number
        @column()
        declare lastNameSuffix: string
        @column()
        declare userProfileId: number
      }"
    `)

    await connection.schema.dropTable('test_profiles')
  })

  test('convert plural table names to singular class names', async ({ assert }) => {
    const db = getDb()
    const connection = db.connection()
    const generator = new OrmSchemaBuilder(connection)

    await connection.schema.dropTableIfExists('test_users_plural')
    await connection.schema.dropTableIfExists('test_posts_plural')
    await connection.schema.dropTableIfExists('test_categories')

    await connection.schema.createTable('test_users_plural', (table) => {
      table.increments('id')
    })

    await connection.schema.createTable('test_posts_plural', (table) => {
      table.increments('id')
    })

    await connection.schema.createTable('test_categories', (table) => {
      table.increments('id')
    })

    const usersColumns = await connection.knexQuery().from('test_users_plural').columnInfo()
    const usersPrimaryKeys = await connection.getPrimaryKeys('test_users_plural')
    const postsColumns = await connection.knexQuery().from('test_posts_plural').columnInfo()
    const postsPrimaryKeys = await connection.getPrimaryKeys('test_posts_plural')
    const categoriesColumns = await connection.knexQuery().from('test_categories').columnInfo()
    const categoriesPrimaryKeys = await connection.getPrimaryKeys('test_categories')

    const usersSchemas = generator.generateSchemas([
      { name: 'test_users_plural', columns: usersColumns, primaryKeys: usersPrimaryKeys },
    ])
    const postsSchemas = generator.generateSchemas([
      { name: 'test_posts_plural', columns: postsColumns, primaryKeys: postsPrimaryKeys },
    ])
    const categoriesSchemas = generator.generateSchemas([
      {
        name: 'test_categories',
        columns: categoriesColumns,
        primaryKeys: categoriesPrimaryKeys,
      },
    ])

    assert.snapshot(usersSchemas.classes.join('\n')).matchInline(`
      "export class TestUsersPluralSchema extends BaseModel {
        static $columns = ['id'] as const
        $columns = TestUsersPluralSchema.$columns
        @column({ isPrimary: true })
        declare id: number
      }"
    `)
    assert.snapshot(postsSchemas.classes.join('\n')).matchInline(`
      "export class TestPostsPluralSchema extends BaseModel {
        static $columns = ['id'] as const
        $columns = TestPostsPluralSchema.$columns
        @column({ isPrimary: true })
        declare id: number
      }"
    `)
    assert.snapshot(categoriesSchemas.classes.join('\n')).matchInline(`
      "export class TestCategorySchema extends BaseModel {
        static $columns = ['id'] as const
        $columns = TestCategorySchema.$columns
        @column({ isPrimary: true })
        declare id: number
      }"
    `)

    await connection.schema.dropTable('test_users_plural')
    await connection.schema.dropTable('test_posts_plural')
    await connection.schema.dropTable('test_categories')
  })

  test('convert snake_case table names to PascalCase class names', async ({ assert }) => {
    const db = getDb()
    const connection = db.connection()
    const generator = new OrmSchemaBuilder(connection)

    await connection.schema.dropTableIfExists('user_profiles')

    await connection.schema.createTable('user_profiles', (table) => {
      table.increments('id')
    })

    const columns = await connection.knexQuery().from('user_profiles').columnInfo()
    const primaryKeys = await connection.getPrimaryKeys('user_profiles')
    const schemas = generator.generateSchemas([{ name: 'user_profiles', columns, primaryKeys }])

    assert.snapshot(schemas.classes.join('\n')).matchInline(`
      "export class UserProfileSchema extends BaseModel {
        static $columns = ['id'] as const
        $columns = UserProfileSchema.$columns
        @column({ isPrimary: true })
        declare id: number
      }"
    `)

    await connection.schema.dropTable('user_profiles')
  })
})
