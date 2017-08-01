## Registering provider

Make sure to register the lucid provider to make use of `Database` and `Lucid` models. The providers are registered inside `start/app.js`

```js
const providers = [
  '@adonisjs/lucid/providers/LucidProvider'
]
```


## Usage 

Once done you can access `Database` provider and run mysql queries as follows.

```js
const Database = use('Database')

await Database.table('users').select('*')
await Database.table('users').paginate()
```

## Migrations Provider

This repo also comes with a migrations and seeds provider to run to migrate your database using incremental migrations.

Make sure to register migrations provider under `aceProviders` array.

```js
const aceProviders = [
  '@adonisjs/lucid/providers/MigrationsProvider'
]
```

After this running `adonis --help` will list a set of commands under `migration` namespace.

## Environment Variables

The configuration file `config/database.js` references **environment variables** from `.env` file. Make sure to set them accordingly for development and prodiction envorinment. 

```
DB_CONNECTION=sqlite
```

When using mysql set following

```
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_DATABASE=adonis
```
