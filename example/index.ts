import { BaseModel } from '@ioc:Adonis/Lucid/Orm'

class User extends BaseModel {
  public username: string
}

const user = User.query().then((a) => {
  a[0].username.toLocaleLowerCase()
})
console.log(user)
