/*
* @adonisjs/lucid
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

import { ProfilerActionContract } from '@ioc:Adonis/Core/Profiler'
import { QueryClientContract, TransactionClientContract } from '@ioc:Adonis/Lucid/Database'

/**
 * Used for reporting queries using the profiler and the event
 * emitter
 */
export class QueryReporter {
  private eventName = 'db:query'
  private startTime: [number, number] | undefined
  private profilerAction: ProfilerActionContract | undefined
  private isReady = false

  constructor (
    private client: QueryClientContract | TransactionClientContract,
    private debug: boolean,
    private data: any,
  ) {
  }

  /**
   * Initiate the hrtime when there are one or more query listeners
   */
  private initStartTime () {
    if (!this.client.emitter.hasListeners(this.eventName) || !this.debug) {
      return
    }
    this.startTime = process.hrtime()
  }

  /**
   * Init the profiler action when client has profiler attached
   * to it
   */
  private initProfilerAction () {
    if (!this.client.profiler) {
      return
    }
    this.profilerAction = this.client.profiler.profile(this.eventName, this.data)
  }

  /**
   * Commit the profiler action with optional error
   */
  private commitProfilerAction (error?: Error) {
    if (!this.profilerAction) {
      return
    }
    error ? this.profilerAction.end({ error }) : this.profilerAction.end()
  }

  /**
   * Emit the query with duration
   */
  private emitQueryEvent (error?: Error) {
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
  public begin (data?: any): this {
    this.isReady = true
    this.data = data || this.data
    this.initStartTime()
    this.initProfilerAction()
    return this
  }

  /**
   * End query reporting
   */
  public end (error?: Error) {
    if (!this.isReady) {
      throw new Error('Cannot end the query reporter, since the begin was never called')
    }
    this.commitProfilerAction(error)
    this.emitQueryEvent(error)
  }
}
