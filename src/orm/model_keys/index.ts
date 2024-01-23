/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { ModelKeysContract, ModelObject } from '../../types/model.js'

/**
 * Exposes the API to collect, get and resolve model keys
 */
export class ModelKeys implements ModelKeysContract {
  constructor(private keys: ModelObject = {}) {}

  /**
   * Add a new key
   */
  add(key: string, value: string) {
    this.keys[key] = value
  }

  /**
   * Get value for a given key
   */
  get(key: string, defaultValue: string): string
  get(key: string, defaultValue?: string): string | undefined {
    return this.keys[key] || defaultValue
  }

  /**
   * Resolve key, if unable to resolve, the key will be
   * returned as it is.
   */
  resolve(key: string): string {
    return this.get(key, key)
  }

  /**
   * Return all keys
   */
  all() {
    return this.keys
  }
}
