/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import * as errors from '../../errors.js'
import {
  type LucidRow,
  type LucidModel,
  type EncryptedColumnMeta,
  type EncryptedColumnOptions,
  type EncryptedColumnDecorator,
} from '../../types/model.js'

function defineEncryptedMeta(
  model: LucidModel,
  property: string,
  options?: EncryptedColumnOptions
): EncryptedColumnMeta {
  const dottedAttribute = `${model.name}.${property}`

  if (options?.deterministic && options?.blind) {
    throw new errors.E_INVALID_ENCRYPTED_COLUMN_CONFIGURATION([
      dottedAttribute,
      'The "deterministic" and "blind" options cannot be used together',
    ])
  }

  if (options?.blind) {
    if (!options.blind.columnName?.trim()) {
      throw new errors.E_INVALID_ENCRYPTED_COLUMN_CONFIGURATION([
        dottedAttribute,
        'Missing "blind.columnName"',
      ])
    }

    if (!options.blind.purpose?.trim()) {
      throw new errors.E_INVALID_ENCRYPTED_COLUMN_CONFIGURATION([
        dottedAttribute,
        'Missing "blind.purpose"',
      ])
    }

    return {
      mode: 'blind',
      driver: options.driver,
      blindColumnName: options.blind.columnName,
      purpose: options.blind.purpose,
    }
  }

  if (options?.deterministic) {
    return {
      mode: 'deterministic',
      driver: options.driver,
    }
  }

  return {
    mode: 'standard',
    driver: options?.driver,
  }
}

/**
 * Decorator to define an encrypted column
 */
export const encryptedColumn: EncryptedColumnDecorator = (options?) => {
  return function decorateAsEncryptedColumn(target, property) {
    const Model = target.constructor as LucidModel
    Model.boot()

    const {
      deterministic: droppedDeterministic,
      blind: droppedBlind,
      ...columnOptions
    } = options || {}
    void droppedDeterministic
    void droppedBlind
    const encryptionMeta = defineEncryptedMeta(Model, property, options)
    const meta = Object.assign({}, columnOptions.meta, { encryption: encryptionMeta })

    Model.$addColumn(property, {
      ...columnOptions,
      meta,
      prepare(value: any, attributeName: string, modelInstance: LucidRow) {
        if (value === null || value === undefined) {
          return value
        }

        const encryption = (modelInstance.constructor as LucidModel).$getEncryption(attributeName)
        if (encryptionMeta.mode === 'deterministic') {
          return encryption.encrypt(value, {
            deterministic: true,
            driver: encryptionMeta.driver,
          })
        }

        if (encryptionMeta.driver) {
          return encryption.encrypt(value, { driver: encryptionMeta.driver })
        }

        return encryption.encrypt(value)
      },
      consume(value: any, attributeName: string, modelInstance: LucidRow) {
        if (value === null || value === undefined) {
          return value
        }

        const encryption = (modelInstance.constructor as LucidModel).$getEncryption(attributeName)
        return encryption.decrypt(value)
      },
    })
  }
}
