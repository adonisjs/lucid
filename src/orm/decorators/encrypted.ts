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
  const driver = options?.driver

  if (options?.deterministic && options?.blind) {
    throw new errors.E_INVALID_ENCRYPTED_COLUMN_CONFIGURATION([
      dottedAttribute,
      'The "deterministic" and "blind" options cannot be used together',
    ])
  }

  if (options?.blind) {
    const blindColumnName = options.blind.columnName?.trim()
    const purpose = options.blind.purpose?.trim()

    if (!blindColumnName) {
      throw new errors.E_INVALID_ENCRYPTED_COLUMN_CONFIGURATION([
        dottedAttribute,
        'Missing "blind.columnName"',
      ])
    }

    if (!purpose) {
      throw new errors.E_INVALID_ENCRYPTED_COLUMN_CONFIGURATION([
        dottedAttribute,
        'Missing "blind.purpose"',
      ])
    }

    return {
      mode: 'blind',
      driver,
      blindColumnName,
      purpose,
    }
  }

  if (options?.deterministic) {
    return {
      mode: 'deterministic',
      driver,
    }
  }

  return {
    mode: 'standard',
    driver,
  }
}

/**
 * Decorator to define an encrypted column
 */
export const encryptedColumn: EncryptedColumnDecorator = (options?) => {
  return function decorateAsEncryptedColumn(target, property) {
    const Model = target.constructor as LucidModel
    Model.boot()

    const { deterministic, blind, driver, ...columnOptions } = options || {}

    const encryptionMeta = defineEncryptedMeta(Model, property, {
      deterministic,
      blind,
      driver,
    })
    const meta = Object.assign({}, columnOptions.meta, { encryption: encryptionMeta })

    Model.$addColumn(property, {
      ...columnOptions,
      meta,
      prepare(value: any, attributeName: string, modelInstance: LucidRow) {
        if (value === null || value === undefined) {
          return value
        }

        const model = modelInstance.constructor as LucidModel
        if (encryptionMeta.mode === 'deterministic') {
          const encryption = model.$resolveEncryption(
            attributeName,
            'deterministic',
            encryptionMeta.driver
          )

          return encryption.driver
            ? encryption.provider.encrypt(value, {
                deterministic: true,
                driver: encryption.driver,
              })
            : encryption.provider.encrypt(value, {
                deterministic: true,
              })
        }

        const encryption = model.$resolveEncryption(
          attributeName,
          encryptionMeta.mode,
          encryptionMeta.driver
        )

        return encryption.driver
          ? encryption.provider.encrypt(value, { driver: encryption.driver })
          : encryption.provider.encrypt(value)
      },
      consume(value: any, attributeName: string, modelInstance: LucidRow) {
        if (value === null || value === undefined) {
          return value
        }

        const encryption = (modelInstance.constructor as LucidModel).$resolveEncryption(
          attributeName,
          encryptionMeta.mode,
          encryptionMeta.driver
        )

        return encryption.driver
          ? encryption.provider.decrypt(value, { driver: encryption.driver })
          : encryption.provider.decrypt(value)
      },
    })
  }
}
