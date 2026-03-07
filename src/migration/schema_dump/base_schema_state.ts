/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { dirname } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { createReadStream, createWriteStream } from 'node:fs'
import { spawn, type ChildProcess, type SpawnOptions } from 'node:child_process'
import { mkdir, appendFile, writeFile } from 'node:fs/promises'
import { type ConnectionConfig, type QueryClientContract } from '../../types/database.js'

/**
 * Contract implemented by dialect-specific schema dump handlers.
 */
export interface SchemaStateContract {
  dump(path: string): Promise<void>
  load(path: string): Promise<void>
}

/**
 * Base implementation shared across all dialects. Dialect-specific classes are
 * only responsible for producing the structural SQL dump. This class appends
 * Lucid migration metadata afterwards.
 */
export abstract class BaseSchemaState implements SchemaStateContract {
  constructor(
    protected client: QueryClientContract,
    protected connectionConfig: ConnectionConfig,
    protected schemaTableName: string,
    protected schemaVersionsTableName: string
  ) {}

  /**
   * Dump the structural schema first and then append migrations metadata.
   */
  async dump(path: string) {
    await mkdir(dirname(path), { recursive: true })
    await this.dumpSchema(path)

    /**
     * The schema dump must also record Lucid's migration bookkeeping tables,
     * otherwise a freshly bootstrapped database would forget which migrations
     * were already squashed into the SQL baseline.
     */
    const metadata = await this.dumpMigrationMetadata()
    if (metadata.trim()) {
      await appendFile(path, `\n\n${metadata.trim()}\n`, 'utf-8')
    }
  }

  /**
   * Dialects must implement schema restore explicitly. Throwing here prevents
   * partial support from failing silently.
   */
  async load(_path: string) {
    throw new Error(`Schema loading is not implemented for "${this.connectionConfig.client}" yet`)
  }

  /**
   * Dump the dialect-specific structural schema to the provided path.
   */
  protected abstract dumpSchema(path: string): Promise<void>

  /**
   * Export rows from Lucid's schema bookkeeping tables as `INSERT` statements.
   */
  protected async dumpMigrationMetadata() {
    const statements: string[] = []

    for (let tableName of [this.schemaTableName, this.schemaVersionsTableName]) {
      /**
       * Fresh applications may not have run migrations yet. In that case we
       * simply skip the missing bookkeeping table.
       */
      if (!(await this.client.schema.hasTable(tableName))) {
        continue
      }

      const columns = Object.keys(await this.client.columnsInfo(tableName))
      if (!columns.length) {
        continue
      }

      /**
       * Keep rows deterministic in the generated SQL to make dumps stable and
       * easier to diff.
       */
      const query = this.client.query<Record<string, any>>().from(tableName).select(columns)

      if (columns.includes('id')) {
        query.orderBy('id', 'asc')
      } else if (columns.includes('version')) {
        query.orderBy('version', 'asc')
      }

      const rows = await query
      for (let row of rows) {
        statements.push(this.stringifyInsert(tableName, row))
      }
    }

    return statements.join('\n')
  }

  /**
   * Stringify an insert statement using the active dialect query builder, so
   * values are escaped consistently with the current client.
   */
  protected stringifyInsert(tableName: string, row: Record<string, any>) {
    return this.client
      .getWriteClient()
      .queryBuilder()
      .insert(row)
      .into(tableName)
      .toQuery()
      .replace(/;?\s*$/, ';')
  }

  /**
   * Helper to write a fully materialized dump to disk.
   */
  protected async writeContents(path: string, contents: string) {
    await writeFile(path, `${contents.trim()}\n`, 'utf-8')
  }

  /**
   * Collect stdout and stderr emitted by a child process. Individual helpers can
   * then decide which stream should be surfaced in case of failure.
   */
  private collectProcessOutput(child: ChildProcess) {
    let stdout = ''
    let stderr = ''

    child.stdout?.on('data', (chunk) => {
      stdout += chunk.toString()
    })

    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    return {
      getStdout: () => stdout,
      getStderr: () => stderr,
    }
  }

  /**
   * Wait for a spawned process to exit. Spawning failures reject immediately
   * through the `error` event.
   */
  private waitForProcessExit(child: ChildProcess) {
    return new Promise<number | null>((resolve, reject) => {
      child.once('error', reject)
      child.once('close', resolve)
    })
  }

  /**
   * Create a user-facing process error, preferring stderr and then stdout for
   * tools that only report actionable details through standard output.
   */
  private createCommandError(command: string, stdout: string, stderr: string) {
    return new Error(stderr.trim() || stdout.trim() || `Failed to execute "${command}"`)
  }

  /**
   * Stream CLI output directly to disk to avoid buffering large dumps in memory.
   */
  protected async spawnToFile(
    command: string,
    args: string[],
    outputPath: string,
    options: Omit<SpawnOptions, 'stdio'> = {}
  ) {
    const child = spawn(command, args, {
      ...options,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    /**
     * Pipe stdout to disk and collect stderr separately for actionable errors.
     */
    const output = createWriteStream(outputPath)
    const { getStdout, getStderr } = this.collectProcessOutput(child)
    const piping = pipeline(child.stdout!, output)
    const exitCode = await this.waitForProcessExit(child)
    await piping

    /**
     * Prefer surfacing the CLI stderr, since tools like `pg_dump` and
     * `mysqldump` usually emit precise failure messages there.
     */
    if (exitCode !== 0) {
      throw this.createCommandError(command, getStdout(), getStderr())
    }
  }

  /**
   * Stream a SQL file to a CLI process using stdin.
   */
  protected async spawnFromFile(
    command: string,
    args: string[],
    inputPath: string,
    options: Omit<SpawnOptions, 'stdio'> = {}
  ) {
    const child = spawn(command, args, {
      ...options,
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    /**
     * Pipe the SQL file to stdin and collect process output for actionable
     * errors.
     */
    const { getStdout, getStderr } = this.collectProcessOutput(child)
    let inputError: unknown = null
    const input = pipeline(createReadStream(inputPath), child.stdin).catch((error) => {
      /**
       * Reading from stdin can fail before the child process reports any
       * useful status of its own. Capture that failure explicitly and force
       * the subprocess to stop waiting for more input.
       */
      inputError = error
      child.stdin.destroy(error)
      child.kill()
    })

    const exitCode = await this.waitForProcessExit(child)
    await input

    if (inputError) {
      throw inputError
    }

    if (exitCode !== 0) {
      throw this.createCommandError(command, getStdout(), getStderr())
    }
  }

  /**
   * Execute a CLI command and collect its output for actionable failures.
   */
  protected async spawnCommand(
    command: string,
    args: string[],
    options: Omit<SpawnOptions, 'stdio'> = {}
  ) {
    const child = spawn(command, args, {
      ...options,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    const { getStdout, getStderr } = this.collectProcessOutput(child)
    const exitCode = await this.waitForProcessExit(child)

    if (exitCode !== 0) {
      throw this.createCommandError(command, getStdout(), getStderr())
    }

    return getStdout()
  }
}
