/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type Configure from '@adonisjs/core/commands/configure'

/**
 * We only allow configuring the one's thoroughly tested
 * inside the Lucid codebase. Knex supports more and one
 * can reference knex docs to configure additional
 * dialects.
 */
const DIALECTS = ['sqlite', 'mysql', 'postgres', 'mssql'] as const
const DIALECTS_INFO: {
  [K in (typeof DIALECTS)[number]]: {
    envVars?: Record<string, number | string>
    envValidations?: Record<string, string>
    pkg: string
  }
} = {
  sqlite: {
    pkg: 'sqlite3',
  },
  mysql: {
    pkg: 'mysql2',
    envVars: {
      DB_HOST: '127.0.0.1',
      DB_PORT: 3306,
      DB_USER: 'root',
      DB_PASSWORD: '',
      DB_DATABASE: '',
    },
    envValidations: {
      DB_HOST: `Env.schema.string({ format: 'host' })`,
      DB_PORT: `Env.schema.number()`,
      DB_USER: 'Env.schema.string()',
      DB_PASSWORD: 'Env.schema.string.optional()',
      DB_DATABASE: 'Env.schema.string()',
    },
  },
  postgres: {
    envVars: {
      DB_HOST: '127.0.0.1',
      DB_PORT: 5432,
      DB_USER: 'postgres',
      DB_PASSWORD: '',
      DB_DATABASE: '',
    },
    envValidations: {
      DB_HOST: `Env.schema.string({ format: 'host' })`,
      DB_PORT: `Env.schema.number()`,
      DB_USER: 'Env.schema.string()',
      DB_PASSWORD: 'Env.schema.string.optional()',
      DB_DATABASE: 'Env.schema.string()',
    },
    pkg: 'pg',
  },
  mssql: {
    envVars: {
      DB_HOST: '127.0.0.1',
      DB_PORT: 1433,
      DB_USER: 'sa',
      DB_PASSWORD: '',
      DB_DATABASE: '',
    },
    envValidations: {
      DB_HOST: `Env.schema.string({ format: 'host' })`,
      DB_PORT: `Env.schema.number()`,
      DB_USER: 'Env.schema.string()',
      DB_PASSWORD: 'Env.schema.string.optional()',
      DB_DATABASE: 'Env.schema.string()',
    },
    pkg: 'tedious',
  },
}

/**
 * Configures the package
 */
export async function configure(command: Configure) {
  const codemods = await command.createCodemods()

  /**
   * Prompt to select the dialect to use
   */
  const dialect =
    (await command.prompt.choice('Select the database you want to use', DIALECTS, {
      hint: 'You can always change it later',
    })) || 'postgres'

  const { pkg, envVars, envValidations } = DIALECTS_INFO[dialect]
  const installNpmDriver = await command.prompt.confirm(
    `Do you want to install npm package "${pkg}"?`
  )

  /**
   * Register provider
   */
  await codemods.updateRcFile((rcFile) => {
    rcFile.addCommand('@adonisjs/lucid/commands')
    rcFile.addProvider('@adonisjs/lucid/database_provider')
  })

  /**
   * Define environment variables
   */
  if (envVars) {
    codemods.defineEnvVariables(envVars)
  }

  /**
   * Define environment validations
   */
  if (envValidations) {
    codemods.defineEnvValidations({
      variables: envValidations,
      leadingComment: 'Variables for configuring database connection',
    })
  }

  /**
   * Publish config
   */
  await command.publishStub('config.stub', { dialect: dialect })

  /**
   * Install package or show steps to install package
   */
  if (installNpmDriver) {
    await command.installPackages([{ name: pkg, isDevDependency: false }])
  } else {
    command.listPackagesToInstall([{ name: pkg, isDevDependency: false }])
  }
}
