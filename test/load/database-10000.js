'use strict'

const Database = require('../../src/Database')
const loadtest = require('loadtest')
const http = require('http')
const path = require('path')

const Env = {
  get: function(){
    return 'sqlite'
  }
}

const Config = {
  get: function(name){
    return {
      client: 'sqlite3',
      connection: {
        filename: path.join(__dirname,'../unit/storage/test.sqlite3')
      }
    }
  }
}

const db = new Database(Env,Config)

var server = http.createServer(function (req,res) {

  db.table('users').then(function (users) {
    res.writeHead(200,{"content-type":"application/json"})
    res.write(JSON.stringify(users))
    res.end()
  }).catch(function (err) {
    res.writeHead(503,{"content-type":"application/json"})
    res.write(err)
    res.end()
  })

}).listen(8000)

var options = {
    url: 'http://localhost:8000',
    maxRequests: 10000
};

console.time("Database");
loadtest.loadTest(options, function(error, result) {
  if (error) {
      return console.error('Got an error: %s', error);
  }
  console.log(result);
  console.log('Tests run successfully');
  console.timeEnd("Database")
  server.close()
  db.destroy()
  process.exit(0)
});
