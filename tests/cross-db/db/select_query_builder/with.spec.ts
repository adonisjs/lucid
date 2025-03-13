/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { debug } from '../../../../src/debug.js'
import { getConnectionConfig, SUPPORT_WITH_MATERIALIZED } from '../../../helpers.js'
import { Connection } from '../../../../src/connection/connection.js'

test.group('Select query builder | with', () => {
  test('select from a common table expression', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()

    const sql = client
      .with('jennifers', (db) => {
        return db.query().from('person').where('first_name', '=', 'Jennifer').select(['id', 'age'])
      })
      .with('adult_jennifers', (db) =>
        db.query().from('jennifers').where('age', '>', 18).select(['id', 'age'])
      )
      .selectFrom('adult_jennifers')
      .where('age', '<', 60)
      .toSQL()

    const knexSQL = knex
      .with('jennifers', (query) => {
        return query.from('person').where('first_name', '=', 'Jennifer').select(['id', 'age'])
      })
      .with('adult_jennifers', (query) =>
        query.from('jennifers').where('age', '>', 18).select(['id', 'age'])
      )
      .from('adult_jennifers')
      .where('age', '<', 60)
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('select from an insert query executed via common table expression', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()

    const sql = client
      .with('new_person', (db) => {
        return db
          .insertQuery()
          .table('person')
          .values({
            first_name: 'Jennifer',
            age: 35,
          })
          .returning(['id'])
      })
      .with('new_pet', (db) =>
        db
          .insertQuery()
          .table('pet')
          .values({
            name: 'Doggo',
            species: 'dog',
            is_favorite: true,
            // Use the id of the person we just inserted.
            owner_id: db.query().from('new_person').select('id'),
          })
          .returning(['id'])
      )
      .selectFrom(['new_person', 'new_pet'])
      .select(['new_person.id as person_id', 'new_pet.id as pet_id'])
      .toSQL()

    const knexSQL = knex
      .with('new_person', (query) => {
        return query
          .table('person')
          .insert({
            first_name: 'Jennifer',
            age: 35,
          })
          .returning(['id'])
      })
      .with('new_pet', (query) =>
        query
          .table('pet')
          .insert({
            name: 'Doggo',
            species: 'dog',
            is_favorite: true,
            // Use the id of the person we just inserted.
            owner_id: knex.from('new_person').select('id'),
          })
          .returning(['id'])
      )
      .from({ new_person: 'new_person', new_pet: 'new_pet' })
      .select(['new_person.id as person_id', 'new_pet.id as pet_id'])
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })
})

test.group('Select query builder | withRecursive', () => {
  test('select from a recursive common table expression', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()

    const sql = client
      .withRecursive('jennifers', (db) => {
        return db.query().from('person').where('first_name', '=', 'Jennifer').select(['id', 'age'])
      })
      .with('adult_jennifers', (db) =>
        db.query().from('jennifers').where('age', '>', 18).select(['id', 'age'])
      )
      .selectFrom('adult_jennifers')
      .where('age', '<', 60)
      .toSQL()

    const knexSQL = knex
      .withRecursive('jennifers', (query) => {
        return query.from('person').where('first_name', '=', 'Jennifer').select(['id', 'age'])
      })
      .withRecursive('adult_jennifers', (query) =>
        query.from('jennifers').where('age', '>', 18).select(['id', 'age'])
      )
      .from('adult_jennifers')
      .where('age', '<', 60)
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('select from an insert query executed via common table expression', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()

    const sql = client
      .withRecursive('new_person', (db) => {
        return db
          .insertQuery()
          .table('person')
          .values({
            first_name: 'Jennifer',
            age: 35,
          })
          .returning(['id'])
      })
      .with('new_pet', (db) =>
        db
          .insertQuery()
          .table('pet')
          .values({
            name: 'Doggo',
            species: 'dog',
            is_favorite: true,
            // Use the id of the person we just inserted.
            owner_id: db.query().from('new_person').select('id'),
          })
          .returning(['id'])
      )
      .selectFrom(['new_person', 'new_pet'])
      .select(['new_person.id as person_id', 'new_pet.id as pet_id'])
      .toSQL()

    const knexSQL = knex
      .withRecursive('new_person', (query) => {
        return query
          .table('person')
          .insert({
            first_name: 'Jennifer',
            age: 35,
          })
          .returning(['id'])
      })
      .withRecursive('new_pet', (query) =>
        query
          .table('pet')
          .insert({
            name: 'Doggo',
            species: 'dog',
            is_favorite: true,
            // Use the id of the person we just inserted.
            owner_id: knex.from('new_person').select('id'),
          })
          .returning(['id'])
      )
      .from({ new_person: 'new_person', new_pet: 'new_pet' })
      .select(['new_person.id as person_id', 'new_pet.id as pet_id'])
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })
})

test.group('Select query builder | withMaterialized', (group) => {
  group.tap((t) => t.skip(!SUPPORT_WITH_MATERIALIZED))

  test('select via common table expression as a materialized view', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()

    const sql = client
      .withMaterialized('jennifers', (db) => {
        return db.query().from('person').where('first_name', '=', 'Jennifer').select(['id', 'age'])
      })
      .with('adult_jennifers', (db) =>
        db.query().from('jennifers').where('age', '>', 18).select(['id', 'age'])
      )
      .selectFrom('adult_jennifers')
      .where('age', '<', 60)
      .toSQL()

    const knexSQL = knex
      .withMaterialized('jennifers', (query) => {
        return query.from('person').where('first_name', '=', 'Jennifer').select(['id', 'age'])
      })
      .withMaterialized('adult_jennifers', (query) =>
        query.from('jennifers').where('age', '>', 18).select(['id', 'age'])
      )
      .from('adult_jennifers')
      .where('age', '<', 60)
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('select from an insert query executed via common table expression', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()

    const sql = client
      .withMaterialized('new_person', (db) => {
        return db
          .insertQuery()
          .table('person')
          .values({
            first_name: 'Jennifer',
            age: 35,
          })
          .returning(['id'])
      })
      .with('new_pet', (db) =>
        db
          .insertQuery()
          .table('pet')
          .values({
            name: 'Doggo',
            species: 'dog',
            is_favorite: true,
            // Use the id of the person we just inserted.
            owner_id: db.query().from('new_person').select('id'),
          })
          .returning(['id'])
      )
      .selectFrom(['new_person', 'new_pet'])
      .select(['new_person.id as person_id', 'new_pet.id as pet_id'])
      .toSQL()

    const knexSQL = knex
      .withMaterialized('new_person', (query) => {
        return query
          .table('person')
          .insert({
            first_name: 'Jennifer',
            age: 35,
          })
          .returning(['id'])
      })
      .withMaterialized('new_pet', (query) =>
        query
          .table('pet')
          .insert({
            name: 'Doggo',
            species: 'dog',
            is_favorite: true,
            // Use the id of the person we just inserted.
            owner_id: knex.from('new_person').select('id'),
          })
          .returning(['id'])
      )
      .from({ new_person: 'new_person', new_pet: 'new_pet' })
      .select(['new_person.id as person_id', 'new_pet.id as pet_id'])
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })
})

test.group('Select query builder | withNotMaterialized', (group) => {
  group.tap((t) => t.skip(!SUPPORT_WITH_MATERIALIZED))

  test('select via common table expression as a materialized view', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()

    const sql = client
      .withNotMaterialized('jennifers', (db) => {
        return db.query().from('person').where('first_name', '=', 'Jennifer').select(['id', 'age'])
      })
      .with('adult_jennifers', (db) =>
        db.query().from('jennifers').where('age', '>', 18).select(['id', 'age'])
      )
      .selectFrom('adult_jennifers')
      .where('age', '<', 60)
      .toSQL()

    const knexSQL = knex
      .withNotMaterialized('jennifers', (query) => {
        return query.from('person').where('first_name', '=', 'Jennifer').select(['id', 'age'])
      })
      .withNotMaterialized('adult_jennifers', (query) =>
        query.from('jennifers').where('age', '>', 18).select(['id', 'age'])
      )
      .from('adult_jennifers')
      .where('age', '<', 60)
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('select from an insert query executed via common table expression', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()

    const sql = client
      .withNotMaterialized('new_person', (db) => {
        return db
          .insertQuery()
          .table('person')
          .values({
            first_name: 'Jennifer',
            age: 35,
          })
          .returning(['id'])
      })
      .with('new_pet', (db) =>
        db
          .insertQuery()
          .table('pet')
          .values({
            name: 'Doggo',
            species: 'dog',
            is_favorite: true,
            // Use the id of the person we just inserted.
            owner_id: db.query().from('new_person').select('id'),
          })
          .returning(['id'])
      )
      .selectFrom(['new_person', 'new_pet'])
      .select(['new_person.id as person_id', 'new_pet.id as pet_id'])
      .toSQL()

    const knexSQL = knex
      .withNotMaterialized('new_person', (query) => {
        return query
          .table('person')
          .insert({
            first_name: 'Jennifer',
            age: 35,
          })
          .returning(['id'])
      })
      .withNotMaterialized('new_pet', (query) =>
        query
          .table('pet')
          .insert({
            name: 'Doggo',
            species: 'dog',
            is_favorite: true,
            // Use the id of the person we just inserted.
            owner_id: knex.from('new_person').select('id'),
          })
          .returning(['id'])
      )
      .from({ new_person: 'new_person', new_pet: 'new_pet' })
      .select(['new_person.id as person_id', 'new_pet.id as pet_id'])
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })
})
