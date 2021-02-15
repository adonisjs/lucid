/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { LucidModel, QueryScope, QueryScopeCallback } from '@ioc:Adonis/Lucid/Model'

/**
 * Helper to mark a function as query scope
 */
export function scope<Model extends LucidModel, Callback extends QueryScopeCallback<Model>>(
  callback: Callback
): QueryScope<Callback> {
  return callback as QueryScope<Callback>
}
