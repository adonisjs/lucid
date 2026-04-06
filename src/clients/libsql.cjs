const Sqlite3Client = require('knex/lib/dialects/sqlite3/index.js')

module.exports = class LibSQLClient extends Sqlite3Client {
  _driver() {
    return require('@libsql/sqlite3')
  }

  get dialect() {
    return 'libsql'
  }

  get driverName() {
    return 'libsql'
  }
}
