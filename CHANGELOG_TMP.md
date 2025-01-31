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
