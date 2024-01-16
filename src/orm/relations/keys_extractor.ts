/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { LucidModel } from '../../types/model.js'
import * as errors from '../../errors.js'

/**
 * Utility to consistently extract relationship keys from the model
 * and the relation model.
 */
export class KeysExtractor<Keys extends { [key: string]: { key: string; model: LucidModel } }> {
  constructor(
    private model: LucidModel,
    private relationName: string,
    private keys: Keys
  ) {}

  /**
   * Extract the defined keys from the models
   */
  extract(): { [P in keyof Keys]: { attributeName: string; columnName: string } } {
    const relationRef = `${this.model.name}.${this.relationName}`

    return Object.keys(this.keys).reduce(
      (result, extractKey: keyof Keys) => {
        const { key, model } = this.keys[extractKey]
        const attribute = model.$getColumn(key)

        if (!attribute) {
          throw new errors.E_MISSING_MODEL_ATTRIBUTE([relationRef, key, model.name])
        }

        result[extractKey] = {
          attributeName: key,
          columnName: attribute.columnName,
        }

        return result
      },
      {} as { [P in keyof Keys]: { attributeName: string; columnName: string } }
    )
  }
}
