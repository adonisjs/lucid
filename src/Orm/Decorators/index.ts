/*
* @adonisjs/lucid
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

/// <reference path="../../../adonis-typings/index.ts" />

import 'reflect-metadata'
import {
  ColumnDecorator,
  ComputedDecorator,
  DateColumnDecorator,
  DateTimeColumnDecorator,
  LucidModel,
} from '@ioc:Adonis/Lucid/Model'

import {
  HasOneDecorator,
  HasManyDecorator,
  BelongsToDecorator,
  ManyToManyDecorator,
  HasManyThroughDecorator,
} from '@ioc:Adonis/Lucid/Relations'

import { dateColumn, dateTimeColumn } from './date'

/**
 * Define property on a model as a column. The decorator needs a
 * proper model class inheriting the base model
 */
export const column: ColumnDecorator & {
  date: DateColumnDecorator,
  dateTime: DateTimeColumnDecorator,
} = (options?) => {
  return function decorateAsColumn (target, property) {
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
  return function decorateAsComputed (target, property) {
    const Model = target.constructor as LucidModel

    Model.boot()
    Model.$addComputed(property, options || {})
  }
}

/**
 * Define belongsTo relationship
 */
export const belongsTo: BelongsToDecorator = (relatedModel, relation?) => {
  return function decorateAsRelation (target, property: string) {
    const Model = target.constructor as LucidModel
    Model.boot()
    Model.$addRelation(property, 'belongsTo', relatedModel, Object.assign({ relatedModel }, relation))
  }
}

/**
 * Define hasOne relationship
 */
export const hasOne: HasOneDecorator = (relatedModel, relation?) => {
  return function decorateAsRelation (target, property: string) {
    const Model = target.constructor as LucidModel
    Model.boot()
    Model.$addRelation(property, 'hasOne', relatedModel, Object.assign({ relatedModel }, relation))
  }
}

/**
 * Define hasMany relationship
 */
export const hasMany: HasManyDecorator = (relatedModel, relation?) => {
  return function decorateAsRelation (target, property: string) {
    const Model = target.constructor as LucidModel
    Model.boot()
    Model.$addRelation(property, 'hasMany', relatedModel, Object.assign({ relatedModel }, relation))
  }
}

/**
 * Define manyToMany relationship
 */
export const manyToMany: ManyToManyDecorator = (relatedModel, relation?) => {
  return function decorateAsRelation (target, property: string) {
    const Model = target.constructor as LucidModel
    Model.boot()
    Model.$addRelation(property, 'manyToMany', relatedModel, Object.assign({ relatedModel }, relation))
  }
}

/**
 * Define hasManyThrough relationship
 */
export const hasManyThrough: HasManyThroughDecorator = ([relatedModel, throughModel], relation) => {
  return function decorateAsRelation (target, property: string) {
    const Model = target.constructor as LucidModel
    Model.boot()
    Model.$addRelation(
      property,
      'hasManyThrough',
      relatedModel, Object.assign({ relatedModel, throughModel }, relation),
    )
  }
}
