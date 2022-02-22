import { BaseCommand, flags } from '@adonisjs/core/build/standalone'

export default class DbWipe extends BaseCommand {
  public static commandName = 'db:wipe'
  public static description = 'Drop all tables, views and types in database'

  /**
   * Choose a custom pre-defined connection. Otherwise, we use the
   * default connection
   */
  @flags.string({ description: 'Define a custom database connection', alias: 'c' })
  public connection: string

  /**
   * Drop all views in database
   */
  @flags.boolean({ description: 'Also drop all views in database' })
  public dropViews: boolean

  /**
   * Drop all types in database
   */
  @flags.boolean({ description: 'Also drop all types in database ( Postgres only )' })
  public dropTypes: boolean

  /**
   * Force command execution in production
   */
  @flags.boolean({ description: 'Explicitly force command to run in production' })
  public force: boolean

  public static settings = {
    loadApp: true,
  }

  /**
   * Execute command
   */
  public async run(): Promise<void> {
    const db = this.application.container.use('Adonis/Lucid/Database')
    const connection = db.connection(this.connection || db.primaryConnectionName)
    const continueWipe =
      !this.application.inProduction || this.force || (await this.takeProductionConstent())

    /**
     * Prompt cancelled or rejected and hence do not continue
     */
    if (!continueWipe) {
      return
    }

    /**
     * Ensure the define connection name does exists in the
     * config file
     */
    if (!connection) {
      this.logger.error(
        `${this.connection} is not a valid connection name. Double check config/database file`
      )
      return
    }

    if (this.dropViews) {
      await db.connection().dropAllViews()
      this.logger.info('All views dropped successfully')
    }

    await db.connection().dropAllTables()
    this.logger.info('All tables have been dropped successfully')

    if (this.dropTypes) {
      await db.connection().dropAllTypes()
      this.logger.info('All types dropped successfully')
    }
  }

  /**
   * Prompts to take consent for running migrations in production
   */
  protected async takeProductionConstent(): Promise<boolean> {
    const question = 'You are in production environment. Continue ?'
    try {
      const continueMigrations = await this.prompt.confirm(question)
      return continueMigrations
    } catch (error) {
      return false
    }
  }
}
