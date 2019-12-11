/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

import { IocContract } from '@adonisjs/fold'

import { Schema } from '../src/Schema'
import { Database } from '../src/Database'
import { Adapter } from '../src/Orm/Adapter'
import { BaseModel } from '../src/Orm/BaseModel'

import {
  column,
  hasOne,
  hasMany,
  computed,
  belongsTo,
  manyToMany,
  hasManyThrough,
} from '../src/Orm/Decorators'

export default class DatabaseServiceProvider {
  constructor (protected $container: IocContract) {
  }

  /**
   * Register database binding
   */
  public register (): void {
    this.$container.singleton('Adonis/Lucid/Database', () => {
      const config = this.$container.use('Adonis/Core/Config').get('database', {})
      const Logger = this.$container.use('Adonis/Core/Logger')
      const Profiler = this.$container.use('Adonis/Core/Profiler')
      return new Database(config, Logger, Profiler)
    })

    this.$container.singleton('Adonis/Lucid/Orm', () => {
      /**
       * Attaching adapter to the base model. Each model is allowed to define
       * a different adapter.
       */
      BaseModel.$adapter = new Adapter(this.$container.use('Adonis/Lucid/Database'))
      BaseModel.$container = this.$container

      return {
        BaseModel,
        column,
        computed,
        hasOne,
        hasMany,
        belongsTo,
        manyToMany,
        hasManyThrough,
      }
    })

    this.$container.singleton('Adonis/Lucid/Schema', () => {
      return Schema
    })
  }

  public boot (): void {
    this.$container.with(['Adonis/Core/HealthCheck', 'Adonis/Lucid/Database'], (HealthCheck) => {
      HealthCheck.addChecker('lucid', 'Adonis/Lucid/Database')
    })
  }
}
