import { DateTime } from 'luxon'
import { BaseModel, scope } from '../src/orm/base_model/index.js'
import { column, hasOne } from '../src/orm/decorators/index.js'
import { HasOne } from '../src/types/relations.js'
import { ModelQueryBuilderContract } from '../src/types/model.js'
import factory from '../src/factories/main.js'

enum ProfileTypes {
  TWITTER = 'TWITTER',
}

type Builder = ModelQueryBuilderContract<typeof User>

class Profile extends BaseModel {
  declare id: string
  declare userId: string
  declare user: HasOne<typeof User>

  declare type: ProfileTypes

  @column.dateTime()
  declare createdAt?: DateTime
}

export class User extends BaseModel {
  declare id: string
  declare username: string

  @hasOne(() => Profile, {
    onQuery: (builder) => {
      if (builder.isRelatedQuery) {
        builder.preload('user')
      }
    },
  })
  declare profile: HasOne<typeof Profile>

  static active = scope((builder: Builder) => {
    builder.apply((scopes) => scopes.country('India'))
  })
  static country = scope((builder, _country: string) => {
    builder.whereIn('', [])
  })
}

User.query().apply((scopes) => scopes.active().country('India'))
User.create({ id: '1', username: 'a' })
User.fetchOrCreateMany('id', [{ id: '1', username: 'virk' }])
User.create({ id: '1', username: 'virk' })
User.create({ id: '1', username: 'virk' })
User.create({ id: '1' })

const F = factory.define(User, ({ faker }) => {
  return {
    username: faker.internet.userName(),
  }
})

const P = factory.define(Profile, () => {
  return {}
})

const ProfileF = P.state('social', () => {}).build()

const UserF = F.state('active', (user) => {
  user.username = 'virk'
})
  .relation('profile', () => ProfileF)
  .build()

UserF.with('profile', 1).merge({})
User.query().withCount('profile', (query) => {
  query.where('isActive', true).has('user', '>', 1)
})

User.query().withCount('profile')

User.query()
  .paginate(1, 1)
  .then((users) => {
    users.forEach((user) => user.username)
  })

const user = new User()
user.loadCount('profile')
