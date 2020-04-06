import { BaseModel, HasOne, hasOne } from '@ioc:Adonis/Lucid/Orm'

class Profile extends BaseModel {
  public id: string
  public userId: string
  public foo () {
  }

  public user: HasOne<typeof User>

  // public static status = queryScope((builder) => {
  //   builder.whereIn('', [])
  // })

  // public $columns: Pick<Profile, 'id' | 'userId'>
}

export class User extends BaseModel {
  public id: string
  public username: string
  // public $columns: Pick<User, 'id' | 'username'>

  @hasOne(() => Profile, {
    onQuery: (builder) => builder.preload('user'),
  })
  public profile: HasOne<typeof Profile>

  public foo () {
  }

  public static active = User.defineScope((builder) => {
    builder.apply((scopes) => scopes.country('India'))
  })

  public static country = User.defineScope((builder, _country: string) => {
    builder.whereIn('', [])
  })
}

User.query().apply((scopes) => scopes.active().country('India'))

User.create({ id: '1', username: 'a' })
User.fetchOrCreateMany('id', [{ id: '1', username: 'virk' }])
User.create({ id: '1', username: 'virk' })
User.create({ id: '1', username: 'virk' })
User.create({ id: '1' })

// user.$getQueryFor('insert', {} as any).multiInsert
// const user = new User()
// user.related('profile').create({ id: '1' })
