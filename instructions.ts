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

function getDbServer(sink: typeof sinkStatic) {
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
	const dbServer = await getDbServer(sink)

	/**
	 * Create Config file
	 */
	const configPath = app.configPath('database.ts')
	const databaseConfig = new sink.files.MustacheFile(
		projectRoot,
		configPath,
		getStub('database.txt')
	)

	databaseConfig
		.apply({
			primary: dbServer[0],
			sqlite: dbServer.includes('sqlite'),
			mysql: dbServer.includes('mysql'),
			psql: dbServer.includes('pg'),
			oracle: dbServer.includes('oracle'),
			mssql: dbServer.includes('mssql'),
		})
		.commit()

	const configDir = app.directoriesMap.get('config') || 'config'
	sink.logger.action('create').succeeded(`${configDir}/database.ts`)

	/**
	 * Setup .env file
	 */
	const env = new sink.files.EnvFile(projectRoot)
	env.set('DB_CONNECTION', dbServer[0])

	/**
	 * Define connection setting, when one or more database other than
	 * sqlite are selected
	 */
	if (dbServer.find((name) => name !== 'sqlite')) {
		env.set('DB_HOST', '127.0.0.1')
		env.set('DB_USER', 'lucid')
		env.set('DB_PASSWORD', '')
		env.set('DB_NAME', 'lucid')
	}

	env.commit()
	sink.logger.action('update').succeeded('.env,.env.example')

	/**
	 * Create tmp dir when sqlite is selected
	 */
	if (dbServer.includes('sqlite') && !existsSync(app.tmpPath())) {
		mkdirSync(app.tmpPath())
		const tmpDir = app.directoriesMap.get('tmp') || 'tmp'
		sink.logger.action('create').succeeded(`./${tmpDir}`)
	}

	/**
	 * Install required dependencies
	 */
	const pkg = new sink.files.PackageJsonFile(projectRoot)
	pkg.install('luxon', undefined, false)

	if (dbServer.includes('sqlite')) {
		pkg.install('sqlite3', undefined, false)
	}

	if (dbServer.includes('mysql')) {
		pkg.install('mysql', undefined, false)
	}

	if (dbServer.includes('pg')) {
		pkg.install('pg', undefined, false)
	}

	if (dbServer.includes('oracle')) {
		pkg.install('oracledb', undefined, false)
	}

	if (dbServer.includes('mssql')) {
		pkg.install('mssql', undefined, false)
	}

	const spinner = sink.logger.await(
		`Installing packages: ${pkg.getInstalls(false).list.join(', ')}`
	)

	try {
		await pkg.commitAsync()
		spinner.update('Packages installed')
	} catch (error) {
		spinner.update('Unable to install packages')
		sink.logger.fatal(error)
	}

	spinner.stop()
}
