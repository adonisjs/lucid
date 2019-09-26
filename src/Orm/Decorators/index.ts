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
  HasOneThroughFn,
  HasManyThroughFn,
  ModelConstructorContract,
} from '@ioc:Adonis/Lucid/Model'

/**
 * Define property on a model as a column. The decorator needs a
 * proper model class inheriting the base model
 */
export const column: ColumnFn = (column?) => {
  return function decorateAsColumn (target, property) {
    const Model = target.constructor as ModelConstructorContract
    Model.$boot()
    Model.$addColumn(property, column || {})
  }
}

/**
 * Define computed property on a model. The decorator needs a
 * proper model class inheriting the base model
 */
export const computed: ComputedFn = (column) => {
  return function decorateAsComputed (target, property) {
    const Model = target.constructor as ModelConstructorContract

    Model.$boot()
    Model.$addComputed(property, column || {})
  }
}

/**
 * Define belongsTo relationship
 */
export const belongsTo: BelongsToFn = (relation?) => {
  return function decorateAsRelation (target, property: string) {
    const Model = target.constructor as ModelConstructorContract
    Model.$boot()
    Model.$addRelation(property, 'belongsTo', relation || {})
  }
}

/**
 * Define hasOne relationship
 */
export const hasOne: HasOneFn = (relation?) => {
  return function decorateAsRelation (target, property: string) {
    const Model = target.constructor as ModelConstructorContract
    Model.$boot()
    Model.$addRelation(property, 'hasOne', relation || {})
  }
}

/**
 * Define hasMany relationship
 */
export const hasMany: HasManyFn = (relation?) => {
  return function decorateAsRelation (target, property: string) {
    const Model = target.constructor as ModelConstructorContract
    Model.$boot()
    Model.$addRelation(property, 'hasMany', relation || {})
  }
}

/**
 * Define manyToMany relationship
 */
export const manyToMany: ManyToManyFn = (relation?) => {
  return function decorateAsRelation (target, property: string) {
    const Model = target.constructor as ModelConstructorContract
    Model.$boot()
    Model.$addRelation(property, 'manyToMany', relation || {})
  }
}

/**
 * Define hasOneThrough relationship
 */
export const hasOneThrough: HasOneThroughFn = (relation?) => {
  return function decorateAsRelation (target, property: string) {
    const Model = target.constructor as ModelConstructorContract
    Model.$boot()
    Model.$addRelation(property, 'hasOneThrough', relation || {})
  }
}

/**
 * Define hasManyThrough relationship
 */
export const hasManyThrough: HasManyThroughFn = (relation?) => {
  return function decorateAsRelation (target, property: string) {
    const Model = target.constructor as ModelConstructorContract
    Model.$boot()
    Model.$addRelation(property, 'hasManyThrough', relation || {})
  }
}
