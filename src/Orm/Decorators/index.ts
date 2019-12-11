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
  ColumnFn,
  HasOneFn,
  HasManyFn,
  ComputedFn,
  BelongsToFn,
  ManyToManyFn,
  HasManyThroughFn,
  ModelConstructorContract,
} from '@ioc:Adonis/Lucid/Model'

/**
 * Define property on a model as a column. The decorator needs a
 * proper model class inheriting the base model
 */
export const column: ColumnFn = (options?) => {
  return function decorateAsColumn (target, property) {
    const Model = target.constructor as ModelConstructorContract
    Model.$boot()
    Model.$addColumn(property, options || {})
  }
}

/**
 * Define computed property on a model. The decorator needs a
 * proper model class inheriting the base model
 */
export const computed: ComputedFn = (options) => {
  return function decorateAsComputed (target, property) {
    const Model = target.constructor as ModelConstructorContract

    Model.$boot()
    Model.$addComputed(property, options || {})
  }
}

/**
 * Define belongsTo relationship
 */
export const belongsTo: BelongsToFn = (relatedModel, relation?) => {
  return function decorateAsRelation (target, property: string) {
    const Model = target.constructor as ModelConstructorContract
    Model.$boot()
    Model.$addRelation(property, 'belongsTo', Object.assign({ relatedModel }, relation))
  }
}

/**
 * Define hasOne relationship
 */
export const hasOne: HasOneFn = (relatedModel, relation?) => {
  return function decorateAsRelation (target, property: string) {
    const Model = target.constructor as ModelConstructorContract
    Model.$boot()
    Model.$addRelation(property, 'hasOne', Object.assign({ relatedModel }, relation))
  }
}

/**
 * Define hasMany relationship
 */
export const hasMany: HasManyFn = (relatedModel, relation?) => {
  return function decorateAsRelation (target, property: string) {
    const Model = target.constructor as ModelConstructorContract
    Model.$boot()
    Model.$addRelation(property, 'hasMany', Object.assign({ relatedModel }, relation))
  }
}

/**
 * Define manyToMany relationship
 */
export const manyToMany: ManyToManyFn = (relatedModel, relation?) => {
  return function decorateAsRelation (target, property: string) {
    const Model = target.constructor as ModelConstructorContract
    Model.$boot()
    Model.$addRelation(property, 'manyToMany', Object.assign({ relatedModel }, relation))
  }
}

/**
 * Define hasManyThrough relationship
 */
export const hasManyThrough: HasManyThroughFn = ([relatedModel, throughModel], relation) => {
  return function decorateAsRelation (target, property: string) {
    const Model = target.constructor as ModelConstructorContract
    Model.$boot()
    Model.$addRelation(property, 'hasManyThrough', Object.assign({ relatedModel, throughModel }, relation))
  }
}
