import { join } from 'path'
import * as sinkStatic from '@adonisjs/sink'
import { ApplicationContract } from '@ioc:Adonis/Core/Application'

/**
 * Prompt choices for the DBMS selection
 */
const DBMS_PROMPT_CHOICES = [
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

function getDBMS (sink: typeof sinkStatic) {
  return sink.getPrompt().multiple('Which DBMS are you going to use? (use "space" to select item)', DBMS_PROMPT_CHOICES)
}

/**
 * Returns absolute path to the stub relative from the templates
 * directory
 */
function getStub (...relativePaths: string[]) {
  return join(__dirname, 'templates', ...relativePaths)
}

/**
 * Instructions to be executed when setting up the package.
 */
export default async function instructions (
  projectRoot: string,
  app: ApplicationContract,
  sink: typeof sinkStatic,
) {
  const pkg = new sink.files.PackageJsonFile(projectRoot)
  const dbms = await getDBMS(sink)

  pkg.install('luxon')

  if (dbms.includes('sqlite')) {
    pkg.install('sqlite3')
  }

  if (dbms.includes('mysql')) {
    pkg.install('mysql')
  }

  if (dbms.includes('pg')) {
    pkg.install('pg')
  }

  if (dbms.includes('oracle')) {
    pkg.install('oracledb')
  }

  if (dbms.includes('mssql')) {
    pkg.install('mssql')
  }

  const configPath = app.configPath('database.ts')
  const databaseConfig = new sink.files.MustacheFile(projectRoot, configPath, getStub('database.txt'))

  databaseConfig.apply({
    sqlite: dbms.includes('sqlite'),
    mysql: dbms.includes('mysql'),
    psql: dbms.includes('pg'),
    oracle: dbms.includes('oracle'),
    mssql: dbms.includes('mssql'),
  }).commit()

  sink.logger.create(configPath)

  /**
   * Install required dependencies
   */
  sink.logger.info(`Installing packages: ${pkg.getInstalls().list.join(', ')}...`)
  await pkg.commitAsync()
  sink.logger.success('Packages installed!')
}
