/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/// <reference path="../../../adonis-typings/index.ts" />

import { EventsList, HooksHandler } from '@ioc:Adonis/Lucid/Model'
import { IocContract, IocResolverContract, IocResolverLookupNode } from '@adonisjs/fold'

/**
 * A generic class to implement before and after lifecycle hooks
 */
export class Hooks {
  private hooks: {
    [event: string]: {
      before: Set<Exclude<HooksHandler<any>, string> | IocResolverLookupNode>,
      after: Set<Exclude<HooksHandler<any>, string> | IocResolverLookupNode>,
    },
  } = {}

  /**
   * Resolver to resolve IoC container bindings
   */
  private resolver: IocResolverContract

  constructor (container: IocContract) {
    this.resolver = container.getResolver(undefined, 'modelHooks', 'App/Models/Hooks')
  }

  /**
   * Add hook for a given event and lifecycle
   */
  public add (lifecycle: 'before' | 'after', event: EventsList, handler: HooksHandler<any>) {
    this.hooks[event] = this.hooks[event] || { before: new Set(), after: new Set() }

    let resolvedHook: Exclude<HooksHandler<any>, 'string'> | IocResolverLookupNode

    /**
     * If hook is a string, then resolve it from the container
     */
    if (typeof (handler) === 'string') {
      resolvedHook = this.resolver.resolve(handler)
    } else {
      resolvedHook = handler
    }

    this.hooks[event][lifecycle].add(resolvedHook)
    return this
  }

  /**
   * Execute hooks for a given event and lifecycle
   */
  public async execute (lifecycle: 'before' | 'after', event: EventsList, payload: any): Promise<void> {
    if (!this.hooks[event]) {
      return
    }

    for (let hook of this.hooks[event][lifecycle]) {
      if (typeof (hook) === 'function') {
        await hook(payload)
      } else {
        await this.resolver.call(hook, undefined, [payload])
      }
    }
  }

  /**
   * Remove hooks for a given event
   */
  public clear (event: EventsList): void {
    if (!this.hooks[event]) {
      return
    }

    delete this.hooks[event]
  }

  /**
   * Remove all hooks
   */
  public clearAll (): void {
    this.hooks = {}
  }
}
