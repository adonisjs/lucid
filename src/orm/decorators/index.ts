/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import {
  LucidModel,
  HooksDecorator,
  ColumnDecorator,
  ComputedDecorator,
  DateColumnDecorator,
  DateTimeColumnDecorator,
} from '../../types/model.js'

import {
  HasOneDecorator,
  HasManyDecorator,
  BelongsToDecorator,
  ManyToManyDecorator,
  HasManyThroughDecorator,
} from '../../types/relations.js'

import { dateColumn } from './date.js'
import { dateTimeColumn } from './date_time.js'

/**
 * Define property on a model as a column. The decorator needs a
 * proper model class inheriting the base model
 */
export const column: ColumnDecorator & {
  date: DateColumnDecorator
  dateTime: DateTimeColumnDecorator
} = (options?) => {
  return function decorateAsColumn(target, property) {
    const Model = target.constructor as LucidModel
    Model.boot()
    Model.$addColumn(property, options || {})
  }
}

column.date = dateColumn
column.dateTime = dateTimeColumn

/**
 * Define computed property on a model. The decorator needs a
 * proper model class inheriting the base model
 */
export const computed: ComputedDecorator = (options) => {
  return function decorateAsComputed(target, property) {
    const Model = target.constructor as LucidModel

    Model.boot()
    Model.$addComputed(property, options || {})
  }
}

/**
 * Define belongsTo relationship
 */
export const belongsTo: BelongsToDecorator = (relatedModel, relation?) => {
  return function decorateAsRelation(target, property: string) {
    const Model = target.constructor as LucidModel
    Model.boot()
    Model.$addRelation(
      property,
      'belongsTo',
      relatedModel,
      Object.assign({ relatedModel }, relation)
    )
  }
}

/**
 * Define hasOne relationship
 */
export const hasOne: HasOneDecorator = (relatedModel, relation?) => {
  return function decorateAsRelation(target, property: string) {
    const Model = target.constructor as LucidModel
    Model.boot()
    Model.$addRelation(property, 'hasOne', relatedModel, Object.assign({ relatedModel }, relation))
  }
}

/**
 * Define hasMany relationship
 */
export const hasMany: HasManyDecorator = (relatedModel, relation?) => {
  return function decorateAsRelation(target, property: string) {
    const Model = target.constructor as LucidModel
    Model.boot()
    Model.$addRelation(property, 'hasMany', relatedModel, Object.assign({ relatedModel }, relation))
  }
}

/**
 * Define manyToMany relationship
 */
export const manyToMany: ManyToManyDecorator = (relatedModel, relation?) => {
  return function decorateAsRelation(target, property: string) {
    const Model = target.constructor as LucidModel
    Model.boot()
    Model.$addRelation(
      property,
      'manyToMany',
      relatedModel,
      Object.assign({ relatedModel }, relation)
    )
  }
}

/**
 * Define hasManyThrough relationship
 */
export const hasManyThrough: HasManyThroughDecorator = ([relatedModel, throughModel], relation) => {
  return function decorateAsRelation(target, property: string) {
    const Model = target.constructor as LucidModel
    Model.boot()
    Model.$addRelation(
      property,
      'hasManyThrough',
      relatedModel,
      Object.assign({ relatedModel, throughModel }, relation)
    )
  }
}

/**
 * Before/After save hook
 */
export const beforeSave: HooksDecorator = () => {
  return function decorateAsHook(target, property) {
    target.boot()
    target.before('save', (target as any)[property].bind(target))
  }
}
export const afterSave: HooksDecorator = () => {
  return function decorateAsColumn(target, property) {
    target.boot()
    target.after('save', (target as any)[property].bind(target))
  }
}

/**
 * Before/After create hook
 */
export const beforeCreate: HooksDecorator = () => {
  return function decorateAsColumn(target, property) {
    target.boot()
    target.before('create', (target as any)[property].bind(target))
  }
}
export const afterCreate: HooksDecorator = () => {
  return function decorateAsColumn(target, property) {
    target.boot()
    target.after('create', (target as any)[property].bind(target))
  }
}

/**
 * Before/After update hook
 */
export const beforeUpdate: HooksDecorator = () => {
  return function decorateAsColumn(target, property) {
    target.boot()
    target.before('update', (target as any)[property].bind(target))
  }
}
export const afterUpdate: HooksDecorator = () => {
  return function decorateAsColumn(target, property) {
    target.boot()
    target.after('update', (target as any)[property].bind(target))
  }
}

/**
 * Before/After delete hook
 */
export const beforeDelete: HooksDecorator = () => {
  return function decorateAsColumn(target, property) {
    target.boot()
    target.before('delete', (target as any)[property].bind(target))
  }
}
export const afterDelete: HooksDecorator = () => {
  return function decorateAsColumn(target, property) {
    target.boot()
    target.after('delete', (target as any)[property].bind(target))
  }
}

/**
 * Before/After find hook
 */
export const beforeFind: HooksDecorator = () => {
  return function decorateAsColumn(target, property) {
    target.boot()
    target.before('find', (target as any)[property].bind(target))
  }
}
export const afterFind: HooksDecorator = () => {
  return function decorateAsColumn(target, property) {
    target.boot()
    target.after('find', (target as any)[property].bind(target))
  }
}

/**
 * Before/After fetchs hook
 */
export const beforeFetch: HooksDecorator = () => {
  return function decorateAsColumn(target, property) {
    target.boot()
    target.before('fetch', (target as any)[property].bind(target))
  }
}
export const afterFetch: HooksDecorator = () => {
  return function decorateAsColumn(target, property) {
    target.boot()
    target.after('fetch', (target as any)[property].bind(target))
  }
}

/**
 * Before/After paginate hook
 */
export const beforePaginate: HooksDecorator = () => {
  return function decorateAsColumn(target, property) {
    target.boot()
    target.before('paginate', (target as any)[property].bind(target))
  }
}
export const afterPaginate: HooksDecorator = () => {
  return function decorateAsColumn(target, property) {
    target.boot()
    target.after('paginate', (target as any)[property].bind(target))
  }
}
