const Sqlite3Client = require('knex/lib/dialects/sqlite3')

class LibSQLClient extends Sqlite3Client {
  _driver() {
    return require('@libsql/sqlite3')
  }
}

Object.assign(LibSQLClient.prototype, {
  dialect: 'libsql',
  driverName: 'libsql',
})

module.exports = LibSQLClient
