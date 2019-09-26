import { BaseModel } from '@ioc:Adonis/Lucid/Orm'

class Profile extends BaseModel {
}

class User extends BaseModel {
  public username: string

  public profile: Profile
}

const user = new User()
const profile = user.$getRelated('profile')
console.log(profile)
