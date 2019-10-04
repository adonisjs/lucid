import { BaseModel } from '@ioc:Adonis/Lucid/Orm'

class Profile extends BaseModel {
}

class User extends BaseModel {
  public username: string

  public profile: Profile
}

const user = new User()
user.related('profile').where('username', 'virk').exec()
