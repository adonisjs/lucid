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
- [ ] use traits
- [x] computed properties
- [ ] visible/hidden attributes
- [x] timestamps


## Eager Loading

```js
User
  .query()
  .with('posts.comments')

// when constraints
User
  .query()
  .with('posts', (builder) => {
    builder.with('comments', () => {
    })
  })
```


