import { HasOne, HasMany, BelongsTo, ExtractRelations } from '@ioc:Adonis/Lucid/Relations'
import { BaseModel } from '@ioc:Adonis/Lucid/Orm'
import { AsColumns } from '@ioc:Adonis/Lucid/Model'

class Profile extends BaseModel {
  public foo = 'a'

  public user: BelongsTo<User>

  public static $refs: {
    columns: any,
    relations: ExtractRelations<Profile>,
  }
}

class Post extends BaseModel {
  public user: BelongsTo<User>

  public static $refs: {
    columns: any,
    relations: ExtractRelations<Post>,
  }
}

class User extends BaseModel {
  public username: string
  public get age (): number {
    return 22
  }

  public set age (number: number) {
    console.log(number)
  }

  public profile: HasOne<Profile>
  public posts: HasMany<Post>

  public static $refs: {
    columns: AsColumns<Pick<User, 'username' | 'age'>>,
    relations: ExtractRelations<User>,
  }
}

const user = new User()
User.$refs.columns.age

user.username = 'virk'
user.$getRelated('profile')!.preload('user')
user.$setRelated('posts', [new Post()])
user.$pushRelated('profile', new Profile())

User.query().preload('profile', (builder) => {
  builder.where('age', '10').preload('user')
})

user.related('profile')
user.preload((preloader) => {
  preloader.preload('profile', (builder) => {
    builder.preload('user')
  }).preload('posts')
})

const profile = (User.$getRelation('profile').$relatedModel() as typeof Profile).$refs.relations.user

// const profile = User.$getRelation('profile')!

// User.$before('save', (user) => {
//   user.username
// })

// const user = new User()
// user.related<'hasOne', 'profile'>('profile').save(new Profile())

// user.profile = new Profile()
