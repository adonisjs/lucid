/* eslint-disable @unicorn/no-await-expression-member */
/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * Patches a bug in knex's SQLite transaction handling where
 * `_setForeignCheck` returns `null` to mean "no change needed", but the
 * guard in `_evaluateContainer` uses `restoreForeignCheck !== undefined`
 * — so `null` incorrectly triggers the guard and throws:
 *
 *   "Refusing to create transaction: unable to change `foreign_keys`
 *    pragma inside a nested transaction"
 *
 * This affects DDL operations like `dropForeign` inside transactions
 * on SQLite, because knex's DDL layer creates internal nested
 * transactions via strict clients.
 *
 * Fix: make `_setForeignCheck` return `undefined` instead of `null`
 * so the existing guard treats it as "no change needed".
 *
 * TODO: Remove once knex fixes this upstream.
 */
export async function patchKnexSqliteForeignKeyCheck() {
  let TransactionSqlite: any
  try {
    TransactionSqlite = (
      await import(
        // @ts-expect-error - accessing knex internals
        'knex/lib/dialects/sqlite3/execution/sqlite-transaction.js'
      )
    ).default
  } catch {
    return
  }

  const proto = TransactionSqlite.prototype
  if (!proto._setForeignCheck || proto.__lucidPatched) {
    return
  }

  const original = proto._setForeignCheck
  proto._setForeignCheck = async function (conn: any, enforce: any) {
    const result = await original.call(this, conn, enforce)
    return result === null ? undefined : result
  }

  proto.__lucidPatched = true
}
