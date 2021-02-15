/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { LucidModel, LucidRow } from '@ioc:Adonis/Lucid/Model'
import { FactoryManagerContract, DefineCallback, StubIdCallback } from '@ioc:Adonis/Lucid/Factory'
import { FactoryModel } from './FactoryModel'

/**
 * Factory manager exposes the API to register factories.
 */
export class FactoryManager implements FactoryManagerContract {
  private stubCounter = 1
  private stubIdCallback: StubIdCallback = (counter) => counter

  /**
   * Returns the next id
   */
  public getNextId(model: LucidRow) {
    return this.stubIdCallback(this.stubCounter++, model)
  }

  /**
   * Define a factory model
   */
  public define<Model extends LucidModel>(model: Model, callback: DefineCallback<Model>) {
    return new FactoryModel(model, callback, this)
  }

  /**
   * Define custom callback to generate stub ids
   */
  public stubId(callback: StubIdCallback) {
    this.stubIdCallback = callback
  }
}
