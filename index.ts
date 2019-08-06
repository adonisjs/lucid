// import * as Knex from 'knex'
// // // import { join } from 'path'
// import { DatabaseQueryBuilderContract } from '@ioc:Adonis/Addons/DatabaseQueryBuilder'

// const knex = Knex({
//   client: 'pg',
//   connection: {
//     host: '0.0.0.0',
//     user: 'virk',
//     password: '',
//     database: 'directory-service',
//   },
//   pool: {
//     min: 0,
//     max: 5,
//     idleTimeoutMillis: 30000,
//   },
//   useNullAsDefault: true,
// })

// knex()
//   .from('foo')
//   .havingIn('f', ['a'])

// // // let i = 0;
// // knex['_context'].client.pool.on('destroySuccess', _eventId => {
// //   // i++
// //   console.log(
// //     knex['_context'].client.pool.numUsed(),
// //     knex['_context'].client.pool.numFree(),
// //     knex['_context'].client.pool.numPendingAcquires(),
// //   )

// //   // if (i === 3) {
// //   //   knex['_context'].client.pool.destroy()
// //   // }
// // });

// // knex['_context'].client.pool.on('poolDestroySuccess', _resource => {
// //   console.log('poolDestroySuccess>>>')
// // });

// // // setInterval(() => {
// // //   console.log('ping')
// // // }, 1000)

// // // type User = {
// // //   id: number,
// // // }

// // // console.log(knex.raw(['10']).toQuery())

// // // knex.schema.createTable('users', (table) => {
// // //   table.increments('id')
// // //   table.string('username')
// // //   table.integer('age')
// // //   table.timestamps()
// // // }).then(() => console.log('created'))

// // // knex.table('users').insert([
// // //   { username: 'virk', age: 29 }, { username: 'nikk', age: 28 }, { username: 'prasan', age: 29 },
// // // ]).then(console.log)

// // Promise.all([
// //   knex
// //   .select('*')
// //   .from('users')
// //   .debug(true)
// //   .then((result) => {
// //     console.log(result)
// //   }),
// //   knex
// //   .select('*')
// //   .from('users')
// //   .debug(true)
// //   .then((result) => {
// //     console.log(result)
// //   }),
// //   knex
// //   .select('*')
// //   .from('users')
// //   .debug(true)
// //   .then((result) => {
// //     console.log(result)
// //   }),
// //   knex
// //   .select('*')
// //   .from('users')
// //   .debug(true)
// //   .then((result) => {
// //     console.log(result)
// //   }),
// //   knex
// //   .select('*')
// //   .from('users')
// //   .debug(true)
// //   .then((result) => {
// //     console.log(result)
// //   }),
// // ]).then(() => {
// // })

// // // knex.transaction().then((trx) => {
// // // })

// // // console.log(query.toSQL())

// // // type FilteredKeys<T> = { [P in keyof T]: T[P] extends Function ? never : P }[keyof T]

// // // type GetRefs<T extends typeof BaseModel> = T['refs'] extends object ? {
// // //   [P in keyof T['refs']]: InstanceType<T>[P]
// // // } : {
// // //   [P in FilteredKeys<InstanceType<T>>]: InstanceType<T>[P]
// // // }

// // // class BaseModel {
// // //   public static refs: unknown

// // //   public static query<T extends typeof BaseModel> (
// // //     this: T,
// // //   ): DatabaseQueryBuilderContract<GetRefs<T>, InstanceType<T>> {
// // //     return {} as DatabaseQueryBuilderContract<GetRefs<T>, InstanceType<T>>
// // //   }
// // // }

// // // class User extends BaseModel {
// // //   public username: string
// // //   public age: number

// // //   public castToInt (): number {
// // //     return 22
// // //   }
// // // }

// // // class Post extends BaseModel {
// // // }

// const foo: DatabaseQueryBuilderContract<{ username: string, age: number, email: string }> = {}
// foo.whereIn(['username', 'age', 'email'], [
//   ['foo', 22, 'a'], ['bar', 22, 'a'], ['virk', 22, 'a'],
// ])
