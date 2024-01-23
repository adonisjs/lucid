/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
import { test } from '@japa/runner'
import type { ManyToMany } from '../../src/types/relations.js'

import { FactoryManager } from '../../src/factories/main.js'
import { column, manyToMany } from '../../src/orm/decorators/index.js'

import {
  setup,
  getDb,
  cleanup,
  ormAdapter,
  resetTables,
  getBaseModel,
} from '../../test-helpers/index.js'
import { AppFactory } from '@adonisjs/core/factories/app'

const factoryManager = new FactoryManager()

test.group('Factory | ManyToMany | make', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('make model with relationship', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Skill extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare name: string
    }
    Skill.boot()

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @column()
      points: number = 0

      @manyToMany(() => Skill)
      declare skills: ManyToMany<typeof Skill>
    }

    const postFactory = factoryManager
      .define(Skill, () => {
        return {
          name: 'Programming',
        }
      })
      .build()

    const factory = factoryManager
      .define(User, () => {
        return {}
      })
      .relation('skills', () => postFactory)
      .build()

    const user = await factory.with('skills').makeStubbed()

    assert.exists(user.id)
    assert.isFalse(user.$isPersisted)
    assert.lengthOf(user.skills, 1)

    assert.exists(user.skills[0].id)
    assert.instanceOf(user.skills[0], Skill)
    assert.deepEqual(user.skills[0].$extras, {})
    assert.isFalse(user.skills[0].$isPersisted)
  })

  test('pass custom attributes to relationship', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Skill extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare name: string
    }
    Skill.boot()

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @column()
      points: number = 0

      @manyToMany(() => Skill)
      declare skills: ManyToMany<typeof Skill>
    }

    const postFactory = factoryManager
      .define(Skill, () => {
        return {
          name: 'Programming',
        }
      })
      .build()

    const factory = factoryManager
      .define(User, () => {
        return {}
      })
      .relation('skills', () => postFactory)
      .build()

    const user = await factory
      .with('skills', 1, (related) => {
        related.merge({ name: 'Dancing' })
      })
      .makeStubbed()

    assert.isFalse(user.$isPersisted)
    assert.lengthOf(user.skills, 1)
    assert.instanceOf(user.skills[0], Skill)
    assert.isFalse(user.skills[0].$isPersisted)
    assert.equal(user.skills[0].name, 'Dancing')
  })

  test('make many relationship', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Skill extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare name: string
    }
    Skill.boot()

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @column()
      points: number = 0

      @manyToMany(() => Skill)
      declare skills: ManyToMany<typeof Skill>
    }

    const postFactory = factoryManager
      .define(Skill, () => {
        return {
          name: 'Programming',
        }
      })
      .build()

    const factory = factoryManager
      .define(User, () => {
        return {}
      })
      .relation('skills', () => postFactory)
      .build()

    const user = await factory
      .with('skills', 2, (related) => {
        related.merge({ name: 'Dancing' })
      })
      .makeStubbed()

    assert.isFalse(user.$isPersisted)
    assert.lengthOf(user.skills, 2)

    assert.instanceOf(user.skills[0], Skill)
    assert.isFalse(user.skills[0].$isPersisted)
    assert.equal(user.skills[0].name, 'Dancing')

    assert.instanceOf(user.skills[1], Skill)
    assert.isFalse(user.skills[1].$isPersisted)
    assert.equal(user.skills[1].name, 'Dancing')
  })
})

test.group('Factory | ManyToMany | create', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('create model with relationship', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Skill extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare name: string
    }
    Skill.boot()

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @column()
      points: number = 0

      @manyToMany(() => Skill)
      declare skills: ManyToMany<typeof Skill>
    }

    const postFactory = factoryManager
      .define(Skill, () => {
        return {
          name: 'Programming',
        }
      })
      .build()

    const factory = factoryManager
      .define(User, () => {
        return {}
      })
      .relation('skills', () => postFactory)
      .build()

    const user = await factory.with('skills').create()

    assert.isTrue(user.$isPersisted)
    assert.lengthOf(user.skills, 1)
    assert.instanceOf(user.skills[0], Skill)
    assert.isTrue(user.skills[0].$isPersisted)

    const users = await db.from('users').select('*')
    const skills = await db.from('skills').select('*')
    const skillUsers = await db.from('skill_user').select('*')

    assert.lengthOf(skills, 1)
    assert.lengthOf(users, 1)
    assert.equal(skillUsers[0].user_id, users[0].id)
    assert.equal(skillUsers[0].skill_id, skills[0].id)
  })

  test('pass custom attributes', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Skill extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare name: string
    }
    Skill.boot()

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @column()
      points: number = 0

      @manyToMany(() => Skill)
      declare skills: ManyToMany<typeof Skill>
    }

    const postFactory = factoryManager
      .define(Skill, () => {
        return {
          name: 'Programming',
        }
      })
      .build()

    const factory = factoryManager
      .define(User, () => {
        return {}
      })
      .relation('skills', () => postFactory)
      .build()

    const user = await factory
      .with('skills', 1, (related) => related.merge({ name: 'Dancing' }))
      .create()

    assert.isTrue(user.$isPersisted)
    assert.lengthOf(user.skills, 1)
    assert.instanceOf(user.skills[0], Skill)
    assert.isTrue(user.skills[0].$isPersisted)
    assert.equal(user.skills[0].name, 'Dancing')
  })

  test('create many relationships', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Skill extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare name: string
    }
    Skill.boot()

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @column()
      points: number = 0

      @manyToMany(() => Skill)
      declare skills: ManyToMany<typeof Skill>
    }

    const postFactory = factoryManager
      .define(Skill, () => {
        return {
          name: 'Programming',
        }
      })
      .build()

    const factory = factoryManager
      .define(User, () => {
        return {}
      })
      .relation('skills', () => postFactory)
      .build()

    const user = await factory
      .with('skills', 2, (related) => related.merge([{ name: 'Dancing' }, { name: 'Programming' }]))
      .create()

    assert.isTrue(user.$isPersisted)
    assert.lengthOf(user.skills, 2)
    assert.instanceOf(user.skills[0], Skill)
    assert.isTrue(user.skills[0].$isPersisted)
    assert.equal(user.skills[0].name, 'Dancing')

    assert.instanceOf(user.skills[1], Skill)
    assert.isTrue(user.skills[1].$isPersisted)
    assert.equal(user.skills[1].name, 'Programming')
  })

  test('rollback changes on error', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    assert.plan(4)

    class Skill extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare name: string
    }
    Skill.boot()

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @column()
      points: number = 0

      @manyToMany(() => Skill)
      declare skills: ManyToMany<typeof Skill>
    }

    const postFactory = factoryManager
      .define(Skill, () => {
        return {}
      })
      .build()

    const factory = factoryManager
      .define(User, () => {
        return {}
      })
      .relation('skills', () => postFactory)
      .build()

    try {
      await factory.with('skills').create()
    } catch (error) {
      assert.exists(error)
    }

    const users = await db.from('users').exec()
    const skills = await db.from('skills').exec()
    const userSkills = await db.from('skill_user').exec()

    assert.lengthOf(users, 0)
    assert.lengthOf(skills, 0)
    assert.lengthOf(userSkills, 0)
  })

  test('define pivot attributes for the pivot table', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Skill extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare name: string
    }
    Skill.boot()

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @column()
      points: number = 0

      @manyToMany(() => Skill)
      declare skills: ManyToMany<typeof Skill>
    }

    const postFactory = factoryManager
      .define(Skill, () => {
        return {
          name: 'Programming',
        }
      })
      .build()

    const factory = factoryManager
      .define(User, () => {
        return {}
      })
      .relation('skills', () => postFactory)
      .build()

    const user = await factory
      .with('skills', 2, (related) => {
        related
          .merge([{ name: 'Dancing' }, { name: 'Programming' }])
          .pivotAttributes({ proficiency: 'master' })
      })
      .create()

    assert.isTrue(user.$isPersisted)
    assert.lengthOf(user.skills, 2)
    assert.instanceOf(user.skills[0], Skill)
    assert.isTrue(user.skills[0].$isPersisted)
    assert.equal(user.skills[0].name, 'Dancing')

    assert.instanceOf(user.skills[1], Skill)
    assert.isTrue(user.skills[1].$isPersisted)
    assert.equal(user.skills[1].name, 'Programming')

    const skills = await user.related('skills').query().pivotColumns(['proficiency'])
    assert.containsSubset(skills, [
      { $extras: { pivot_proficiency: 'master' } },
      { $extras: { pivot_proficiency: 'master' } },
    ])
  })
})
