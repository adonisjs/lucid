/*
* @adonisjs/lucid
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

/// <reference path="../../adonis-typings/database.ts" />

import { Pool } from 'tarn'
import * as knex from 'knex'
import { EventEmitter } from 'events'
import { ConnectionConfigContract, ConnectionContract } from '@ioc:Adonis/Addons/Database'

/**
 * Connection class manages a given database connection. Internally it uses
 * knex to build the database connection with appropriate database
 * driver.
 */
export class Connection extends EventEmitter implements ConnectionContract {
  /**
   * Reference to knex. The instance is created once the `open`
   * method is invoked
   */
  public client?: knex

  /**
   * List of events emitted by this class
   */
  public readonly EVENTS: ['open', 'close', 'close:error']

  constructor (public name: string, public config: ConnectionConfigContract) {
    super()
  }

  /**
   * Does cleanup by removing knex reference and removing
   * all listeners
   */
  private _monitorPoolResources () {
    this.pool!.on('destroySuccess', () => {
      /**
       * Force close when `numUsed` and `numFree` both are zero. This happens
       * when `min` resources inside the pool are set to `0`.
       */
      if (this.pool!.numFree() === 0 && this.pool!.numUsed() === 0) {
        this.close()
      }
    })

    /**
     * Pool has destroyed and hence we must cleanup resources
     * as well.
     */
    this.pool!.on('poolDestroySuccess', () => {
      this.client = undefined
      this.emit('close')
      this.removeAllListeners()
    })
  }

  /**
   * Returns the pool instance for the given connection
   */
  public get pool (): null | Pool<any> {
    return this.client ? this.client['_context'].client.pool : null
  }

  /**
   * Opens the connection by creating knex instance
   */
  public open () {
    try {
      this.client = knex(this.config)
      this._monitorPoolResources()
      this.emit('open')
    } catch (error) {
      this.emit('error', error)
      throw error
    }
  }

  /**
   * Closes DB connection by destroying knex instance. The `connection`
   * object must be free for garbage collection.
   *
   * In case of error this method will emit `close:error` event followed
   * by the `close` event.
   */
  public async close (): Promise<void> {
    if (this.client) {
      try {
        await this.client!.destroy()
      } catch (error) {
        this.emit('close:error', error)
      }
    }
  }
}
