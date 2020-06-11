/*
* @adonisjs/lucid
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

/// <reference path="../../adonis-typings/index.ts" />

import test from 'japa'

import {
  column,
  computed,
  hasOne,
  hasMany,
} from '../../src/Orm/Decorators'
import {
  setup,
  getDb,
  cleanup,
  ormAdapter,
  resetTables,
  getBaseModel,
} from '../../test-helpers'
import { HasOne, HasMany } from '@ioc:Adonis/Lucid/Orm'

let db: ReturnType<typeof getDb>
let BaseModel: ReturnType<typeof getBaseModel>

test.group('Model subclass', (group) => {
  group.before(async () => {
    db = getDb()
    BaseModel = getBaseModel(ormAdapter(db))
    await setup()
  })

  group.after(async () => {
    await cleanup()
    await db.manager.closeAll()
  })

  group.afterEach(async () => {
    await resetTables()
  })

  test('boot should define correct table name', async (assert) => {
    class SubModel extends BaseModel {}
    class MyModel extends SubModel {}
    class MyModel2 extends SubModel {
      public static table = 'custom'
    }

    SubModel.boot()
    MyModel.boot()
    MyModel2.boot()

    assert.strictEqual(SubModel.table, 'sub_models')
    assert.strictEqual(MyModel.table, 'my_models')
    assert.strictEqual(MyModel2.table, 'custom')
  })

  test('boot should define correct primary key', async (assert) => {
    class SubModel extends BaseModel {}
    class MyModel extends SubModel {}
    class MyModel2 extends SubModel {
      public static primaryKey = 'custom'
    }

    SubModel.boot()
    MyModel.boot()
    MyModel2.boot()

    assert.strictEqual(SubModel.primaryKey, 'id')
    assert.strictEqual(MyModel.primaryKey, 'id')
    assert.strictEqual(MyModel2.primaryKey, 'custom')
  })

  test('subclasses should inherit static definitions', async (assert) => {
    class RelatedModel extends BaseModel {}

    class SubModel extends BaseModel {
      @column()
      public column1: number

      @computed()
      public computed1 () {
        return 1
      }

      @hasOne(() => RelatedModel)
      public related1: HasOne<typeof RelatedModel>
    }

    class MyModel extends SubModel {
      @column()
      public column2: string

      @computed()
      public computed2 () {
        return 2
      }

      @hasMany(() => RelatedModel)
      public related2: HasMany<typeof RelatedModel>
    }

    SubModel.boot()
    MyModel.boot()

    assert.deepStrictEqual(Array.from(SubModel.$columnsDefinitions.keys()), ['column1'])
    assert.deepStrictEqual(Array.from(MyModel.$columnsDefinitions.keys()), ['column1', 'column2'])

    assert.deepStrictEqual(Array.from(SubModel.$computedDefinitions.keys()), ['computed1'])
    assert.deepStrictEqual(Array.from(MyModel.$computedDefinitions.keys()), ['computed1', 'computed2'])

    assert.deepStrictEqual(Array.from(SubModel.$relationsDefinitions.keys()), ['related1'])
    assert.deepStrictEqual(Array.from(MyModel.$relationsDefinitions.keys()), ['related1', 'related2'])
  })
})
