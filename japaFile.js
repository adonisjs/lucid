'use strict'

const cli = require('japa/cli')
require('./lib/iocResolver').setFold(require('@adonisjs/fold'))
cli.run('test/**/*.spec.js')
