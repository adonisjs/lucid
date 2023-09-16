/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { QueryClientContract, TransactionClientContract } from '../../adonis-typings/database.js'

/**
 * Used for reporting queries using the profiler and the event
 * emitter
 */
export class QueryReporter {
  private eventName = 'db:query'
  private startTime: [number, number] | undefined
  private isReady = false

  constructor(
    private client: QueryClientContract | TransactionClientContract,
    private debug: boolean,
    private data: any
  ) {}

  /**
   * Initiate the hrtime when there are one or more query listeners
   */
  private initStartTime() {
    if (!this.client.emitter.hasListeners(this.eventName) || !this.debug) {
      return
    }
    this.startTime = process.hrtime()
  }

  /**
   * Emit the query with duration
   */
  private emitQueryEvent(error?: Error) {
    if (!this.startTime) {
      return
    }

    const eventData = { duration: process.hrtime(this.startTime), ...this.data, error }
    this.client.emitter.emit(this.eventName, eventData)
  }

  /**
   * Begin query reporting. Data passed to this method will
   * overwrite the existing data object
   */
  begin(data?: any): this {
    this.isReady = true
    this.data = data || this.data
    this.initStartTime()
    return this
  }

  /**
   * End query reporting
   */
  end(error?: Error) {
    if (!this.isReady) {
      return
    }
    this.emitQueryEvent(error)
  }
}
