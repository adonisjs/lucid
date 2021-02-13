import { DateTime } from 'luxon'
import { BaseModel, HasOne, hasOne, scope, column } from '@ioc:Adonis/Lucid/Orm'
import Factory from '@ioc:Adonis/Lucid/Factory'

const ProfileTypes = {
	TWITTER: 'TWITTER' as 'TWITTER',
	FACEBOOK: 'FACEBOOK' as 'FACEBOOK',
}

class Profile extends BaseModel {
	public id: string
	public userId: string
	public user: HasOne<typeof User>

	public type: keyof typeof ProfileTypes

	@column.dateTime()
	public createdAt?: DateTime
}

export class User extends BaseModel {
	public id: string
	public username: string

	@hasOne(() => Profile, {
		onQuery: (builder) => {
			if (builder.isRelatedQuery) {
				builder.preload('user')
			}
		},
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

const F = Factory.define(User, ({ faker }) => {
	return {
		username: faker.internet.userName(),
	}
})

const P = Factory.define(Profile, () => {
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

User.query()
	.paginate(1, 1)
	.then((users) => {
		users.forEach((user) => user.username)
	})
