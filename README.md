# Query Builder Features

- [x] Paginate method
- [x] forPage method
- [ ] chunk ( removed )
- [ ] pluckAll ( removed )
- [x] withPrefix
- [x] transactions
- [x] global transactions



## Model

- [ ] hooks
- [ ] getters
- [ ] setters
- [ ] helper static methods
- [ ] boot method ( ability to extend via BaseModel )
- [ ] refresh model
- [ ] fill model with json data
- [ ] use traits
- [ ] computed properties
- [ ] visible/hidden attributes
- [ ] timestamps


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


