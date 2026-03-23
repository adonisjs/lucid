/**
 * Patches knex 3.2.x bugs in node_modules.
 * Runs automatically via postinstall, or manually:
 *
 *   node patch-knex.js
 *
 * Safe to run multiple times. Skips patches that are already applied.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'

let knexDir
try {
  const require = createRequire(import.meta.url)
  knexDir = dirname(require.resolve('knex/package.json'))
} catch {
  process.exit(0)
}

const pkg = JSON.parse(readFileSync(resolve(knexDir, 'package.json'), 'utf8'))
const [major, minor] = pkg.version.split('.').map(Number)

if (major !== 3 || minor < 2) {
  console.log(`knex ${pkg.version} — no patches needed`)
  process.exit(0)
}

console.log(`Patching knex ${pkg.version}...\n`)
let patched = 0
let total = 0

/**
 * Patch: Fix ESM types resolution.
 * The .d.mts file is either missing (3.2.3) or incomplete — it
 * doesn't re-export the Knex namespace type (3.2.4).
 * Redirect to the complete .d.ts definitions instead.
 * https://github.com/knex/knex/issues/6403
 */
total++
const pkgPath = resolve(knexDir, 'package.json')
const esmTypes = pkg.exports?.['.']?.import?.types
if (esmTypes && esmTypes !== './types/index.d.ts') {
  pkg.exports['.'].import.types = './types/index.d.ts'
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
  console.log(`  ✓ Fixed ESM types resolution (${esmTypes} → ./types/index.d.ts)`)
  patched++
} else {
  console.log(`  · ESM types — ok`)
}

/**
 * Patch: Fix _evaluateContainer guard in SQLite transactions.
 * `null !== undefined` incorrectly blocks nested transactions
 * when no pragma change is needed.
 * https://github.com/knex/knex/issues/6402
 */
total++
const txPath = resolve(knexDir, 'lib/dialects/sqlite3/execution/sqlite-transaction.js')
let txSrc = readFileSync(txPath, 'utf8')
if (txSrc.includes('restoreForeignCheck !== undefined')) {
  txSrc = txSrc.replace('restoreForeignCheck !== undefined', 'restoreForeignCheck != null')
  writeFileSync(txPath, txSrc)
  console.log(`  ✓ Fixed _evaluateContainer guard (null !== undefined)`)
  patched++
} else {
  console.log(`  · _evaluateContainer guard — ok`)
}

/**
 * Patch: Fix alter() creating nested transactions that fail
 * when already inside a transaction. Reuses the existing
 * transaction instead of creating a new one.
 * https://github.com/knex/knex/issues/6402
 */
total++
const ddlPath = resolve(knexDir, 'lib/dialects/sqlite3/schema/ddl.js')
let ddlSrc = readFileSync(ddlPath, 'utf8')
const original = `  async alter(newSql, createIndices, columns) {
    await this.client.transaction(
      async (trx) => {
        await trx.raw(newSql);
        await this.copyData(trx, columns);
        await this.dropOriginal(trx);
        await this.renameTable(trx);

        for (const createIndex of createIndices) {
          await trx.raw(createIndex);
        }
      },
      { connection: this.connection, enforceForeignCheck: false }
    );
  }`

const replacement = `  async alter(newSql, createIndices, columns) {
    if (this.client.transacting) {
      await this.client.raw(newSql);
      await this.copyData(this.client, columns);
      await this.dropOriginal(this.client);
      await this.renameTable(this.client);

      for (const createIndex of createIndices) {
        await this.client.raw(createIndex);
      }
    } else {
      await this.client.transaction(
        async (trx) => {
          await trx.raw(newSql);
          await this.copyData(trx, columns);
          await this.dropOriginal(trx);
          await this.renameTable(trx);

          for (const createIndex of createIndices) {
            await trx.raw(createIndex);
          }
        },
        { connection: this.connection, enforceForeignCheck: false }
      );
    }
  }`

if (ddlSrc.includes(original)) {
  ddlSrc = ddlSrc.replace(original, replacement)
  writeFileSync(ddlPath, ddlSrc)
  console.log(`  ✓ Fixed alter() nested transaction`)
  patched++
} else {
  console.log(`  · alter() nested transaction — ok`)
}

console.log(`\nDone — ${patched}/${total} patch(es) applied`)
