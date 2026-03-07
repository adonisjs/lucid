/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, extname, join } from 'node:path'

/**
 * Increment this version whenever the manifest shape changes in a backward
 * incompatible way.
 */
export const SCHEMA_DUMP_MANIFEST_VERSION = 1

/**
 * Sidecar metadata written next to every SQL dump. The manifest lets Lucid
 * reason about intentionally pruned migrations without parsing the SQL file.
 */
export type SchemaDumpManifest = {
  version: number
  connection: string
  dumpPath: string
  generatedAt: string
  schemaTableName: string
  schemaVersionsTableName: string
  squashedMigrationNames: string[]
}

/**
 * Context used to validate that a schema dump manifest belongs to the current
 * migration bookkeeping tables and connection.
 */
export type SchemaDumpManifestContext = {
  connection: string
  schemaTableName: string
  schemaVersionsTableName: string
}

/**
 * High-level wrapper around the schema dump sidecar manifest.
 */
export class SchemaDumpManifestFile {
  /**
   * Returns the default dump path for a given connection.
   */
  static defaultDumpPath(connectionName: string) {
    return `database/schema/${connectionName}-schema.sql`
  }

  /**
   * Returns the manifest path stored next to the SQL dump.
   */
  static metaPath(dumpPath: string) {
    const extension = extname(dumpPath)
    const fileName = basename(dumpPath, extension || undefined)
    return join(dirname(dumpPath), `${fileName}.meta.json`)
  }

  /**
   * Create a new manifest instance for the provided dump metadata.
   */
  static create(
    payload: Omit<SchemaDumpManifest, 'version' | 'generatedAt'> & { generatedAt?: string }
  ) {
    return new SchemaDumpManifestFile({
      version: SCHEMA_DUMP_MANIFEST_VERSION,
      generatedAt: payload.generatedAt || new Date().toISOString(),
      ...payload,
    })
  }

  /**
   * Convert an unknown JSON value into a manifest instance. Returns `null`
   * when the value does not match the expected shape.
   */
  static fromJSON(value: unknown): SchemaDumpManifestFile | null {
    if (!value || typeof value !== 'object') {
      return null
    }

    const manifest = value as Partial<SchemaDumpManifest>

    if (
      typeof manifest.version !== 'number' ||
      typeof manifest.connection !== 'string' ||
      typeof manifest.dumpPath !== 'string' ||
      typeof manifest.generatedAt !== 'string' ||
      typeof manifest.schemaTableName !== 'string' ||
      typeof manifest.schemaVersionsTableName !== 'string' ||
      !Array.isArray(manifest.squashedMigrationNames) ||
      !manifest.squashedMigrationNames.every((name) => typeof name === 'string')
    ) {
      return null
    }

    return new SchemaDumpManifestFile(manifest as SchemaDumpManifest)
  }

  /**
   * Read and validate a manifest file from disk.
   */
  static async read(path: string): Promise<SchemaDumpManifestFile | null> {
    try {
      const contents = await readFile(path, 'utf-8')
      return this.fromJSON(JSON.parse(contents))
    } catch {
      return null
    }
  }

  /**
   * Read a manifest from disk and return it only when it matches the provided
   * migration bookkeeping context.
   */
  static async readForContext(path: string, context: SchemaDumpManifestContext) {
    const manifest = await this.read(path)
    if (!manifest || !manifest.matchesContext(context)) {
      return null
    }

    return manifest
  }

  constructor(private manifest: SchemaDumpManifest) {}

  /**
   * Persist the manifest as formatted JSON for readability and diffs.
   */
  async write(path: string) {
    await writeFile(path, JSON.stringify(this.manifest, null, 2) + '\n', 'utf-8')
  }

  /**
   * Returns the raw manifest payload.
   */
  toJSON() {
    return this.manifest
  }

  /**
   * Returns true when the manifest was created for the provided migration
   * bookkeeping context.
   */
  matchesContext(payload: SchemaDumpManifestContext) {
    return (
      this.manifest.version === SCHEMA_DUMP_MANIFEST_VERSION &&
      this.manifest.connection === payload.connection &&
      this.manifest.schemaTableName === payload.schemaTableName &&
      this.manifest.schemaVersionsTableName === payload.schemaVersionsTableName
    )
  }

  /**
   * Returns true when the given migration name is part of the squashed baseline.
   */
  hasSquashedMigration(name: string) {
    return this.manifest.squashedMigrationNames.includes(name)
  }

  /**
   * Returns the list of migration names stored inside the manifest.
   */
  getSquashedMigrationNames() {
    return [...this.manifest.squashedMigrationNames]
  }
}
