/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { BaseCommand, flags } from '@adonisjs/core/ace'
import { CommandOptions } from '@adonisjs/core/types/ace'
import string from '@poppinss/utils/string'
import { Knex } from 'knex'
import { stubsRoot } from '../stubs/main.js'

declare module '@adonisjs/lucid/database' {
  interface DatabaseQueryBuilder {
    getAllTables(): Promise<string[]>
  }
}

export default class DbPull extends BaseCommand {
  static commandName = 'db:pull'
  static description = 'Pull database tables and generate models'

  static options: CommandOptions = {
    startApp: true,
    loadApp: true,
  }

  @flags.string({
    description: 'Define a custom database connection',
    alias: 'c',
  })
  declare connection: string

  @flags.boolean({
    description: 'Convert table names to camelCase for model names',
    default: true,
  })
  declare camelCase: boolean

  private ignoreTables = ['adonis_schema', 'adonis_schema_versions']

  private matchingTypes: Record<string, string> = {
    varchar: 'string',
    integer: 'number',
    datetime: 'DateTime',
    char: 'string',
  }

  /**
   * Get model name from table name
   * @param table : string
   * @returns : string
   */
  private getModelName(table: string): string {
    if (!this.camelCase) {
      return string.pascalCase(table) + 'Model'
    }

    let modelName = table.replace(/^[^a-zA-Z]+/g, '').replace(/[^a-zA-Z0-9]+$/g, '')

    return string.pascalCase(string.camelCase(modelName))
  }

  /**
   * Generate model from table
   * @param table : string
   * @param columns : { [column: string]: Knex.ColumnInfo; }
   * @returns : Promise<void>
   */
  private async generateModel(
    table: string,
    columns: { [column: string]: Knex.ColumnInfo }
  ): Promise<void> {
    const modelName = this.getModelName(table)
    const codemods = await this.createCodemods()

    const modelContent = Object.entries(columns).map(([columnName, columnInfo]) => {
      // If the column is an id, add the isPrimary option
      const columnContent = columnName.match(/id/) ? '@column({ isPrimary: true })' : '@column()'

      // If the column is a datetime, add the autoCreate option
      return `${columnName === 'updated_at' || columnName === 'created_at' ? '@column.dateTime({ autoCreate: true })' : columnContent}\ndeclare ${string.camelCase(columnName)}: ${this.matchingTypes[columnInfo.type] ?? columnInfo.type}\n`
    })

    await codemods.makeUsingStub(stubsRoot, 'make/model/db_pull.stub', {
      entity: {
        name: modelName,
        path: '',
        content: modelContent.join('\n'),
      },
    })
  }

  /**
   * Run the command
   * @returns : Promise<void>
   */
  async run(): Promise<void> {
    try {
      const db = await this.app.container.make('lucid.db')
      const connection = db.connection(this.connection)

      if (typeof connection.getAllTables !== 'function') {
        throw new Error('getAllTables method is not available on the database connection')
      }

      const tables = await connection.getAllTables()

      if (!tables || tables.length === 0) {
        this.logger.warning('No tables found in the database')
        return
      }

      // Remove adonis_schema and adonis_schema_versions from the tables
      this.logger.info(`Found ${tables.length - 2} tables in the database`)

      for (const table of tables) {
        if (this.ignoreTables.includes(table)) continue

        try {
          this.logger.info(`Processing table: ${table}`)

          const columns = await connection.columnsInfo(table)

          await this.generateModel(table, columns)
          this.logger.success(`Generated model for table: ${table}`)
        } catch (error: any) {
          this.logger.error(`Failed to process table ${table}: ${error.message}`)
        }
      }
    } catch (error: any) {
      this.logger.error(`Database error: ${error.message}`)
    }
  }
}
