'use strict'

const knex = require('knex')

class Database{

  constructor(Env,Config){

    const dbConnection = Env.get('DB_CONNECTION')
    if(!dbConnection){
      throw new Error(`Specify DB_CONNECTION under .env file`)
    }

    const connectionSettings = Config.get(`database.${dbConnection}`)
    return knex(connectionSettings)
  }

}


module.exports = Database
