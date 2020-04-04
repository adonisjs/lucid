import { BaseModel, HasOne } from '@ioc:Adonis/Lucid/Orm'

class Profile extends BaseModel {
  public id: string
  public userId: string
  public $columns: Pick<Profile, 'id' | 'userId'>
}

class User extends BaseModel {
  public id: string
  public username: string
  public $columns: Pick<User, 'id' | 'username'>

  public profile: HasOne<Profile>

  public foo () {
    // this.related('profile')
  }
}

User.create({ id: '1' })
User.fetchOrCreateMany('id', [{ id: '1', username: 'virk' }])
User.create({ id: '1', username: 'virk' })
User.create({ id: '1', username: 'virk' })
User.create({ id: '1' })

const user = new User()
user.related('profile').create({ id: '1', userId: '1' })
