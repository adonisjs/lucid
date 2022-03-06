/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { join } from 'path'
import { mkdirSync, existsSync } from 'fs'
import * as sinkStatic from '@adonisjs/sink'
import { ApplicationContract } from '@ioc:Adonis/Core/Application'

/**
 * Prompt choices for the database server selection
 */
const DB_SERVER_PROMPT_CHOICES = [
  {
    name: 'sqlite' as const,
    message: 'SQLite',
  },
  {
    name: 'mysql' as const,
    message: 'MySQL / MariaDB',
  },
  {
    name: 'pg' as const,
    message: 'PostgreSQL',
  },
  {
    name: 'oracle' as const,
    message: 'OracleDB',
  },
  {
    name: 'mssql' as const,
    message: 'Microsoft SQL Server',
  },
]

/**
 * Environment variables used by different database
 * drivers
 */
const DB_SERVER_ENV_VALUES = {
  sqlite: {},
  mysql: {
    MYSQL_HOST: 'localhost',
    MYSQL_PORT: 3306,
    MYSQL_USER: 'lucid',
    MYSQL_PASSWORD: '',
    MYSQL_DB_NAME: 'lucid',
  },
  pg: {
    PG_HOST: 'localhost',
    PG_PORT: 5432,
    PG_USER: 'lucid',
    PG_PASSWORD: '',
    PG_DB_NAME: 'lucid',
  },
  oracle: {
    ORACLE_HOST: 'localhost',
    ORACLE_PORT: 1521,
    ORACLE_USER: 'lucid',
    ORACLE_PASSWORD: '',
    ORACLE_DB_NAME: 'lucid',
  },
  mssql: {
    MSSQL_SERVER: 'localhost',
    MSSQL_PORT: 1433,
    MSSQL_USER: 'lucid',
    MSSQL_PASSWORD: '',
    MSSQL_DB_NAME: 'lucid',
  },
}

/**
 * Packages required by different drivers
 */
const DB_DRIVER_PACKAGES = {
  sqlite: '@vscode/sqlite3',
  mysql: 'mysql',
  pg: 'pg',
  oracle: 'oracledb',
  mssql: 'mssql',
}

/**
 * Prompts user for the drivers they want to use
 */
function getDbDrivers(sink: typeof sinkStatic) {
  return sink
    .getPrompt()
    .multiple('Select the database driver you want to use', DB_SERVER_PROMPT_CHOICES, {
      validate(choices) {
        return choices && choices.length ? true : 'Select atleast one database driver to continue'
      },
    })
}

/**
 * Returns absolute path to the stub relative from the templates
 * directory
 */
function getStub(...relativePaths: string[]) {
  return join(__dirname, 'templates', ...relativePaths)
}

/**
 * Instructions to be executed when setting up the package.
 */
export default async function instructions(
  projectRoot: string,
  app: ApplicationContract,
  sink: typeof sinkStatic
) {
  /**
   * Get drivers
   */
  const drivers = await getDbDrivers(sink)

  /**
   * Create Config file
   */
  const configPath = app.configPath('database.ts')
  const databaseConfig = new sink.files.MustacheFile(
    projectRoot,
    configPath,
    getStub('database.txt')
  )

  databaseConfig.overwrite = true
  databaseConfig
    .apply({
      sqlite: drivers.includes('sqlite'),
      mysql: drivers.includes('mysql'),
      psql: drivers.includes('pg'),
      oracle: drivers.includes('oracle'),
      mssql: drivers.includes('mssql'),
    })
    .commit()
  const configDir = app.directoriesMap.get('config') || 'config'
  sink.logger.action('create').succeeded(`${configDir}/database.ts`)

  /**
   * Setup .env file
   */
  const env = new sink.files.EnvFile(projectRoot)
  env.set('DB_CONNECTION', drivers[0])

  /**
   * Unset old values
   */
  Object.keys(DB_SERVER_ENV_VALUES).forEach((driver) => {
    Object.keys(DB_SERVER_ENV_VALUES[driver]).forEach((key) => {
      env.unset(key)
    })
  })
  drivers.forEach((driver) => {
    Object.keys(DB_SERVER_ENV_VALUES[driver]).forEach((key) => {
      env.set(key, DB_SERVER_ENV_VALUES[driver][key])
    })
  })

  env.commit()
  sink.logger.action('update').succeeded('.env,.env.example')

  /**
   * Create tmp dir when sqlite is selected
   */
  if (drivers.includes('sqlite') && !existsSync(app.tmpPath())) {
    mkdirSync(app.tmpPath())
    const tmpDir = app.directoriesMap.get('tmp') || 'tmp'
    sink.logger.action('create').succeeded(`./${tmpDir}`)
  }

  /**
   * Install required dependencies
   */
  const pkg = new sink.files.PackageJsonFile(projectRoot)

  /**
   * Remove existing dependencies
   */
  Object.keys(DB_DRIVER_PACKAGES).forEach((driver) => {
    if (!drivers.includes(driver as any)) {
      pkg.uninstall(DB_DRIVER_PACKAGES[driver], false)
    }
  })

  pkg.install('luxon', undefined, false)
  drivers.forEach((driver) => {
    pkg.install(DB_DRIVER_PACKAGES[driver], undefined, false)
  })

  const logLines = [
    `Installing: ${sink.logger.colors.gray(pkg.getInstalls(false).list.join(', '))}`,
  ]

  /**
   * Find the list of packages we have to remove
   */
  const packagesToRemove = pkg
    .getUninstalls(false)
    .list.filter((name) => pkg.get(`dependencies.${name}`))

  if (packagesToRemove.length) {
    logLines.push(`Removing: ${sink.logger.colors.gray(packagesToRemove.join(', '))}`)
  }

  const spinner = sink.logger.await(logLines.join(' '))

  try {
    await pkg.commitAsync()
    spinner.update('Packages installed')
  } catch (error) {
    spinner.update('Unable to install packages')
    sink.logger.fatal(error)
  }

  spinner.stop()
}
