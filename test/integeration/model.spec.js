'use strict'

const StaticProxy = require('../../src/Orm/Proxy/Static')
const Model = require('../../src/Orm/Proxy/Model')
const path = require('path')
let knex = require('knex')({
  client: 'sqlite3',
  connection: {
    filename: path.join(__dirname,'../unit/storage/test.sqlite3')
  }
})

class User extends Model{

  static extend(){
    return new StaticProxy(this)
  }

}

User = User.extend()
let user1 = {}
let user2 = {}

knex = knex.table('users')

User
.find(1)
.then( function (user){
  user1 = user
  return User.find(2)
})
.then( function (user) {
  user2 = user
  console.log(user1.update().toSQL())
  console.log(user2.update().toSQL())
}).catch(function (error){
  console.log(error.stack)
})
