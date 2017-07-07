# Query Builder Features

- [x] Paginate method
- [x] forPage method
- [ ] chunk ( removed )
- [ ] pluckAll ( removed )
- [x] withPrefix
- [x] transactions
- [x] global transactions



## Model

- [x] hooks
- [x] getters
- [x] setters
- [x] helper static methods
- [x] boot method ( ability to extend via BaseModel )
- [ ] refresh model
- [x] fill model with json data
- [x] use traits
- [x] computed properties
- [x] visible/hidden attributes
- [x] timestamps


## Using StandAlone
Lucid can be standalone as well

```js
const { config, db, Models } = require('@adonisjs/lucid-standalone')
config({
  // define connections
})

await db.table('users').insert()
Models.register('App/Model/User', require('./models/User'))
Models.register('App/Model/City', require('./models/City'))

const User = Models.get('App/Model/User')
```
