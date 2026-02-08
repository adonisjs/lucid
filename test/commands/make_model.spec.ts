/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { ListLoader } from '@adonisjs/core/ace'
import { AceFactory } from '@adonisjs/core/factories'

import { getDb } from '../../test-helpers/index.js'
import MakeModel from '../../commands/make_model.js'
import MakeFactory from '../../commands/make_factory.js'
import MakeMigration from '../../commands/make_migration.js'

test.group('MakeModel', (group) => {
  group.each.teardown(async () => {
    delete process.env.ADONIS_ACE_CWD
  })

  test('make a model', async ({ fs, assert }) => {
    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    await ace.app.init()
    ace.ui.switchMode('raw')

    const command = await ace.create(MakeModel, ['user'])
    await command.exec()

    command.assertLog('green(DONE:)    create app/models/user.ts')
    assert.snapshot(await fs.contents('app/models/user.ts')).matchInline(`
      "import { UserSchema } from '#database/schema'

      export default class User extends UserSchema {
      }"
    `)
  })

  test('make a model with migration', async ({ fs, assert }) => {
    const db = getDb()
    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    ace.app.container.singleton('lucid.db', () => db)
    await ace.app.init()
    ace.ui.switchMode('raw')

    ace.addLoader(new ListLoader([MakeMigration]))

    const command = await ace.create(MakeModel, ['user', '--migration'])
    await command.exec()

    command.assertLog('green(DONE:)    create app/models/user.ts')
    command.assertLogMatches(/database\/migrations\/\d+_create_users_table/)
    assert.snapshot(await fs.contents('app/models/user.ts')).matchInline(`
      "import { UserSchema } from '#database/schema'

      export default class User extends UserSchema {
      }"
    `)
  })

  test('make a model with factory', async ({ fs, assert }) => {
    const db = getDb()
    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    ace.app.container.singleton('lucid.db', () => db)
    await ace.app.init()
    ace.ui.switchMode('raw')

    ace.addLoader(new ListLoader([MakeFactory]))

    const command = await ace.create(MakeModel, ['user', '--factory'])
    await command.exec()

    command.assertLog('green(DONE:)    create app/models/user.ts')
    command.assertLog('green(DONE:)    create database/factories/user_factory.ts')
    assert.snapshot(await fs.contents('app/models/user.ts')).matchInline(`
      "import { UserSchema } from '#database/schema'

      export default class User extends UserSchema {
      }"
    `)
  })
})

test.group('MakeModel | Interactive', (group) => {
  group.each.teardown(async () => {
    delete process.env.ADONIS_ACE_CWD
  })

  test('make a model with string property', async ({ fs, assert }) => {
    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    await ace.app.init()
    ace.ui.switchMode('raw')

    const command = await ace.create(MakeModel, ['post'])
    command.interactive = true
    command.collectPropertiesInteractively = async () => ({
      properties: [{ name: 'title', type: 'string' as const, nullable: false }],
      relations: [],
    })

    await command.exec()

    command.assertLog('green(DONE:)    create app/models/post.ts')
    assert.snapshot(await fs.contents('app/models/post.ts')).matchInline(`
      "import { PostSchema } from '#database/schema'
      import { column } from '@adonisjs/lucid/orm'

      export default class Post extends PostSchema {
        @column()
        declare title: string
      }"
    `)
  })

  test('make a model with nullable number property', async ({ fs, assert }) => {
    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    await ace.app.init()
    ace.ui.switchMode('raw')

    const command = await ace.create(MakeModel, ['product'])
    command.interactive = true
    command.collectPropertiesInteractively = async () => ({
      properties: [{ name: 'price', type: 'number' as const, nullable: true }],
      relations: [],
    })

    await command.exec()

    command.assertLog('green(DONE:)    create app/models/product.ts')
    assert.snapshot(await fs.contents('app/models/product.ts')).matchInline(`
      "import { ProductSchema } from '#database/schema'
      import { column } from '@adonisjs/lucid/orm'

      export default class Product extends ProductSchema {
        @column()
        declare price: number | null
      }"
    `)
  })

  test('make a model with date property', async ({ fs, assert }) => {
    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    await ace.app.init()
    ace.ui.switchMode('raw')

    const command = await ace.create(MakeModel, ['event'])
    command.interactive = true
    command.collectPropertiesInteractively = async () => ({
      properties: [{ name: 'eventDate', type: 'date' as const, nullable: false }],
      relations: [],
    })

    await command.exec()

    command.assertLog('green(DONE:)    create app/models/event.ts')
    assert.snapshot(await fs.contents('app/models/event.ts')).matchInline(`
      "import { EventSchema } from '#database/schema'
      import { column } from '@adonisjs/lucid/orm'
      import type { DateTime } from 'luxon'

      export default class Event extends EventSchema {
        @column.date()
        declare eventDate: DateTime
      }"
    `)
  })

  test('make a model with dateTime property', async ({ fs, assert }) => {
    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    await ace.app.init()
    ace.ui.switchMode('raw')

    const command = await ace.create(MakeModel, ['log'])
    command.interactive = true
    command.collectPropertiesInteractively = async () => ({
      properties: [{ name: 'occurredAt', type: 'dateTime' as const, nullable: false }],
      relations: [],
    })

    await command.exec()

    command.assertLog('green(DONE:)    create app/models/log.ts')
    assert.snapshot(await fs.contents('app/models/log.ts')).matchInline(`
      "import { LogSchema } from '#database/schema'
      import { column } from '@adonisjs/lucid/orm'
      import type { DateTime } from 'luxon'

      export default class Log extends LogSchema {
        @column.dateTime()
        declare occurredAt: DateTime
      }"
    `)
  })

  test('make a model with belongsTo relation', async ({ fs, assert }) => {
    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    await ace.app.init()
    ace.ui.switchMode('raw')

    const command = await ace.create(MakeModel, ['post'])
    command.interactive = true
    command.collectPropertiesInteractively = async () => ({
      properties: [],
      relations: [{ name: 'author', type: 'belongsTo' as const, relatedModel: 'User' }],
    })

    await command.exec()

    command.assertLog('green(DONE:)    create app/models/post.ts')
    assert.snapshot(await fs.contents('app/models/post.ts')).matchInline(`
      "import { PostSchema } from '#database/schema'
      import { belongsTo } from '@adonisjs/lucid/orm'
      import type { BelongsTo } from '@adonisjs/lucid/types/relations'
      import User from '#models/user'

      export default class Post extends PostSchema {
        @belongsTo(() => User)
        declare author: BelongsTo<typeof User>
      }"
    `)
  })

  test('make a model with hasMany relation', async ({ fs, assert }) => {
    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    await ace.app.init()
    ace.ui.switchMode('raw')

    const command = await ace.create(MakeModel, ['user'])
    command.interactive = true
    command.collectPropertiesInteractively = async () => ({
      properties: [],
      relations: [{ name: 'posts', type: 'hasMany' as const, relatedModel: 'Post' }],
    })

    await command.exec()

    command.assertLog('green(DONE:)    create app/models/user.ts')
    assert.snapshot(await fs.contents('app/models/user.ts')).matchInline(`
      "import { UserSchema } from '#database/schema'
      import { hasMany } from '@adonisjs/lucid/orm'
      import type { HasMany } from '@adonisjs/lucid/types/relations'
      import Post from '#models/post'

      export default class User extends UserSchema {
        @hasMany(() => Post)
        declare posts: HasMany<typeof Post>
      }"
    `)
  })

  test('make a model with manyToMany relation', async ({ fs, assert }) => {
    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    await ace.app.init()
    ace.ui.switchMode('raw')

    const command = await ace.create(MakeModel, ['post'])
    command.interactive = true
    command.collectPropertiesInteractively = async () => ({
      properties: [],
      relations: [{ name: 'tags', type: 'manyToMany' as const, relatedModel: 'Tag' }],
    })

    await command.exec()

    command.assertLog('green(DONE:)    create app/models/post.ts')
    assert.snapshot(await fs.contents('app/models/post.ts')).matchInline(`
      "import { PostSchema } from '#database/schema'
      import { manyToMany } from '@adonisjs/lucid/orm'
      import type { ManyToMany } from '@adonisjs/lucid/types/relations'
      import Tag from '#models/tag'

      export default class Post extends PostSchema {
        @manyToMany(() => Tag)
        declare tags: ManyToMany<typeof Tag>
      }"
    `)
  })

  test('make a model with hasManyThrough relation', async ({ fs, assert }) => {
    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    await ace.app.init()
    ace.ui.switchMode('raw')

    const command = await ace.create(MakeModel, ['country'])
    command.interactive = true
    command.collectPropertiesInteractively = async () => ({
      properties: [],
      relations: [
        {
          name: 'posts',
          type: 'hasManyThrough' as const,
          relatedModel: 'Post',
          throughModel: 'User',
        },
      ],
    })

    await command.exec()

    command.assertLog('green(DONE:)    create app/models/country.ts')
    assert.snapshot(await fs.contents('app/models/country.ts')).matchInline(`
      "import { CountrySchema } from '#database/schema'
      import { hasManyThrough } from '@adonisjs/lucid/orm'
      import type { HasManyThrough } from '@adonisjs/lucid/types/relations'
      import Post from '#models/post'
      import User from '#models/user'

      export default class Country extends CountrySchema {
        @hasManyThrough(() => Post, () => User)
        declare posts: HasManyThrough<typeof Post>
      }"
    `)
  })

  test('make a model with multiple properties and relations', async ({ fs, assert }) => {
    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    await ace.app.init()
    ace.ui.switchMode('raw')

    const command = await ace.create(MakeModel, ['post'])
    command.interactive = true
    command.collectPropertiesInteractively = async () => ({
      properties: [
        { name: 'title', type: 'string' as const, nullable: false },
        { name: 'publishedAt', type: 'dateTime' as const, nullable: true },
      ],
      relations: [
        { name: 'author', type: 'belongsTo' as const, relatedModel: 'User' },
        { name: 'comments', type: 'hasMany' as const, relatedModel: 'Comment' },
      ],
    })

    await command.exec()

    command.assertLog('green(DONE:)    create app/models/post.ts')
    assert.snapshot(await fs.contents('app/models/post.ts')).matchInline(`
      "import { PostSchema } from '#database/schema'
      import { column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
      import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
      import type { DateTime } from 'luxon'
      import User from '#models/user'
      import Comment from '#models/comment'

      export default class Post extends PostSchema {
        @column()
        declare title: string

        @column.dateTime()
        declare publishedAt: DateTime | null

        @belongsTo(() => User)
        declare author: BelongsTo<typeof User>

        @hasMany(() => Comment)
        declare comments: HasMany<typeof Comment>
      }"
    `)
  })

  test('make a model with no properties in interactive mode', async ({ fs, assert }) => {
    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    await ace.app.init()
    ace.ui.switchMode('raw')

    const command = await ace.create(MakeModel, ['empty'])
    command.interactive = true
    command.collectPropertiesInteractively = async () => ({
      properties: [],
      relations: [],
    })

    await command.exec()

    command.assertLog('green(DONE:)    create app/models/empty.ts')
    assert.snapshot(await fs.contents('app/models/empty.ts')).matchInline(`
      "import { EmptySchema } from '#database/schema'

      export default class Empty extends EmptySchema {
      }"
    `)
  })
})
