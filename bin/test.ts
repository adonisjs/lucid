import { assert } from '@japa/assert'
import { specReporter } from '@japa/spec-reporter'
import { runFailedTests } from '@japa/run-failed-tests'
import { processCliArgs, configure, run } from '@japa/runner'

/*
|--------------------------------------------------------------------------
| Configure tests
|--------------------------------------------------------------------------
|
| The configure method accepts the configuration to configure the Japa
| tests runner.
|
| The first method call "processCliArgs" process the command line arguments
| and turns them into a config object. Using this method is not mandatory.
|
| Please consult japa.dev/runner-config for the config docs.
*/
configure({
  ...processCliArgs(process.argv.slice(2)),
  ...{
    files: ['test/**/*.spec.ts', '!test/database/drop-table.spec.ts'],
    plugins: [assert()],
    reporters: [specReporter()],
    importer: (filePath: string) => import(filePath),
    forceExit: true,
    teardown: [
      async (runner) => {
        await require('fs-extra').remove(require('path').join(__dirname, 'test-helpers', 'tmp'))
      },
    ],
  },
})

/*
|--------------------------------------------------------------------------
| Run tests
|--------------------------------------------------------------------------
|
| The following "run" method is required to execute all the tests.
|
*/
run()
