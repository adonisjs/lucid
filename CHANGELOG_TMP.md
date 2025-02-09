# A temporary changelog as I am making changes

- Remove `connection.connect` method, since we perform the connect steps as soon as class constructor is created. The `connect` method was mis-leading as it felt like creating a database connection. Whereas, in reality we were constructing knex instances in this method.
- Rename `connection.disconnect` to `connection.close`.
- The `Connection` class is no longer an instance of `EventEmitter`. Instead, you can listen for disconnection events by defining callbacks. The callbacks are defined as `connection.onClose` and `connection.onError`.

```diff
const connection = new Connection(id, config)
- connection.on('disconnect', function (self) {})
+ connection.onClose(function (self) {})

- connection.on('disconnect:error', function (error, self) {})
+ connection.onCloseError(function (error, self) {})
```

- Add support for implementation based clients. Now, we no longer expect the `client` property to be a string. It could be a Connection class as well.

- Remove property `version` from dialects. The version was used by certain parts of Lucid ORM to decide which features of the database to use. Instead, these features will be added as flags to the dialect.

- Remove `supportsDomains`, `getAllDomains`, and `dropAllDomains` from the `DialectContract`. Domains are now returned and dropped as types.

- Change the return type of methods like `getAllTables`, `getAllViews`, and `getAllTypes` to return an array of objects. Earlier they used to return an array of strings, where each table was the name of the resource. Now the resource is part of the `name` property of the object.

```diff
- string[]
+ {name: string}[]
```

- Add `hasView`, `hasTable`, and `truncateAllTables` methods to the `DialectContract`.
- Add support for managing views in MSSQL and improve how tables are dropped in MSSQL dialect.
