import { BaseModel, HasOne, hasOne, scope } from '@ioc:Adonis/Lucid/Orm'
import Factory from '@ioc:Adonis/Lucid/Factory'

class Profile extends BaseModel {
  public id: string
  public userId: string
  public user: HasOne<typeof User>
}

export class User extends BaseModel {
  public id: string
  public username: string

  @hasOne(() => Profile, {
    onQuery: (builder) => builder.preload('user'),
  })
  public profile: HasOne<typeof Profile>

  public static active = scope<typeof User>((builder) => {
    builder.apply((scopes) => scopes.country('India'))
  })
  public static country = scope((builder, _country: string) => {
    builder.whereIn('', [])
  })
}

User.query().apply((scopes) => scopes.active().country('India'))

User.create({ id: '1', username: 'a' })
User.fetchOrCreateMany('id', [{ id: '1', username: 'virk' }])
User.create({ id: '1', username: 'virk' })
User.create({ id: '1', username: 'virk' })
User.create({ id: '1' })

const F = Factory.define(User, (state) => {
  const user = new User()
  user.username = state.faker.username
  return user
})

const P = Factory.define(Profile, () => new Profile())

const ProfileF = P
  .state('social', () => {})
  .build()

const UserF = F
  .state('active', (user) => {
    user.username = 'virk'
  })
  .related('profile', () => ProfileF)
  .build()

UserF.with('profile', 1)
