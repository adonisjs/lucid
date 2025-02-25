/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { BaseModel } from '../../../src/orm/model.js'

test.group('Base model | boot', () => {
  test('initialize static properties of the model on boot', ({ assert }) => {
    class User extends BaseModel {}
    class BigIntValueObject {
      static consume(value: string) {
        return BigInt(value)
      }
    }

    User.boot()
    User.defineAttribute('id', {})
    User.defineCast('id', BigIntValueObject)

    assert.isTrue(User.booted)
    assert.isFalse(User.preventAccessingMissingAttributes)
    assert.deepEqual(
      User.$attributesMap,
      new Map([
        [
          'id',
          {
            columnName: 'id',
            consume: undefined,
            hasGetter: false,
            hasSetter: false,
            isPrimary: false,
            meta: undefined,
            prepare: undefined,
            serialize: undefined,
            serializeAs: 'id',
          },
        ],
      ])
    )
    assert.deepEqual(User.$castsMap, new Map([['id', BigIntValueObject]]))
    assert.deepEqual(User.$computedPropertiesMap, new Map())
    assert.deepEqual(User.$keysMap, {
      attributesToColumns: {
        id: 'id',
      },
      columnsToAttributes: {
        id: 'id',
      },
    })

    assert.isUndefined(BaseModel.booted)
    assert.isFalse(BaseModel.preventAccessingMissingAttributes)
    assert.isUndefined(BaseModel.$attributesMap)
    assert.isUndefined(BaseModel.$castsMap)
    assert.isUndefined(BaseModel.$computedPropertiesMap)
    assert.isUndefined(BaseModel.$keysMap)
  })

  test('copy properties from the parent model when both parent and child are booted', ({
    assert,
  }) => {
    class BigIntValueObject {
      static consume(value: string) {
        return BigInt(value)
      }
    }

    class AppModel extends BaseModel {
      static preventAccessingMissingAttributes: boolean = true
    }
    class User extends AppModel {}
    class Post extends AppModel {
      static preventAccessingMissingAttributes: boolean = false
    }

    AppModel.boot()
    AppModel.defineAttribute('createdAt', {})
    AppModel.defineAttribute('updatedAt', {})

    User.boot()
    User.defineAttribute('id', {})
    User.defineCast('id', BigIntValueObject)

    Post.boot()
    Post.defineAttribute('id', {})
    Post.defineAttribute('title', {})

    assert.isTrue(User.booted)
    assert.isTrue(User.preventAccessingMissingAttributes)
    assert.deepEqual(
      User.$attributesMap,
      new Map([
        [
          'createdAt',
          {
            columnName: 'createdAt',
            consume: undefined,
            hasGetter: false,
            hasSetter: false,
            isPrimary: false,
            meta: undefined,
            prepare: undefined,
            serialize: undefined,
            serializeAs: 'createdAt',
          },
        ],
        [
          'updatedAt',
          {
            columnName: 'updatedAt',
            consume: undefined,
            hasGetter: false,
            hasSetter: false,
            isPrimary: false,
            meta: undefined,
            prepare: undefined,
            serialize: undefined,
            serializeAs: 'updatedAt',
          },
        ],
        [
          'id',
          {
            columnName: 'id',
            consume: undefined,
            hasGetter: false,
            hasSetter: false,
            isPrimary: false,
            meta: undefined,
            prepare: undefined,
            serialize: undefined,
            serializeAs: 'id',
          },
        ],
      ])
    )
    assert.deepEqual(User.$castsMap, new Map([['id', BigIntValueObject]]))
    assert.deepEqual(User.$keysMap, {
      attributesToColumns: {
        createdAt: 'createdAt',
        id: 'id',
        updatedAt: 'updatedAt',
      },
      columnsToAttributes: {
        createdAt: 'createdAt',
        id: 'id',
        updatedAt: 'updatedAt',
      },
    })

    assert.isTrue(Post.booted)
    assert.isFalse(Post.preventAccessingMissingAttributes)
    assert.deepEqual(
      Post.$attributesMap,
      new Map([
        [
          'createdAt',
          {
            columnName: 'createdAt',
            consume: undefined,
            hasGetter: false,
            hasSetter: false,
            isPrimary: false,
            meta: undefined,
            prepare: undefined,
            serialize: undefined,
            serializeAs: 'createdAt',
          },
        ],
        [
          'updatedAt',
          {
            columnName: 'updatedAt',
            consume: undefined,
            hasGetter: false,
            hasSetter: false,
            isPrimary: false,
            meta: undefined,
            prepare: undefined,
            serialize: undefined,
            serializeAs: 'updatedAt',
          },
        ],
        [
          'id',
          {
            columnName: 'id',
            consume: undefined,
            hasGetter: false,
            hasSetter: false,
            isPrimary: false,
            meta: undefined,
            prepare: undefined,
            serialize: undefined,
            serializeAs: 'id',
          },
        ],
        [
          'title',
          {
            columnName: 'title',
            consume: undefined,
            hasGetter: false,
            hasSetter: false,
            isPrimary: false,
            meta: undefined,
            prepare: undefined,
            serialize: undefined,
            serializeAs: 'title',
          },
        ],
      ])
    )
    assert.deepEqual(Post.$castsMap, new Map([]))
    assert.deepEqual(Post.$keysMap, {
      attributesToColumns: {
        createdAt: 'createdAt',
        id: 'id',
        title: 'title',
        updatedAt: 'updatedAt',
      },
      columnsToAttributes: {
        createdAt: 'createdAt',
        id: 'id',
        title: 'title',
        updatedAt: 'updatedAt',
      },
    })

    assert.isTrue(AppModel.booted)
    assert.isTrue(AppModel.preventAccessingMissingAttributes)
    assert.deepEqual(
      AppModel.$attributesMap,
      new Map([
        [
          'createdAt',
          {
            columnName: 'createdAt',
            consume: undefined,
            hasGetter: false,
            hasSetter: false,
            isPrimary: false,
            meta: undefined,
            prepare: undefined,
            serialize: undefined,
            serializeAs: 'createdAt',
          },
        ],
        [
          'updatedAt',
          {
            columnName: 'updatedAt',
            consume: undefined,
            hasGetter: false,
            hasSetter: false,
            isPrimary: false,
            meta: undefined,
            prepare: undefined,
            serialize: undefined,
            serializeAs: 'updatedAt',
          },
        ],
      ])
    )
    assert.deepEqual(AppModel.$castsMap, new Map([]))

    assert.isUndefined(BaseModel.booted)
    assert.isFalse(BaseModel.preventAccessingMissingAttributes)
    assert.isUndefined(BaseModel.$attributesMap)
    assert.isUndefined(BaseModel.$castsMap)
    assert.isUndefined(BaseModel.$keysMap)
  })
})
