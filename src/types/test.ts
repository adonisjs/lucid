/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

export type ExtractRelationCallback<
  T extends (...args: any[]) => any,
  Callback = NonNullable<Parameters<T>[1]>,
> = Callback extends (...args: any[]) => any ? Parameters<Callback>[0] : never
