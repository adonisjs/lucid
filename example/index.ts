import { BaseModel } from '@ioc:Adonis/Lucid/Orm'

class Profile extends BaseModel {
}

class User extends BaseModel {
  public username: string

  public profile: Profile
}

User.$before('save', async (user) => {
  user.username
})

const user = new User()
user.related<'hasOne', 'profile'>('profile').save(new Profile())

user.profile = new Profile()
