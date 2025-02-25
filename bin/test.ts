import { expect } from '@japa/expect'
import { assert } from '@japa/assert'
import { snapshot } from '@japa/snapshot'
import { fileSystem } from '@japa/file-system'
import { expectTypeOf } from '@japa/expect-type'
import { configure, processCLIArgs, run } from '@japa/runner'

processCLIArgs(process.argv.splice(2))
configure({
  suites: [
    {
      name: 'dialects',
      files: ['tests/dialects/**/*.spec.ts'],
    },
    {
      name: 'cross-db',
      files: ['tests/cross-db/**/*.spec.ts'],
    },
    {
      name: 'types',
      files: ['tests/types/**/*.spec.ts'],
    },
  ],
  plugins: [
    expect(),
    assert(),
    fileSystem({
      basePath: new URL('../tests/tmp', import.meta.url),
      autoClean: true,
    }),
    expectTypeOf(),
    snapshot(),
  ],
})

run()
