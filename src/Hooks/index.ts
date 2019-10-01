/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/// <reference path="../../adonis-typings/index.ts" />

import { HooksContract } from '@ioc:Adonis/Lucid/Model'

/**
 * A generic class to implement before and after lifecycle hooks
 */
export class Hooks<Events extends string, Handler extends any> implements HooksContract<Events, Handler> {
  private _hooks: {
    [event: string]: {
      before: Set<Handler>,
      after: Set<Handler>,
    },
  } = {}

  /**
   * Add hook for a given event and lifecycle
   */
  public add (lifecycle: 'before' | 'after', event: Events, handler: Handler) {
    this._hooks[event] = this._hooks[event] || { before: new Set(), after: new Set() }
    this._hooks[event][lifecycle].add(handler)
    return this
  }

  /**
   * Execute hooks for a given event and lifecycle
   */
  public async execute (lifecycle: 'before' | 'after', event: Events, payload: any): Promise<void> {
    if (!this._hooks[event]) {
      return
    }

    for (let hook of this._hooks[event][lifecycle]) {
      await hook(payload)
    }
  }

  /**
   * Register before hook
   */
  public before (event: Events, handler: Handler): this {
    return this.add('before', event, handler)
  }

  /**
   * Register after hook
   */
  public after (event: Events, handler: Handler): this {
    return this.add('after', event, handler)
  }

  /**
   * Remove hooks for a given event
   */
  public clear (event: Events): void {
    if (!this._hooks[event]) {
      return
    }

    delete this._hooks[event]
  }

  /**
   * Remove all hooks
   */
  public clearAll (): void {
    this._hooks = {}
  }
}
