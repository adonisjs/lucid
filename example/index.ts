import { BaseModel } from '@ioc:Adonis/Lucid/Orm'

class User extends BaseModel {
  public id: string
  public username: string
  public static $refs: Pick<User, 'id' | 'username'>
}

User.create({ id: '1' })
User.fetchOrCreateMany('id', [{ id: '1', username: 'virk' }])
User.create({ id: '1', username: 'virk' })
// User.create({ id: '1', username: 22 })
User.create({ id: '1' })
