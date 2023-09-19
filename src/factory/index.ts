/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { LucidModel, LucidRow } from '../../adonis-typings/model.js'
import {
  DefineCallback,
  FactoryModelContract,
  StubIdCallback,
} from '../../adonis-typings/factory.js'
import { FactoryModel } from './factory_model.js'

/**
 * Factory manager exposes the API to register factories.
 */
export class FactoryManager {
  private stubCounter = 1
  private stubIdCallback: StubIdCallback = (counter) => counter

  /**
   * Returns the next id
   */
  getNextId(model: LucidRow) {
    return this.stubIdCallback(this.stubCounter++, model)
  }

  /**
   * Define a factory model
   */
  define<Model extends LucidModel>(
    model: Model,
    callback: DefineCallback<Model>
  ): FactoryModelContract<Model> {
    return new FactoryModel(model, callback, this)
  }

  /**
   * Define custom callback to generate stub ids
   */
  stubId(callback: StubIdCallback): void {
    this.stubIdCallback = callback
  }
}
